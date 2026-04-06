import { NextResponse } from 'next/server';
import { fetchFamilyData } from '@/lib/db/familyRepository';

export const dynamic = 'force-dynamic'; // always fresh, never cached by Next.js

export async function GET() {
  try {
    const data = await fetchFamilyData();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
