'use client';

export const dynamic = 'force-dynamic';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { FamilyMember } from '@/types';
import { useToast } from '@/components/admin/Toast';

export default function NewAdminPage() {
  const router = useRouter();
  const toast = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'family_admin'>('family_admin');
  const [rootFamilyId, setRootFamilyId] = useState('');

  useEffect(() => {
    fetch('/api/admin/members').then(r => r.json()).then(setMembers).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username, password, role,
          rootFamilyId: role === 'family_admin' ? (rootFamilyId || null) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat admin');
      toast.success(`Akun admin "${username}" berhasil dibuat`);
      router.push('/admin/admins');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none transition-all';
  const inputStyle = { background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' };

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/admins"
          className="text-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text)]">
          ← Kembali
        </Link>
        <span style={{ color: 'var(--border)' }}>|</span>
        <h1 className="font-display text-2xl font-bold text-[var(--text)]">Tambah Admin</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl p-5 space-y-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

          <div>
            <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5 uppercase tracking-wider">
              Username <span className="text-red-400">*</span>
            </label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className={inputCls} style={inputStyle} required autoComplete="off" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5 uppercase tracking-wider">
              Password <span className="text-red-400">*</span>
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className={inputCls} style={inputStyle} required autoComplete="new-password"
              placeholder="Min. 8 karakter" minLength={6} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5 uppercase tracking-wider">
              Role <span className="text-red-400">*</span>
            </label>
            <select value={role} onChange={e => setRole(e.target.value as typeof role)}
              className={inputCls} style={inputStyle}>
              <option value="family_admin">Family Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <p className="text-[10px] text-[var(--text-subtle)] mt-1">
              {role === 'super_admin'
                ? 'Super Admin dapat mengelola semua data dan akun admin'
                : 'Family Admin hanya dapat mengelola anggota keluarga tertentu'}
            </p>
          </div>

          {role === 'family_admin' && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-subtle)] mb-1.5 uppercase tracking-wider">
                Root Family (Anggota Awal)
              </label>
              <select value={rootFamilyId} onChange={e => setRootFamilyId(e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">— Pilih anggota sebagai root —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--text-subtle)] mt-1">
                Admin ini hanya dapat mengelola anggota dari keluarga yang dipilih
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
            {saving ? 'Menyimpan…' : 'Buat Admin'}
          </button>
          <button type="button" onClick={() => router.push('/admin/admins')}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            Batal
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
