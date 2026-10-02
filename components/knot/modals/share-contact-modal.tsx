'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'

export function ShareContactModal() {
  const {
    shareContactTarget,
    closeShareContactModal,
    shareContactForm,
    updateShareContactForm,
    shareContactSubmitting,
    shareContactSent,
    shareContactError,
    submitShareContact,
  } = useKnot()

  if (!shareContactTarget) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={closeShareContactModal}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-primary">「{shareContactTarget.title}」への問い合わせ</p>
            <h2 className="mt-1 text-xl font-black">投稿者に連絡する</h2>
          </div>
          <button onClick={closeShareContactModal} aria-label="モーダルを閉じる" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {shareContactSent ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 size={40} className="text-emerald-500" />
            <p className="font-black text-slate-900">送信しました</p>
            <p className="text-sm leading-6 text-slate-500">投稿者に問い合わせ内容をお送りしました。ご返信をお待ちください。</p>
            <button onClick={closeShareContactModal} className="mt-2 rounded-full bg-slate-100 px-6 py-2.5 text-sm font-black text-slate-700">
              閉じる
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <label className="text-xs font-black text-slate-500">お名前</label>
              <input
                value={shareContactForm.senderName}
                onChange={(event) => updateShareContactForm({ senderName: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500">メールアドレス</label>
              <input
                type="email"
                value={shareContactForm.senderEmail}
                onChange={(event) => updateShareContactForm({ senderEmail: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500">電話番号（任意）</label>
              <input
                value={shareContactForm.senderPhone}
                onChange={(event) => updateShareContactForm({ senderPhone: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500">メッセージ</label>
              <textarea
                value={shareContactForm.message}
                onChange={(event) => updateShareContactForm({ message: event.target.value })}
                rows={4}
                placeholder="希望条件や受け渡し方法など、伝えたいことをご記入ください"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            {shareContactError && <p className="text-sm font-bold text-rose-600">{shareContactError}</p>}

            <button
              onClick={submitShareContact}
              disabled={shareContactSubmitting}
              className="w-full rounded-full bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
            >
              {shareContactSubmitting ? '送信中...' : '送信する'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
