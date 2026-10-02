import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  // `error` comes from the URL, so it's attacker-controlled. Only render it when it looks
  // like a Supabase error code, never as free text someone could choose as phishing copy.
  const code = params?.error
  const isErrorCode = typeof code === 'string' && /^[a-z0-9_]{1,64}$/.test(code)

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h1 className="text-xl font-black">リンクが無効か期限切れです</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          お手数ですが、もう一度メールアドレス・パスワードでログインし、再度お手続きください。
        </p>
        {isErrorCode && <p className="mt-3 text-xs text-slate-400">エラーコード: {code}</p>}
        <Link
          href="/?auth=login"
          className="mt-7 block w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground"
        >
          ログイン画面へ戻る
        </Link>
        <Link href="/" className="mt-3 block w-full text-sm font-black text-slate-500 hover:text-primary">
          トップへ戻る
        </Link>
      </div>
    </main>
  )
}
