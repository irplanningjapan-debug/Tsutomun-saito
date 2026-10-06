'use client'

import { ChevronDown } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { faqs } from '@/lib/knot/data'

export function FaqSection() {
  const { openFaq, setOpenFaq } = useKnot()

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
      <div className="text-center">
        <p className="text-sm font-black text-primary">FAQ</p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">よくある質問</h2>
      </div>
      <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
        {faqs.map(([question, answer], index) => (
          <div key={question}>
            <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold">
              <span>{question}</span>
              <ChevronDown size={18} className={`shrink-0 text-primary transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
            </button>
            {openFaq === index && <p className="pb-5 pr-8 text-sm leading-6 text-slate-500">{answer}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}

export function ContactFooterSection() {
  const { setContactSent, setLegalModal, setSupportHubOpen } = useKnot()

  return (
    <>
      <section id="contact" className="border-t border-sky-100 bg-sky-50/60 px-5 py-10 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-wide text-primary">OPERATOR CONTACT</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">つとむん運営窓口</h2>
          <p className="mt-1 text-sm text-slate-600">企画・運営: Tameni</p>
          </div>
          <button onClick={() => { setContactSent(false); setLegalModal('contact') }} className="text-left text-sm font-bold text-slate-600 hover:text-primary">
            掲載内容やサービスに関するお問い合わせは、運営窓口までご連絡ください。
          </button>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
           <a href="#top" className="text-xl font-black tracking-tight">西都 つとむん<span className="text-primary">.</span></a>
          <p className="mt-2 text-xs text-slate-500">あなたのやってみたいがここでつながる。</p>
          <p className="mt-3 text-xs font-bold text-slate-600">企画・運営: IRplanning</p>
          <p className="mt-1 text-xs text-slate-500">運営窓口: つとむんサポート</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
            <a href="#activities" className="hover:text-primary">体験・ワークを探す</a>
            <a href="#recruit" className="hover:text-primary">体験・ワークを掲載する</a>
            <a href="#how" className="hover:text-primary">つとむんについて</a>
            <button onClick={() => setSupportHubOpen(true)} className="hover:text-primary">サポート情報</button>
            <button onClick={() => { setContactSent(false); setLegalModal('contact') }} className="hover:text-primary">運営窓口・お問い合わせ</button>
            <button onClick={() => setLegalModal('privacy')} className="hover:text-primary">プライバシーポリシー</button>
            <button onClick={() => setLegalModal('terms')} className="hover:text-primary">利用規約</button>
          </div>
          <p className="text-xs text-slate-400">© 2026 つとむん</p>
        </div>
      </footer>
    </>
  )
}
