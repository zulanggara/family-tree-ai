'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuditLog, AuditAction, AuditEntityType } from '@/lib/db/auditRepository';

interface LogsResult {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

const ACTION_STYLES: Record<AuditAction, { label: string; bg: string; color: string; border: string }> = {
  CREATE: { label: 'Tambah',  bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.4)' },
  UPDATE: { label: 'Ubah',    bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.4)' },
  DELETE: { label: 'Hapus',   bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.4)' },
  LOGIN:  { label: 'Login',   bg: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'rgba(168,85,247,0.4)' },
  LOGOUT: { label: 'Logout',  bg: 'rgba(107,114,128,0.12)',color: '#9ca3af', border: 'rgba(107,114,128,0.4)' },
  IMPORT: { label: 'Import',  bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  member:  'Anggota',
  marriage:'Pernikahan',
  admin:   'Admin',
  session: 'Sesi',
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

const IGNORED_KEYS = new Set(['childrenIds', 'spouseIds', 'marriages', 'id']);

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama', nickname: 'Nama Panggilan', gender: 'Jenis Kelamin',
  birthDate: 'Tanggal Lahir', birthPlace: 'Tempat Lahir', deathDate: 'Tanggal Wafat',
  photo: 'Foto', biography: 'Biografi', profession: 'Profesi',
  education: 'Pendidikan', religion: 'Agama', nationality: 'Kewarganegaraan',
  hobbies: 'Hobi', socialLinks: 'Media Sosial', gallery: 'Galeri',
  fatherId: 'ID Ayah', motherId: 'ID Ibu',
  // marriage / admin fields
  memberId: 'Anggota', spouseId: 'Pasangan', status: 'Status',
  marriedDate: 'Tgl Nikah', endDate: 'Tgl Cerai',
  username: 'Username', role: 'Role', rootFamilyId: 'Root Keluarga',
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) {
    if (v.length === 0) return '';
    // array of objects (e.g. socialLinks)
    if (typeof v[0] === 'object') return v.map(item => JSON.stringify(item)).join(' · ');
    return v.join(', ');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function collectRows(obj: Record<string, unknown>): { key: string; label: string; value: string }[] {
  return Object.entries(obj)
    .filter(([k]) => !IGNORED_KEYS.has(k))
    .map(([k, v]) => ({ key: k, label: fieldLabel(k), value: displayValue(v) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'));
}

const EMPTY_CELL = <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>kosong</span>;

function DiffTable({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .filter(k => !IGNORED_KEYS.has(k))
    .sort((a, b) => fieldLabel(a).localeCompare(fieldLabel(b), 'id'));

  if (allKeys.length === 0) return (
    <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Tidak ada perubahan yang tercatat.</p>
  );

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="grid text-[11px] font-semibold uppercase tracking-wider"
        style={{
          gridTemplateColumns: '1fr 1fr 1fr',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>Field</div>
        <div className="px-3 py-2" style={{ color: '#ef4444', borderLeft: '1px solid var(--border)', background: 'rgba(239,68,68,0.06)' }}>
          ← Sebelum
        </div>
        <div className="px-3 py-2" style={{ color: '#22c55e', borderLeft: '1px solid var(--border)', background: 'rgba(34,197,94,0.06)' }}>
          Sesudah →
        </div>
      </div>

      {/* Rows */}
      {allKeys.map((k, i) => {
        const bVal = displayValue(before[k]);
        const aVal = displayValue(after[k]);
        const isLast = i === allKeys.length - 1;
        return (
          <div
            key={k}
            className="grid text-xs"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr',
              borderBottom: isLast ? 'none' : '1px solid var(--border)',
            }}
          >
            <div className="px-3 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>
              {fieldLabel(k)}
            </div>
            <div className="px-3 py-2 font-mono break-all"
              style={{ color: '#ef4444', borderLeft: '1px solid var(--border)', background: 'rgba(239,68,68,0.04)' }}>
              {bVal || EMPTY_CELL}
            </div>
            <div className="px-3 py-2 font-mono break-all"
              style={{ color: '#22c55e', borderLeft: '1px solid var(--border)', background: 'rgba(34,197,94,0.04)' }}>
              {aVal || EMPTY_CELL}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SingleSnapshot({ label, data, accentColor, headerBg }: {
  label: string; data: Record<string, unknown>; accentColor: string; headerBg: string;
}) {
  const rows = collectRows(data);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
        style={{ background: headerBg, color: accentColor, borderBottom: '1px solid var(--border)' }}>
        {label}
      </div>
      {/* Rows */}
      {rows.map((r, i) => (
        <div
          key={r.key}
          className="grid text-xs"
          style={{
            gridTemplateColumns: '1fr 2fr',
            borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)',
          }}
        >
          <div className="px-3 py-2 font-medium" style={{ color: 'var(--text-muted)' }}>{r.label}</div>
          <div className="px-3 py-2 font-mono break-all"
            style={{ color: accentColor, borderLeft: '1px solid var(--border)' }}>
            {r.value || EMPTY_CELL}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ details }: { details: Record<string, unknown> }) {
  const { before, after, cascadeDeleted, ...rest } = details as {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    cascadeDeleted?: number;
    [k: string]: unknown;
  };

  return (
    <div
      className="px-4 py-3 overflow-x-auto"
      style={{ background: 'var(--bg)', borderTop: '1px dashed var(--border)' }}
    >
      {before && after ? (
        <DiffTable before={before} after={after} />
      ) : after ? (
        <SingleSnapshot label="Data Ditambahkan" data={after} accentColor="#22c55e" headerBg="rgba(34,197,94,0.08)" />
      ) : before ? (
        <SingleSnapshot label="Data Dihapus" data={before} accentColor="#ef4444" headerBg="rgba(239,68,68,0.08)" />
      ) : null}

      {cascadeDeleted !== undefined && (
        <div className="mt-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
          Total dihapus termasuk keturunan: <strong>{cascadeDeleted}</strong> anggota
        </div>
      )}

      {Object.keys(rest).length > 0 && (
        <details className="mt-2">
          <summary className="text-[10px] uppercase tracking-wider cursor-pointer select-none text-xs"
            style={{ color: 'var(--text-subtle)' }}>
            Info lainnya
          </summary>
          <SingleSnapshot label="" data={rest as Record<string, unknown>} accentColor="var(--text-muted)" headerBg="transparent" />
        </details>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const [result, setResult] = useState<LogsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async (p: number, action: string, entity: string, admin: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (action) params.set('action', action);
      if (entity) params.set('entityType', entity);
      if (admin)  params.set('admin', admin);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Gagal memuat logs');
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error tidak diketahui');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when page changes
  useEffect(() => {
    fetchLogs(page, filterAction, filterEntity, filterAdmin);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Debounced re-fetch when filters change (reset to page 1)
  const handleFilterChange = (action: string, entity: string, admin: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1, action, entity, admin);
    }, 350);
  };

  const onActionChange = (v: string) => { setFilterAction(v); handleFilterChange(v, filterEntity, filterAdmin); };
  const onEntityChange = (v: string) => { setFilterEntity(v); handleFilterChange(filterAction, v, filterAdmin); };
  const onAdminChange  = (v: string) => { setFilterAdmin(v);  handleFilterChange(filterAction, filterEntity, v); };

  const totalLabel = result
    ? `${result.total.toLocaleString('id-ID')} entri`
    : '';

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)] font-display">Audit Logs</h1>
        <p className="text-sm text-[var(--text-subtle)] mt-1">
          Riwayat semua perubahan data oleh admin · {totalLabel}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 p-4 rounded-xl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {/* Action filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Aksi</label>
          <select
            value={filterAction}
            onChange={e => onActionChange(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 min-w-[120px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Semua</option>
            {(Object.keys(ACTION_STYLES) as AuditAction[]).map(a => (
              <option key={a} value={a}>{ACTION_STYLES[a].label}</option>
            ))}
          </select>
        </div>

        {/* Entity filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Tipe Data</label>
          <select
            value={filterEntity}
            onChange={e => onEntityChange(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 min-w-[130px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Semua</option>
            {(Object.keys(ENTITY_LABELS) as AuditEntityType[]).map(e => (
              <option key={e} value={e}>{ENTITY_LABELS[e]}</option>
            ))}
          </select>
        </div>

        {/* Admin filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Admin</label>
          <input
            type="text"
            placeholder="Cari username…"
            value={filterAdmin}
            onChange={e => onAdminChange(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 min-w-[160px]"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Reset */}
        {(filterAction || filterEntity || filterAdmin) && (
          <div className="flex flex-col justify-end">
            <button
              onClick={() => { setFilterAction(''); setFilterEntity(''); setFilterAdmin(''); handleFilterChange('', '', ''); }}
              className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {/* Table header */}
        <div className="grid gap-0 text-[10px] uppercase tracking-wider text-[var(--text-subtle)] px-4 py-2.5"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--border)',
            gridTemplateColumns: '48px 1fr 90px 110px 1fr 100px 40px',
          }}>
          <span>#</span>
          <span>Waktu</span>
          <span>Aksi</span>
          <span>Tipe</span>
          <span>Data / Admin</span>
          <span>IP Address</span>
          <span></span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-[var(--text-subtle)]">
            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Memuat logs…
          </div>
        )}

        {error && (
          <div className="px-4 py-8 text-center text-sm text-red-400">{error}</div>
        )}

        {!loading && !error && result?.logs.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-[var(--text-subtle)]">
            Tidak ada log yang ditemukan
          </div>
        )}

        {!loading && !error && result && result.logs.map((log, i) => {
          const style = ACTION_STYLES[log.action] ?? ACTION_STYLES.CREATE;
          const isExpanded = expandedId === log.id;
          const rowBg = i % 2 === 0 ? 'var(--bg)' : 'var(--card)';
          const rowNo = (result.page - 1) * 50 + i + 1;

          return (
            <div key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Main row */}
              <div
                className="grid items-center gap-0 px-4 py-3 text-sm"
                style={{
                  background: rowBg,
                  gridTemplateColumns: '48px 1fr 90px 110px 1fr 100px 40px',
                }}
              >
                {/* Row number */}
                <span className="text-[10px] text-[var(--text-subtle)] tabular-nums">{rowNo}</span>

                {/* Timestamp */}
                <span className="text-xs text-[var(--text-muted)]">{formatDateTime(log.createdAt)}</span>

                {/* Action badge */}
                <span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
                  >
                    {style.label}
                  </span>
                </span>

                {/* Entity type */}
                <span className="text-xs text-[var(--text-muted)]">
                  {ENTITY_LABELS[log.entityType] ?? log.entityType}
                </span>

                {/* Entity name + admin */}
                <div className="min-w-0">
                  {log.entityName && (
                    <p className="text-sm font-medium text-[var(--text)] truncate">{log.entityName}</p>
                  )}
                  {log.entityId && (
                    <p className="text-[10px] font-mono text-[var(--text-subtle)] truncate">{log.entityId}</p>
                  )}
                  <p className="text-[10px] text-[var(--accent)] mt-0.5">
                    {log.adminUsername}
                    <span className="text-[var(--text-subtle)] ml-1">
                      ({log.adminRole === 'super_admin' ? 'Super Admin' : 'Family Admin'})
                    </span>
                  </p>
                </div>

                {/* IP */}
                <span className="text-[10px] font-mono text-[var(--text-subtle)] truncate">
                  {log.ipAddress ?? '—'}
                </span>

                {/* Expand button (only if details exist) */}
                <div className="flex justify-end">
                  {log.details && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="w-6 h-6 rounded flex items-center justify-center transition-all hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                      title="Lihat detail"
                    >
                      <svg
                        width="12" height="12" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={2}
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && log.details && (
                <DetailPanel details={log.details} />
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {result && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-[var(--text-subtle)]">
            {result.total > 0
              ? `No. ${(result.page - 1) * 50 + 1}–${Math.min(result.page * 50, result.total)} · ${result.total.toLocaleString('id-ID')} total entri`
              : '0 entri'}
          </span>
          {result.pages > 1 && (
            <div className="flex items-center gap-2">
              {/* First */}
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >«</button>
              {/* Prev */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >Sebelumnya</button>

              {/* Page numbers (show up to 5 around current) */}
              {Array.from({ length: Math.min(5, result.pages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, result.pages - 4));
                const p = start + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="text-xs w-8 h-8 rounded-lg transition-all font-medium"
                    style={{
                      background: p === page ? 'var(--accent-dim)' : 'var(--card)',
                      border: `1px solid ${p === page ? 'var(--accent)' : 'var(--border)'}`,
                      color: p === page ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >{p}</button>
                );
              })}

              {/* Next */}
              <button
                onClick={() => setPage(p => Math.min(result.pages, p + 1))}
                disabled={page === result.pages}
                className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >Berikutnya</button>
              {/* Last */}
              <button
                onClick={() => setPage(result.pages)}
                disabled={page === result.pages}
                className="text-xs px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >»</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
