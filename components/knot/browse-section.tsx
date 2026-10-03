'use client'

import { ArrowRight, Map } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { genres, regionConfig } from '@/lib/knot/data'
import { ActivityCard } from './activity-card'

export function BrowseSection() {
  const {
    browseGenre, setBrowseGenre, setAudience, setSchedule, browseActivities, regionCounts, setArea, audience, schedule,
    setViewMode, setMapArea, setSelectedPoint, scheduleFilterOptions,
  } = useKnot()

  const openOnMap = (place: string) => {
    setViewMode('map')
    setMapArea(place)
    setSelectedPoint(place)
  }

  return (
    <section id="browse" className="scroll-mt-20 bg-slate-50 px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-primary">WORKS DIRECTORY</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {browseGenre ? (browseGenre === '地域・伝統文化' ? '地域・伝統文化・神楽' : browseGenre) : '西都の体験・ワーク一覧'}
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {browseGenre ? `${browseActivities.length}件の活動を、地域と条件から探せます` : 'ジャンルや地域をまたいで、すべての体験・ワークを探せます'}
            </p>
          </div>
          <button
            onClick={() => { setBrowseGenre(null); setAudience('すべて'); setSchedule('すべて'); document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:border-primary hover:text-primary sm:self-auto"
          >
            <ArrowRight size={14} className="rotate-180" />トップに戻る
          </button>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {genres.map((genre) => (
            <button
              key={genre.label}
              onClick={() => setBrowseGenre(genre.label)}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black transition ${browseGenre === genre.label ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-500 shadow-sm hover:text-primary'}`}
            >
              {genre.icon} {genre.label}
            </button>
          ))}
          <button
            onClick={() => setBrowseGenre(null)}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black ${!browseGenre ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-500 shadow-sm'}`}
          >
            すべての体験・ワーク
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-primary">WHERE TO FIND</p>
                <h3 className="mt-1 text-lg font-black">西都市内のエリア</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-primary">{Object.keys(regionCounts).length}エリア</span>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-slate-900 shadow-sm hover:bg-amber-500"
                >
                  <Map size={13} />マップで見る
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(regionCounts).map(([place, count]) => (
                <button
                  key={place}
                  onClick={() => { setArea(place); openOnMap(place) }}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  {place} ({count})
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {regionConfig.groups.map((group) => {
                const groupActivities = browseActivities.filter((item) => group.places.includes(item.area))
                const placeCounts = group.places.map((place) => ({
                  place,
                  count: browseActivities.filter((item) => item.area === place).length,
                }))
                const activePlaces = placeCounts.filter((entry) => entry.count > 0)
                return (
                  <div key={group.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-black text-slate-700">{group.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{groupActivities.length}件の体験・ワーク</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activePlaces.length > 0 ? (
                        activePlaces.map(({ place, count }) => (
                          <button
                            key={place}
                            type="button"
                            onClick={() => { setArea(place); openOnMap(place) }}
                            className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-primary shadow-sm ring-1 ring-primary/15 transition hover:bg-primary hover:text-primary-foreground"
                          >
                            {place} ({count})
                          </button>
                        ))
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">まだ体験・ワークがありません</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black text-primary">REFINE YOUR SEARCH</p>
            <h3 className="mt-1 text-lg font-black">条件で絞り込む</h3>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-500">対象年代</span>
                <select value={audience} onChange={(event) => setAudience(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-primary">
                  <option>すべて</option>
                  {['幼児', '小学生', '高生', '一般', 'シニア'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-500">曜日・時間帯</span>
                <select value={schedule} onChange={(event) => setSchedule(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-primary">
                  {scheduleFilterOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <button onClick={() => { setAudience('すべて'); setSchedule('すべて') }} className="text-xs font-bold text-primary hover:underline">条件をリセット</button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-primary">MATCHING WORKS</p>
            <h3 className="mt-1 text-xl font-black">{browseGenre ? 'このジャンルの体験・ワーク' : 'すべての体験・ワーク'}</h3>
          </div>
          <span className="text-xs font-bold text-slate-400">{browseActivities.length}件</span>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {browseActivities.map((activity) => <ActivityCard key={activity.title} activity={activity} />)}
        </div>
        {browseActivities.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-black">条件に合う体験・ワークがありません</p>
            <button onClick={() => { setAudience('すべて'); setSchedule('すべて') }} className="mt-3 text-sm font-bold text-primary">条件をリセットする</button>
          </div>
        )}
      </div>
    </section>
  )
}
