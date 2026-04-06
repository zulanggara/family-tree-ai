import { listAdmins } from '@/lib/db/adminRepository';
import { fetchFamilyData } from '@/lib/db/familyRepository';
import Link from 'next/link';
import { AdminsTable } from '@/components/admin/AdminsTable';

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const [admins, { members }] = await Promise.all([
    listAdmins(),
    fetchFamilyData(),
  ]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Manajemen Admin</h1>
          <p className="text-sm text-[var(--text-subtle)] mt-0.5">{admins.length} akun admin terdaftar</p>
        </div>
        <Link
          href="/admin/admins/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Admin
        </Link>
      </div>

      <AdminsTable admins={admins} members={members} />
    </div>
  );
}
