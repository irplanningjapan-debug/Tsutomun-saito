'use client'

import { ArrowRight, CalendarDays, MessageCircle, Search, Sparkles, Star, Users } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'

const steps: [string, string, string, typeof Search][] = [
  ['01', '興味のある活動を探す', '気になるジャンルやキーワードから、参加したい活動を見つけよう。', Search],
  ['02', '参加してみる', '詳細を確認して、参加ボタンをタップ。あとは当日を待つだけ。', CalendarDays],
  ['03', '仲間と楽しむ', '同じ「好き」を持つ仲間と、かけがえのない時間を過ごそう。', Star],
]

export function RecruitSection() {
  const { openRegistration, openContact } = useKnot()

  return (
    <section id="recruit" className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
      <div className="rounded-[2rem] bg-[#1d82f5] p-7 text-white sm:p-10 lg:p-14">
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-sm font-black tracking-wide text-slate-900">FOR ORGANIZERS</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">あなたのやってみたいが<br />ここでつながる。</h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-sky-50">一緒に楽しむ仲間を集めたい人へ。KNOTなら、興味の近い人にあなたの活動を届けられます。</p>
            <button onClick={openRegistration} className="mt-7 rounded-full bg-white px-6 py-3 text-sm font-black text-[#1d82f5] shadow-lg shadow-sky-900/20 transition hover:shadow-xl hover:shadow-amber-400/40">
              活動・イベントを掲載する <ArrowRight className="ml-1 inline" size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-300/40 bg-white/15 p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-400 text-slate-900"><MessageCircle size={21} /></div>
              <p className="mt-6 text-sm font-bold">気軽に募集</p>
              <p className="mt-1 text-xs leading-5 text-sky-50/90">フォームに入力するだけで、すぐに募集を始められます。</p>
            </div>
            <div className="rounded-2xl border border-amber-300/40 bg-white/15 p-5 sm:mt-8">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-400 text-slate-900"><Users size={21} /></div>
              <p className="mt-6 text-sm font-bold">仲間が見つかる</p>
              <p className="mt-1 text-xs leading-5 text-sky-50/90">あなたの活動に興味のある人とつながれます。</p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-5 rounded-2xl border border-amber-300/40 bg-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-400 text-slate-900"><Sparkles size={22} /></div>
            <div>
              <p className="font-black">活動の事務局業務やIT・AI活用でお困りですか？</p>
              <p className="mt-1.5 max-w-xl text-xs leading-5 text-sky-50/90">ホームページ制作、チラシ・デザイン作成、助成金申請書類、AI導入まで。地域の活動を続けるための裏方業務を「タメニ（Tameni）」が伴走サポートします。</p>
            </div>
          </div>
          <button
            onClick={() => openContact('🤝 事務局・ITサポート相談')}
            className="shrink-0 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-amber-300"
          >
            事務局サポートについて相談する（無料）
          </button>
        </div>
      </div>
    </section>
  )
}

export function HowSection() {
  const { openBrowse } = useKnot()

  return (
    <section id="how" className="bg-sky-50/70 px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-black text-primary">HOW IT WORKS</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">KNOTのはじめ方</h2>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {steps.map(([number, title, desc, Icon]) => (
            <div key={number} className="relative text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-primary shadow-sm"><Icon size={25} /></div>
              <span className="mt-4 block text-xs font-black tracking-widest text-primary">STEP {number}</span>
              <h3 className="mt-2 font-black">{title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <button onClick={() => openBrowse(null)} className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-black text-primary-foreground shadow-md">
            すべての活動を見る <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </section>
  )
}
