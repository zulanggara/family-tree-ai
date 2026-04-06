import { headers } from 'next/headers';
import { AdminNav } from '@/components/admin/AdminNav';
import { ToastProvider } from '@/components/admin/Toast';
import type { SessionPayload } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Read session from header set by middleware (not available on login page)
  let session: SessionPayload | null = null;
  try {
    const h = await headers();
    const raw = h.get('x-session');
    if (raw) session = JSON.parse(raw) as SessionPayload;
  } catch {
    // no session (login page)
  }

  // Always wrap in ToastProvider so client pages can use useToast()
  if (!session) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <AdminNav username={session.username} role={session.role}>
        {children}
      </AdminNav>
    </ToastProvider>
  );
}
