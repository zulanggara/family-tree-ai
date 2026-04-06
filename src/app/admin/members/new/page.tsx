import { fetchFamilyData } from '@/lib/db/familyRepository';
import { MemberForm } from '@/components/admin/MemberForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewMemberPage() {
  const { members } = await fetchFamilyData();

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/members"
            className="text-sm transition-colors text-[var(--text-muted)] hover:text-[var(--text)]">
            ← Kembali
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Tambah Anggota</h1>
        </div>

        <MemberForm allMembers={members} mode="create" />
      </div>
    </div>
  );
}
