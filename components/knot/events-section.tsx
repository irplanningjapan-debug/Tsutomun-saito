'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { CalendarDays, LayoutList, MapPin } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { parseActivityCalendarDate, formatEventDateBadge, formatEventDateTime, isActivityListingExpired } from '@/lib/knot/data'
import type { Activity } from '@/lib/knot/types'
import { EventsCalendar } from './events-calendar'
import { NoImagePlaceholder } from './no-image-placeholder'

export function EventsSection() {
  const { allActivities, setSelectedEvent, setSelectedActivity } = useKnot()
  const [displayMode, setDisplayMode] = useState<'card' | 'calendar'>('card')

  const events = allActivities.filter((item) => item.listingType === 'event' && !isActivityListingExpired(item))

  const calendarActivities = useMemo(() => {
    const seen = new Set<string>()
    const combined = [...events, ...allActivities]
    const result: Activity[] = []
    for (const activity of combined) {
      if (seen.has(activity.title)) continue
      if (!parseActivityCalendarDate(activity)) continue
      seen.add(activity.title)
      result.push(activity)
    }
    return result
  }, [events, allActivities])

  const handleSelect = (activity: Activity) => {
    if (activity.listingType === 'event') {
      setSelectedEvent(activity)
    } else {
      setSelectedActivity(activity)
    }
  }

  return (
    <section id="events" className="bg-sky-50/60 px-5 py-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-black text-primary">UPCOMING EVENTS</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">近日開催の体験会・ワーク</h2>
          </div>
          <button
            type="button"
            onClick={() => setDisplayMode((mode) => (mode === 'card' ? 'calendar' : 'card'))}
            aria-label={displayMode === 'card' ? '月間カレンダー表示に切り替える' : 'カード一覧表示に切り替える'}
            aria-pressed={displayMode === 'calendar'}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-sky-200 bg-white text-primary shadow-sm transition hover:border-primary hover:bg-sky-50"
          >
            {displayMode === 'card' ? <CalendarDays size={22} /> : <LayoutList size={22} />}
          </button>
        </div>

        {displayMode === 'card' ? (
          <div key="card" className="mt-7 grid animate-in fade-in slide-in-from-bottom-2 gap-4 duration-300 md:grid-cols-2">
            {events.map((event) => (
              <button
                key={event.title}
                onClick={() => setSelectedEvent(event)}
                className="group flex gap-4 rounded-2xl border border-sky-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl">
                  {event.image ? (
                    <Image src={event.image} alt="" fill className="object-cover" />
                  ) : (
                    <NoImagePlaceholder compact />
                  )}
                  <span className="absolute top-2 left-2 z-10 whitespace-nowrap rounded-lg bg-primary px-2 py-1 text-[10px] font-black leading-none text-primary-foreground shadow-sm">
                    {formatEventDateBadge(event.eventDate)}
                  </span>
                  {event.area && (
                    <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-0.5 whitespace-nowrap rounded-lg bg-slate-900/85 px-2 py-1 text-[10px] font-black leading-none text-white shadow-sm">
                      <MapPin size={10} />{event.area}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black leading-6 text-slate-900">{event.title}</h3>
                  <p className="mt-2 text-xs font-bold text-slate-500">{formatEventDateTime(event.eventDate || event.date)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-primary">参加費 {event.fee}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{event.capacity}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div key="calendar" className="mt-7 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <EventsCalendar activities={calendarActivities} onSelect={handleSelect} />
          </div>
        )}
      </div>
    </section>
  )
}
