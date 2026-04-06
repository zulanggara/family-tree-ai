import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side client — uses the service role key to bypass RLS.
 * Only call this from API routes or server components (never expose to the browser).
 */
export function createServerClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Browser / anon client — safe to use on the client side.
 * Currently used for future client-side features (realtime, auth, etc).
 */
export function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
