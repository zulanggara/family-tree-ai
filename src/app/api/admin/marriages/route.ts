import { NextRequest, NextResponse } from 'next/server'
import { upsertMarriage, deleteMarriage, MarriageInput } from '@/lib/db/familyRepository'
import { getRequestSession, getAllowedIds, forbiddenIfOutOfScope } from '@/lib/apiAuth'

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
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
