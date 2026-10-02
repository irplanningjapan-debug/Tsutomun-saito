import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseUrl } from '@/lib/supabase/config'

// participation_applications has RLS enabled with no UPDATE policy for anon/authenticated
// roles either, so a client-side .update() here would silently match zero rows. This route
// performs the update server-side with the service-role key, after verifying the row being
// withdrawn actually belongs to the signed-in caller (by applicant_email), so a member can
// only withdraw their own application.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: '対象の申込が指定されていません。' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[v0] SUPABASE_SERVICE_ROLE_KEY is not configured; cannot update participation_applications.')
    return NextResponse.json({ error: '退会処理に失敗しました。' }, { status: 500 })
  }
  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: updated, error } = await adminClient
    .from('participation_applications')
    .update({ status: 'withdrawn' })
    .eq('id', id)
    .eq('applicant_email', user.email)
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('[v0] Failed to withdraw participation application:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: '対象の申込が見つかりませんでした。' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
