import { NextRequest, NextResponse } from 'next/server'
import { fetchMemberById, updateMember, cascadeDeleteMember, MemberInput } from '@/lib/db/familyRepository'
import { getRequestSession, getAllowedIds, forbiddenIfOutOfScope } from '@/lib/apiAuth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = getRequestSession(request);
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const denied = forbiddenIfOutOfScope(id, allowed);
      if (denied) return denied;
    }
    const member = await fetchMemberById(id)
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    return NextResponse.json(member)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = getRequestSession(request);
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const denied = forbiddenIfOutOfScope(id, allowed);
      if (denied) return denied;
    }
    const input: Partial<MemberInput> = await request.json()
    const member = await updateMember(id, input)
    return NextResponse.json(member)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = getRequestSession(request);
    if (session?.role === 'family_admin' && session.rootFamilyId) {
      const allowed = await getAllowedIds(session);
      const denied = forbiddenIfOutOfScope(id, allowed);
      if (denied) return denied;
    }
    const deleted = await cascadeDeleteMember(id);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
