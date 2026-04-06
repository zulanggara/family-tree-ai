import { fetchFamilyData, fetchMemberById, getDescendantIds } from '@/lib/db/familyRepository';
import { MemberForm } from '@/components/admin/MemberForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, { members }, session] = await Promise.all([
    fetchMemberById(id),
    fetchFamilyData(),
    getServerSession(),
  ]);

  if (!member) notFound();

  // family_admin can only edit members within their descendant scope
  if (session?.role === 'family_admin' && session.rootFamilyId) {
    const allowedIds = new Set(await getDescendantIds(session.rootFamilyId));
    if (!allowedIds.has(id)) notFound();
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/members"
            className="text-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Kembali
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div>
            <h1 className="font-display text-2xl font-bold text-[var(--text)]">Edit: {member.name}</h1>
            <p className="text-xs text-[var(--text-subtle)] mt-0.5">ID: {member.id}</p>
          </div>
        </div>

        <MemberForm member={member} allMembers={members} mode="edit" />
      </div>
    </div>
  );
}
