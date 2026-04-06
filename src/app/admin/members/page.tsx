import { fetchFamilyData, getDescendantIds } from '@/lib/db/familyRepository';
import Link from 'next/link';
import { MembersTable } from '@/components/admin/MembersTable';
import { getServerSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const { members } = await fetchFamilyData();
  const session = await getServerSession();

  let visible = members;
  if (session?.role === 'family_admin' && session.rootFamilyId) {
    const allowedIds = new Set(await getDescendantIds(session.rootFamilyId));
    visible = members.filter(m => allowedIds.has(m.id));
  }

  const sorted = [...visible].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Anggota Keluarga</h1>
          <p className="text-sm text-[var(--text-subtle)] mt-0.5">{sorted.length} total anggota</p>
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

      <MembersTable members={sorted} />
    </div>
  );
}
