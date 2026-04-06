/**
 * Family data service — single entry point for all data consumers.
 *
 * Data source is controlled by the env var NEXT_PUBLIC_DATA_SOURCE:
 *   "local"  → reads from data/family.json  (default, no DB required)
 *   "api"    → fetches from Next.js API route /api/family → Supabase
 *
 * To switch to the database:
 *   Add  NEXT_PUBLIC_DATA_SOURCE=api  to your .env.local (and to Vercel env vars).
 *
 * Nothing else needs to change — all components call getFamilyData() unchanged.
 */

import { FamilyData } from '@/types';

const USE_LOCAL = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'local') === 'local';

export async function getFamilyData(): Promise<FamilyData> {
  if (USE_LOCAL) {
    const local = await import('../../data/family.json');
    return local.default as FamilyData;
  }

  // Relative URL works both in the browser and in server-side fetch (Next.js).
  // In browser:  /api/family
  // In Node SSR: needs full URL, but this service is only called client-side
  //              via useFamilyData hook, so relative is fine.
  const res = await fetch('/api/family', { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `GET /api/family failed: ${res.status}`);
  }
  return res.json() as Promise<FamilyData>;
}
