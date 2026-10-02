import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseUrl } from '@/lib/supabase/config'

// participation_applications has Row Level Security enabled with no SELECT policy for
// anon/authenticated roles, so the browser's Supabase client (anon key) always sees zero
// rows here regardless of any .eq()/.or() filter - that's why the organizer dashboard's
// "申込者一覧 (0組) を確認" never counted up even though rows were being inserted correctly.
// This route reads the table server-side with the service-role key (which bypasses RLS) and
// scopes the result to only the activities the signed-in caller actually owns, so we don't
// hand out other organizers' applicant counts.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  }

  // Same ownership filter used elsewhere in the app (refetchDbActivities): match by the
  // stable user_id first, and also by contact_email for listings submitted before user_id
  // existed on this account.
  const filters = [`user_id.eq.${user.id}`, user.email ? `contact_email.eq.${user.email}` : null].filter(Boolean).join(',')
  const { data: ownActivities, error: ownActivitiesError } = await supabase.from('activities').select('title').or(filters)
  if (ownActivitiesError) {
    return NextResponse.json({ error: ownActivitiesError.message }, { status: 500 })
  }

  const titles = Array.from(new Set((ownActivities ?? []).map((row) => row.title).filter(Boolean)))
  if (titles.length === 0) {
    return NextResponse.json({ counts: {} })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[v0] SUPABASE_SERVICE_ROLE_KEY is not configured; cannot read participation_applications.')
    return NextResponse.json({ error: '申込件数を取得できませんでした。' }, { status: 500 })
  }
  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data, error } = await adminClient
    .from('participation_applications')
    .select('activity_title')
    .in('activity_title', titles)
    .neq('status', 'withdrawn')
  if (error) {
    console.error('[v0] Failed to load participation counts:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.activity_title] = (counts[row.activity_title] ?? 0) + 1
  }
  return NextResponse.json({ counts })
}
