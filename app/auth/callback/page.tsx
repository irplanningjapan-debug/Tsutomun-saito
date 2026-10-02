'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

// Handles every shape a Supabase auth email link (sign-up confirmation, password
// recovery, magic link) can arrive in:
//
// 1. `#access_token=...&refresh_token=...&type=...` — the implicit flow puts the tokens in
//    the URL *fragment*, which never reaches the server, so this MUST run in the browser.
// 2. `?code=...` — the PKCE flow. Exchanged client-side too, since @supabase/ssr's browser
//    client is the one holding the matching code_verifier cookie from when the link was
//    requested.
// 3. `?token_hash=...&type=...` — Supabase's direct OTP verification param. This path does
//    NOT depend on any locally-stored verifier, so it keeps working even if the link is
//    opened in a different browser/device than the one that started sign-up, which is the
//    most common cause of "リンクが無効か期限切れです" with the PKCE-only flow.
//
// Whichever one succeeds establishes a real session before we redirect to `next`.
//
// For password recovery specifically (`next` points at /auth/update-password, or the link
// says `type=recovery`), a failed exchange here does NOT get sent to the generic
// /auth/error dead end. It's forwarded to /auth/update-password instead, carrying the
// still-unused `code`/hash along — that page runs the same establishing logic itself
// (see its own file) as a second, independent attempt, and only THEN shows a
// "リンクが無効か期限切れです" state if that also fails. This matters because the two
// attempts aren't actually identical: this page's exchange can fail for reasons that
// don't reflect the link itself being bad (e.g. a transient read of the verifier
// cookie), so giving update-password its own shot before giving up avoids dead-ending
// a user whose link was, in fact, still good.
function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('認証を確認しています…')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const supabase = createClient()
      const next = searchParams.get('next') ?? '/'

      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const hashError = hashParams.get('error_description') || hashParams.get('error')

      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const otpType = searchParams.get('type') as EmailOtpType | null

      let succeeded = false
      let errorCode: string | undefined

      if (hashError) {
        console.error('[v0] Auth callback received an error in the URL fragment:', hashError)
        errorCode = hashParams.get('error_code') ?? hashError
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        succeeded = !error
        if (error) {
          console.error('[v0] setSession from URL fragment failed:', {
            name: error.name,
            status: error.status,
            code: error.code,
            message: error.message,
          })
          errorCode = error.code ?? error.name
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        succeeded = !error
        if (error) {
          console.error('[v0] exchangeCodeForSession failed:', {
            name: error.name,
            status: error.status,
            code: error.code,
            message: error.message,
          })
          errorCode = error.code ?? error.name
        }
      } else if (tokenHash && otpType) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
        succeeded = !error
        if (error) {
          console.error('[v0] verifyOtp failed:', {
            name: error.name,
            status: error.status,
            code: error.code,
            message: error.message,
          })
          errorCode = error.code ?? error.name
        }
      } else {
        console.error('[v0] Auth callback had no recognizable token in the URL.')
        errorCode = 'no_token_in_url'
      }

      if (cancelled) return

      if (succeeded) {
        // Email confirmation is required, but there is no admin-approval step: the moment
        // the user proves ownership of their email by landing here with a valid session,
        // their account should be usable. The signup trigger inserts the profile row with
        // status 'pending' (it can't know at insert time whether confirmation is required),
        // so flip it to 'active' now. Scoped to status=pending so it never resurrects an
        // account an admin has since suspended.
        const { data: userData } = await supabase.auth.getUser()
        if (userData.user) {
          const { error: activateError } = await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('id', userData.user.id)
            .eq('status', 'pending')
          if (activateError) {
            console.log('[v0] Failed to activate profile after email confirmation:', activateError.message)
          }
        }

        setMessage('認証が完了しました。移動しています…')
        router.replace(next)
      } else {
        const isRecovery = otpType === 'recovery' || hashParams.get('type') === 'recovery' || next.includes('update-password')

        if (isRecovery) {
          // Give /auth/update-password its own shot at establishing the session instead of
          // dead-ending here: forward the still-unused code/hash so its client-side logic
          // (see that page) can retry independently.
          const target = new URL(next, window.location.origin)
          if (code) target.searchParams.set('code', code)
          if (errorCode) target.searchParams.set('error', errorCode)
          router.replace(`${target.pathname}?${target.searchParams.toString()}${hash || ''}`)
          return
        }

        // `pkce_code_verifier_not_found` means the confirmation link was opened on a
        // different device/browser than the one that started sign-up (e.g. registered on a
        // PC, opened the email on a phone) — the code_verifier cookie only ever exists on
        // the originating browser. Supabase's hosted /verify step already confirms the
        // email server-side before it redirects here, so the account is not actually broken;
        // this device just can't finish creating a *local* session without that cookie.
        // Send the user to a friendly "already confirmed, please log in" landing instead of
        // the scary generic error page.
        if (errorCode === 'pkce_code_verifier_not_found') {
          router.replace('/auth/already-confirmed')
          return
        }

        // A `token_hash` verification (used once the email link is switched to the
        // cross-device-safe format, see /auth/confirm) failing for a signup/email
        // confirmation almost always means the link was already used previously — not that
        // it's newly invalid. Same friendly landing; recovery is handled separately above.
        if (tokenHash && (otpType === 'signup' || otpType === 'email')) {
          router.replace('/auth/already-confirmed')
          return
        }

        router.replace(errorCode ? `/auth/error?error=${encodeURIComponent(errorCode)}` : '/auth/error')
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; searchParams/router identity churn shouldn't re-trigger the exchange.
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <p className="text-sm text-muted-foreground">認証を確認しています…</p>
        </main>
      }
    >
      <AuthCallbackHandler />
    </Suspense>
  )
}
