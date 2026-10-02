import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseUrl } from '@/lib/supabase/config'

// See app/api/organizer/participation-summary/route.ts for why this reads
// participation_applications with the service-role key instead of the browser's anon-key
// client: RLS has no SELECT policy on this table, so the client always saw an empty list.
// This route additionally verifies the caller actually owns the requested activity title
// before returning any applicant rows, so one organizer can't read another's applicant list
// by just changing the title query param.
export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get('title')?.trim()
  if (!title) {
    return NextResponse.json({ error: '活動・イベント名を指定してください。' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  }

  const filters = [`user_id.eq.${user.id}`, user.email ? `contact_email.eq.${user.email}` : null].filter(Boolean).join(',')
  const { data: owned, error: ownedError } = await supabase.from('activities').select('id').eq('title', title).or(filters).limit(1)
  if (ownedError) {
    return NextResponse.json({ error: ownedError.message }, { status: 500 })
  }
  if (!owned || owned.length === 0) {
    return NextResponse.json({ error: 'この活動・イベントの申込者を確認する権限がありません。' }, { status: 403 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[v0] SUPABASE_SERVICE_ROLE_KEY is not configured; cannot read participation_applications.')
    return NextResponse.json({ error: '申込者一覧を取得できませんでした。' }, { status: 500 })
  }
  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data, error } = await adminClient
    .from('participation_applications')
    .select('applicant_name, applicant_phone, applicant_email, participant_breakdown, group_size, question, status, created_at')
    .eq('activity_title', title)
    .neq('status', 'withdrawn')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[v0] Failed to load participation applicants:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applicants: data ?? [] })
}
