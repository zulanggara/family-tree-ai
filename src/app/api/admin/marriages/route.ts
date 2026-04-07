import { NextRequest, NextResponse } from 'next/server'
import { upsertMarriage, deleteMarriage, MarriageInput } from '@/lib/db/familyRepository'
import { getRequestSession, getAllowedIds, forbiddenIfOutOfScope } from '@/lib/apiAuth'
import { logAction } from '@/lib/db/auditRepository'

export async function POST(request: NextRequest) {
  try {
    const session = getRequestSession(request);
    const input: MarriageInput = await request.json()
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const denied = forbiddenIfOutOfScope(input.memberId, allowed);
      if (denied) return denied;
    }
    await upsertMarriage(input)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'CREATE', entityType: 'marriage', entityId: `${input.memberId}:${input.spouseId}`, details: { after: { memberId: input.memberId, spouseId: input.spouseId, status: input.status, marriedDate: input.marriedDate ?? null, endDate: input.endDate ?? null } }, ipAddress: ip }).catch(console.error);
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = getRequestSession(request);
    const { memberId, spouseId } = await request.json()
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const denied = forbiddenIfOutOfScope(memberId, allowed);
      if (denied) return denied;
    }
    await deleteMarriage(memberId, spouseId)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'DELETE', entityType: 'marriage', entityId: `${memberId}:${spouseId}`, details: { before: { memberId, spouseId } }, ipAddress: ip }).catch(console.error);
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
