/**
 * API route auth helpers.
 *
 * - getRequestSession: reads the verified session forwarded by middleware via x-session header.
 * - getDescendantIdSet: returns the set of IDs a family_admin may manage (root + all descendants).
 *   Returns null for super_admin (no restriction).
 * - assertCanManage: throws a 403 Response if the given member ID is out of scope.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SessionPayload } from '@/lib/session';
import { getDescendantIds } from '@/lib/db/familyRepository';

export function getRequestSession(req: NextRequest): SessionPayload | null {
  const raw = req.headers.get('x-session');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Returns allowed member IDs for the session, or null if unrestricted (super_admin / no rootFamilyId).
 */
export async function getAllowedIds(session: SessionPayload): Promise<Set<string> | null> {
  if (session.role === 'super_admin' || !session.rootFamilyId) return null;
  const ids = await getDescendantIds(session.rootFamilyId);
  return new Set(ids);
}

/**
 * Returns a 403 NextResponse if the given memberId is not in the allowed set,
 * or null if access is permitted.
 */
export function forbiddenIfOutOfScope(
  memberId: string,
  allowedIds: Set<string> | null,
): NextResponse | null {
  if (allowedIds === null) return null; // unrestricted
  if (!allowedIds.has(memberId)) {
    return NextResponse.json(
      { error: 'Forbidden: anggota di luar scope Anda' },
      { status: 403 },
    );
  }
  return null;
}
