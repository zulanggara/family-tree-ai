import { fetchFamilyData, getDescendantAndSpouseIds } from '@/lib/db/familyRepository';
import { getServerSession } from '@/lib/session';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [{ members: allMembers }, session] = await Promise.all([
    fetchFamilyData(),
    getServerSession(),
  ]);

  let members = allMembers;
  if (session?.role === 'family_admin' && session.rootFamilyId) {
    const allowedIds = new Set(await getDescendantAndSpouseIds(session.rootFamilyId));
    members = allMembers.filter(m => allowedIds.has(m.id));
  }

  const alive = members.filter(m => !m.deathDate).length;
  const male = members.filter(m => m.gender === 'male').length;
  const female = members.filter(m => m.gender === 'female').length;
  const withProfession = members.filter(m => m.profession).length;

  const stats = [
    { label: 'Total Anggota', value: members.length, color: 'var(--accent)' },
    { label: 'Masih Hidup', value: alive, color: '#22c55e' },
    { label: 'Laki-laki', value: male, color: '#3b82f6' },
    { label: 'Perempuan', value: female, color: '#ec4899' },
    { label: 'Ada Data Profesi', value: withProfession, color: '#f59e0b' },
  ];

  // Latest 5 members by id (highest number = newest)
  const recent = [...members]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 5);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-subtle)] mt-0.5">Overview data keluarga</p>
        </div>
        <Link
          href="/admin/members/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Anggota
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[var(--text-subtle)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent members */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-[var(--text)]">Anggota Terbaru</h2>
          <Link href="/admin/members"
            className="text-xs transition-colors"
            style={{ color: 'var(--accent)' }}>
            Lihat semua →
          </Link>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {recent.map(m => (
            <div key={m.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full"
                  style={{ background: m.gender === 'male' ? '#3b82f6' : '#ec4899' }} />
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{m.name}</p>
                  <p className="text-xs text-[var(--text-subtle)]">
                    {m.id} · {m.profession ?? 'Profesi belum diisi'}
                  </p>
                </div>
              </div>
              <Link href={`/admin/members/${m.id}/edit`}
                className="text-xs px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                Edit
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
