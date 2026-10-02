'use client'

import { useKnot } from '@/lib/knot/store'
import { ActivityCard } from './activity-card'

export function ActivitiesSection() {
  const { activeTab, setActiveTab, searchedActivities, tabActivities, searched, setSearched, setQuery, setArea } = useKnot()

  const resetSearch = () => {
    setQuery('')
    setArea('')
    setSearched(false)
  }

  return (
    <section id="activities" className="scroll-mt-20 bg-white px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-primary">FIND YOUR TSUTOMUN</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                {searched ? `検索結果：${searchedActivities.length}件` : '西都のおすすめ体験・ワーク'}
              </h2>
              {searched && (
                <button
                  onClick={resetSearch}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-500 hover:border-primary hover:text-primary"
                >
                  絞り込み解除（全件表示に戻す）
                </button>
              )}
            </div>
          </div>
          <div className="flex rounded-full bg-slate-50 p-1 shadow-sm">
            {['おすすめ', '新着', '近くの体験・ワーク'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold sm:px-4 ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-slate-500 hover:text-primary'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tabActivities.map((activity) => <ActivityCard key={activity.title} activity={activity} />)}
        </div>
      </div>
    </section>
  )
}
