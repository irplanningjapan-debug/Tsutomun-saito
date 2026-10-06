'use client'

import Image from 'next/image'
import { Search, Sparkles, Check } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { regionConfig } from '@/lib/knot/data'

export function HeroSection() {
  const { query, setQuery, setSearched, area, setArea, searched, searchedActivities } = useKnot()

  return (
    <section id="top" className="relative isolate overflow-hidden bg-sky-50/80">
      <Image src="/images/miyazaki-hero.png" alt="西都原古墳群の緑・菜の花や桜、米良の神楽" fill priority className="absolute inset-0 -z-10 object-cover opacity-20" />
      <div className="absolute inset-0 -z-10 bg-sky-50/75" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-16 lg:grid-cols-[1fr_0.85fr] lg:px-8 lg:pb-24 lg:pt-24">
        <div className="relative">
          {/* フクロウの背景透かし */}
          <div className="pointer-events-none absolute -top-8 -left-6 sm:left-4 w-72 h-72 sm:w-88 sm:h-88 opacity-[0.10] -z-10 select-none">
            <img
              src="/tsutomun_logo.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3.5 py-2 text-xs font-bold text-primary shadow-sm">
            <Sparkles size={14} /> 西都の魅力を体験・西都でワークする
          </div>
          <h1 className="max-w-xl text-balance text-4xl font-black leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            あなたの<span className="text-primary">「やってみたい」</span>が、<br />ここでつながる。
          </h1>
          <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            つとむんは西都市のワークとあなたの「やってみたい」を結ぶプラットフォーム。身近な地域で新しい出会いと挑戦を見つけよう
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-500">
            <span className="flex items-center gap-2"><Check size={16} className="text-primary" />登録無料</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-primary" />西都の体験・ワーク</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-primary" />初心者歓迎</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -right-3 -top-5 z-30 rotate-6 rounded-2xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-900 shadow-sm">SAITO LOCAL</div>
          <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60">
            <div className="relative h-36">
              <Image src="/SHIROMIKAGURA.jpg" alt="地域の暮らしを楽しむ人々" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              <p className="absolute bottom-4 left-5 text-sm font-black text-white">地域の「魅力」が見つかる</p>
            </div>
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-primary">ACTIVITY FINDER</p>
                  <h2 className="mt-1 text-xl font-black">何をしてみたい？</h2>
                </div>
                <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-xl">🔎</div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-sky-100">
                  <Search size={18} className="text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSearched(false) }}
                    placeholder="キーワードで検索"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <span className="text-base">📍</span>
                  <select
                    value={area}
                    onChange={(e) => { setArea(e.target.value); setSearched(false) }}
                    className="w-full bg-transparent text-sm font-semibold text-slate-600 outline-none"
                  >
                    <option value="">エリアを選択</option>
                    {regionConfig.groups.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.places.map((place) => (
                          <option key={place} value={place}>{regionConfig.prefecture} {place}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => {
                    setSearched(true)
                    requestAnimationFrame(() => document.getElementById('activities')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-md shadow-sky-200 transition hover:bg-sky-600"
                >
                  <Search size={17} />体験・ワークを探す
                </button>
              </div>
              {searched && <p className="mt-4 text-center text-xs font-bold text-primary">{searchedActivities.length}件が見つかりました</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="h-8 bg-white" style={{ clipPath: 'ellipse(65% 100% at 50% 100%)' }} />
    </section>
  )
}
