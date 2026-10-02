import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseUrl } from '@/lib/supabase/config'

// See app/api/organizer/participation-summary/route.ts for why this reads
// participation_applications with the service-role key instead of the browser's anon-key
// client: RLS has no SELECT policy on this table, so a member's own "参加予定・申込中の活動"
// section on My Page always saw an empty list even though their applications were saved
// correctly. This route scopes results to the signed-in caller's own email, so a member can
// never read another member's applications.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[v0] SUPABASE_SERVICE_ROLE_KEY is not configured; cannot read participation_applications.')
    return NextResponse.json({ error: '申込中の活動を取得できませんでした。' }, { status: 500 })
  }
  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data, error } = await adminClient
    .from('participation_applications')
    .select('id, activity_title, activity_area, activity_date, group_size, status, created_at')
    .eq('applicant_email', user.email)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[v0] Failed to load my participation applications:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data ?? [] })
}
