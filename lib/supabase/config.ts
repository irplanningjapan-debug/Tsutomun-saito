// Pinned values for the knot-miyazaki Supabase project.
//
// The platform-managed NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// env vars have been out of sync during the Supabase project migration: the
// URL and anon key have at times pointed at two *different* Supabase
// projects, which breaks every request with "Invalid API key" (a `||`
// fallback doesn't help here because the stale vars are non-empty, just
// wrong). Pinning both values together guarantees they always match the same
// project. Once the env vars are confirmed consistent, this can go back to
// reading them from process.env.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://efjanoptpcwxfjhvvvir.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_SCQWkj4-wWSYO_kLLBgu4A_KEdTYm13'

export const supabaseUrl = SUPABASE_URL
export const supabaseAnonKey = SUPABASE_ANON_KEY
