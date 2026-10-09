'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LayoutDashboard, LogOut, Mail, Pencil, RefreshCw, Trash2, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { formatEventDateTime, genres, getDaysUntilExpiry, isActivityListingExpired, memberTypeOptions, volunteerIntentOptions } from '@/lib/knot/data'
import { BirthdateSelect } from '@/components/knot/modals/birthdate-select'
import { NoImagePlaceholder } from '@/components/knot/no-image-placeholder'
import type { Activity, ShareItem } from '@/lib/knot/types'

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

// 掲載期限バッジ用に「YYYY年MM月DD日」形式で表示する。
function formatJapaneseDate(dateInput: string): string {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return '未設定'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

const shareItemStatusBadgeStyle: Record<ShareItem['status'], string> = {
  受付中: 'bg-emerald-50 text-emerald-700',
  '解決済み・終了': 'bg-slate-100 text-slate-500',
}

function formatShareItemCreatedAt(createdAt?: string): string {
  if (!createdAt) return '未設定'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '未設定'
  return formatJapaneseDate(createdAt)
}

// マイページ内「ゆずりあい投稿の管理」セクション。ログイン中の自分が投稿した
// share_items のみを一覧表示し、編集・解決済み化・削除をその場で行えるようにする。
function MyShareListingsSection() {
  const {
    myShareItems, myShareItemsLoading, openShareItemForm, deleteShareItem, toggleShareItemStatus, openShareBoard,
    shareItemActionError,
  } = useKnot()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-primary">ゆずりあい投稿の管理</p>
        <button
          type="button"
          onClick={() => openShareItemForm()}
          className="rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground"
        >
          ＋ 新しく投稿する
        </button>
      </div>
      {shareItemActionError && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{shareItemActionError}</p>
      )}
      <div className="mt-3 space-y-3">
        {myShareItemsLoading ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">読み込み中です...</p>
        ) : myShareItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            <p>まだ投稿がありません。</p>
            <button type="button" onClick={openShareBoard} className="mt-2 text-xs font-black text-primary hover:underline">
              ゆずりあい・貸し借り掲示板を見る
            </button>
          </div>
        ) : (
          myShareItems.map((item) => {
            const isResolved = item.status === '解決済み・終了'
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{item.type}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{item.municipality}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${shareItemStatusBadgeStyle[item.status]}`}>{item.status}</span>
                </div>
                <h3 className="mt-2 font-black text-slate-900">{item.title}</h3>
                <p className="mt-1 text-xs text-slate-500">投稿日：{formatShareItemCreatedAt(item.createdAt)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openShareItemForm(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs font-black text-primary">
                    <Pencil size={13} />編集する
                  </button>
                  <button
                    onClick={() => toggleShareItemStatus(item)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                  >
                    <Mail size={13} />{isResolved ? '受付中に戻す' : '解決済みにする（受付終了）'}
                  </button>
                  <button
                    onClick={() => {
                      if (item.id && window.confirm('この投稿を削除しますか？')) deleteShareItem(item.id)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={13} />削除する
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

export function MyPageModal() {
  const {
    myPageOpen, setMyPageOpen, organizationProfile, isAdmin, setMyPageTab, openRegistration,
    myListings, withdrawnTitles, reuseListing, deleteMyListing, setApplicantListActivity, applicantCounts, signOut,
    myEventApplications, myCircleApplications, myApplicationsLoading, leaveCircleApplication,
    setRenewalTarget,
  } = useKnot()
  const [listingsSection, setListingsSection] = useState<'activities' | 'share'>('activities')
  if (!myPageOpen) return null

  const listings = myListings
  const hasApplications = myEventApplications.length > 0 || myCircleApplications.length > 0

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" onClick={() => setMyPageOpen(false)}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMyPageOpen(false)}
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 hover:bg-amber-100"
          >
            <span className="inline-flex items-center gap-2 text-sm font-black">
              <LayoutDashboard size={16} />
              管理者メニュー：管理ダッシュボードを開く
            </span>
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black leading-none text-white">ADMIN</span>
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-4">
              <button type="button" onClick={() => setMyPageOpen(false)} className="block text-sm font-bold text-primary">← トップ画面へ戻る</button>
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-primary"
              >
                <LogOut size={14} />ログアウト
              </button>
            </div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-sky-50/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-primary">{organizationProfile.accountKind === 'organization' ? '団体企業基本情報' : '会員基本情報'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">{organizationProfile.name || '未設定'}</h2>
                    {organizationProfile.memberTypes.map((type) => (
                      <span key={type} className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{organizationProfile.kana}</p>
                </div>
                <button type="button" onClick={() => setMyPageTab('profile')} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-primary shadow-sm">基本情報を編集</button>
              </div>
              {organizationProfile.accountKind === 'organization' ? (
                <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>所在地：{organizationProfile.address || '未設定'}</p>
                  <p>代表連絡先：{organizationProfile.phone || '未設定'} / {organizationProfile.email}</p>
                  <p>担当者：{organizationProfile.contactName || '未設定'} / {organizationProfile.contactPhone}</p>
                  <p>担当者連絡先：{organizationProfile.contactEmail || '未設定'}</p>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>メールアドレス：{organizationProfile.email}</p>
                  <p>電話番号：{organizationProfile.phone || '未設定'}</p>
                  <p>お住まいの地域：{organizationProfile.address || '未設定'}</p>
                  <p>生年月日：{organizationProfile.birthdate ? organizationProfile.birthdate.replace(/-/g, '/') : '未設定'}</p>
                </div>
              )}
              {organizationProfile.accountKind === 'organization' && (organizationProfile.website || organizationProfile.social) && (
                <div className="mt-3 flex gap-3 text-xs font-bold text-primary">
                  {organizationProfile.website && <a href={organizationProfile.website} target="_blank" rel="noreferrer">HP</a>}
                  {organizationProfile.social && <a href={organizationProfile.social} target="_blank" rel="noreferrer">SNS</a>}
                </div>
              )}
            </div>
            <p className="text-xs font-black text-primary">MY PAGE</p>
            <h2 className="mt-1 text-2xl font-black">{organizationProfile.name}の掲載管理</h2>
          </div>
          <button onClick={() => setMyPageOpen(false)} aria-label="マイページを閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        <button onClick={() => { setMyPageOpen(false); openRegistration() }} className="mb-6 mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground">＋ 新しい体験・ワークを掲載する</button>
        {(hasApplications || myApplicationsLoading) && (
          <div className="mb-6">
            <p className="text-xs font-black text-primary">参加予定・申込中のワーク</p>
            <div className="mt-3 space-y-3">
              {myCircleApplications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">定期・継続体験・ワーク</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      {application.status === 'withdrawn' ? '参加終了' : '参加中'}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-slate-900">{application.activityTitle}</h3>
                  <p className="mt-1 text-xs text-slate-500">{application.activityArea}</p>
                  {application.groupSize && <p className="mt-1 text-xs text-slate-500">募集人数：{application.groupSize}</p>}
                  <div className="mt-3">
                    <button
                      onClick={() => leaveCircleApplication(application)}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                    >
                      参加を終了する（退会）
                    </button>
                  </div>
                </article>
              ))}
              {myEventApplications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-primary">イベント</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">申込受付中</span>
                  </div>
                  <h3 className="mt-2 font-black text-slate-900">{application.activityTitle}</h3>
                  <p className="mt-1 text-xs text-slate-500">{application.activityArea} / {formatEventDateTime(application.activityDate)}</p>
                  {application.groupSize && <p className="mt-1 text-xs text-slate-500">募集人数：{application.groupSize}</p>}
                </article>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setListingsSection('activities')}
            className={`rounded-full px-4 py-2 text-xs font-black transition ${
              listingsSection === 'activities' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:text-primary'
            }`}
          >
            体験・ワーク掲載管理
          </button>
          <button
            type="button"
            onClick={() => setListingsSection('share')}
            className={`rounded-full px-4 py-2 text-xs font-black transition ${
              listingsSection === 'share' ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:text-primary'
            }`}
          >
            ゆずりあい投稿の管理
          </button>
        </div>
        {listingsSection === 'share' ? (
          <div className="mt-3">
            <MyShareListingsSection />
          </div>
        ) : (
        <div className="mt-3 space-y-3">
          {listings.map((item) => {
            const daysUntilExpiry = getDaysUntilExpiry(item.expiresAt)
            // Uses isActivityListingExpired (which also checks eventDate/deadline) rather than
            // just daysUntilExpiry from expiresAt alone, so 単発体験・ワーク listings are judged
            // expired the moment their event/application deadline passes, not only when a
            // separately-tracked expiresAt field says so.
            const expired = isActivityListingExpired(item)
            const ended = withdrawnTitles.includes(item.title) || expired
            const isPending = !ended && item.reviewStatus === 'pending'
            const isKnotEvent = item.listingType === 'event' && item.intakeMethod === 'knot'
            const applicants = applicantCounts[item.title] ?? 0
            const capacityNumber = Number(item.capacity) || 10
            const remaining = Math.max(0, capacityNumber - applicants)
            return (
              <article key={item.title} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex gap-4">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
                    {item.image ? <Image src={item.image} alt="" fill className="object-cover" /> : <NoImagePlaceholder compact />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${ended ? 'bg-slate-100 text-slate-500' : isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                        {ended ? '終了・下書き' : isPending ? '承認待ち' : '掲載中'}
                      </span>
                      {item.listingType === 'event' && <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black text-primary">イベント</span>}
                    </div>
                    <h3 className="mt-2 font-black text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.area} / {formatEventDateTime(item.date)}</p>
                    {item.listingType !== 'event' && daysUntilExpiry !== null && (
                      <span className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-[11px] font-black ${expired ? 'bg-rose-100 text-rose-700' : daysUntilExpiry <= 30 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                        掲載期限：{formatJapaneseDate(item.expiresAt!)}（{expired ? `${Math.abs(daysUntilExpiry)}日超過` : `残り${daysUntilExpiry}日`}）
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => reuseListing(item)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-black text-primary">編集</button>
                  <button onClick={() => reuseListing({ ...item, id: undefined, title: `${item.title}（再利用）` })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">複製して新規作成（再利用）</button>
                  <button onClick={() => deleteMyListing(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-100">
                    <Trash2 size={13} />削除
                  </button>
                  {isKnotEvent && (
                    <button onClick={() => setApplicantListActivity(item)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">申込者一覧（{applicants}組）を確認</button>
                  )}
                  {item.listingType !== 'event' && (
                    <button
                      onClick={() => setRenewalTarget(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00552e] px-3 py-2 text-xs font-black text-primary-foreground hover:opacity-90"
                    >
                      <RefreshCw size={13} />🔄 掲載期間を更新する
                    </button>
                  )}
                </div>
                {isPending && (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-2.5">
                    <p className="text-xs font-bold text-amber-800">運営事務局が掲載内容を確認しています。承認後、一般公開されます。</p>
                  </div>
                )}
                {isKnotEvent && (
                  <div className="mt-3 flex flex-col gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-black text-sky-800"><span className="mr-2 inline-block rounded-full bg-[#00552e] px-2 py-1 text-white">つとむん受付中</span>{applicants}組申込 / 残り{remaining}組</p>
                  </div>
                )}
                {expired && (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50 p-2.5">
                    <p className="text-xs font-bold text-rose-700">
                      {item.listingType === 'event'
                        ? '開催日時（または申込締切）を過ぎたため、サイト上では受付終了として非表示になっています。「複製して新規作成」から次回イベントとして再掲載できます。'
                        : '掲載期限を迎えたため、サイト上では非表示になっています。「編集」から内容をご確認のうえ、上のボタンから再掲載（更新）できます。'}
                    </p>
                  </div>
                )}
              </article>
            )
          })}
  </div>
        )}
  </div>
  </div>
  )
  }

const profileGenderOptions = [
  { value: '', label: '未回答' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
] as const

export function ProfileEditModal() {
  const {
    myPageOpen, myPageTab, setMyPageTab, organizationProfile, setOrganizationProfile,
    profileSaving, profileSaveError, saveProfile, setDeleteAccountModalOpen,
  } = useKnot()
  if (!myPageOpen || myPageTab !== 'profile') return null

  const isOrganization = organizationProfile.accountKind === 'organization'
  const includesSupporterType = organizationProfile.memberTypes.includes('サポーター（ボランティア）')

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-primary">{isOrganization ? '団体企業基本情報' : '会員基本情報'}</p>
            <h2 className="mt-1 text-2xl font-black">会員情報の確認・編集</h2>
          </div>
          <button type="button" onClick={() => setMyPageTab('listings')} className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-black text-slate-600">登録区分</p>
          <div className="grid grid-cols-2 gap-2">
            {(['individual', 'organization'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setOrganizationProfile((current) => ({ ...current, accountKind: kind }))}
                className={`rounded-lg py-2 text-xs font-black ${organizationProfile.accountKind === kind ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-500'}`}
              >
                {kind === 'individual' ? '個人' : '団体企業'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-black text-slate-600">会員種別（複数選択可）</p>
          <div className="flex flex-wrap gap-2">
            {memberTypeOptions.map((type) => (
              <label key={type} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${organizationProfile.memberTypes.includes(type) ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-500'}`}>
                <input
                  type="checkbox"
                  checked={organizationProfile.memberTypes.includes(type)}
                  onChange={() => setOrganizationProfile((current) => ({ ...current, memberTypes: toggleInArray(current.memberTypes, type) }))}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-600">
            {isOrganization ? '団体名・企業名' : 'お名前'}
            <input
              value={organizationProfile.name}
              onChange={(event) => setOrganizationProfile((current) => ({ ...current, name: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-black text-slate-600">
            {isOrganization ? '団体企業名（よみ・フリガナ）' : 'フリガナ'}
            <input
              value={organizationProfile.kana}
              onChange={(event) => setOrganizationProfile((current) => ({ ...current, kana: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-black text-slate-600 sm:col-span-2">
            メールアドレス
            <input
              value={organizationProfile.email}
              disabled
              readOnly
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-400"
            />
            <span className="mt-1.5 block text-[11px] font-normal text-slate-400">※ログインメールアドレスの変更は運営事務局へお問い合わせください</span>
          </label>
          {isOrganization ? (
            <>
              <label className="text-xs font-black text-slate-600 sm:col-span-2">
                代表電話番号
                <input
                  value={organizationProfile.phone}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, phone: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600 sm:col-span-2">
                所在地・住所
                <textarea
                  value={organizationProfile.address}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, address: event.target.value }))}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal leading-relaxed"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                ご担当者氏名
                <input
                  value={organizationProfile.contactName}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, contactName: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                担当者携帯番号
                <input
                  value={organizationProfile.contactPhone}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, contactPhone: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                ご担当者メールアドレス
                <input
                  value={organizationProfile.contactEmail}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, contactEmail: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                公式HP URL（任意）
                <input
                  value={organizationProfile.website}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, website: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600 sm:col-span-2">
                公式SNS URL（Instagram、LINE、X等）
                <input
                  value={organizationProfile.social}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, social: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
            </>
          ) : (
            <>
              <label className="text-xs font-black text-slate-600">
                生年月日
                <BirthdateSelect
                  value={organizationProfile.birthdate}
                  onChange={(next) => setOrganizationProfile((current) => ({ ...current, birthdate: next }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600">
                性別
                <select
                  value={organizationProfile.gender}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, gender: event.target.value as typeof current.gender }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                >
                  {profileGenderOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-black text-slate-600 sm:col-span-2">
                電話番号（任意）
                <input
                  value={organizationProfile.phone}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, phone: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-black text-slate-600 sm:col-span-2">
                お住まいの地域・住所（任意）
                <textarea
                  value={organizationProfile.address}
                  onChange={(event) => setOrganizationProfile((current) => ({ ...current, address: event.target.value }))}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal leading-relaxed"
                />
              </label>
            </>
          )}
        </div>
        {includesSupporterType && (
          <div className="mt-6 space-y-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <div>
              <p className="mb-2 text-xs font-black text-slate-600">ボランティア・サポーターとしての希望（複数選択可）</p>
              <div className="flex flex-wrap gap-2">
                {volunteerIntentOptions.map((option) => (
                  <label key={option} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${organizationProfile.volunteerIntent.includes(option) ? 'border-violet-400 bg-violet-100 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <input
                      type="checkbox"
                      checked={organizationProfile.volunteerIntent.includes(option)}
                      onChange={() => setOrganizationProfile((current) => ({ ...current, volunteerIntent: toggleInArray(current.volunteerIntent, option) }))}
                      className="sr-only"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-black text-slate-600">関心のあるジャンル（複数選択可）</p>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <label key={genre.label} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${organizationProfile.interestGenres.includes(genre.label) ? 'border-emerald-400 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <input
                      type="checkbox"
                      checked={organizationProfile.interestGenres.includes(genre.label)}
                      onChange={() => setOrganizationProfile((current) => ({ ...current, interestGenres: toggleInArray(current.interestGenres, genre.label) }))}
                      className="sr-only"
                    />
                    <span>{genre.icon}</span>{genre.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-xs font-black text-slate-600">
              得意なこと・伝えたいこと（任意）
              <textarea
                rows={3}
                value={organizationProfile.skillNotes}
                onChange={(event) => setOrganizationProfile((current) => ({ ...current, skillNotes: event.target.value }))}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal leading-6"
              />
            </label>
          </div>
        )}
        {profileSaveError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{profileSaveError}</p>}
        <button
          type="button"
          onClick={saveProfile}
          disabled={profileSaving}
          className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {profileSaving ? '保存中…' : '基本情報を保存する'}
        </button>
        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-xs font-black text-slate-400">設定</p>
          <button
            type="button"
            onClick={() => setDeleteAccountModalOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-700"
          >
            <Trash2 size={14} />アカウントを削除する（退会）
          </button>
        </div>
      </div>
    </div>
  )
}

export function DeleteAccountModal() {
  const { deleteAccountModalOpen, setDeleteAccountModalOpen, deletingAccount, deleteAccountError, deleteAccount } = useKnot()
  if (!deleteAccountModalOpen) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-5" onClick={() => !deletingAccount && setDeleteAccountModalOpen(false)}>
      <div role="alertdialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-black text-slate-900">アカウントを削除しますか？</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          退会すると、ログインができなくなり、掲載中のすべての体験・ワークも非公開になります。この操作は取り消せません。
        </p>
        {deleteAccountError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{deleteAccountError}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDeleteAccountModalOpen(false)}
            disabled={deletingAccount}
            className="rounded-xl bg-slate-100 py-3 text-sm font-black text-slate-600 disabled:opacity-60"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={deleteAccount}
            disabled={deletingAccount}
            className="rounded-xl bg-rose-600 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {deletingAccount ? '削除中…' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function WithdrawalModal() {
  const { withdrawalTarget, setWithdrawalTarget, setWithdrawnTitles } = useKnot()
  if (!withdrawalTarget) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-5">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-black text-red-600">掲載終了の確認</p>
        <h2 className="mt-2 text-xl font-black text-slate-900">「{withdrawalTarget}」の掲載を終了しますか？</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">掲載を取り下げても、後から再公開・編集できます。</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setWithdrawalTarget(null)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-black text-slate-700">キャンセル</button>
          <button
            onClick={() => { setWithdrawnTitles((current) => [...current, withdrawalTarget]); setWithdrawalTarget(null) }}
            className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-black text-white"
          >
            掲載を終了する
          </button>
        </div>
      </div>
    </div>
  )
}

// マイページの「🔄 掲載期間を更新する」から開く確認モーダル。内容・開催日・連絡先に
// 変更がなければそのまま1年延長、変更がある場合はいったん編集フォームへ遷移してもらう。
export function RenewalConfirmModal() {
  const { renewalTarget, setRenewalTarget, renewingListing, renewListing, reuseListing } = useKnot()
  if (!renewalTarget) return null

  const target: Activity = renewalTarget

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-5" onClick={() => !renewingListing && setRenewalTarget(null)}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-black text-primary">掲載期間の更新</p>
        <h2 className="mt-2 text-xl font-black text-slate-900">「{target.title}」を更新しますか？</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          内容を確認し、掲載期間を1年間延長しますか？
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          変更がある場合は「内容を編集する」から先に編集・保存してください。変更がなければ「1年間延長する」を押すと、掲載期限が本日から1年後に更新され、更新通知の状態もリセットされます。
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => renewListing(target)}
            disabled={renewingListing}
            className="rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {renewingListing ? '更新中…' : '1年間延長する'}
          </button>
          <button
            onClick={() => { setRenewalTarget(null); reuseListing(target) }}
            disabled={renewingListing}
            className="rounded-xl bg-slate-100 py-3 text-sm font-black text-slate-700 disabled:opacity-60"
          >
            内容を編集する
          </button>
          <button
            onClick={() => setRenewalTarget(null)}
            disabled={renewingListing}
            className="rounded-xl py-2 text-xs font-bold text-slate-400 disabled:opacity-60"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
