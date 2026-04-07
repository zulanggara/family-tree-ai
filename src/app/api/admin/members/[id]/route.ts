import { NextRequest, NextResponse } from 'next/server'
import { fetchMemberById, updateMember, cascadeDeleteMember, MemberInput } from '@/lib/db/familyRepository'
import { getRequestSession, getAllowedIds, forbiddenIfOutOfScope } from '@/lib/apiAuth'
import { logAction } from '@/lib/db/auditRepository'

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
    const before = await fetchMemberById(id)
    const member = await updateMember(id, input)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    // Only log fields that actually changed
    const COMPARE_KEYS = ['name','photo','gender','birthDate','deathDate','birthPlace','fatherId','motherId',
      'biography','nickname','profession','education','religion','nationality','hobbies','socialLinks','gallery'] as const;
    const diffBefore: Record<string, unknown> = {};
    const diffAfter: Record<string, unknown> = {};
    if (before) {
      for (const key of COMPARE_KEYS) {
        if (JSON.stringify(before[key] ?? null) !== JSON.stringify(member[key] ?? null)) {
          diffBefore[key] = before[key] ?? null;
          diffAfter[key] = member[key] ?? null;
        }
      }
    }
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'UPDATE', entityType: 'member', entityId: id, entityName: member.name, details: Object.keys(diffBefore).length ? { before: diffBefore, after: diffAfter } : null, ipAddress: ip }).catch(console.error);
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
    const before = await fetchMemberById(id);
    const deleted = await cascadeDeleteMember(id);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    logAction({ adminUsername: session?.username ?? 'unknown', adminRole: session?.role ?? 'unknown', action: 'DELETE', entityType: 'member', entityId: id, entityName: before?.name, details: { before, cascadeDeleted: deleted }, ipAddress: ip }).catch(console.error);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
