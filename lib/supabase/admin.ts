import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

/**
 * Standalone client for creating new auth.users accounts via self-service
 * sign-up. This project's SUPABASE_SERVICE_ROLE_KEY currently points at a
 * different Supabase project than NEXT_PUBLIC_SUPABASE_URL (see
 * lib/supabase/config.ts), so the privileged admin API is not usable here.
 * This client intentionally never persists a session so it cannot interfere
 * with the calling admin's own cookie-based session.
 */
export function createSignupClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
