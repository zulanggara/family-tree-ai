import { NextRequest, NextResponse } from 'next/server';
import { deleteAdmin, getAdminById } from '@/lib/db/adminRepository';
import { logAction } from '@/lib/db/auditRepository';
import { getRequestSession } from '@/lib/apiAuth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const before = await getAdminById(parseInt(id));
    await deleteAdmin(parseInt(id));
    const session = getRequestSession(_req);
    const ip = _req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? _req.headers.get('x-real-ip') ?? null;
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'DELETE', entityType: 'admin', entityId: id, entityName: before?.username, details: { before: before ? { id: before.id, username: before.username, role: before.role, rootFamilyId: before.rootFamilyId } : null }, ipAddress: ip }).catch(console.error);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
