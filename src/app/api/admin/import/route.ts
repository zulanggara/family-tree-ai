import { NextRequest, NextResponse } from 'next/server';
import { createMember, upsertMarriage } from '@/lib/db/familyRepository';
import * as XLSX from 'xlsx';

interface RawMember {
  id?: string;
  name?: string;
  photo?: string;
  gender?: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  father_id?: string;
  mother_id?: string;
  nickname?: string;
  profession?: string;
  education?: string;
  religion?: string;
  nationality?: string;
  biography?: string;
  hobbies?: string;
  // JSON source format
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  fatherId?: string;
  motherId?: string;
  marriages?: { spouseId: string; status: string; marriedDate?: string; endDate?: string }[];
  socialLinks?: { label: string; url: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const format = (formData.get('format') as string) ?? 'json';

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    let members: RawMember[] = [];

    if (format === 'json') {
      const text = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(text);
      members = Array.isArray(parsed) ? parsed : (parsed.members ?? []);
    } else if (format === 'csv') {
      const text = new TextDecoder().decode(bytes);
      members = parseCsv(text);
    } else if (format === 'excel') {
      const wb = XLSX.read(bytes, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      members = XLSX.utils.sheet_to_json<RawMember>(sheet);
    } else {
      return NextResponse.json({ error: `Format "${format}" tidak didukung untuk import` }, { status: 400 });
    }

    if (!members.length) {
      return NextResponse.json({ error: 'Tidak ada data yang ditemukan dalam file' }, { status: 400 });
    }

    let created = 0;
    let failed = 0;
    const errors: string[] = [];

    // Pass 1: insert members without parent refs
    for (const raw of members) {
      const id = String(raw.id ?? '').trim() || undefined;
      const name = String(raw.name ?? '').trim();
      if (!name) { failed++; continue; }

      const gender = normalizeGender(raw.gender);
      const hobbies = parseHobbies(raw.hobbies);

      try {
        await createMember({
          id,
          name,
          photo: raw.photo ?? '',
          gender,
          birthDate: raw.birthDate ?? raw.birth_date ?? null,
          deathDate: raw.deathDate ?? raw.death_date ?? null,
          birthPlace: raw.birthPlace ?? raw.birth_place ?? null,
          nickname: raw.nickname ?? null,
          profession: raw.profession ?? null,
          education: raw.education ?? null,
          religion: raw.religion ?? null,
          nationality: raw.nationality ?? null,
          biography: raw.biography ?? null,
          hobbies,
          socialLinks: Array.isArray(raw.socialLinks) ? raw.socialLinks : [],
        });
        created++;
      } catch (e) {
        failed++;
        errors.push(`${id ?? name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Pass 2: upsert marriages (JSON format only — CSV/Excel don't carry marriage data)
    let marriagesCreated = 0;
    for (const raw of members) {
      if (!Array.isArray(raw.marriages)) continue;
      const memberId = String(raw.id ?? '').trim();
      if (!memberId) continue;
      for (const mar of raw.marriages) {
        try {
          await upsertMarriage({
            memberId,
            spouseId: mar.spouseId,
            status: mar.status as any,
            marriedDate: mar.marriedDate ?? null,
            endDate: mar.endDate ?? null,
          });
          marriagesCreated++;
        } catch { /* skip */ }
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      failed,
      marriages: marriagesCreated,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeGender(g: unknown): 'male' | 'female' {
  const s = String(g ?? '').toLowerCase();
  return s === 'female' || s === 'perempuan' || s === 'p' ? 'female' : 'male';
}

function parseHobbies(h: unknown): string[] {
  if (!h) return [];
  if (Array.isArray(h)) return h.map(String);
  return String(h).split(/[;,]/).map(s => s.trim()).filter(Boolean);
}

function parseCsv(text: string): RawMember[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj as RawMember;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}
