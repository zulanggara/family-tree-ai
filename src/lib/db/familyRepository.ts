import postgres from 'postgres';
import { FamilyData, FamilyMember, Marriage, MarriageStatus } from '@/types';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return postgres(url, { max: 1 });
}

// ─── Row types ────────────────────────────────────────────────────────────────
interface MemberRow {
  id: string; name: string; photo: string; gender: string;
  birth_date: string | null; death_date: string | null; birth_place: string | null;
  father_id: string | null; mother_id: string | null; biography: string | null;
  nickname: string | null; profession: string | null; education: string | null;
  religion: string | null; nationality: string | null;
  hobbies: string[]; social_links: { label: string; url: string }[];
  gallery: string[];
}

interface MarriageRow {
  id: number; member_id: string; spouse_id: string; status: string;
  married_date: string | null; end_date: string | null;
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function fetchFamilyData(): Promise<FamilyData> {
  const sql = getDb();
  try {
    const [memberRows, marriageRows] = await Promise.all([
      sql<MemberRow[]>`SELECT * FROM family_members ORDER BY id`,
      sql<MarriageRow[]>`SELECT * FROM marriages`,
    ]);
    return transform(memberRows, marriageRows);
  } finally {
    await sql.end();
  }
}

export async function fetchMemberById(id: string): Promise<FamilyMember | null> {
  const sql = getDb();
  try {
    const [rows, marriageRows, childRows] = await Promise.all([
      sql<MemberRow[]>`SELECT * FROM family_members WHERE id = ${id}`,
      sql<MarriageRow[]>`SELECT * FROM marriages WHERE member_id = ${id} OR spouse_id = ${id}`,
      sql<{ id: string }[]>`SELECT id FROM family_members WHERE father_id = ${id} OR mother_id = ${id}`,
    ]);
    if (!rows[0]) return null;

    const marriages: Marriage[] = marriageRows.map(r => ({
      spouseId: r.member_id === id ? r.spouse_id : r.member_id,
      status: r.status as MarriageStatus,
      marriedDate: r.married_date ?? null,
      endDate: r.end_date ?? null,
    }));

    return rowToMember(rows[0], marriages, childRows.map(c => c.id));
  } finally {
    await sql.end();
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────
export interface MemberInput {
  id?: string;
  name: string;
  photo?: string;
  gender: 'male' | 'female';
  birthDate?: string | null;
  deathDate?: string | null;
  birthPlace?: string | null;
  fatherId?: string | null;
  motherId?: string | null;
  biography?: string | null;
  nickname?: string | null;
  profession?: string | null;
  education?: string | null;
  religion?: string | null;
  nationality?: string | null;
  hobbies?: string[];
  socialLinks?: { label: string; url: string }[];
  gallery?: string[];
}

export async function createMember(input: MemberInput): Promise<FamilyMember> {
  const sql = getDb();
  try {
    const id = input.id?.trim() || await generateNextId(sql);
    const rows = await sql<MemberRow[]>`
      INSERT INTO family_members
        (id, name, photo, gender, birth_date, death_date, birth_place,
         father_id, mother_id, biography, nickname, profession, education,
         religion, nationality, hobbies, social_links, gallery)
      VALUES (
        ${id}, ${input.name}, ${input.photo ?? ''},
        ${input.gender}, ${input.birthDate ?? null}, ${input.deathDate ?? null},
        ${input.birthPlace ?? null}, ${input.fatherId ?? null}, ${input.motherId ?? null},
        ${input.biography ?? null}, ${input.nickname ?? null}, ${input.profession ?? null},
        ${input.education ?? null}, ${input.religion ?? null}, ${input.nationality ?? null},
        ${sql.array(input.hobbies ?? [])},
        ${sql.json(input.socialLinks ?? [])},
        ${sql.array(input.gallery ?? [])}
      )
      RETURNING *
    `;
    return rowToMember(rows[0], [], []);
  } finally {
    await sql.end();
  }
}

export async function updateMember(id: string, input: Partial<MemberInput>): Promise<FamilyMember> {
  const sql = getDb();
  try {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.photo !== undefined) updates.photo = input.photo ?? '';
    if (input.gender !== undefined) updates.gender = input.gender;
    if ('birthDate' in input) updates.birth_date = input.birthDate ?? null;
    if ('deathDate' in input) updates.death_date = input.deathDate ?? null;
    if ('birthPlace' in input) updates.birth_place = input.birthPlace ?? null;
    if ('fatherId' in input) updates.father_id = input.fatherId ?? null;
    if ('motherId' in input) updates.mother_id = input.motherId ?? null;
    if ('biography' in input) updates.biography = input.biography ?? null;
    if ('nickname' in input) updates.nickname = input.nickname ?? null;
    if ('profession' in input) updates.profession = input.profession ?? null;
    if ('education' in input) updates.education = input.education ?? null;
    if ('religion' in input) updates.religion = input.religion ?? null;
    if ('nationality' in input) updates.nationality = input.nationality ?? null;
    if (input.hobbies !== undefined) updates.hobbies = input.hobbies;
    if (input.socialLinks !== undefined) updates.social_links = input.socialLinks;
    if (input.gallery !== undefined) updates.gallery = input.gallery;

    if (Object.keys(updates).length > 0) {
      await sql`UPDATE family_members SET ${sql(updates)} WHERE id = ${id}`;
    }

    const member = await fetchMemberById(id);
    if (!member) throw new Error('Member not found after update');
    return member;
  } finally {
    await sql.end();
  }
}

export async function deleteMember(id: string): Promise<void> {
  const sql = getDb();
  try {
    await sql`DELETE FROM family_members WHERE id = ${id}`;
  } finally {
    await sql.end();
  }
}

// ─── Descendants ──────────────────────────────────────────────────────────────
/** Returns all descendant IDs (including the given id) using a recursive CTE. */
export async function getDescendantIds(rootId: string): Promise<string[]> {
  const sql = getDb();
  try {
    const rows = await sql<{ id: string }[]>`
      WITH RECURSIVE desc_tree AS (
        SELECT id FROM family_members WHERE id = ${rootId}
        UNION ALL
        SELECT fm.id FROM family_members fm
        JOIN desc_tree dt ON fm.father_id = dt.id OR fm.mother_id = dt.id
      )
      SELECT id FROM desc_tree
    `;
    return rows.map(r => r.id);
  } finally {
    await sql.end();
  }
}

export interface DescendantInfo {
  id: string;
  name: string;
  generation: number;
}

export async function getDescendantsInfo(rootId: string): Promise<DescendantInfo[]> {
  const sql = getDb();
  try {
    const rows = await sql<DescendantInfo[]>`
      WITH RECURSIVE desc_tree AS (
        SELECT id, name, 0 AS generation FROM family_members WHERE id = ${rootId}
        UNION ALL
        SELECT fm.id, fm.name, dt.generation + 1
        FROM family_members fm
        JOIN desc_tree dt ON fm.father_id = dt.id OR fm.mother_id = dt.id
      )
      SELECT id, name, generation FROM desc_tree ORDER BY generation, name
    `;
    return rows;
  } finally {
    await sql.end();
  }
}

/** Deletes a member and ALL their descendants (children, grandchildren, etc.) safely. */
export async function cascadeDeleteMember(id: string): Promise<number> {
  const sql = getDb();
  try {
    // 1. Collect all IDs to delete
    const allIds = await (async () => {
      const rows = await sql<{ id: string }[]>`
        WITH RECURSIVE desc_tree AS (
          SELECT id FROM family_members WHERE id = ${id}
          UNION ALL
          SELECT fm.id FROM family_members fm
          JOIN desc_tree dt ON fm.father_id = dt.id OR fm.mother_id = dt.id
        )
        SELECT id FROM desc_tree
      `;
      return rows.map(r => r.id);
    })();

    // 2. Clear parent refs pointing to any of these (prevents FK SET NULL trigger conflicts)
    await sql`
      UPDATE family_members
      SET father_id = NULL
      WHERE father_id = ANY(${sql.array(allIds)}::text[])
    `;
    await sql`
      UPDATE family_members
      SET mother_id = NULL
      WHERE mother_id = ANY(${sql.array(allIds)}::text[])
    `;

    // 3. Delete marriages (cascade would handle it, but explicit is cleaner)
    await sql`
      DELETE FROM marriages
      WHERE member_id = ANY(${sql.array(allIds)}::text[])
         OR spouse_id = ANY(${sql.array(allIds)}::text[])
    `;

    // 4. Delete all members
    await sql`
      DELETE FROM family_members WHERE id = ANY(${sql.array(allIds)}::text[])
    `;

    return allIds.length;
  } finally {
    await sql.end();
  }
}

export interface MarriageInput {
  memberId: string;
  spouseId: string;
  status: MarriageStatus;
  marriedDate?: string | null;
  endDate?: string | null;
}

export async function upsertMarriage(input: MarriageInput): Promise<void> {
  const sql = getDb();
  try {
    const [a, b] = [input.memberId, input.spouseId].sort();
    await sql`
      INSERT INTO marriages (member_id, spouse_id, status, married_date, end_date)
      VALUES (${a}, ${b}, ${input.status}, ${input.marriedDate ?? null}, ${input.endDate ?? null})
      ON CONFLICT (member_id, spouse_id) DO UPDATE SET
        status = EXCLUDED.status,
        married_date = EXCLUDED.married_date,
        end_date = EXCLUDED.end_date
    `;
  } finally {
    await sql.end();
  }
}

export async function deleteMarriage(memberId: string, spouseId: string): Promise<void> {
  const sql = getDb();
  try {
    const [a, b] = [memberId, spouseId].sort();
    await sql`DELETE FROM marriages WHERE member_id = ${a} AND spouse_id = ${b}`;
  } finally {
    await sql.end();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function generateNextId(sql: ReturnType<typeof postgres>): Promise<string> {
  const rows = await sql<{ id: string }[]>`SELECT id FROM family_members`;
  const nums = rows
    .map(r => parseInt(r.id.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `m${String(next).padStart(3, '0')}`;
}

function transform(memberRows: MemberRow[], marriageRows: MarriageRow[]): FamilyData {
  const marriagesByMember = new Map<string, Marriage[]>();
  for (const row of marriageRows) {
    addMarriage(marriagesByMember, row.member_id, row.spouse_id, row);
    addMarriage(marriagesByMember, row.spouse_id, row.member_id, row);
  }
  const childrenByParent = new Map<string, string[]>();
  for (const row of memberRows) {
    for (const parentId of [row.father_id, row.mother_id]) {
      if (!parentId) continue;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId)!.push(row.id);
    }
  }
  const members: FamilyMember[] = memberRows.map(row =>
    rowToMember(row, marriagesByMember.get(row.id) ?? [], childrenByParent.get(row.id) ?? []),
  );
  return { members };
}

function rowToMember(row: MemberRow, marriages: Marriage[], childrenIds: string[]): FamilyMember {
  return {
    id: row.id, name: row.name, photo: row.photo ?? '', gender: row.gender as 'male' | 'female',
    birthDate: row.birth_date ?? undefined, deathDate: row.death_date ?? null,
    birthPlace: row.birth_place ?? undefined, fatherId: row.father_id ?? null,
    motherId: row.mother_id ?? null,
    spouseIds: marriages.map(m => m.spouseId),
    childrenIds,
    marriages,
    biography: row.biography ?? undefined, nickname: row.nickname ?? undefined,
    profession: row.profession ?? undefined, education: row.education ?? undefined,
    religion: row.religion ?? undefined, nationality: row.nationality ?? undefined,
    hobbies: row.hobbies ?? [], socialLinks: row.social_links ?? [],
    gallery: row.gallery ?? [],
  };
}

function addMarriage(
  byMember: Map<string, Marriage[]>,
  memberId: string, spouseId: string, row: MarriageRow,
) {
  if (!byMember.has(memberId)) byMember.set(memberId, []);
  byMember.get(memberId)!.push({
    spouseId, status: row.status as MarriageStatus,
    marriedDate: row.married_date ?? null, endDate: row.end_date ?? null,
  });
}
