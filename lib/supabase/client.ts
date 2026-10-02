import { createBrowserClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    // Secure cookies in production; not in dev, so localhost still works.
    cookieOptions: { secure: process.env.NODE_ENV === 'production' },
    // NOTE: `auth.experimental.appendPkceFlowIdToRedirects` was tried here to solve a
    // narrow multi-flow-collision edge case, but it made the common case worse: once a
    // link carries `sb_flow_id`, exchangeCodeForSession looks up ONLY that flow's slot
    // and fails fast (`pkce_code_verifier_not_found`) instead of falling back to the
    // always-present "most recently started flow" verifier — so it broke the ordinary
    // single-request, click-immediately case, which matters far more than the rare
    // collision it was meant to prevent. Deliberately left off.
  })
}
