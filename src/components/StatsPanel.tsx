'use client';

import { FamilyMember } from '@/types';
import { getSpouseIds } from '@/lib/family';

interface StatsPanelProps {
  members: FamilyMember[];
  onClose: () => void;
}

function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-[var(--text)]">{value}</span>
        {sub && <p className="text-[10px] text-[var(--text-subtle)]">{sub}</p>}
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text-muted)] truncate max-w-[70%]">{label}</span>
        <span className="text-[var(--text-subtle)]">{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function StatsPanel({ members, onClose }: StatsPanelProps) {
  const alive = members.filter(m => !m.deathDate);
  const deceased = members.filter(m => m.deathDate);
  const male = members.filter(m => m.gender === 'male');
  const female = members.filter(m => m.gender === 'female');

  // Average lifespan for deceased
  const lifespans = deceased
    .filter(m => m.birthDate && m.deathDate)
    .map(m => new Date(m.deathDate!).getFullYear() - new Date(m.birthDate!).getFullYear());
  const avgLifespan = lifespans.length > 0
    ? Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length)
    : null;

  // Oldest alive
  const oldestAlive = alive
    .filter(m => m.birthDate)
    .sort((a, b) => new Date(a.birthDate!).getTime() - new Date(b.birthDate!).getTime())[0];

  // Youngest member
  const youngest = members
    .filter(m => m.birthDate)
    .sort((a, b) => new Date(b.birthDate!).getTime() - new Date(a.birthDate!).getTime())[0];

  // Current age of oldest alive
  function currentAge(birthDate: string) {
    const today = new Date();
    const birth = new Date(birthDate);
    return today.getFullYear() - birth.getFullYear();
  }

  // Birthplace distribution (city level)
  const cityCount: Record<string, number> = {};
  for (const m of members) {
    if (m.birthPlace) {
      const city = m.birthPlace.split(',')[0].trim();
      cityCount[city] = (cityCount[city] ?? 0) + 1;
    }
  }
  const topCities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCity = topCities[0]?.[1] ?? 1;

  // Marriage stats
  const married = members.filter(m =>
    m.marriages?.some(mar => mar.status === 'married')
  );
  const divorced = members.filter(m =>
    m.marriages?.some(mar => mar.status === 'divorced')
  );
  const widowed = members.filter(m =>
    m.marriages?.some(mar => mar.status === 'widowed') &&
    !m.marriages?.some(mar => mar.status === 'married')
  );

  // Average children per parent
  const parents = members.filter(m => m.childrenIds.length > 0);
  const avgChildren = parents.length > 0
    ? (parents.reduce((s, m) => s + m.childrenIds.length, 0) / parents.length).toFixed(1)
    : '0';

  // Most children
  const mostChildren = [...members].sort((a, b) => b.childrenIds.length - a.childrenIds.length)[0];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-xs overflow-y-auto"
        style={{
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          animation: 'slideInRight 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>📊</span>
            <div>
              <p className="text-[10px] text-[var(--text-subtle)]">Ringkasan</p>
              <h3 className="font-display text-sm font-semibold text-[var(--text)]">Statistik Keluarga</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] transition-all">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Overview */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-subtle)] mb-3 font-semibold">
              Umum
            </p>
            <StatRow label="Total Anggota" value={members.length} />
            <StatRow label="Masih Hidup" value={alive.length}
              sub={`${Math.round(alive.length / members.length * 100)}% dari total`} />
            <StatRow label="Telah Wafat" value={deceased.length} />
            {avgLifespan && <StatRow label="Rata-rata Usia Wafat" value={`${avgLifespan} tahun`} />}
            {oldestAlive?.birthDate && (
              <StatRow label="Anggota Tertua (Hidup)"
                value={oldestAlive.name.split(' ')[0]}
                sub={`${currentAge(oldestAlive.birthDate)} tahun`} />
            )}
            {youngest?.birthDate && (
              <StatRow label="Anggota Termuda"
                value={youngest.name.split(' ')[0]}
                sub={new Date(youngest.birthDate).getFullYear().toString()} />
            )}
          </div>

          {/* Gender */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-subtle)] mb-3 font-semibold">
              Jenis Kelamin
            </p>
            <Bar label="Laki-laki" value={male.length} max={members.length} color="var(--blue)" />
            <Bar label="Perempuan" value={female.length} max={members.length} color="#ec4899" />
          </div>

          {/* Marriage */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-subtle)] mb-3 font-semibold">
              Pernikahan
            </p>
            <StatRow label="Menikah" value={married.length} />
            <StatRow label="Duda / Janda" value={widowed.length} />
            <StatRow label="Bercerai" value={divorced.length} />
            <StatRow label="Rata-rata Anak per Orang Tua" value={avgChildren} />
            {mostChildren && mostChildren.childrenIds.length > 0 && (
              <StatRow
                label="Terbanyak Anak"
                value={mostChildren.name.split(' ')[0]}
                sub={`${mostChildren.childrenIds.length} anak`}
              />
            )}
          </div>

          {/* Birthplace */}
          {topCities.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-subtle)] mb-3 font-semibold">
                Kota Kelahiran Terbanyak
              </p>
              {topCities.map(([city, count]) => (
                <Bar key={city} label={city} value={count} max={maxCity} color="var(--accent)" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
