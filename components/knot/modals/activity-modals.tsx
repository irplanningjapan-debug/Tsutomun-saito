'use client'

import Image from 'next/image'
import { ArrowUpRight, Building2, CalendarDays, Clock3, Heart, MapPin, Phone, Users, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { formatDeadlineDateTime, formatEventDateTime, shortRecruitmentLabel } from '@/lib/knot/data'
import type { Activity } from '@/lib/knot/types'
import { NoImagePlaceholder } from '../no-image-placeholder'
import { ShareMenu } from '../share-menu'

// 「主催・運営団体」欄：団体名・ロゴ・紹介文を表示する。団体名が未登録の場合は表示しない。
function OrganizerSection({ activity }: { activity: Activity }) {
  if (!activity.organizerOrgName) return null
  return (
    <div className="mt-6 flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
        {activity.organizerLogoUrl ? (
          <Image src={activity.organizerLogoUrl} alt={`${activity.organizerOrgName}のロゴ`} width={48} height={48} className="size-full object-cover" />
        ) : (
          <Building2 size={20} className="text-primary" />
        )}
      </div>
      <div>
        <p className="text-xs font-black text-slate-400">主催・運営団体</p>
        <p className="mt-1 text-sm font-black text-slate-800">{activity.organizerOrgName}</p>
        {activity.organizerBio && <p className="mt-1.5 text-xs leading-5 text-slate-500">{activity.organizerBio}</p>}
      </div>
    </div>
  )
}

// Opens the organizer's registered reception contact ("見学・体験の受付先"), which can be a
// URL, an email address, or a phone number, using the appropriate handler for each. Falls
// back to a guidance popup when no contact has been registered yet.
function openInquiryContact(contact?: string) {
  const trimmed = contact?.trim()
  if (!trimmed) {
    window.alert('お問い合わせありがとうございます。主催者への連絡フォームを準備しています。')
    return
  }
  if (/^https?:\/\//i.test(trimmed)) {
    window.open(trimmed, '_blank', 'noopener,noreferrer')
    return
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    window.location.href = `mailto:${trimmed}`
    return
  }
  if (/^[0-9+\-()\s]{6,}$/.test(trimmed)) {
    window.location.href = `tel:${trimmed.replace(/[^0-9+]/g, '')}`
    return
  }
  window.alert(`主催者への連絡先：${trimmed}`)
}

export function ApplicationModal() {
  const { applicationModal, setApplicationModal, participantType, setParticipantType, adultCount, setAdultCount, childCount, setChildCount } = useKnot()
  if (!applicationModal) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setApplicationModal(null)}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">このイベントに申し込む</h2>
          <button type="button" onClick={() => setApplicationModal(null)} aria-label="閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm text-slate-500">{applicationModal.title}</p>
        <div className="mt-5 space-y-3">
          <input placeholder="お名前" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          <input type="email" placeholder="メールアドレス" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          <label className="block text-xs font-black text-slate-600">
            参加する方について
            <select value={participantType} onChange={(event) => setParticipantType(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal">
              <option value="family">ファミリー・親子ペア（家族単位）</option>
              <option value="infant">幼児（未就学児）と保護者</option>
              <option value="elementary_low">小学低学年（1〜3年生）</option>
              <option value="elementary_high">小学高学年（4〜6年生）</option>
              <option value="junior_high_high">中学生・高校生</option>
              <option value="adult">一般・大人</option>
              <option value="senior">シニア</option>
            </select>
          </label>
          {participantType === 'family' ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-black text-slate-600">
                大人
                <input type="number" min="0" value={adultCount} onChange={(event) => setAdultCount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal" />
              </label>
              <label className="text-xs font-black text-slate-600">
                子ども
                <input type="number" min="0" value={childCount} onChange={(event) => setChildCount(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal" />
              </label>
            </div>
          ) : (
            <input type="number" min="1" defaultValue="1" placeholder="参加人数" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          )}
          <textarea placeholder="質問・事前連絡（任意）" rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          <button type="button" onClick={() => setApplicationModal(null)} className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground">申し込む</button>
        </div>
      </div>
    </div>
  )
}

export function ActivityDetailModal() {
  const { selectedActivity, setSelectedActivity, favorites, setFavorites } = useKnot()
  if (!selectedActivity) return null
  const isFavorited = favorites.includes(selectedActivity.title)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={() => setSelectedActivity(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="activity-dialog-title" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative h-52 sm:h-64">
          {selectedActivity.image ? (
            <Image src={selectedActivity.image} alt={selectedActivity.title} fill className="object-cover" />
          ) : (
            <NoImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
          <button onClick={() => setSelectedActivity(null)} aria-label="詳細を閉じる" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"><X size={19} /></button>
          <ShareMenu activity={selectedActivity} className="absolute right-16 top-4" />
          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex flex-wrap gap-2">
              {selectedActivity.genre.map((label) => (
                <span key={label} className="rounded-full bg-white px-3 py-1 text-xs font-black text-primary">{label}</span>
              ))}
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{selectedActivity.area}</span>
            </div>
            <h2 id="activity-dialog-title" className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{selectedActivity.title}</h2>
            {(selectedActivity.recruitmentTypes && selectedActivity.recruitmentTypes.length > 0) || (selectedActivity.tags && selectedActivity.tags.length > 0) ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedActivity.recruitmentTypes?.map((type) => (
                  <span key={type} className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-900">{shortRecruitmentLabel(type)}</span>
                ))}
                {selectedActivity.tags
                  ?.filter((tag) => tag !== '参加者募集中')
                  .map((tag) => (
                    <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-black text-primary">#{tag}</span>
                  ))}
              </div>
            ) : null}
            {selectedActivity.timeSlots && selectedActivity.timeSlots.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedActivity.timeSlots.map((slot) => (
                  <span key={slot} className="rounded-full bg-slate-900/60 px-3 py-1 text-xs font-bold text-white">{slot}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-7 text-slate-600">{selectedActivity.description || '説明文は登録されていません。'}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <Users size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-black text-slate-400">対象年齢・レベル</p>
                <p className="mt-1 text-sm font-bold text-slate-700">
                  {/* audienceTags (already sorted into canonical order by mapDbActivityToActivity) reflects what
                      was actually selected in the form; the raw `audience` string is a legacy join that can
                      predate that sort, so prefer audienceTags whenever it's present. */}
                  {selectedActivity.level || `${selectedActivity.audienceTags?.join('・') || selectedActivity.audience}・初心者歓迎`}
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-black text-slate-400">活動日時</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{formatEventDateTime(selectedActivity.date)}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="text-lg leading-none text-primary">⌖</span>
              <div>
                <p className="text-xs font-black text-slate-400">活動場所</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{selectedActivity.venue || `${selectedActivity.area}の活動拠点`}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedActivity.venue || `${selectedActivity.area} 公民館`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary hover:underline"
                >
                  <MapPin size={13} />Googleマップで場所を見る
                </a>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="text-lg leading-none text-primary">￥</span>
              <div>
                <p className="text-xs font-black text-slate-400">参加費・月謝</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{selectedActivity.fee || '活動ごとにご確認ください'}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <span className="text-lg leading-none text-primary">＋</span>
            <div>
              <p className="text-xs font-black text-slate-400">持ち物・服装</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{selectedActivity.whatToBring || '動きやすい服装、飲み物'}</p>
            </div>
          </div>
          <OrganizerSection activity={selectedActivity} />
          <div className="mt-7">
            <p className="text-xs font-black tracking-wide text-primary">ACTIVITY STORY</p>
            <h3 className="mt-2 text-lg font-black text-slate-900">この活動について</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{selectedActivity.description || '説明文は登録されていません。'}</p>
          </div>
          {(selectedActivity.instagramUrl || selectedActivity.lineUrl || selectedActivity.websiteUrl) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {selectedActivity.instagramUrl && (
                <a
                  href={selectedActivity.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-primary hover:text-primary"
                >
                  Instagram
                </a>
              )}
              {selectedActivity.lineUrl && (
                <a
                  href={selectedActivity.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-primary hover:text-primary"
                >
                  LINE公式
                </a>
              )}
              {selectedActivity.websiteUrl && (
                <a
                  href={selectedActivity.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-primary hover:text-primary"
                >
                  公式Webサイト
                </a>
              )}
            </div>
          )}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button
              onClick={() =>
                setFavorites((current) =>
                  current.includes(selectedActivity.title) ? current.filter((item) => item !== selectedActivity.title) : [...current, selectedActivity.title],
                )
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-black hover:border-rose-300 hover:text-rose-500 ${isFavorited ? 'border-rose-300 text-rose-500' : 'border-slate-200 text-slate-600'}`}
            >
              <Heart size={17} fill={isFavorited ? 'currentColor' : 'none'} />お気に入り保存
            </button>
          <button
            onClick={() => openInquiryContact(selectedActivity.applicationUrl)}
            className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-sm hover:opacity-90"
          >
            体験・見学の申込・お問い合わせ
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EventDetailModal() {
  const { selectedEvent, setSelectedEvent, openParticipation } = useKnot()
  if (!selectedEvent) return null
  const isExternalIntake = selectedEvent.intakeMethod === 'external'

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" onClick={() => setSelectedEvent(null)}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">イベント・体験会</span>
              {selectedEvent.genre.map((label) => (
                <span key={label} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-primary">{label}</span>
              ))}
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight">{selectedEvent.title}</h2>
            {(selectedEvent.recruitmentTypes && selectedEvent.recruitmentTypes.length > 0) || (selectedEvent.tags && selectedEvent.tags.length > 0) ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedEvent.recruitmentTypes?.map((type) => (
                  <span key={type} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">{shortRecruitmentLabel(type)}</span>
                ))}
                {selectedEvent.tags
                  ?.filter((tag) => tag !== '参加者募集中')
                  .map((tag) => (
                    <span key={tag} className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-primary">#{tag}</span>
                  ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ShareMenu activity={selectedEvent} />
            <button onClick={() => setSelectedEvent(null)} aria-label="イベント詳細を閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 rounded-2xl bg-sky-50 p-4 text-sm font-bold text-slate-700">
          <p><CalendarDays size={16} className="mr-2 inline text-primary" />{formatEventDateTime(selectedEvent.date)}</p>
          <p><MapPin size={16} className="mr-2 inline text-primary" />{selectedEvent.venue || selectedEvent.area}</p>
          <p>参加費：{selectedEvent.fee}</p>
          <p>募集定員：{selectedEvent.capacity}</p>
          <p>申込締切：{formatDeadlineDateTime(selectedEvent.deadline)}</p>
        </div>
        <p className="mt-5 text-sm leading-7 text-slate-600">{selectedEvent.description}</p>
        <OrganizerSection activity={selectedEvent} />
        {isExternalIntake ? (
          <div className="mt-6 space-y-2.5">
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold leading-5 text-amber-800">この活動は主催者独自のフォーム・電話での受付となります。</p>
            {selectedEvent.applicationUrl && (
              <a
                href={selectedEvent.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground"
              >
                外部フォームで申し込む <ArrowUpRight size={16} />
              </a>
            )}
            {selectedEvent.applicationPhone && (
              <a
                href={`tel:${selectedEvent.applicationPhone.replace(/[^0-9+]/g, '')}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3.5 text-sm font-black text-slate-700"
              >
                <Phone size={16} />電話で申し込む（{selectedEvent.applicationPhone}）
              </a>
            )}
          </div>
        ) : (
          <button onClick={() => openParticipation(selectedEvent)} className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground">参加について申し込む</button>
        )}
      </div>
    </div>
  )
}
