'use client'

import { useKnot } from '@/lib/knot/store'

// Shared consent control used on every form that submits personal data
// (signup, activity registration, participation applications, contact).
// Opens the same LegalModal used by the footer links so the terms/privacy
// text only lives in one place.
export function LegalConsentCheckbox({
  checked,
  onChange,
  showError = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  showError?: boolean
}) {
  const { setLegalModal } = useKnot()

  return (
    <div>
      <label
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs font-bold leading-5 ${
          showError ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={showError}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          <button type="button" onClick={() => setLegalModal('terms')} className="font-black text-primary underline underline-offset-2">
            利用規約
          </button>
          および
          <button type="button" onClick={() => setLegalModal('privacy')} className="font-black text-primary underline underline-offset-2">
            プライバシーポリシー
          </button>
          に同意する
        </span>
      </label>
      {showError && <p className="mt-1.5 text-xs font-bold text-rose-600">利用規約およびプライバシーポリシーへの同意が必要です</p>}
    </div>
  )
}
