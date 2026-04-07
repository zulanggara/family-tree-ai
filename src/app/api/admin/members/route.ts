import { NextRequest, NextResponse } from 'next/server'
import { fetchFamilyData, createMember, MemberInput } from '@/lib/db/familyRepository'
import { getRequestSession, getAllowedIds, forbiddenIfOutOfScope } from '@/lib/apiAuth'
import { logAction } from '@/lib/db/auditRepository'

export async function GET(request: NextRequest) {
  try {
    const session = getRequestSession(request);
    const data = await fetchFamilyData()
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const filtered = allowed ? data.members.filter(m => allowed.has(m.id)) : data.members;
      return NextResponse.json(filtered)
    }
    return NextResponse.json(data.members)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = getRequestSession(request);
    const input: MemberInput = await request.json()

    // family_admin can only create members whose parent is within their scope
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const parentId = input.fatherId || input.motherId;
      if (parentId) {
        const denied = forbiddenIfOutOfScope(parentId, allowed);
        if (denied) return denied;
      }
    }

    const member = await createMember(input)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'CREATE', entityType: 'member', entityId: member.id, entityName: member.name, details: { after: member }, ipAddress: ip }).catch(console.error);
    return NextResponse.json(member, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
