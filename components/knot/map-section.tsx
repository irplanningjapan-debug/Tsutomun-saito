'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'
import { ArrowRight, Map } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { formatEventDateTime, genres, regionConfig } from '@/lib/knot/data'
import { NoImagePlaceholder } from './no-image-placeholder'

// Leaflet reads from `window` at import time, so the map must never render on the
// server. Loading it via next/dynamic with ssr disabled keeps this page's own SSR intact.
const MunicipalityMap = dynamic(() => import('./leaflet-map').then((mod) => mod.MunicipalityMap), {
  ssr: false,
  loading: () => <div className="absolute inset-0 z-10 grid place-items-center bg-[#dff3f7] text-xs font-bold text-slate-400">地図を読み込み中…</div>,
})

export function MapSection() {
  const {
    mapGenre, setMapGenre, mapArea, setMapArea, setSelectedPoint, selectedPoint,
    visiblePoints, mapActivities, setSelectedActivity, backToBrowseFromMap,
  } = useKnot()

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-sky-50 px-5 py-10 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-primary">MIYAZAKI ACTIVITY MAP</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">宮崎の活動をマップで探す</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">気になるピンをタップすると、その地域の活動が表示されます。</p>
          </div>
          <button onClick={backToBrowseFromMap} className="inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2.5 text-xs font-black text-slate-600 shadow-sm hover:text-primary">
            <ArrowRight size={14} className="rotate-180" />通常のリスト表示へ
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            <span className="text-xs font-black text-primary">ジャンル</span>
            <select value={mapGenre} onChange={(event) => { setMapGenre(event.target.value); setSelectedPoint(null) }} className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-800 outline-none">
              <option>すべて</option>
              {genres.map((genre) => <option key={genre.label}>{genre.label}</option>)}
            </select>
          </label>
          <label className="flex flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
            <span className="text-xs font-black text-primary">エリア</span>
            <select
              value={mapArea}
              onChange={(event) => { setMapArea(event.target.value); setSelectedPoint(event.target.value === 'すべて' ? null : event.target.value) }}
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-800 outline-none"
            >
              <option>すべて</option>
              {regionConfig.groups.flatMap((group) => group.places).map((place) => <option key={place}>{place}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[540px] overflow-hidden rounded-[2rem] border border-sky-100 bg-[#dff3f7] shadow-sm">
            <div className="absolute left-4 right-4 top-4 z-20 rounded-xl bg-white/95 px-4 py-3 shadow-md">
              <p className="text-xs font-black text-primary"><Map size={13} className="mr-1 inline" />宮崎県 活動マップ</p>
              <p className="mt-1 text-[11px] text-slate-500">気になる市町村のピンをタップしてみましょう</p>
            </div>
            <MunicipalityMap points={visiblePoints} selectedArea={selectedPoint} onSelectArea={setSelectedPoint} />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-primary">ACTIVITY SPOTS</p>
                  <h2 className="mt-1 text-xl font-black">{selectedPoint || '県内の活動エリア'}</h2>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-primary">{mapActivities.length}件</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {visiblePoints.map((point) => (
                  <button
                    key={point.area}
                    onClick={() => setSelectedPoint(point.area)}
                    className={`rounded-full px-3 py-2 text-xs font-black ${selectedPoint === point.area ? 'bg-primary text-primary-foreground' : 'bg-slate-50 text-slate-600 hover:text-primary'}`}
                  >
                    {point.area} ({mapActivities.filter((activity) => activity.area === point.area).length})
                  </button>
                ))}
              </div>
            </div>
            {selectedPoint && mapActivities.filter((activity) => activity.area === selectedPoint).map((activity) => (
              <article
                key={activity.title}
                onClick={() => setSelectedActivity(activity)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex gap-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    {activity.image ? <Image src={activity.image} alt="" fill className="object-cover" /> : <NoImagePlaceholder compact />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-primary">{activity.genre.join(' · ')}</span>
                    <h3 className="mt-1 font-black leading-5 text-slate-900">{activity.title}</h3>
                    <p className="mt-2 text-xs font-bold text-slate-500">{formatEventDateTime(activity.date)} · {activity.area}</p>
                  </div>
                </div>
                <p className="mt-4 text-right text-xs font-black text-primary">詳細を見る <ArrowRight size={13} className="ml-1 inline" /></p>
              </article>
            ))}
            {!selectedPoint && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm font-bold leading-6 text-slate-500">
                地図上のピン、またはエリアタグを選ぶと<br />活動カードがここに表示されます。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
