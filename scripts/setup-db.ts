/**
 * One-time setup script:
 *   1. Creates the database if it does not exist
 *   2. Creates tables (family_members + marriages)
 *   3. Seeds all data from data/family.json
 *
 * Run:  npm run db:setup
 *
 * Safe to re-run: uses CREATE TABLE IF NOT EXISTS + upsert.
 */

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL. Check .env.local');
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Marriage {
  spouseId: string;
  status: string;
  marriedDate?: string | null;
  endDate?: string | null;
}
interface FamilyMember {
  id: string; name: string; photo: string; gender: string;
  birthDate?: string; deathDate?: string | null; birthPlace?: string;
  fatherId: string | null; motherId: string | null;
  spouseIds: string[]; childrenIds: string[];
  marriages?: Marriage[]; biography?: string;
  nickname?: string; profession?: string; education?: string;
  religion?: string; nationality?: string;
  hobbies?: string[]; socialLinks?: { label: string; url: string }[];
}

// ─── Step 1: Ensure database exists ──────────────────────────────────────────
async function ensureDatabase() {
  // Parse the URL to connect to 'postgres' db first to create target db
  const url = new URL(DATABASE_URL!);
  const dbName = url.pathname.slice(1); // strip leading /
  url.pathname = '/postgres';

  const adminSql = postgres(url.toString(), { max: 1 });
  try {
    const rows = await adminSql<{ datname: string }[]>`
      SELECT datname FROM pg_database WHERE datname = ${dbName}
    `;
    if (rows.length === 0) {
      // Cannot use parameters for CREATE DATABASE — use identifier
      await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Created database "${dbName}"`);
    } else {
      console.log(`✅ Database "${dbName}" already exists`);
    }
  } finally {
    await adminSql.end();
  }
}

// ─── Step 2: Create schema ────────────────────────────────────────────────────
async function createSchema(sql: ReturnType<typeof postgres>) {
  console.log('📐 Creating schema…');

  await sql`
    CREATE TABLE IF NOT EXISTS family_members (
      id            TEXT PRIMARY KEY,
      name          TEXT        NOT NULL,
      photo         TEXT        NOT NULL DEFAULT '',
      gender        TEXT        NOT NULL CHECK (gender IN ('male', 'female')),
      birth_date    TEXT,
      death_date    TEXT,
      birth_place   TEXT,
      father_id     TEXT,
      mother_id     TEXT,
      biography     TEXT,
      nickname      TEXT,
      profession    TEXT,
      education     TEXT,
      religion      TEXT,
      nationality   TEXT,
      hobbies       TEXT[]      NOT NULL DEFAULT '{}',
      social_links  JSONB       NOT NULL DEFAULT '[]',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_father') THEN
        ALTER TABLE family_members
          ADD CONSTRAINT fk_father FOREIGN KEY (father_id)
          REFERENCES family_members (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_mother') THEN
        ALTER TABLE family_members
          ADD CONSTRAINT fk_mother FOREIGN KEY (mother_id)
          REFERENCES family_members (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $$
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marriages (
      id           SERIAL      PRIMARY KEY,
      member_id    TEXT        NOT NULL REFERENCES family_members (id) ON DELETE CASCADE,
      spouse_id    TEXT        NOT NULL REFERENCES family_members (id) ON DELETE CASCADE,
      status       TEXT        NOT NULL DEFAULT 'married'
                     CHECK (status IN ('married','widowed','divorced','separated','annulled')),
      married_date TEXT,
      end_date     TEXT,
      CONSTRAINT uq_marriage UNIQUE (member_id, spouse_id),
      CONSTRAINT chk_no_self CHECK  (member_id <> spouse_id)
    )
  `;

  await sql`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$
  `;

  await sql`
    CREATE OR REPLACE TRIGGER trg_family_members_updated_at
      BEFORE UPDATE ON family_members
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `;

  // ── Admin users table ──────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id              SERIAL      PRIMARY KEY,
      username        TEXT        NOT NULL UNIQUE,
      password_hash   TEXT        NOT NULL,
      role            TEXT        NOT NULL DEFAULT 'family_admin'
                        CHECK (role IN ('super_admin', 'family_admin')),
      root_family_id  TEXT        REFERENCES family_members(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // ── Audit logs table ───────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id             BIGSERIAL    PRIMARY KEY,
      admin_username TEXT         NOT NULL,
      admin_role     TEXT         NOT NULL,
      action         TEXT         NOT NULL,
      entity_type    TEXT         NOT NULL,
      entity_id      TEXT,
      entity_name    TEXT,
      details        JSONB,
      ip_address     TEXT,
      created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created
      ON audit_logs (created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_admin
      ON audit_logs (admin_username)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action
      ON audit_logs (action)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type
      ON audit_logs (entity_type)
  `;

  // ── gallery column (idempotent) ────────────────────────────────────────────
  await sql`
    ALTER TABLE family_members
      ADD COLUMN IF NOT EXISTS gallery TEXT[] NOT NULL DEFAULT '{}'
  `;

  console.log('✅ Schema ready');
}

// ─── Step 0b: Seed default super_admin ───────────────────────────────────────
async function ensureDefaultAdmin(sql: ReturnType<typeof postgres>) {
  const rows = await sql`SELECT id FROM admin_users WHERE username = 'admin'`;
  if (rows.length > 0) {
    console.log('✅ Default admin already exists');
    return;
  }
  const hash = await bcrypt.hash('admin123', 12);
  await sql`
    INSERT INTO admin_users (username, password_hash, role)
    VALUES ('admin', ${hash}, 'super_admin')
  `;
  console.log('✅ Default super_admin created  (username: admin  password: admin123)');
  console.log('   ⚠️  Change the password after first login!');
}

// ─── Step 3: Seed members ─────────────────────────────────────────────────────
async function seedMembers(sql: ReturnType<typeof postgres>, members: FamilyMember[]) {
  console.log(`\n🌱 Upserting ${members.length} members (pass 1 — without parent refs)…`);

  for (const m of members) {
    await sql`
      INSERT INTO family_members
        (id, name, photo, gender, birth_date, death_date, birth_place,
         father_id, mother_id, biography, nickname, profession, education,
         religion, nationality, hobbies, social_links)
      VALUES (
        ${m.id}, ${m.name}, ${m.photo ?? ''},
        ${m.gender}, ${m.birthDate ?? null}, ${m.deathDate ?? null},
        ${m.birthPlace ?? null}, ${null}, ${null},
        ${m.biography ?? null}, ${m.nickname ?? null}, ${m.profession ?? null},
        ${m.education ?? null}, ${m.religion ?? null}, ${m.nationality ?? null},
        ${sql.array(m.hobbies ?? [])},
        ${sql.json(m.socialLinks ?? [])}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, photo = EXCLUDED.photo, gender = EXCLUDED.gender,
        birth_date = EXCLUDED.birth_date, death_date = EXCLUDED.death_date,
        birth_place = EXCLUDED.birth_place, biography = EXCLUDED.biography,
        nickname = EXCLUDED.nickname, profession = EXCLUDED.profession,
        education = EXCLUDED.education, religion = EXCLUDED.religion,
        nationality = EXCLUDED.nationality, hobbies = EXCLUDED.hobbies,
        social_links = EXCLUDED.social_links
    `;
  }
  console.log(`✅ Upserted ${members.length} members`);

  console.log('\n🔗 Updating parent references (pass 2)…');
  let n = 0;
  for (const m of members) {
    if (!m.fatherId && !m.motherId) continue;
    await sql`
      UPDATE family_members
      SET father_id = ${m.fatherId ?? null}, mother_id = ${m.motherId ?? null}
      WHERE id = ${m.id}
    `;
    n++;
  }
  console.log(`✅ Updated parent refs for ${n} members`);
}

// ─── Step 4: Seed marriages ───────────────────────────────────────────────────
async function seedMarriages(sql: ReturnType<typeof postgres>, members: FamilyMember[]) {
  console.log('\n💍 Upserting marriages…');
  const seen = new Set<string>();
  let n = 0;
  for (const m of members) {
    for (const mar of m.marriages ?? []) {
      const [a, b] = [m.id, mar.spouseId].sort();
      const key = `${a}:${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await sql`
        INSERT INTO marriages (member_id, spouse_id, status, married_date, end_date)
        VALUES (${a}, ${b}, ${mar.status}, ${mar.marriedDate ?? null}, ${mar.endDate ?? null})
        ON CONFLICT (member_id, spouse_id) DO UPDATE SET
          status = EXCLUDED.status,
          married_date = EXCLUDED.married_date,
          end_date = EXCLUDED.end_date
      `;
      n++;
    }
  }
  console.log(`✅ Upserted ${n} marriages\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { members }: { members: FamilyMember[] } = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'data/family.json'), 'utf-8'),
  );

  await ensureDatabase();

  const sql = postgres(DATABASE_URL!, { max: 1 });
  try {
    await createSchema(sql);
    await seedMembers(sql, members);
    await seedMarriages(sql, members);
    await ensureDefaultAdmin(sql);
    console.log('🎉 Setup complete!');
  } finally {
    await sql.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
