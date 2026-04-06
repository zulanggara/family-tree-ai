import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminByUsername, verifyAdminPassword } from '@/lib/db/adminRepository';
import { createSessionToken } from '@/lib/session';

const COOKIE_NAME = 'admin_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const admin = await getAdminByUsername(username);
    if (!admin) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await verifyAdminPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const token = await createSessionToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      rootFamilyId: admin.rootFamilyId,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);

    return NextResponse.json({ ok: true, role: admin.role, username: admin.username });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
