import { fetchFamilyData, getDescendantAndSpouseIds } from '@/lib/db/familyRepository';
import { getServerSession } from '@/lib/session';
import {
  BirthDeathChart, GenderChart, EducationChart, ProfessionChart,
  ChildrenDistChart, AgeAtDeathChart, GenerationChart, NameWordCloud,
  YearlyData, GenderData, DistItem, WordItem,
} from '@/components/admin/StatsCharts';

export const dynamic = 'force-dynamic';

function topN(map: Map<string, number>, n: number, normalize?: (k: string) => string): DistItem[] {
  const entries: DistItem[] = [];
  map.forEach((value, key) => entries.push({ name: normalize ? normalize(key) : key, value }));
  return entries.sort((a, b) => b.value - a.value).slice(0, n);
}

function countMap(values: (string | undefined | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

export default async function StatsPage() {
  const [{ members: allMembers }, session] = await Promise.all([
    fetchFamilyData(),
    getServerSession(),
  ]);

  let members = allMembers;
  if (session?.role === 'family_admin' && session.rootFamilyId) {
    const allowedIds = new Set(await getDescendantAndSpouseIds(session.rootFamilyId));
    members = allMembers.filter(m => allowedIds.has(m.id));
  }

  // ── Births & deaths per year ──────────────────────────────────────────────
  const yearlyMap = new Map<number, { lahir: number; wafat: number }>();
  for (const m of members) {
    if (m.birthDate) {
      const y = new Date(m.birthDate).getFullYear();
      const e = yearlyMap.get(y) ?? { lahir: 0, wafat: 0 };
      yearlyMap.set(y, { ...e, lahir: e.lahir + 1 });
    }
    if (m.deathDate) {
      const y = new Date(m.deathDate).getFullYear();
      const e = yearlyMap.get(y) ?? { lahir: 0, wafat: 0 };
      yearlyMap.set(y, { ...e, wafat: e.wafat + 1 });
    }
  }
  const yearlyData: YearlyData[] = Array.from(yearlyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, d]) => ({ year, ...d }));

  // ── Gender ────────────────────────────────────────────────────────────────
  const male = members.filter(m => m.gender === 'male').length;
  const female = members.filter(m => m.gender === 'female').length;
  const genderData: GenderData[] = [
    { name: 'Laki-laki', value: male },
    { name: 'Perempuan', value: female },
  ];

  // ── Education ─────────────────────────────────────────────────────────────
  const eduMap = countMap(members.map(m => m.education));
  const educationData = topN(eduMap, 12, k => k.length > 25 ? k.slice(0, 25) + '…' : k);

  // ── Profession ────────────────────────────────────────────────────────────
  const profMap = countMap(members.map(m => m.profession));
  const professionData = topN(profMap, 10, k => k.length > 28 ? k.slice(0, 28) + '…' : k);

  // ── Children count ────────────────────────────────────────────────────────
  const childrenCountMap = new Map<number, number>();
  for (const m of members) {
    const c = m.childrenIds.length;
    childrenCountMap.set(c, (childrenCountMap.get(c) ?? 0) + 1);
  }
  const maxChildren = Math.max(...childrenCountMap.keys(), 0);
  const childrenData: DistItem[] = Array.from({ length: maxChildren + 1 }, (_, i) => ({
    name: i === 0 ? '0 anak' : i === 1 ? '1 anak' : `${i} anak`,
    value: childrenCountMap.get(i) ?? 0,
  }));

  // ── Age at death ──────────────────────────────────────────────────────────
  const ageGroups: Record<string, number> = {
    '0–19': 0, '20–39': 0, '40–59': 0, '60–79': 0, '80–99': 0, '100+': 0,
  };
  for (const m of members) {
    if (!m.birthDate || !m.deathDate) continue;
    const age = new Date(m.deathDate).getFullYear() - new Date(m.birthDate).getFullYear();
    if (age < 20) ageGroups['0–19']++;
    else if (age < 40) ageGroups['20–39']++;
    else if (age < 60) ageGroups['40–59']++;
    else if (age < 80) ageGroups['60–79']++;
    else if (age < 100) ageGroups['80–99']++;
    else ageGroups['100+']++;
  }
  const ageData: DistItem[] = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

  // ── Generation depth (rough: count ancestors) ─────────────────────────────
  const memberMap = new Map(members.map(m => [m.id, m]));
  function depth(id: string, visited = new Set<string>()): number {
    if (visited.has(id)) return 0;
    visited.add(id);
    const m = memberMap.get(id);
    if (!m) return 0;
    const fd = m.fatherId ? depth(m.fatherId, visited) : -1;
    const md = m.motherId ? depth(m.motherId, visited) : -1;
    return Math.max(fd, md) + 1;
  }
  const genMap = new Map<number, number>();
  for (const m of members) {
    const d = depth(m.id);
    genMap.set(d, (genMap.get(d) ?? 0) + 1);
  }
  const generationData: DistItem[] = Array.from(genMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([gen, value]) => ({ name: `Gen ${gen + 1}`, value }));

  // ── Name word cloud ───────────────────────────────────────────────────────
  const STOP_WORDS = new Set(['bin', 'binti', 'bint', 'al', 'abu', 'umm', 'dan', 'dan', 'the', 'and']);
  const wordFreqMap = new Map<string, number>();
  for (const m of members) {
    const words = m.name.toLowerCase().split(/\s+/).map(w => w.trim()).filter(w => w.length > 1 && !STOP_WORDS.has(w));
    for (const w of words) {
      wordFreqMap.set(w, (wordFreqMap.get(w) ?? 0) + 1);
    }
  }
  const wordCloudData: WordItem[] = Array.from(wordFreqMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 80);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const alive = members.filter(m => !m.deathDate).length;
  const withBio = members.filter(m => m.biography).length;
  const withPhoto = members.filter(m => m.photo).length;
  const married = new Set(members.flatMap(m => m.spouseIds)).size > 0
    ? members.filter(m => m.spouseIds.length > 0).length : 0;

  const summaryStats = [
    { label: 'Total Anggota', value: members.length, color: 'var(--accent)' },
    { label: 'Masih Hidup', value: alive, color: '#22c55e' },
    { label: 'Sudah Wafat', value: members.length - alive, color: '#6b7280' },
    { label: 'Laki-laki', value: male, color: '#3b82f6' },
    { label: 'Perempuan', value: female, color: '#ec4899' },
    { label: 'Ada Biografi', value: withBio, color: '#f59e0b' },
    { label: 'Ada Foto', value: withPhoto, color: '#06b6d4' },
    { label: 'Pernah Menikah', value: married, color: '#8b5cf6' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">Statistik</h1>
        <p className="text-sm text-[var(--text-subtle)] mt-0.5">Analisis data keluarga secara visual</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {summaryStats.map(s => (
          <div key={s.label} className="rounded-xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[var(--text-subtle)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="space-y-6">
        {/* Row 1: full-width births/deaths */}
        {yearlyData.length > 0 && <BirthDeathChart data={yearlyData} />}

        {/* Row 2: gender + children */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GenderChart data={genderData} />
          <ChildrenDistChart data={childrenData} />
        </div>

        {/* Row 3: education + profession */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {educationData.length > 0 && <EducationChart data={educationData} />}
          {professionData.length > 0 && <ProfessionChart data={professionData} />}
        </div>

        {/* Row 4: age at death + generation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ageData.some(d => d.value > 0) && <AgeAtDeathChart data={ageData} />}
          {generationData.length > 0 && <GenerationChart data={generationData} />}
        </div>

        {/* Row 5: name word cloud */}
        {wordCloudData.length > 0 && <NameWordCloud data={wordCloudData} />}
      </div>
    </div>
  );
}
