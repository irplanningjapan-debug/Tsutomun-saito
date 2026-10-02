import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// クロスデバイス対応のメール確認エンドポイント。
//
// `/auth/callback` の PKCE (`?code=...`) 交換は、サインアップを開始した端末のブラウザに
// 保存された code_verifier クッキーが無いと失敗する（PC で登録 → スマホでリンクを開く、
// のようなケースで発生する pkce_code_verifier_not_found エラーの原因）。
//
// このルートは Supabase の `token_hash` ベースの OTP 検証
// (`supabase.auth.verifyOtp({ token_hash, type })`) を使う。この方式はローカルに保存した
// シークレットに依存しないため、確認メールのリンクをどの端末・ブラウザで開いても
// サーバーサイドで確実に認証を完了できる。
//
// 有効化するには、Supabase Dashboard の Authentication > Email Templates >
// 「Confirm signup」のリンクを `{{ .ConfirmationURL }}` から下記のような形式に変更する:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      // メール確認が必要な運用だが承認ステップは無いため、確認が取れた時点で
      // profiles.status を pending → active に更新する（/auth/callback と同じ処理）。
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        await supabase.from('profiles').update({ status: 'active' }).eq('id', userData.user.id).eq('status', 'pending')
      }
      redirect(next)
    }

    console.error('[v0] /auth/confirm verifyOtp failed:', { code: error.code, message: error.message })

    // recovery（パスワード再設定）だけは update-password 側に自力での再試行チャンスを
    // 与える。それ以外（signup/email/magiclink）は、既に一度使用済みのリンクを
    // 再度開いた可能性が高いため、驚かせるエラー画面ではなくログイン誘導にする。
    if (type === 'recovery') {
      redirect(`/auth/update-password?error=${encodeURIComponent(error.code ?? error.name)}`)
    }
    redirect('/auth/already-confirmed')
  }

  redirect('/auth/error')
}
