'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Reached after clicking the password-recovery email link. Supabase can deliver the
// recovery grant two different ways depending on project auth settings:
//   1. PKCE: a `?code=` query param, normally already exchanged for a session by
//      /auth/callback before redirecting here (session then lives in cookies).
//   2. Implicit: `#access_token=&refresh_token=&type=recovery` in the URL hash. A hash
//      never reaches the server, so /auth/callback can't see it at all — it has to be
//      read and applied here, client-side, on first render.
// This page handles both directly instead of assuming /auth/callback already succeeded,
// so a recovery link works regardless of which flow the project is configured for.
export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let resolved = false

    const finish = (ok: boolean) => {
      if (resolved) return
      resolved = true
      setHasSession(ok)
      setCheckingSession(false)
    }

    // supabase-js's browser client already auto-detects a recovery session from the URL
    // (hash tokens or a PKCE code) on load and fires this event once it's established —
    // this is the primary signal, and covers cases the manual parsing below might miss.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        finish(true)
      }
    })

    const establishSession = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken) {
        const { error: setError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        // Clear the tokens from the address bar so they aren't left visible/bookmarkable.
        window.history.replaceState(null, '', window.location.pathname)
        if (!setError) return finish(true)
      }

      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        window.history.replaceState(null, '', window.location.pathname)
        if (!exchangeError) return finish(true)
      }

      // Neither hash tokens nor a code were present/valid — fall back to checking
      // whether /auth/callback already established a session via cookies.
      const { data } = await supabase.auth.getUser()
      finish(!!data.user)
    }

    establishSession()

    return () => subscription.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('パスワードは6文字以上でご入力ください。')
      return
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。')
      return
    }
    setSubmitting(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      console.log('[v0] Password update failed:', updateError.message)
      if (/session|jwt|token/i.test(updateError.message)) {
        setError('セッションの有効期限が切れています。お手数ですが、再度パスワード再設定をお試しください。')
      } else if (/should be different|same/i.test(updateError.message)) {
        setError('現在のパスワードとは異なるパスワードをご入力ください。')
      } else {
        setError('パスワードの更新に失敗しました。時間をおいて再度お試しください。')
      }
      return
    }
    setDone(true)
    // Sign out the recovery session so the login form starts clean, then send the user
    // to the top page with ?auth=login, which KnotApp reads to auto-open the login modal.
    await supabase.auth.signOut()
    setTimeout(() => router.push('/?auth=login'), 1800)
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        {checkingSession ? (
          <p className="text-center text-sm text-slate-500">確認中…</p>
        ) : done ? (
          <div className="text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={26} />
            </div>
            <h1 className="mt-5 text-lg font-black">パスワードを変更しました</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">ログイン画面へ移動します…</p>
          </div>
        ) : !hasSession ? (
          <div className="text-center">
            <h1 className="text-xl font-black">リンクが無効か期限切れです</h1>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              お手数ですが、もう一度パスワード再設定のお手続きをお願いします。
            </p>
            <a href="/" className="mt-7 inline-block w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground">
              トップへ戻る
            </a>
          </div>
        ) : (
          <>
            <p className="text-xs font-black text-primary">KNOT ACCOUNT</p>
            <h1 className="mt-1 text-2xl font-black">新しいパスワードを設定</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">新しいパスワードをご入力ください。</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                  {error}
                </p>
              )}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="新しいパスワード（6文字以上）"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'パスワードを非表示にする' : 'パスワードを表示する'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="新しいパスワード（確認）"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'パスワードを非表示にする' : 'パスワードを表示する'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {submitting ? '更新中…' : 'パスワードを更新する'}
              </button>
              <a href="/?auth=login" className="block text-center text-sm font-black text-slate-500 hover:text-primary">
                ログイン画面に戻る
              </a>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
