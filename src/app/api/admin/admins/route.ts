import { NextRequest, NextResponse } from 'next/server';
import { listAdmins, createAdmin } from '@/lib/db/adminRepository';
import { logAction } from '@/lib/db/auditRepository';
import { getRequestSession } from '@/lib/apiAuth';

export async function GET() {
  try {
    const admins = await listAdmins();
    return NextResponse.json(admins);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, role, rootFamilyId } = await req.json();
    if (!username || !password || !role) {
      return NextResponse.json({ error: 'username, password, role wajib diisi' }, { status: 400 });
    }
    const admin = await createAdmin({ username, password, role, rootFamilyId });
    const session = getRequestSession(req);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? null;
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'CREATE', entityType: 'admin', entityId: String(admin.id), entityName: username, details: { after: { id: admin.id, username: admin.username, role: admin.role, rootFamilyId: admin.rootFamilyId } }, ipAddress: ip }).catch(console.error);
    return NextResponse.json(admin, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
