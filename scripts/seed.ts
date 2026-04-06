/**
 * Seed script — migrates data/family.json into PostgreSQL.
 *
 * Requires the schema to already exist (run db:setup first, or db:setup handles both).
 *
 * Run:  npm run db:seed
 *
 * Safe to re-run: uses upsert (ON CONFLICT DO UPDATE).
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { readFileSync } from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}

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

const jsonPath = path.resolve(process.cwd(), 'data/family.json');
const { members }: { members: FamilyMember[] } = JSON.parse(readFileSync(jsonPath, 'utf-8'));

async function seed() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log(`\n🌱 Seeding ${members.length} members…\n`);

    // Pass 1: insert without parent refs to avoid FK conflicts
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

    // Pass 2: update parent refs
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

    // Marriages
    const seen = new Set<string>();
    let mc = 0;
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
        mc++;
      }
    }
    console.log(`✅ Upserted ${mc} marriages\n`);
    console.log('🎉 Seed complete!');
  } finally {
    await sql.end();
  }
}

seed().catch(err => { console.error('Unhandled error:', err); process.exit(1); });
