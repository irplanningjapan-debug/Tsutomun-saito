'use client'

import { ArrowRight, Building2, HandCoins, HandHeart, Hotel, Plus, Stethoscope, UtensilsCrossed } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'

const categories: [string, string, string, typeof Building2][] = [
  ['facility', '施設・練習場所', '体育館、公民館、グラウンドなど', Building2],
  ['catering', 'お弁当・仕出し', '合宿やイベント用の手配先', UtensilsCrossed],
  ['medical', '医療・休日当番医', 'もしもの安心', Stethoscope],
  ['grant', '助成金・支援', '活動資金や補助制度', HandCoins],
  ['stay', '宿泊・滞在', '合宿所やゲストハウスなど', Hotel],
]

export function SupportInfoSection() {
  const { setSupportHubOpen, setSupportHubTab, openContact, openShareBoard } = useKnot()

  const openCategory = (tab: string) => {
    setSupportHubTab(tab)
    setSupportHubOpen(true)
  }

  return (
    <section id="support-info" className="border-b border-sky-100 bg-sky-50/60">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="text-center">
          <p className="inline-flex rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-black tracking-wide text-primary">地域の活動をみんなで支える</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">宮崎の活動サポート便利帳</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            イベントの練習場所、仕出し弁当、もしもの休日当番医、助成金まで。地域の活動に必要なリアルな情報をまとめています。あなたの知っているおすすめ情報の推薦もお待ちしています！
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map(([tab, label, description, Icon]) => (
            <button
              key={tab}
              onClick={() => openCategory(tab)}
              className="group flex flex-col items-start rounded-2xl border border-sky-100 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-primary hover:shadow-md"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-sky-100 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon size={20} />
              </div>
              <p className="mt-4 text-sm font-black text-slate-900">{label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-primary">一覧を見る <ArrowRight size={12} /></span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <button
            onClick={openShareBoard}
            className="group flex w-full flex-col items-start gap-1 rounded-2xl border border-emerald-100 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600 transition group-hover:bg-emerald-500 group-hover:text-white">
                <HandHeart size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">ゆずりあい・貸し借り（ゆずりあい掲示板）</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">活動で使うテントや備品を、地域のみんなで貸し借り・譲り合い</p>
              </div>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 sm:mt-0">掲示板を見る <ArrowRight size={12} /></span>
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => openContact('📌 サポート情報の推薦/掲載')}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-black text-primary-foreground shadow-md shadow-primary/20 transition hover:shadow-lg"
          >
            <Plus size={17} /> サポート情報の推薦／掲載
          </button>
        </div>
      </div>
    </section>
  )
}
