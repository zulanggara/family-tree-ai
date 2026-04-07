/**
 * Migration: add audit_logs table + gallery column to existing databases.
 *
 * Safe to run multiple times (all statements are idempotent).
 *
 * Run:  npm run db:migrate
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL. Check .env.local');
  process.exit(1);
}

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1 });
  try {
    console.log('🔄 Running migration…');

    // audit_logs table
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
    console.log('  ✅ audit_logs table');

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
    console.log('  ✅ Indexes on audit_logs');

    // gallery column (from previous migration)
    await sql`
      ALTER TABLE family_members
        ADD COLUMN IF NOT EXISTS gallery TEXT[] NOT NULL DEFAULT '{}'
    `;
    console.log('  ✅ gallery column on family_members');

    console.log('\n🎉 Migration complete!');
  } finally {
    await sql.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
