'use client'

import { useRef, useState, type RefObject } from 'react'
import { Check, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { formatDeadlineDateTime, formatEventDateTime, genres, recruitmentOptions, regionConfig } from '@/lib/knot/data'
import { NoImagePlaceholder } from '@/components/knot/no-image-placeholder'
import { LegalConsentCheckbox } from '@/components/knot/modals/legal-consent-checkbox'
import { compressImageFile } from '@/lib/knot/image-utils'

// Small, consistent visual markers so users can tell at a glance which fields
// they must fill in versus which are optional, instead of relying on inline
// "(必須)"/"(任意)" text buried inside placeholders that disappear once typed in.
function RequiredBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
      必須
    </span>
  )
}

function OptionalBadge() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400">
      任意
    </span>
  )
}

export function RegistrationModal() {
  const {
    isRegistrationOpen, closeRegistration, registrationSubmitted, registrationPreview, setRegistrationPreview,
    registration, updateRegistration, eventListingType, setEventListingType, eventExpiryMode, setEventExpiryMode,
    registrationError, setRegistrationError, registrationPhoto, setRegistrationPhoto,
    selectedAudiences, setSelectedAudiences, audienceDetails, setAudienceDetails,
    selectedTags, setSelectedTags, customTag, setCustomTag, tagOptions, audienceOptions,
    listingExpiry, setListingExpiry, recruitmentTypes, toggleRecruitmentType,
    selectedTimeSlots, toggleTimeSlot, activityTimeSlotOptions,
    intakeMethod, setIntakeMethod, applicationUrl, setApplicationUrl, applicationPhone, setApplicationPhone,
    submitRegistration, newActivities, setWithdrawnTitles, registrationSubmitting,
    organizationProfile,
  } = useKnot()

  // Refs to the required inputs so we can smooth-scroll to and focus the first
  // one that's missing when the user tries to submit an incomplete form.
  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const venueRef = useRef<HTMLInputElement>(null)
  const eventDateRef = useRef<HTMLInputElement>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showAgreementError, setShowAgreementError] = useState(false)
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false)

  const clearFieldError = (key: string) => {
    setFieldErrors((current) => {
      if (!(key in current)) return current
      const { [key]: _removed, ...rest } = current
      return rest
    })
  }

  const errorInputClass = (key: string) =>
    fieldErrors[key] ? 'border-rose-400 ring-2 ring-rose-100 focus:border-rose-400' : 'border-slate-200 focus:border-primary'

  if (!isRegistrationOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={() => closeRegistration()}>
      <div role="dialog" aria-modal="true" aria-labelledby="registration-title" onClick={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
          <div>
            <p className="text-xs font-black text-primary">FOR ORGANIZERS</p>
            <h2 id="registration-title" className="mt-1 text-xl font-black">体験・ワークを掲載する</h2>
          </div>
          <button onClick={() => closeRegistration()} aria-label="フォームを閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600"><X size={18} /></button>
        </div>

        {registrationSubmitted ? (
          <div className="px-6 py-16 text-center sm:px-8">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={30} /></div>
            <h3 className="mt-6 text-2xl font-black">掲載申請を受け付けました</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">入力内容を確認のうえ、掲載についてご連絡します。</p>
            <button onClick={() => closeRegistration()} className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground">一覧へ戻る</button>
            {newActivities.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('本当にこの掲載を取り下げますか？（一覧から非表示になります）')) {
                    setWithdrawnTitles((current) => [...current, newActivities[0].title])
                    closeRegistration()
                  }
                }}
                className="mt-4 block w-full text-center text-sm font-bold text-red-600 underline underline-offset-4"
              >
                この掲載を取り下げる（削除）
              </button>
            )}
          </div>
        ) : registrationPreview ? (
          <div className="px-6 py-7 sm:px-8">
            <p className="text-xs font-black text-primary">掲載後の表示イメージ</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-40 bg-slate-100">
                {registrationPhoto ? (
                  <img src={registrationPhoto || '/placeholder.svg'} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <NoImagePlaceholder />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5 pr-16">
                  {registration.genre.map((label) => (
                    <span key={label} className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700">{label}</span>
                  ))}
                </div>
                {eventListingType === 'event' && (
                  <span className="absolute right-3 top-3 rounded-lg bg-primary px-2 py-1 text-[10px] font-black text-primary-foreground">{formatEventDateTime(registration.eventDate) || '日時未定'}</span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-black leading-6 text-slate-900">{registration.title || '（タイトル未入力）'}</h3>
                  {eventListingType === 'event' && <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-black text-sky-700">イベント</span>}
                </div>
                <p className="mt-2 text-xs font-bold text-slate-500">
                  {registration.area} · {eventListingType === 'event' ? formatEventDateTime(registration.eventDate) || '日時未定' : registration.schedule || '日時未定'}
                </p>
                {(selectedTags.length > 0 || recruitmentTypes.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...selectedTags, ...recruitmentTypes.map((item) => item.replace('募集', ''))].map((tag) => (
                      <span key={tag} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-primary">参加費 {registration.fee || '未入力'}</span>
                  {eventListingType === 'event' && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">定員 {registration.capacity ? `${registration.capacity}${(registration as any).capacityUnit || '人'}` : '未設定'}</span>}
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-sky-50 p-5">
              <p className="text-xs font-black text-primary">入力内容の詳細確認</p>
              <h3 className="mt-2 text-xl font-black">{registration.title}</h3>
              <p className="mt-2 text-xs font-bold text-slate-500">{registration.genre.join(' · ')} / {registration.area}</p>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{registration.description}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                {eventListingType === 'regular' && <p><b>日時：</b>{registration.schedule || '未入力'}</p>}
                <p><b>場所：</b>{registration.venue || '未入力'}</p>
                <p><b>対象：</b>{selectedAudiences.join('・') || registration.audience}{audienceDetails ? `（${audienceDetails}）` : ''}</p>
                {selectedTimeSlots.length > 0 && <p><b>主な時間帯：</b>{selectedTimeSlots.join('・')}</p>}
                <p><b>参加費：</b>{registration.fee || '未入力'}</p>
                {registration.feeDetail && <p><b>参加費の詳細：</b>{registration.feeDetail}</p>}
                {registration.belongings && <p><b>持ち物：</b>{registration.belongings}</p>}
                {eventListingType === 'event' && (
                  <>
                    <p><b>開催日時：</b>{formatEventDateTime(registration.eventDate) || '未入力'}</p>
                    <p><b>募集定員:</b>{registration.capacity ? `${registration.capacity}${(registration as any).capacityUnit || '人'}` : '未入力'}</p>
                    <p><b>申込締切：</b>{formatDeadlineDateTime(registration.deadline) || '未入力'}</p>
                  </>
                )}
                {registration.website && <p><b>団体企業ホームページ：</b>{registration.website}</p>}
                {registration.instagram && <p><b>Instagram：</b>{registration.instagram}</p>}
                {registration.line && <p><b>公式LINE：</b>{registration.line}</p>}
                {applicationUrl && <p><b>体験・ワークの受付先URL：</b>{applicationUrl}</p>}
              </div>
            </div>
            {registrationError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{registrationError}</p>}
            <div className="mt-5">
              <LegalConsentCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} showError={showAgreementError} />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setRegistrationPreview(false)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600">入力に戻る</button>
              <button
                onClick={() => {
                  if (!agreedToTerms) {
                    setShowAgreementError(true)
                    return
                  }
                  setShowAgreementError(false)
                  submitRegistration()
                }}
                disabled={registrationSubmitting}
                className="rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {registrationSubmitting ? '送信中…' : 'この内容で申請する'}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const missing: Record<string, string> = {}
              if (!registration.title.trim()) {
                missing.title = eventListingType === 'event' ? 'イベント・体験会名を入力してください' : '体験名・ワーク名を入力してください'
              }
              if (!registration.description.trim()) {
                missing.description = '体験・ワークの説明を入力してください'
              }
              if (!registration.venue.trim()) {
                missing.venue = eventListingType === 'event' ? '開催場所を入力してください' : '活動場所を入力してください'
              }
              if (eventListingType === 'event' && !registration.eventDate.trim()) {
                missing.eventDate = '開催日時を入力してください'
              }
              if (Object.keys(missing).length > 0) {
                setFieldErrors(missing)
                setRegistrationError(`未入力の必須項目が${Object.keys(missing).length}件あります。赤枠の項目をご確認ください。`)
                const order = ['title', 'description', 'venue', 'eventDate'] as const
                const firstKey = order.find((key) => key in missing)
                const refMap: Record<string, RefObject<HTMLInputElement | null> | RefObject<HTMLTextAreaElement | null>> = {
                  title: titleRef,
                  description: descriptionRef,
                  venue: venueRef,
                  eventDate: eventDateRef,
                }
                const target = firstKey ? refMap[firstKey]?.current : null
                target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                target?.focus()
                return
              }
              setFieldErrors({})
              setRegistrationError('')
              setRegistrationPreview(true)
            }}
            className="space-y-6 px-6 py-7 sm:px-8"
          >
            <p className="text-sm leading-6 text-slate-500">地域の仲間へ、地域活動や体験・ワーク募集をかんたんに届けることができます。</p>
            <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <legend className="text-sm font-black text-slate-900">掲載タイプを選択</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEventListingType('regular')}
                  className={`rounded-2xl border-2 p-4 text-left transition ${eventListingType === 'regular' ? 'border-primary bg-white text-primary shadow-sm' : 'border-transparent bg-white text-slate-600'}`}
                >
                  <span className="block text-sm font-black">定期的な体験・ワークを掲載</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">地域活動や保存会活動、サポート活動など</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEventListingType('event')}
                  className={`rounded-2xl border-2 p-4 text-left transition ${eventListingType === 'event' ? 'border-primary bg-sky-50 text-primary shadow-sm' : 'border-transparent bg-white text-slate-600'}`}
                >
                  <span className="block text-sm font-black">単発体験・ワークを掲載</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">1日体験会・ワークショップ・お祭りなど</span>
                </button>
              </div>
            </fieldset>
            {(registrationError || Object.keys(fieldErrors).length > 0) && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                <p>{registrationError || '入力内容をご確認ください。'}</p>
                {Object.keys(fieldErrors).length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-bold">
                    {Object.values(fieldErrors).map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <fieldset className="space-y-4">
              <legend className="text-base font-black">1. 基本情報</legend>
              <div>
                <label htmlFor="registration-title-input" className="mb-2 flex items-center text-xs font-black text-slate-700">
                  {eventListingType === 'event' ? '体験会・ワーク名' : '活動・体験・ワーク名'}
                  <RequiredBadge />
                </label>
                <input
                  id="registration-title-input"
                  ref={titleRef}
                  value={registration.title}
                  onChange={(event) => {
                    updateRegistration('title', event.target.value)
                    clearFieldError('title')
                  }}
                  placeholder={eventListingType === 'event' ? '例：親子で楽しむ神楽太鼓の1日体験会' : '例：神楽体験会、ゆず取り体験'}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${errorInputClass('title')}`}
                  aria-invalid={Boolean(fieldErrors.title)}
                />
                {fieldErrors.title && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.title}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="mb-2 flex items-center text-xs font-black text-slate-500">掲載ジャンル<OptionalBadge /></p>
                  <div className="flex max-h-28 gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
                    {genres.map((genre) => (
                      <button
                        type="button"
                        key={genre.label}
                        onClick={() => updateRegistration('genre', genre.label)}
                        className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${registration.genre.includes(genre.label) ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'}`}
                      >
                        {genre.icon} {genre.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="registration-area" className="mb-2 flex items-center text-xs font-black text-slate-500">掲載エリア<RequiredBadge /></label>
                  <select id="registration-area" value={registration.area} onChange={(event) => updateRegistration('area', event.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary">
                    {regionConfig.groups.flatMap((group) => group.places).map((place) => <option key={place}>{place}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>
            <fieldset className="space-y-4">
              <legend className="text-base font-black">2. 体験・ワーク内容</legend>
              <div>
                <p className="mb-2 flex items-center text-xs font-black text-slate-500">参考写真<OptionalBadge /></p>
                <label className="group relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/60 transition hover:border-primary hover:bg-sky-50">
                  {isCompressingPhoto ? (
                    <span className="text-center text-sm font-bold text-slate-500">画像を圧縮しています…</span>
                  ) : registrationPhoto ? (
                    <>
                      <img src={registrationPhoto || '/placeholder.svg'} alt="選択した参考写真のプレビュー" className="absolute inset-0 h-full w-full bg-white object-contain" />
                      <span className="absolute inset-x-0 bottom-0 bg-slate-900/60 py-1.5 text-center text-[11px] font-bold text-white opacity-0 transition group-hover:opacity-100">タップして写真を変更</span>
                    </>
                  ) : (
                    <span className="text-center text-sm font-bold text-slate-500">
                      参考の写真、またはチラシ・ポスター画像<br /><span className="mt-1 block text-xs font-normal">JPEG / PNG形式、最大10MB推奨</span><span className="mt-1 block text-xs font-normal">またはタップして写真を選択</span>
                      <span className="mt-2 block text-[11px] font-normal text-slate-400">スマホで撮ったチラシ写真でもきれいに掲載できます</span>
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isCompressingPhoto}
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      setIsCompressingPhoto(true)
                      // Resize to <=1000px and re-encode as JPEG on the client before it
                      // ever touches state or the network — an uncompressed phone photo's
                      // base64 string was previously large enough to hit Supabase's
                      // statement timeout on INSERT. If compression fails for any reason,
                      // fall back to no photo rather than blocking the whole submission.
                      const compressed = await compressImageFile(file)
                      setRegistrationPhoto(compressed ?? '')
                      setIsCompressingPhoto(false)
                    }}
                  />
                </label>
              </div>
              <div>
                <label htmlFor="registration-description" className="mb-2 flex items-center text-xs font-black text-slate-500">体験・ワークの説明<RequiredBadge /></label>
                <textarea
                  id="registration-description"
                  ref={descriptionRef}
                  value={registration.description}
                  onChange={(event) => {
                    updateRegistration('description', event.target.value)
                    clearFieldError('description')
                  }}
                  placeholder="例：地域の子どもから大人まで楽しめる体験です。初心者も大歓迎！"
                  rows={5}
                  className={`w-full resize-y rounded-xl border px-4 py-3 text-sm leading-6 outline-none ${errorInputClass('description')}`}
                  aria-invalid={Boolean(fieldErrors.description)}
                />
                {fieldErrors.description && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.description}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {eventListingType === 'event' && (
                  <div className="grid gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:grid-cols-2">
                    <p className="text-xs font-bold leading-5 text-sky-900 sm:col-span-2">掲載期間は開催日または申込締切日までです。開催日を過ぎたものは、一覧から自動的に非公開または受付終了になります。</p>
                    <div className="sm:col-span-2">
                      <p className="mb-2 flex items-center text-xs font-black text-slate-700">掲載終了タイミング<RequiredBadge /></p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="rounded-xl border border-sky-200 bg-white p-3 text-sm font-bold">
                          <input type="radio" name="eventExpiryMode" checked={eventExpiryMode === 'event'} onChange={() => setEventExpiryMode('event')} className="mr-2 accent-primary" />開催当日まで掲載
                        </label>
                        <label className="rounded-xl border border-sky-200 bg-white p-3 text-sm font-bold">
                          <input type="radio" name="eventExpiryMode" checked={eventExpiryMode === 'deadline'} onChange={() => setEventExpiryMode('deadline')} className="mr-2 accent-primary" />申込締切日まで掲載（締切が過ぎたら自動非公開）
                        </label>
                      </div>
                    </div>
                    <label className="block text-xs font-black text-slate-700">
                      <span className="flex items-center">開催日時<RequiredBadge /></span>
                      <input
                        ref={eventDateRef}
                        value={registration.eventDate}
                        onChange={(event) => {
                          updateRegistration('eventDate', event.target.value)
                          clearFieldError('eventDate')
                        }}
                        type="datetime-local"
                        aria-label="開催日時（必須）"
                        title="開催日と開始時間（例: 2026/10/12 10:00）"
                        className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm font-normal outline-none ${errorInputClass('eventDate')}`}
                        aria-invalid={Boolean(fieldErrors.eventDate)}
                      />
                      {fieldErrors.eventDate && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.eventDate}</p>}
                    </label>
                    <label className="block text-xs font-black text-slate-700">
                      <span className="flex items-center">申込締切日<OptionalBadge /></span>
                      <input
                        type="datetime-local"
                        value={registration.deadline}
                        onChange={(event) => updateRegistration('deadline', event.target.value)}
                        aria-label="申込締切日（任意）"
                        title="受付を締め切る日時（例: 2026/10/08 23:59）"
                        placeholder="受付を締め切る日時（例: 2026/10/08 23:59）"
                        className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-primary"
                      />
                    </label>
                    <div>
                      <label htmlFor="registration-fee-event" className="mb-2 flex items-center text-xs font-black text-slate-700">費用・賃金等<OptionalBadge /></label>
                      <input id="registration-fee-event" value={registration.fee} onChange={(event) => updateRegistration('fee', event.target.value)} placeholder="例：無料、1家族500円" className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                  <label htmlFor="registration-capacity" className="mb-2 flex items-center justify-between text-xs font-black text-slate-700">
                    <span>募集定員<OptionalBadge /></span>
                    <span className="text-[11px] font-normal text-slate-500">※数字のみ入力</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="registration-capacity"
                      type="number"
                      min="1"
                      value={registration.capacity}
                      onChange={(event) => updateRegistration('capacity', event.target.value)}
                      placeholder="例: 20"
                      className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-primary"
                    />
                    <select
                      value={(registration as any).capacityUnit || '人'}
                      onChange={(event) => updateRegistration('capacityUnit' as any, event.target.value)}
                      className="shrink-0 rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="人">人</option>
                      <option value="組">組</option>
                    </select>
                  </div>
                </div>
                    <div className="sm:col-span-2">
                      <p className="mb-2 flex items-center text-xs font-black text-slate-700">申込の受付方法<RequiredBadge /></p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="rounded-xl border border-sky-200 bg-white p-3 text-sm font-bold">
                          <input type="radio" name="intakeMethod" checked={intakeMethod === 'knot'} onChange={() => setIntakeMethod('knot')} className="mr-2 accent-primary" />
                          つとむん受付（このアプリ内で申込を受け付ける）
                        </label>
                        <label className="rounded-xl border border-sky-200 bg-white p-3 text-sm font-bold">
                          <input type="radio" name="intakeMethod" checked={intakeMethod === 'external'} onChange={() => setIntakeMethod('external')} className="mr-2 accent-primary" />
                          外部独自フォーム（Googleフォームなど）で受け付ける
                        </label>
                      </div>
                      {intakeMethod === 'external' && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label htmlFor="registration-application-url" className="mb-2 flex items-center text-xs font-black text-slate-700">外部申込フォームURL<OptionalBadge /></label>
                            <input
                              id="registration-application-url"
                              type="url"
                              value={applicationUrl}
                              onChange={(event) => setApplicationUrl(event.target.value)}
                              placeholder="例：Googleフォームのリンク"
                              className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label htmlFor="registration-application-phone" className="mb-2 flex items-center text-xs font-black text-slate-700">申込受付用の電話番号<OptionalBadge /></label>
                            <input
                              id="registration-application-phone"
                              type="tel"
                              value={applicationPhone}
                              onChange={(event) => setApplicationPhone(event.target.value)}
                              placeholder="例：0983-xx-xxxx"
                              className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                            />
                          </div>
                          <p className="text-xs leading-5 text-slate-500 sm:col-span-2">フォームURLまたは電話番号のいずれかをご入力ください。こちらの受付先から直接申し込みます。</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {eventListingType === 'regular' && (
                  <>
                    <div className="sm:col-span-2">
                      <label htmlFor="registration-schedule" className="mb-2 flex items-center text-xs font-black text-slate-500">実施頻度・日時<OptionalBadge /></label>
                      <input id="registration-schedule" value={registration.schedule} onChange={(event) => updateRegistration('schedule', event.target.value)} placeholder="例：毎週水曜 19:00〜21:00" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                      <p className="mb-2 mt-3 flex items-center text-xs font-black text-slate-500">主な時間帯（複数選択可）<OptionalBadge /></p>
                      <div className="flex flex-wrap gap-2">
                        {activityTimeSlotOptions.map((slot) => (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => toggleTimeSlot(slot)}
                            aria-pressed={selectedTimeSlots.includes(slot)}
                            className={`rounded-full border px-3 py-2 text-xs font-black transition ${selectedTimeSlots.includes(slot) ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="registration-fee-regular" className="mb-2 flex items-center text-xs font-black text-slate-500">費用・賃金等<OptionalBadge /></label>
                      <input id="registration-fee-regular" value={registration.fee} onChange={(event) => updateRegistration('fee', event.target.value)} placeholder="例：月額1,000円・無料・月給20万円・時給1200円など" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                    </div>
                  </>
                )}
                <div className="sm:col-span-2">
                  <p className="mb-2 flex items-center text-xs font-black text-slate-500">募集対象・条件<OptionalBadge /></p>
                  <div className="flex flex-wrap gap-2">
                    {audienceOptions.map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setSelectedAudiences((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]))}
                        className={`rounded-full border px-3 py-2 text-xs font-black transition ${selectedAudiences.includes(option) ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  <label className="mt-3 block text-xs font-black text-slate-500">
                    <span className="flex items-center">詳しい対象条件・年齢など<OptionalBadge /></span>
                    <input value={audienceDetails} onChange={(event) => setAudienceDetails(event.target.value)} placeholder="例：定年後の方、親子ペア参加限定、経験1年以上など" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-primary" />
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="registration-venue" className="mb-2 flex items-center text-xs font-black text-slate-500">
                  {eventListingType === 'event' ? '開催場所' : '実施場所'}
                  <RequiredBadge />
                </label>
                <input
                  id="registration-venue"
                  ref={venueRef}
                  value={registration.venue}
                  onChange={(event) => {
                    updateRegistration('venue', event.target.value)
                    clearFieldError('venue')
                  }}
                  placeholder="例：○○公民館"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none ${errorInputClass('venue')}`}
                  aria-invalid={Boolean(fieldErrors.venue)}
                />
                {fieldErrors.venue && <p className="mt-1.5 text-xs font-bold text-rose-600">{fieldErrors.venue}</p>}
              </div>
              <div>
                <p className="mb-2 flex items-center text-xs font-black text-slate-500">費用・賃金等の詳細<OptionalBadge /></p>
                <input
                  value={registration.feeDetail}
                  onChange={(event) => updateRegistration('feeDetail', event.target.value)}
                  placeholder={eventListingType === 'event' ? '例：小学生以下は半額、材料費1,000円が別途必要です' : '例：初回体験は無料、家族2人目から半額など'}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <p className="mb-2 flex items-center text-xs font-black text-slate-500">持ち物・準備するもの<OptionalBadge /></p>
                <input
                  value={registration.belongings}
                  onChange={(event) => updateRegistration('belongings', event.target.value)}
                  placeholder="例：動きやすい服装、タオル、飲み物"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <p className="mb-2 flex items-center text-xs font-black text-slate-500">ワークの特徴タグ<OptionalBadge /></p>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]))}
                      className={`rounded-full border px-3 py-2 text-xs font-black transition ${selectedTags.includes(tag) ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
                {selectedTags.filter((tag) => !tagOptions.includes(tag)).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTags.filter((tag) => !tagOptions.includes(tag)).map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setSelectedTags((current) => current.filter((item) => item !== tag))}
                        aria-label={`カスタムタグ「${tag}」を削除`}
                        className="rounded-full border border-primary bg-primary/10 px-3 py-2 text-xs font-black text-primary"
                      >
                        #{tag} <X size={12} className="ml-1 inline" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <input value={customTag} onChange={(event) => setCustomTag(event.target.value)} placeholder="自由なタグを追加" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                  <button
                    type="button"
                    onClick={() => {
                      const tag = customTag.trim().replace(/^#/, '')
                      if (tag && !selectedTags.includes(tag)) setSelectedTags((current) => [...current, tag])
                      setCustomTag('')
                    }}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-700"
                  >
                    追加
                  </button>
                </div>
              </div>
            </fieldset>
            {eventListingType === 'regular' && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <label className="block text-sm font-black text-slate-800">
                  <span className="flex items-center">掲載有効期限<RequiredBadge /></span>
                  <input
                    type="date"
                    value={listingExpiry}
                    onChange={(event) => setListingExpiry(event.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-primary"
                  />
                </label>
                <p className="mt-2 text-xs leading-5 text-slate-500">登録日から最長1年間です。情報の鮮度を保つため、最長1年ごとに更新・継続手続きをお願いしております（更新案内は登録メールへ通知されます）。</p>
              </div>
            )}
            {eventListingType === 'regular' && (
              <fieldset className="space-y-4">
                <legend className="text-base font-black">3. 募集種別（複数選択可）</legend>
                <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
                  <p className="mb-3 flex items-center text-xs font-black text-slate-700">どんな仲間を募集していますか？<OptionalBadge /></p>
                  <div className="grid gap-3">
                    {recruitmentOptions.map((option) => (
                      <label key={option} className="flex cursor-pointer items-start gap-3 text-sm font-bold text-slate-700">
                        <input type="checkbox" checked={recruitmentTypes.includes(option)} onChange={() => toggleRecruitmentType(option)} className="mt-0.5 size-4 accent-primary" />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
                <legend className="pt-2 text-base font-black">4. 団体企業の公式リンク・見学窓口（公開情報）</legend>
                <p className="-mt-2 text-xs leading-5 text-slate-500">ワークを検討する方に公開される情報です。見学・体験の受付先も入力できます。</p>
                <div>
                  <label htmlFor="registration-website" className="mb-2 flex items-center text-xs font-black text-slate-500">団体会社ホームページURL<OptionalBadge /></label>
                  <input id="registration-website" value={registration.website} onChange={(event) => updateRegistration('website', event.target.value)} placeholder="例：https://example.com" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="registration-instagram" className="mb-2 flex items-center text-xs font-black text-slate-500">Instagram URL<OptionalBadge /></label>
                    <input id="registration-instagram" value={registration.instagram} onChange={(event) => updateRegistration('instagram', event.target.value)} placeholder="例：https://instagram.com/xxxx" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label htmlFor="registration-line" className="mb-2 flex items-center text-xs font-black text-slate-500">公式LINE URL<OptionalBadge /></label>
                    <input id="registration-line" value={registration.line} onChange={(event) => updateRegistration('line', event.target.value)} placeholder="例：https://line.me/xxxx" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label htmlFor="registration-application-url-regular" className="mb-2 flex items-center text-xs font-black text-slate-500">体験・ワークの受付先<OptionalBadge /></label>
                  <input
                    id="registration-application-url-regular"
                    value={applicationUrl}
                    onChange={(event) => setApplicationUrl(event.target.value)}
                    placeholder="例：メール・電話・フォームURLなど"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </div>
              </fieldset>
            )}
            <fieldset className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center text-sm font-black text-slate-800">
                  {eventListingType === 'regular' ? '5. ' : '3. '}運営確認用・申請者情報（非公開）
                  <OptionalBadge />
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">株式会社Tameniが掲載内容の確認に使用します。※この情報は一般には公開されません。ログイン中のアカウント情報が登録済みの場合は自動入力されます（未入力でも申請できます）。</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-black text-slate-500">
                    団体企業名・お名前
                    {organizationProfile.name ? (
                      <input
                        value={registration.contactName}
                        readOnly
                        disabled
                        aria-label="団体企業名（自動入力・変更不可）"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                      />
                    ) : (
                      <>
                        <input
                          value={registration.contactName}
                          onChange={(event) => updateRegistration('contactName', event.target.value)}
                          placeholder="例：〇〇株式会社"
                          aria-label="団体企業名・お名前"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-primary"
                        />
                        <span className="mt-1.5 block text-[11px] font-bold leading-4 text-amber-600">マイページに未登録です。こちらに直接入力するか、マイページから登録してください。</span>
                      </>
                    )}
                  </label>
                  <label className="block text-xs font-black text-slate-500">
                    メールアドレス
                    {organizationProfile.email ? (
                      <input
                        type="email"
                        value={registration.contactEmail}
                        readOnly
                        disabled
                        aria-label="確認用連絡先メールアドレス（自動入力・変更不可）"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                      />
                    ) : (
                      <>
                        <input
                          type="email"
                          value={registration.contactEmail}
                          onChange={(event) => updateRegistration('contactEmail', event.target.value)}
                          placeholder="例：info@example.com"
                          aria-label="確認用連絡先メールアドレス"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-primary"
                        />
                        <span className="mt-1.5 block text-[11px] font-bold leading-4 text-amber-600">マイページに未登録です。こちらに直接入力するか、マイページから登録してください。</span>
                      </>
                    )}
                  </label>
                </div>
                <label className="mt-3 block text-xs font-black text-slate-500">
                  電話番号
                  {organizationProfile.phone ? (
                    <input
                      value={registration.phone}
                      readOnly
                      disabled
                      aria-label="電話番号（自動入力・変更不可）"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600 outline-none"
                    />
                  ) : (
                    <>
                      <input
                        value={registration.phone}
                        onChange={(event) => updateRegistration('phone', event.target.value)}
                        placeholder="例：0983-xx-xxxx"
                        aria-label="電話番号"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-700 outline-none focus:border-primary"
                      />
                      <span className="mt-1.5 block text-[11px] font-bold leading-4 text-amber-600">マイページに未登録です。ご記入いただくと連絡がスムーズです。</span>
                    </>
                  )}
                </label>
              </div>
            </fieldset>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => closeRegistration()} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-600">キャンセル</button>
              <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground">掲載内容を確認する</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
