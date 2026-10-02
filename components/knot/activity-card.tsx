'use client'

import Image from 'next/image'
import { Building2, Heart, MapPin } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { shortRecruitmentLabel, formatEventDateTime } from '@/lib/knot/data'
import type { Activity } from '@/lib/knot/types'
import { NoImagePlaceholder } from './no-image-placeholder'
import { ShareMenu } from './share-menu'

export function ActivityCard({ activity }: { activity: Activity }) {
  const { setSelectedActivity, setSelectedEvent, favorites, setFavorites, applicantCounts } = useKnot()
  const isFavorited = favorites.includes(activity.title)
  const favoriteCount = (activity.favoriteCount ?? 0) + (isFavorited ? 1 : 0)
  const isEvent = activity.listingType === 'event'

  return (
    <article
      onClick={() => (isEvent ? setSelectedEvent(activity) : setSelectedActivity(activity))}
      className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      {/* Image is clipped in its own layer so the share menu's dropdown (a sibling) can
          escape the rounded corners instead of being cut off by overflow-hidden. */}
      <div className="relative h-40">
        <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
          {activity.image ? (
            <Image src={activity.image} alt={activity.title} fill className="object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <NoImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
        </div>
        {activity.area && (
          <span className="absolute left-4 top-3 z-10 inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-700 shadow-sm">
            <MapPin size={11} />{activity.area}
          </span>
        )}
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5 pr-16">
          {activity.genre.map((label) => (
            <span key={label} className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700">{label}</span>
          ))}
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation()
            setFavorites((current) => (current.includes(activity.title) ? current.filter((item) => item !== activity.title) : [...current, activity.title]))
          }}
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-black ${isFavorited ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
          aria-label={`${activity.title}をお気に入り${isFavorited ? 'から削除' : 'に追加'}`}
        >
          <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
          {favoriteCount}
        </button>
        <ShareMenu activity={activity} className="absolute right-14 top-3" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black leading-6 text-slate-900">{activity.title}</h3>
          {activity.listingType === 'event' && <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-black text-sky-700">イベント</span>}
        </div>
        {activity.organizerOrgName && (
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <Building2 size={11} className="shrink-0" />
            <span className="truncate">{activity.organizerOrgName}</span>
          </p>
        )}
        {(activity.recruitmentTypes && activity.recruitmentTypes.length > 0) || (activity.tags && activity.tags.length > 0) ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activity.recruitmentTypes?.map((type) => (
              <span key={type} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">{shortRecruitmentLabel(type)}</span>
            ))}
            {activity.tags
              ?.filter((tag) => tag !== '参加者募集中')
              .map((tag) => (
                <span key={tag} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-primary">#{tag}</span>
              ))}
          </div>
        ) : null}
        {activity.timeSlots && activity.timeSlots.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activity.timeSlots.map((slot) => (
              <span key={slot} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{slot}</span>
            ))}
          </div>
        )}
        {activity.audienceTags && activity.audienceTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activity.audienceTags.map((tag) => (
              <span key={tag} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{tag}</span>
            ))}
          </div>
        )}
        {activity.description && <p className="mt-3 text-xs leading-5 text-slate-500">{activity.description}</p>}
        {activity.listingType === 'event' && (
          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-sky-100 bg-sky-50 p-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-black text-sky-800">
              <span className="mr-2 inline-block rounded-full bg-sky-600 px-2 py-1 text-white">
                {activity.intakeMethod === 'external' ? '外部フォーム受付中' : 'KNOT受付中'}
              </span>
              申込 {applicantCounts[activity.title] ?? 0}組 / 定員 {activity.capacity || '未定'}
            </p>
          </div>
        )}
        {!activity.description && (
          <p className="mt-3 text-xs font-bold text-slate-500">{activity.area} · {formatEventDateTime(activity.date)} · {activity.members}</p>
        )}
      </div>
    </article>
  )
}
