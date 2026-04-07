import { NextRequest, NextResponse } from 'next/server';
import { fetchFamilyData, getDescendantAndSpouseIds } from '@/lib/db/familyRepository';
import { getRequestSession } from '@/lib/apiAuth';
import type { FamilyMember } from '@/types';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const format = new URL(req.url).searchParams.get('format') ?? 'json';

  try {
    const { members: allMembers } = await fetchFamilyData();
    const session = getRequestSession(req);

    let members = allMembers;
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowedIds = new Set(await getDescendantAndSpouseIds(session.rootFamilyId));
      members = allMembers.filter(m => allowedIds.has(m.id));
    }

    switch (format) {
      case 'json': {
        const json = JSON.stringify({ members }, null, 2);
        return new NextResponse(json, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="family-backup-${ts()}.json"`,
          },
        });
      }

      case 'csv': {
        const csv = toCsv(members);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="family-backup-${ts()}.csv"`,
          },
        });
      }

      case 'excel': {
        const wb = XLSX.utils.book_new();
        const membersSheet = XLSX.utils.json_to_sheet(members.map(flattenMember));
        XLSX.utils.book_append_sheet(wb, membersSheet, 'Members');

        // Marriages sheet
        const marriages = members.flatMap(m =>
          (m.marriages ?? []).map(mar => ({
            member_id: m.id,
            member_name: m.name,
            spouse_id: mar.spouseId,
            status: mar.status,
            married_date: mar.marriedDate ?? '',
            end_date: mar.endDate ?? '',
          })),
        );
        // deduplicate
        const seen = new Set<string>();
        const uniqueMarriages = marriages.filter(r => {
          const [a, b] = [r.member_id, r.spouse_id].sort();
          const key = `${a}:${b}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const marriageSheet = XLSX.utils.json_to_sheet(uniqueMarriages);
        XLSX.utils.book_append_sheet(wb, marriageSheet, 'Marriages');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return new NextResponse(buf, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="family-backup-${ts()}.xlsx"`,
          },
        });
      }

      case 'sql': {
        const sql = toSql(members);
        return new NextResponse(sql, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="family-backup-${ts()}.sql"`,
          },
        });
      }

      case 'mysql': {
        const sql = toSql(members, 'mysql');
        return new NextResponse(sql, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="family-backup-${ts()}.mysql.sql"`,
          },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown format: ${format}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ts() {
  return new Date().toISOString().slice(0, 10);
}

function flattenMember(m: FamilyMember) {
  return {
    id: m.id,
    name: m.name,
    photo: m.photo ?? '',
    gender: m.gender,
    birth_date: m.birthDate ?? '',
    death_date: m.deathDate ?? '',
    birth_place: m.birthPlace ?? '',
    father_id: m.fatherId ?? '',
    mother_id: m.motherId ?? '',
    nickname: m.nickname ?? '',
    profession: m.profession ?? '',
    education: m.education ?? '',
    religion: m.religion ?? '',
    nationality: m.nationality ?? '',
    biography: m.biography ?? '',
    hobbies: (m.hobbies ?? []).join('; '),
  };
}

function escape(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function toCsv(members: FamilyMember[]): string {
  const headers = [
    'id','name','photo','gender','birth_date','death_date','birth_place',
    'father_id','mother_id','nickname','profession','education','religion',
    'nationality','biography','hobbies',
  ];
  const rows = members.map(m => [
    m.id, m.name, m.photo ?? '', m.gender,
    m.birthDate ?? '', m.deathDate ?? '', m.birthPlace ?? '',
    m.fatherId ?? '', m.motherId ?? '',
    m.nickname ?? '', m.profession ?? '', m.education ?? '',
    m.religion ?? '', m.nationality ?? '', m.biography ?? '',
    (m.hobbies ?? []).join('; '),
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

function toSql(
  members: FamilyMember[],
  dialect: 'postgresql' | 'mysql' = 'postgresql',
): string {
  const lines: string[] = [
    `-- Family Tree Backup (${dialect.toUpperCase()})`,
    `-- Generated: ${new Date().toISOString()}`,
    '',
  ];

  // Schema
  if (dialect === 'postgresql') {
    lines.push(`CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, photo TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL, birth_date TEXT, death_date TEXT, birth_place TEXT,
  father_id TEXT, mother_id TEXT, biography TEXT, nickname TEXT,
  profession TEXT, education TEXT, religion TEXT, nationality TEXT,
  hobbies TEXT[] NOT NULL DEFAULT '{}', social_links JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
    lines.push(`CREATE TABLE IF NOT EXISTS marriages (
  id SERIAL PRIMARY KEY, member_id TEXT NOT NULL, spouse_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'married', married_date TEXT, end_date TEXT,
  CONSTRAINT uq_marriage UNIQUE (member_id, spouse_id)
);`);
  } else {
    lines.push(`CREATE TABLE IF NOT EXISTS family_members (
  id VARCHAR(50) PRIMARY KEY, name TEXT NOT NULL, photo TEXT NOT NULL DEFAULT '',
  gender VARCHAR(10) NOT NULL, birth_date VARCHAR(20), death_date VARCHAR(20),
  birth_place TEXT, father_id VARCHAR(50), mother_id VARCHAR(50),
  biography TEXT, nickname TEXT, profession TEXT, education TEXT,
  religion TEXT, nationality TEXT, hobbies TEXT, social_links JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`);
    lines.push(`CREATE TABLE IF NOT EXISTS marriages (
  id INT AUTO_INCREMENT PRIMARY KEY, member_id VARCHAR(50) NOT NULL,
  spouse_id VARCHAR(50) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'married',
  married_date VARCHAR(20), end_date VARCHAR(20),
  UNIQUE KEY uq_marriage (member_id, spouse_id)
);`);
  }

  lines.push('');

  // Pass 1: members without parent refs
  for (const m of members) {
    const hobbies = dialect === 'postgresql'
      ? `ARRAY[${(m.hobbies ?? []).map(h => escape(h)).join(', ')}]`
      : escape((m.hobbies ?? []).join('; '));
    const socialLinks = dialect === 'postgresql'
      ? escape(JSON.stringify(m.socialLinks ?? []))
      : escape(JSON.stringify(m.socialLinks ?? []));

    lines.push(
      `INSERT INTO family_members (id,name,photo,gender,birth_date,death_date,birth_place,biography,nickname,profession,education,religion,nationality,hobbies,social_links) VALUES (` +
      `${escape(m.id)},${escape(m.name)},${escape(m.photo ?? '')},${escape(m.gender)},` +
      `${escape(m.birthDate ?? null)},${escape(m.deathDate ?? null)},${escape(m.birthPlace ?? null)},` +
      `${escape(m.biography ?? null)},${escape(m.nickname ?? null)},${escape(m.profession ?? null)},` +
      `${escape(m.education ?? null)},${escape(m.religion ?? null)},${escape(m.nationality ?? null)},` +
      `${hobbies},${socialLinks});`,
    );
  }

  // Pass 2: update parent refs
  lines.push('');
  for (const m of members) {
    if (!m.fatherId && !m.motherId) continue;
    lines.push(
      `UPDATE family_members SET father_id=${escape(m.fatherId)},mother_id=${escape(m.motherId)} WHERE id=${escape(m.id)};`,
    );
  }

  // Marriages
  lines.push('');
  const seen = new Set<string>();
  for (const m of members) {
    for (const mar of m.marriages ?? []) {
      const [a, b] = [m.id, mar.spouseId].sort();
      const key = `${a}:${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(
        `INSERT INTO marriages (member_id,spouse_id,status,married_date,end_date) VALUES (` +
        `${escape(a)},${escape(b)},${escape(mar.status)},${escape(mar.marriedDate ?? null)},${escape(mar.endDate ?? null)});`,
      );
    }
  }

  return lines.join('\n');
}
