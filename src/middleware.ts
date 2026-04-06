import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

const COOKIE = 'admin_session';
const PROTECTED = ['/admin', '/api/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isLoginPage = pathname === '/admin/login';
  const isAuthApi = pathname === '/api/admin/auth';

  if (!isProtected || isLoginPage || isAuthApi) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return redirectToLogin(req);

  const session = await verifySessionToken(token);
  if (!session) return redirectToLogin(req);

  // Role-based: only super_admin can access admin management
  if (
    (pathname.startsWith('/admin/admins') || pathname.startsWith('/api/admin/admins')) &&
    session.role !== 'super_admin'
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Forward session to server components via request headers
  // (strip any client-supplied x-session to prevent spoofing)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-session');
  requestHeaders.set('x-session', JSON.stringify(session));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function redirectToLogin(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
