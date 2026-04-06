import postgres from 'postgres';
import bcrypt from 'bcryptjs';

export interface AdminUser {
  id: number;
  username: string;
  role: 'super_admin' | 'family_admin';
  rootFamilyId: string | null;
  createdAt: string;
}

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  root_family_id: string | null;
  created_at: string;
}

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return postgres(url, { max: 1 });
}

export async function getAdminByUsername(username: string): Promise<(AdminUser & { passwordHash: string }) | null> {
  const sql = getDb();
  try {
    const rows = await sql<AdminRow[]>`
      SELECT * FROM admin_users WHERE username = ${username}
    `;
    if (!rows[0]) return null;
    return rowToAdmin(rows[0]);
  } finally {
    await sql.end();
  }
}

export async function listAdmins(): Promise<AdminUser[]> {
  const sql = getDb();
  try {
    const rows = await sql<AdminRow[]>`
      SELECT id, username, role, root_family_id, created_at
      FROM admin_users ORDER BY id
    `;
    return rows.map(r => rowToAdmin(r));
  } finally {
    await sql.end();
  }
}

export async function createAdmin(input: {
  username: string;
  password: string;
  role: 'super_admin' | 'family_admin';
  rootFamilyId?: string | null;
}): Promise<AdminUser> {
  const sql = getDb();
  try {
    const hash = await bcrypt.hash(input.password, 12);
    const rows = await sql<AdminRow[]>`
      INSERT INTO admin_users (username, password_hash, role, root_family_id)
      VALUES (${input.username}, ${hash}, ${input.role}, ${input.rootFamilyId ?? null})
      RETURNING *
    `;
    return rowToAdmin(rows[0]);
  } finally {
    await sql.end();
  }
}

export async function deleteAdmin(id: number): Promise<void> {
  const sql = getDb();
  try {
    await sql`DELETE FROM admin_users WHERE id = ${id}`;
  } finally {
    await sql.end();
  }
}

export async function verifyAdminPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function rowToAdmin(row: AdminRow): AdminUser & { passwordHash: string } {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role as 'super_admin' | 'family_admin',
    rootFamilyId: row.root_family_id,
    createdAt: row.created_at,
  };
}
