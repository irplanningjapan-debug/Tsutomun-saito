'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseActivityCalendarDate } from '@/lib/knot/data'
import type { Activity } from '@/lib/knot/types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function EventsCalendar({
  activities,
  onSelect,
}: {
  activities: Activity[]
  onSelect: (activity: Activity) => void
}) {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const itemsByDay = useMemo(() => {
    const map = new Map<string, Activity[]>()
    for (const activity of activities) {
      const date = parseActivityCalendarDate(activity)
      if (!date) continue
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const list = map.get(key) ?? []
      list.push(activity)
      map.set(key, list)
    }
    return map
  }, [activities])

  const weeks = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startOffset = firstOfMonth.getDay()
    const gridStart = new Date(year, month, 1 - startOffset)
    const days: Date[] = Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index))
    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) result.push(days.slice(i, i + 7))
    return result
  }, [cursor])

  const monthLabel = `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          aria-label="前の月へ"
          className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-base font-black text-slate-900 sm:text-lg">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          aria-label="次の月へ"
          className="grid size-9 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary hover:text-primary"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-xs font-black text-slate-400">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {weeks.flatMap((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const inMonth = day.getMonth() === cursor.getMonth()
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            const dayItems = itemsByDay.get(key) ?? []
            const isToday = isSameDay(day, today)

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`min-h-[4.5rem] rounded-xl border p-1 text-left sm:min-h-24 sm:p-1.5 ${
                  inMonth ? 'border-slate-100 bg-white' : 'border-transparent bg-slate-50/50'
                }`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-black ${
                    isToday ? 'bg-primary text-primary-foreground' : inMonth ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayItems.slice(0, 2).map((activity, index) => (
                    <button
                      key={`${activity.title}-${index}`}
                      type="button"
                      onClick={() => onSelect(activity)}
                      title={activity.title}
                      className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-bold leading-tight transition hover:opacity-80 ${
                        activity.listingType === 'event' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {activity.title}
                    </button>
                  ))}
                  {dayItems.length > 2 && <p className="px-1.5 text-[10px] font-bold text-slate-400">+{dayItems.length - 2}件</p>}
                </div>
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
