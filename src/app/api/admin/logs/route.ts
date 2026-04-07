import { NextRequest, NextResponse } from 'next/server';
import { fetchLogs } from '@/lib/db/auditRepository';
import { getRequestSession } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  try {
    const session = getRequestSession(req);
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const action = url.searchParams.get('action') || undefined;
    const entityType = url.searchParams.get('entityType') || undefined;
    const adminUsername = url.searchParams.get('admin') || undefined;

    const result = await fetchLogs({ page, limit, action, entityType, adminUsername });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
