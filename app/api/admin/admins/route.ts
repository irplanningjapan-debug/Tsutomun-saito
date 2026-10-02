import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSignupClient } from '@/lib/supabase/admin'

async function requireCallerIsAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null

  return user
}

export async function GET() {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, status, created_at, is_master_admin')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ admins: data })
}

export async function POST(request: Request) {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!fullName || !email) {
    return NextResponse.json({ error: '氏名とメールアドレスを入力してください。' }, { status: 400 })
  }

  const supabase = await createClient()

  // If this email already belongs to a profiles row (an existing member, or an
  // admin created before this account existed as a member), promote that row in
  // place instead of running the sign-up flow below. Sign-up would either fail
  // with "already registered", or — for a member who verified their email a
  // while ago — Supabase can return an obfuscated success with the *existing*
  // auth.users id to avoid leaking which emails are registered; inserting a
  // second profiles row for that id then collides on the primary key
  // ("duplicate key value violates unique constraint profiles_pkey"), which was
  // the bug this existence check fixes. No password or email confirmation is
  // needed since the person can already sign in with their existing account.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.role === 'admin') {
      return NextResponse.json({ error: 'このメールアドレスは既に管理者として登録されています。' }, { status: 400 })
    }
    const { error: promoteError } = await supabase
      .from('profiles')
      .update({ role: 'admin', full_name: existingProfile.full_name || fullName })
      .eq('id', existingProfile.id)
    if (promoteError) {
      return NextResponse.json({ error: promoteError.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, mode: 'promoted' })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: '新規に招待する場合は8文字以上のパスワードを入力してください。' }, { status: 400 })
  }

  // Creating the auth.users row must go through self-service sign-up: this
  // project's service-role key currently points at a different Supabase
  // project (see lib/supabase/admin.ts), so the privileged admin.createUser
  // API is not usable. A fresh, non-persisting client is used so this never
  // touches the calling admin's own session cookies.
  const signupClient = createSignupClient()
  const { data: created, error: signUpError } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? undefined,
      data: { full_name: fullName },
    },
  })

  if (signUpError || !created?.user) {
    const message = signUpError?.message?.toLowerCase().includes('already registered')
      ? 'このメールアドレスは既に登録されています。'
      : signUpError?.message ?? 'アカウントの作成に失敗しました。'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  // Insert the profile row as the calling admin so RLS ("Admins can insert
  // profiles") authorizes it. The new account starts as "pending" until the
  // invitee confirms their email and signs in for the first time. If Supabase's
  // sign-up obfuscation returned an existing user id here despite the
  // maybeSingle() lookup above finding no profiles row (e.g. an orphaned
  // auth.users account with no matching profile), fall back to updating that
  // row rather than surfacing a raw duplicate-key error.
  const { error: profileError } = await supabase.from('profiles').insert({
    id: created.user.id,
    email,
    full_name: fullName,
    role: 'admin',
    status: 'pending',
  })

  if (profileError) {
    if (profileError.code === '23505') {
      const { error: fallbackUpdateError } = await supabase
        .from('profiles')
        .update({ role: 'admin', full_name: fullName })
        .eq('id', created.user.id)
      if (fallbackUpdateError) {
        return NextResponse.json({ error: fallbackUpdateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, mode: 'promoted' })
    }
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, mode: 'invited' })
}

export async function DELETE(request: Request) {
  const caller = await requireCallerIsAdmin()
  if (!caller) {
    return NextResponse.json({ error: '権限がありません。' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: '対象の管理者が指定されていません。' }, { status: 400 })
  }

  if (id === caller.id) {
    return NextResponse.json({ error: '自分自身のアカウントは削除できません。' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: target } = await supabase.from('profiles').select('is_master_admin').eq('id', id).single()
  if (target?.is_master_admin) {
    return NextResponse.json({ error: 'マスター管理者は削除できません。' }, { status: 400 })
  }

  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin')
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: '最後の管理者は削除できません。' }, { status: 400 })
  }

  // "Remove" here means revoke admin privileges only — this is the 管理者・権限管理 tab,
  // not the member roster's delete action. The person may still be a real member (or the
  // account that just registered as one), so their profiles row, member data, and
  // auth.users account must all survive; only the elevated role changes. Downgrading to
  // 'member' (rather than deleting the row) also means they immediately drop out of the
  // GET query above (which filters on role = 'admin') without needing any other cleanup,
  // and reappear as an ordinary account in the 会員・ユーザー名簿 tab.
  const { error } = await supabase.from('profiles').update({ role: 'member' }).eq('id', id).eq('role', 'admin')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
