import Link from 'next/link'

// 別デバイス（PCで登録→スマホでリンク開封 等）でメール確認リンクを開いた場合や、
// 一度使用済みの確認リンクを再度開いた場合の着地点。
// Supabase Auth はメール確認リンクを踏んだ時点でサーバー側のメール確認自体は完了させる
// ため、この端末でセッションを再現できなかった（PKCEのcode_verifierが無い等）だけで
// あり、実際には認証は成功している。ユーザーを驚かせる「リンクが無効です」エラーでは
// なく、ログインへ誘導する優しい案内にする。
export default function AlreadyConfirmedPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">✅</div>
        <h1 className="mt-4 text-xl font-black text-slate-900">メール確認は完了しています</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          すでに認証が完了しています。お手数ですが、この画面からログインしてください。
        </p>
        <Link
          href="/?auth=login"
          className="mt-7 block w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground"
        >
          ログイン画面へ
        </Link>
        <Link href="/" className="mt-3 block w-full text-sm font-black text-slate-500 hover:text-primary">
          トップへ戻る
        </Link>
      </div>
    </main>
  )
}
