'use client'

import { useState } from 'react'
import { combineBirthdateParts, parseBirthdateParts } from '@/lib/knot/data'

const CURRENT_YEAR = new Date().getFullYear()
const years = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => CURRENT_YEAR - i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const days = Array.from({ length: 31 }, (_, i) => i + 1)

export function BirthdateSelect({
  value,
  onChange,
  className = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-primary',
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  // The combined `value` only exists once all three parts are chosen, so the selects
  // keep their own draft state seeded from `value` once, rather than deriving from it
  // on every render — otherwise picking just the year would immediately revert to
  // blank because the (still incomplete) combined value is empty.
  const [parts, setParts] = useState(() => parseBirthdateParts(value))
  const { year, month, day } = parts

  const update = (nextYear: string, nextMonth: string, nextDay: string) => {
    setParts({ year: nextYear, month: nextMonth, day: nextDay })
    onChange(combineBirthdateParts(nextYear, nextMonth, nextDay))
  }

  return (
    <div className="mt-1.5 grid grid-cols-3 gap-2">
      <select
        aria-label="生年月日（年）"
        value={year}
        onChange={(event) => update(event.target.value, month, day)}
        className={className}
      >
        <option value="">年</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
      <select
        aria-label="生年月日（月）"
        value={month}
        onChange={(event) => update(year, event.target.value, day)}
        className={className}
      >
        <option value="">月</option>
        {months.map((m) => (
          <option key={m} value={String(m).padStart(2, '0')}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="生年月日（日）"
        value={day}
        onChange={(event) => update(year, month, event.target.value)}
        className={className}
      >
        <option value="">日</option>
        {days.map((d) => (
          <option key={d} value={String(d).padStart(2, '0')}>
            {d}
          </option>
        ))}
      </select>
    </div>
  )
}
