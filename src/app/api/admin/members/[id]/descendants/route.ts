import { NextRequest, NextResponse } from 'next/server';
import { getDescendantsInfo } from '@/lib/db/familyRepository';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const descendants = await getDescendantsInfo(id);
    // descendants[0] is the member itself (generation 0) — exclude it
    const children = descendants.filter(d => d.generation > 0);
    return NextResponse.json({ total: children.length, descendants: children });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
