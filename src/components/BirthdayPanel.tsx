'use client';

import { FamilyMember } from '@/types';
import { getAvatarUrl } from '@/lib/family';
import { usePhoto } from '@/contexts/PhotoContext';

interface BirthdayPanelProps {
  members: FamilyMember[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}

function daysUntilBirthday(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function BirthdayPanel({ members, onNavigate, onClose }: BirthdayPanelProps) {
  const { getPhoto } = usePhoto();
  const today = new Date();

  const alive = members.filter(m => !m.deathDate && m.birthDate);

  const upcoming = alive
    .map(m => ({ m, days: daysUntilBirthday(m.birthDate!) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 20);

  const todayBdays = upcoming.filter(x => x.days === 0);
  const soon = upcoming.filter(x => x.days > 0 && x.days <= 7);
  const thisMonth = upcoming.filter(x => x.days > 7 && x.days <= 30);

  function getAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const hasPassed = today >= new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    return hasPassed ? age : age - 1;
  }

  function formatBirthday(birthDate: string): string {
    const d = new Date(birthDate);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  }

  const Section = ({ title, items, accent }: {
    title: string;
    items: { m: FamilyMember; days: number }[];
    accent: string;
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: accent }}>
          {title}
        </p>
        <div className="space-y-2">
          {items.map(({ m, days }) => {
            const nextAge = getAge(m.birthDate!) + (days === 0 ? 0 : 1);
            return (
              <button
                key={m.id}
                onClick={() => { onNavigate(m.id); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                  style={{ border: `2px solid ${accent}` }}>
                  <img src={getPhoto(m.id, getAvatarUrl(m))} alt={m.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`;
                    }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{m.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                    {formatBirthday(m.birthDate!)} · {nextAge} tahun
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {days === 0 ? (
                    <span className="text-xs font-bold" style={{ color: accent }}>Hari ini!</span>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{days} hari</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

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
            <span style={{ fontSize: 18 }}>🎂</span>
            <div>
              <p className="text-[10px] text-[var(--text-subtle)]">Kalender</p>
              <h3 className="font-display text-sm font-semibold text-[var(--text)]">Ulang Tahun</h3>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--border)] transition-all">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {todayBdays.length === 0 && soon.length === 0 && thisMonth.length === 0 && (
            <p className="text-sm text-[var(--text-subtle)] text-center py-12">
              Tidak ada ulang tahun dalam 30 hari ke depan
            </p>
          )}
          <Section title="Hari Ini 🎉" items={todayBdays} accent="var(--gold)" />
          <Section title="7 Hari ke Depan" items={soon} accent="var(--accent)" />
          <Section title="Bulan Ini" items={thisMonth} accent="var(--blue)" />
        </div>
      </div>
    </div>
  );
}
