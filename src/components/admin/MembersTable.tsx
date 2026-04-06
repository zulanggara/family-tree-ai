'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FamilyMember } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

interface DescendantInfo {
  id: string;
  name: string;
  generation: number;
}

const PAGE_SIZE = 20;

export function MembersTable({ members }: { members: FamilyMember[] }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Confirm dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string; name: string; descendants: DescendantInfo[]; loaded: boolean;
  } | null>(null);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.id.toLowerCase().includes(query.toLowerCase()) ||
    (m.profession ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleDeleteClick(id: string, name: string) {
    // Fetch descendants first
    setPendingDelete({ id, name, descendants: [], loaded: false });
    setDialogOpen(true);

    try {
      const res = await fetch(`/api/admin/members/${id}/descendants`);
      const data = await res.json();
      setPendingDelete(prev => prev ? { ...prev, descendants: data.descendants ?? [], loaded: true } : null);
    } catch {
      setPendingDelete(prev => prev ? { ...prev, loaded: true } : null);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDialogOpen(false);
    setDeleting(pendingDelete.id);
    try {
      const res = await fetch(`/api/admin/members/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? 'Gagal menghapus anggota');
      } else {
        const d = await res.json();
        const count = d.deleted ?? 1;
        toast.success(`${count} anggota berhasil dihapus`);
        router.refresh();
      }
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  }

  function buildDialogMessage() {
    if (!pendingDelete) return null;
    if (!pendingDelete.loaded) {
      return <p>Memeriksa keturunan dari <strong>{pendingDelete.name}</strong>…</p>;
    }
    if (pendingDelete.descendants.length === 0) {
      return (
        <p>
          Yakin ingin menghapus <strong className="text-[var(--text)]">{pendingDelete.name}</strong>?
          {' '}Tindakan ini tidak dapat dibatalkan.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        <p>
          <strong className="text-[var(--text)]">{pendingDelete.name}</strong> memiliki{' '}
          <strong className="text-red-400">{pendingDelete.descendants.length} keturunan</strong>.
          Menghapus anggota ini akan menghapus seluruh keturunannya juga.
        </p>
        <div className="rounded-lg p-3 max-h-40 overflow-y-auto text-xs space-y-1"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {pendingDelete.descendants.slice(0, 30).map(d => (
            <div key={d.id} className="flex items-center gap-2 text-red-400">
              <span style={{ paddingLeft: (d.generation - 1) * 12 }}>└─</span>
              <span>{d.name}</span>
              <span className="opacity-50 font-mono">({d.id})</span>
            </div>
          ))}
          {pendingDelete.descendants.length > 30 && (
            <p className="text-[var(--text-subtle)] pt-1">
              … dan {pendingDelete.descendants.length - 30} lainnya
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--text-subtle)]">Tindakan ini tidak dapat dibatalkan.</p>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={dialogOpen}
        title={
          pendingDelete?.loaded && pendingDelete.descendants.length > 0
            ? 'Hapus anggota beserta keturunan?'
            : 'Hapus anggota?'
        }
        message={buildDialogMessage()}
        confirmLabel="Ya, hapus semua"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDialogOpen(false); setPendingDelete(null); }}
      />

      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <input
            type="text"
            placeholder="Cari nama, ID, atau profesi…"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['ID', 'Nama', 'Gender', 'Lahir', 'Profesi', 'Status', 'Aksi'].map(h => (
                  <th key={h}
                    className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginated.map(m => (
                <tr key={m.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3 text-xs text-[var(--text-subtle)] font-mono">{m.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-[var(--text)]">{m.name}</p>
                      {m.nickname && (
                        <p className="text-xs text-[var(--text-subtle)]">"{m.nickname}"</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.gender === 'male'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                    }`}>
                      {m.gender === 'male' ? 'L' : 'P'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {m.birthDate ? new Date(m.birthDate).getFullYear() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {m.profession ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {m.deathDate ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        Wafat
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                        Hidup
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/members/${m.id}/edit`}
                        className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(m.id, m.name)}
                        disabled={deleting === m.id}
                        className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-40
                                   bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        {deleting === m.id ? '…' : 'Hapus'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--text-subtle)]">
                    Tidak ada anggota yang cocok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between gap-4"
            style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-[var(--text-subtle)]">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length} anggota
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="px-2 py-1 rounded text-xs transition-all disabled:opacity-30 hover:opacity-70"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 rounded text-xs transition-all disabled:opacity-30 hover:opacity-70"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-[var(--text-subtle)]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className="min-w-[28px] px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                      style={safePage === p
                        ? { background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)' }
                        : { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                    >{p}</button>
                  )
                )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 rounded text-xs transition-all disabled:opacity-30 hover:opacity-70"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >›</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="px-2 py-1 rounded text-xs transition-all disabled:opacity-30 hover:opacity-70"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >»</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
