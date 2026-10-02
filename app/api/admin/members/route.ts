import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseUrl } from '@/lib/supabase/config'

const VALID_MEMBER_STATUSES = new Set(['active', 'pending', 'suspended'])

async function requireCallerIsAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // .maybeSingle() (not .single()) so a missing or, on old duplicate-id data, multiply
  // matching row returns null instead of PostgREST's "Cannot coerce the result to a
  // single JSON object" throw.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return null

  return user
}

// Updates a member's status through the server, authenticated via the admin's own cookie
// session, and always confirms the row that was actually written by selecting it back.
// A plain client-side `.update()` can return no error while silently touching zero rows
// (e.g. RLS filtered it out, or a stale/missing id) — that combination is what let the
// dashboard show "更新しました" while the DB kept its old value. Using `.select().single()`
// here turns that "0 rows changed" case into a real, reportable error instead.
export async function PATCH(request: Request) {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  const status = typeof body?.status === 'string' ? body.status : ''
  const email = typeof body?.email === 'string' && body.email ? body.email.trim().toLowerCase() : null
  const fullName = typeof body?.fullName === 'string' && body.fullName ? body.fullName : null
  if (!id || !VALID_MEMBER_STATUSES.has(status)) {
    return NextResponse.json({ error: '更新内容が不正です。' }, { status: 400 })
  }

  const supabase = await createClient()

  // .maybeSingle() everywhere below: an id that matches 0 or >1 rows must become a plain
  // null/array we can check ourselves, not a thrown PostgREST coercion error.
  let { data: target, error: lookupError } = await supabase.from('profiles').select('id, is_master_admin').eq('id', id).maybeSingle()
  if (lookupError) {
    console.error('[v0] Failed to look up member before status update:', lookupError.message)
    return NextResponse.json({ error: lookupError.message }, { status: 500 })
  }

  // The dashboard's roster can list a member by an id that has no matching profiles row —
  // e.g. their Supabase signUp created the auth.users account but the profile row was never
  // synced (still awaiting email confirmation), or the dashboard is holding a stale id. Try
  // to resolve the real row by email before giving up, and if it truly doesn't exist yet but
  // the auth.users account does, create (UPSERT) it here instead of failing outright.
  let resolvedId = id
  if (!target && email) {
    const { data: byEmail } = await supabase.from('profiles').select('id, is_master_admin').eq('email', email).maybeSingle()
    if (byEmail) {
      target = byEmail
      resolvedId = byEmail.id
    }
  }

  if (!target) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let authEmail: string | null = null
    if (serviceRoleKey) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(id)
      if (authError) {
        console.error('[v0] Failed to look up auth user while provisioning profile:', authError.message)
      }
      authEmail = authUser?.user?.email ?? null
    }

    const emailForProfile = authEmail ?? email
    if (!emailForProfile) {
      return NextResponse.json({ error: '対象の会員が見つからないため更新できませんでした。' }, { status: 404 })
    }

    // profiles.id has no default and must equal the auth.users id it belongs to; every
    // other column has a safe default, so this UPSERT only needs id + email to succeed.
    const { data: provisioned, error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id, email: emailForProfile, full_name: fullName }, { onConflict: 'id' })
      .select('id, is_master_admin')
      .maybeSingle()
    if (upsertError || !provisioned) {
      console.error('[v0] Failed to auto-provision missing profile row:', upsertError?.message)
      return NextResponse.json({ error: `会員レコードの作成に失敗しました: ${upsertError?.message ?? '不明なエラー'}` }, { status: 500 })
    }
    target = provisioned
    resolvedId = provisioned.id
  }

  if (target.is_master_admin && status !== 'active') {
    return NextResponse.json({ error: 'マスター管理者のステータスは変更できません。' }, { status: 400 })
  }

  const { data: updated, error } = await supabase.from('profiles').update({ status }).eq('id', resolvedId).select('id, status').maybeSingle()
  if (error) {
    console.error('[v0] Failed to update member status in Supabase:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated) {
    // The row existed moments ago in the lookup above but the update matched nothing —
    // most likely RLS silently filtered the write. Report it plainly instead of a false
    // success so the dashboard never shows a status that was never actually saved.
    return NextResponse.json({ error: '更新条件に一致する会員が見つかりませんでした（権限設定をご確認ください）。' }, { status: 409 })
  }

  return NextResponse.json({ success: true, id: updated.id, status: updated.status }, { status: 200 })
}

// Deletes a member's `profiles` row and, best-effort, their `auth.users` account so the
// member is fully removed rather than just hidden from the dashboard's local state. The
// auth.users deletion requires SUPABASE_SERVICE_ROLE_KEY to match the same Supabase project
// as NEXT_PUBLIC_SUPABASE_URL; if it doesn't (e.g. misconfigured env var), the profile row is
// still deleted and this route reports that the auth account could not be removed.
export async function DELETE(request: Request) {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: '対象の会員が指定されていません。' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: target } = await supabase.from('profiles').select('is_master_admin').eq('id', id).maybeSingle()
  if (target?.is_master_admin) {
    return NextResponse.json({ error: 'マスター管理者は削除できません。' }, { status: 400 })
  }

  const { error: profileError } = await supabase.from('profiles').delete().eq('id', id)
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  let authUserDeleted = false
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRoleKey) {
    const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)
    if (!authError) {
      authUserDeleted = true
    } else {
      console.error('[v0] Failed to delete auth user (profile row was still removed):', authError.message)
    }
  }

  return NextResponse.json({ success: true, authUserDeleted })
}
