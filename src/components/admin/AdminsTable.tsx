'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUser } from '@/lib/db/adminRepository';
import { FamilyMember } from '@/types';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';

interface Props {
  admins: AdminUser[];
  members: FamilyMember[];
}

const PAGE_SIZE = 10;

export function AdminsTable({ admins, members }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(admins.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = admins.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const confirmAdmin = admins.find(a => a.id === confirmId);

  async function handleDelete() {
    if (!confirmId) return;
    setConfirmId(null);
    setDeleting(confirmId);
    try {
      const res = await fetch(`/api/admin/admins/${confirmId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Akun admin dihapus');
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? 'Gagal menghapus admin');
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={confirmId !== null}
        title="Hapus akun admin?"
        message={
          <p>
            Yakin ingin menghapus akun <strong className="text-[var(--text)]">{confirmAdmin?.username}</strong>?
            {' '}Tindakan ini tidak dapat dibatalkan.
          </p>
        }
        confirmLabel="Ya, hapus"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />

      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['ID', 'Username', 'Role', 'Root Family', 'Dibuat', 'Aksi'].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginated.map(a => {
                const rootMember = a.rootFamilyId ? members.find(m => m.id === a.rootFamilyId) : null;
                return (
                  <tr key={a.id} className="hover:bg-[var(--bg)] transition-colors">
                    <td className="px-4 py-3 text-xs text-[var(--text-subtle)] font-mono">{a.id}</td>
                    <td className="px-4 py-3 font-medium text-[var(--text)]">{a.username}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.role === 'super_admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'
                      }`}>
                        {a.role === 'super_admin' ? 'Super Admin' : 'Family Admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {rootMember ? (
                        <span>{rootMember.name} <span className="opacity-50 font-mono">({a.rootFamilyId})</span></span>
                      ) : a.rootFamilyId ? (
                        <span className="font-mono text-red-400">{a.rootFamilyId} (tidak ditemukan)</span>
                      ) : (
                        <span className="opacity-50">— semua</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {new Date(a.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmId(a.id)}
                        disabled={deleting === a.id}
                        className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-40
                                   bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        {deleting === a.id ? '…' : 'Hapus'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-subtle)]">
                    Belum ada akun admin
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
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, admins.length)} dari {admins.length} admin
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
