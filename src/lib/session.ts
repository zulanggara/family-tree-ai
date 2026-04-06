/**
 * Session utilities — uses Web Crypto (Edge-compatible).
 *
 * Token format:  base64url(payload).base64url(hmac-sha256)
 *
 * Middleware sets x-session header after verifying the cookie so that
 * server components can read the session without another DB call.
 */

export interface SessionPayload {
  id: number;
  username: string;
  role: 'super_admin' | 'family_admin';
  rootFamilyId: string | null;
}

function secret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? 'change-me-in-env';
}

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): string {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(sig);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const encoded = enc.encode(JSON.stringify(payload));
  const data = b64url(encoded.buffer as ArrayBuffer);
  const sig = await hmacSign(data);
  return `${data}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = await hmacSign(data);
    if (expected !== sig) return null;
    return JSON.parse(b64urlDecode(data)) as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Server-component helper ──────────────────────────────────────────────────
// Reads the x-session header set by middleware.
// Only works in server components / route handlers (not Edge middleware itself).
export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const raw = h.get('x-session');
    if (!raw) return null;
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}
