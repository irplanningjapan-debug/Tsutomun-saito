'use client'

import { ArrowRight } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { genres } from '@/lib/knot/data'

export function GenresSection() {
  const { openBrowse } = useKnot()

  return (
    <section id="genres" className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm font-black text-primary">BROWSE BY GENRE</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">気になるジャンルから探す</h2>
        </div>
        <button onClick={() => openBrowse(null)} className="hidden items-center gap-1 text-sm font-bold text-primary sm:flex">すべて見る <ArrowRight size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {genres.map((genre) => (
          <button
            onClick={() => openBrowse(genre.label)}
            key={genre.label}
            className={`group rounded-2xl p-5 text-left ${genre.color} transition hover:-translate-y-1 hover:shadow-md`}
          >
            <span className="text-3xl">{genre.icon}</span>
            <p className="mt-4 text-sm font-black">{genre.label}</p>
            <p className="mt-1 text-xs leading-5 opacity-70">{genre.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black">一覧を見る <ArrowRight size={11} /></span>
          </button>
        ))}
      </div>
    </section>
  )
}
