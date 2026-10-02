import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/config'

// Self-service account deletion (退会). Called from マイページ's "アカウントを削除する" button.
//
// Order matters: the activities status update runs first, through the caller's own session
// (RLS lets a user update rows where user_id = auth.uid()), while auth.uid() still resolves to
// this account. Deleting the auth.users row first would make that same-session update
// impossible to attribute, and activities.user_id has ON DELETE SET NULL (not CASCADE) so the
// rows would otherwise survive with user_id wiped but status untouched — silently staying live
// on the public site under an orphaned listing.
//
// Auth: the client sends its access token in the Authorization header (in addition to relying
// on cookies) because v0's preview iframe and some browser privacy settings can drop
// third-party/SameSite cookies, which makes the cookie-only session unreadable server-side even
// though the user is genuinely logged in client-side. We verify that Bearer token directly
// against Supabase Auth first, and only fall back to the cookie-based session if no token was
// sent, so the check works in both environments.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null

  let userId: string | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- unify the two possible Supabase client shapes (anon+Bearer vs. cookie-based) for the single downstream .from() call below.
  let authedClient: any = null

  if (bearerToken) {
    const tokenClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    })
    const { data, error } = await tokenClient.auth.getUser(bearerToken)
    if (!error && data.user) {
      userId = data.user.id
      authedClient = tokenClient
    }
  }

  if (!userId) {
    const cookieClient = await createClient()
    const { data } = await cookieClient.auth.getUser()
    if (data.user) {
      userId = data.user.id
      authedClient = cookieClient
    }
  }

  if (!userId || !authedClient) {
    return NextResponse.json({ error: 'ログイン状態を確認できませんでした。再度ログインしてください。' }, { status: 401 })
  }

  const { error: closeListingsError } = await authedClient.from('activities').update({ status: 'closed' }).eq('user_id', userId)
  if (closeListingsError) {
    console.error('[v0] Failed to close listings before account deletion:', closeListingsError.message)
    return NextResponse.json({ error: '掲載中の活動の非公開化に失敗しました。時間をおいて再度お試しください。' }, { status: 500 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('[v0] SUPABASE_SERVICE_ROLE_KEY is not set; cannot delete the auth.users account.')
    return NextResponse.json({ error: 'サーバー設定エラーのため退会処理を完了できませんでした。運営にお問い合わせください。' }, { status: 500 })
  }

  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error('[v0] Failed to delete auth user during account deletion:', deleteUserError.message)
    return NextResponse.json({ error: '退会処理に失敗しました。時間をおいて再度お試しください。' }, { status: 500 })
  }

  // profiles.id has ON DELETE CASCADE from auth.users, so the profile row is already gone.
  return NextResponse.json({ success: true })
}
