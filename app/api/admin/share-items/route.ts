import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseUrl } from '@/lib/supabase/config'

async function requireCallerIsAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return null

  return user
}

// Admin views and moderates every share_items row (both 受付中 and 解決済み・終了, from any
// member), which the public RLS policy on share_items does not allow — it only exposes a
// row to anon/other users when status = '受付中' or the caller owns it. The service-role
// client bypasses RLS entirely, so this route (gated by requireCallerIsAdmin) is the only
// place that is allowed to read/mutate every row regardless of owner or status.
function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const adminClient = createServiceRoleClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'サーバー側の設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。' }, { status: 500 })
  }

  const { data, error } = await adminClient
    .from('share_items')
    .select('id, user_id, type, price_type, title, municipality, image_url, description, contact_email, status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Failed to load share_items for admin:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 })
}

export async function PATCH(request: Request) {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  const status = typeof body?.status === 'string' ? body.status : ''
  if (!id || !['受付中', '解決済み・終了'].includes(status)) {
    return NextResponse.json({ error: '更新内容が不正です。' }, { status: 400 })
  }

  const adminClient = createServiceRoleClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'サーバー側の設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。' }, { status: 500 })
  }

  const { data: updated, error } = await adminClient.from('share_items').update({ status }).eq('id', id).select('id, status').maybeSingle()
  if (error) {
    console.error('[v0] Failed to update share_items status:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: '対象の投稿が見つかりませんでした。' }, { status: 404 })
  }

  return NextResponse.json({ success: true, id: updated.id, status: updated.status }, { status: 200 })
}

export async function DELETE(request: Request) {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: '対象の投稿が指定されていません。' }, { status: 400 })
  }

  const adminClient = createServiceRoleClient()
  if (!adminClient) {
    return NextResponse.json({ error: 'サーバー側の設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。' }, { status: 500 })
  }

  const { error } = await adminClient.from('share_items').delete().eq('id', id)
  if (error) {
    console.error('[v0] Failed to delete share_items row:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}
