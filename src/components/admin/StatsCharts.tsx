'use client';

import { useRef, useCallback, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { toPng } from 'html-to-image';

// ─── Shared palette ───────────────────────────────────────────────────────────
const COLORS = ['#6c63ff', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];

// ─── Download button ──────────────────────────────────────────────────────────
function DownloadButton({ containerRef, title }: {
  containerRef: React.RefObject<HTMLDivElement>;
  title: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { borderRadius: '12px' },
      });
      const a = document.createElement('a');
      a.download = `${title.replace(/[^a-z0-9\s]/gi, '').trim().replace(/\s+/g, '_').toLowerCase()}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      // silent fail
    } finally {
      setDownloading(false);
    }
  }, [containerRef, title, downloading]);

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      title="Unduh sebagai PNG"
      className="ml-2 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70 disabled:opacity-40"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
    >
      {downloading ? (
        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
      ) : (
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      )}
    </button>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="rounded-xl p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--text)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-subtle)] mt-0.5">{subtitle}</p>}
        </div>
        <DownloadButton containerRef={ref} title={title} />
      </div>
      {children}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      {label && <p className="font-semibold text-[var(--text)] mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Births & Deaths per year (LineChart, 2 lines) ────────────────────────────
export interface YearlyData {
  year: number;
  lahir: number;
  wafat: number;
}

export function BirthDeathChart({ data }: { data: YearlyData[] }) {
  return (
    <ChartCard title="Kelahiran & Kematian per Tahun" subtitle="Berdasarkan tahun lahir dan wafat">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="year" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
          <Line
            type="monotone" dataKey="lahir" name="Lahir"
            stroke="#22c55e" strokeWidth={2.5}
            dot={{ fill: '#22c55e', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone" dataKey="wafat" name="Wafat"
            stroke="#f97316" strokeWidth={2.5}
            dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Gender distribution ──────────────────────────────────────────────────────
export interface GenderData {
  name: string;
  value: number;
}

export function GenderChart({ data }: { data: GenderData[] }) {
  const GENDER_COLORS = ['#3b82f6', '#ec4899'];
  return (
    <ChartCard title="Distribusi Jenis Kelamin">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
            label={({ name, value, percent }) => `${name ?? ''}: ${value ?? 0} (${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%)`}
            labelLine={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Education distribution ───────────────────────────────────────────────────
export interface DistItem {
  name: string;
  value: number;
}

export function EducationChart({ data }: { data: DistItem[] }) {
  return (
    <ChartCard title="Distribusi Pendidikan Terakhir" subtitle={`${data.reduce((s, d) => s + d.value, 0)} anggota dengan data pendidikan`}>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={130} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--text-subtle)' }}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Profession distribution ──────────────────────────────────────────────────
export function ProfessionChart({ data }: { data: DistItem[] }) {
  return (
    <ChartCard title="Distribusi Profesi (Top 10)" subtitle={`${data.reduce((s, d) => s + d.value, 0)} anggota dengan data profesi`}>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={140} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Jumlah" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--text-subtle)' }}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Children count distribution ─────────────────────────────────────────────
export function ChildrenDistChart({ data }: { data: DistItem[] }) {
  return (
    <ChartCard title="Distribusi Jumlah Anak" subtitle="Seberapa banyak anak per anggota">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Anggota" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: 'var(--text-subtle)' }}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Age at death distribution ────────────────────────────────────────────────
export function AgeAtDeathChart({ data }: { data: DistItem[] }) {
  return (
    <ChartCard title="Distribusi Usia Wafat" subtitle="Kelompok usia saat meninggal">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Jumlah" fill="#8b5cf6" radius={[4, 4, 0, 0]}
            label={{ position: 'top', fontSize: 11, fill: 'var(--text-subtle)' }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Generation distribution ──────────────────────────────────────────────────
export function GenerationChart({ data }: { data: DistItem[] }) {
  return (
    <ChartCard title="Distribusi Generasi" subtitle="Berdasarkan depth dari root anggota">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="value" name="Anggota" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Name word cloud ──────────────────────────────────────────────────────────
export interface WordItem {
  word: string;
  count: number;
}

export function NameWordCloud({ data }: { data: WordItem[] }) {
  if (data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count));
  const minCount = Math.min(...data.map(d => d.count));
  const range = maxCount - minCount || 1;

  function fontSize(count: number) {
    // scale from 11px to 36px
    return Math.round(11 + ((count - minCount) / range) * 25);
  }

  function opacity(count: number) {
    return 0.45 + ((count - minCount) / range) * 0.55;
  }

  return (
    <ChartCard
      title="Word Cloud Nama"
      subtitle={`${data.length} kata unik dari seluruh nama anggota`}
    >
      <div
        className="flex flex-wrap gap-x-3 gap-y-2 justify-center items-center py-4"
        style={{ minHeight: 160 }}
      >
        {data.map((item, i) => (
          <span
            key={item.word}
            title={`${item.word}: ${item.count}×`}
            style={{
              fontSize: fontSize(item.count),
              color: COLORS[i % COLORS.length],
              opacity: opacity(item.count),
              fontWeight: item.count > (maxCount * 0.6) ? 700 : item.count > (maxCount * 0.3) ? 600 : 400,
              lineHeight: 1.2,
              cursor: 'default',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = String(opacity(item.count)))}
          >
            {item.word}
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
