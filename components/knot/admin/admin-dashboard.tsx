'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronUp, Clock3, Download, Eye, EyeOff, ExternalLink, Heart, Loader2, LogOut, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, Send, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import {
  mapDbPartnerToOfficialPartner,
  mapDbProfileToAdminMember,
  mapDbInquiryToAdminInquiry,
  mapDbActivityToAdminListing,
  memberStatusOptions,
  memberTypeOptions,
  memberStatusToDb,
  inquiryStatusToDb,
  publishStatusToDb,
  mapDbShopProductToShopProduct,
  officialShopSettings,
  shopGuideUrlSettingKey,
  allMunicipalities,
  supportMunicipalityOptions,
  officialMunicipalities,
  genres,
  mapDbBulletinPostToBulletinPost,
  mapDbSupportLinkToAdminSupportEntry,
  supportEntryToDbPayload,
  mapDbShareItemToShareItem,
  formatEventDateTime,
  formatInquiryReceivedAt,
  daysSinceInquiryReceived,
  type DbProfileRow,
  type BulletinPost,
  type AdminMember,
  type AdminMemberStatus,
  type AdminMemberType,
  type AdminSupportEntry,
  type AdminSupportGenre,
  type AdminInquiry,
  type AdminInquiryStatus,
  type AdminPublishStatus,
  type AdminActivityListing,
  type AdminListingType,
  type OfficialPartner,
  type ShopProduct,
  type DbActivityRow,
  type DbShareItemRow,
  oneYearFromNowIso,
  getDaysUntilExpiry,
  getExpiryStatus,
  expiryStatusLabel,
  expiryStatusStyle,
  addMonthsToDateInput,
  isActivityListingExpired,
} from '@/lib/knot/data'
 import type { ShareItem } from '@/lib/knot/types'
 import { loadLocalShareItems, saveLocalShareItems } from '@/lib/knot/store'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { NoImagePlaceholder } from '../no-image-placeholder'
import { ShareMenu } from '../share-menu'

const tabs = [
  '会員・ユーザー名簿',
  'サポート情報・URL管理',
  '応援SHOP管理',
  '協賛パートナー管理',
  '活動・イベント管理',
  'お問い合わせ・掲載依頼一覧',
  'つとむん掲示板管理',
  '管理者・権限管理',
] as const
type Tab = (typeof tabs)[number]

const memberTypeStyles: Record<AdminMemberType, string> = {
  '一般': 'bg-slate-100 text-slate-600',
  'サポーター（指導者・ボランティア）': 'bg-violet-100 text-violet-700',
  '主催者': 'bg-sky-100 text-sky-700',
  'パートナー企業・団体': 'bg-amber-100 text-amber-800',
}

const memberStatusStyles: Record<AdminMemberStatus, string> = {
  '有効': 'bg-emerald-100 text-emerald-700',
  '停止中': 'bg-rose-100 text-rose-700',
}

// Surfaces admin/master-admin status directly in the member roster (not just the
// separate 管理者・権限管理 tab) so it's obvious at a glance in the main list who holds
// elevated access, alongside their ordinary member-type tags.
function AdminRoleBadge({ member }: { member: AdminMember }) {
  if (member.isMasterAdmin) {
    return <Badge className="bg-yellow-200 text-yellow-800">マスター管理者</Badge>
  }
  if (member.role === 'admin') {
    return <Badge className="bg-fuchsia-100 text-fuchsia-700">管理者</Badge>
  }
  return null
}

const inquiryStatusStyles: Record<AdminInquiryStatus, string> = {
  '未対応': 'bg-rose-600 text-white',
  '対応中': 'bg-amber-100 text-amber-800',
  '完了': 'bg-emerald-100 text-emerald-700',
}

const inquiryStatusOptions: AdminInquiryStatus[] = ['未対応', '対応中', '完了']

// Inquiries left 未対応 for this many days or more get a "要対応" alert flag,
// so long-neglected requests don't get buried by newer ones.
const STALE_INQUIRY_DAYS = 3

const publishStatusStyles: Record<AdminPublishStatus, string> = {
  '公開中': 'bg-emerald-100 text-emerald-700',
  '承認待ち': 'bg-amber-100 text-amber-800',
  '非公開': 'bg-slate-100 text-slate-500',
}

const publishStatusOptions: AdminPublishStatus[] = ['公開中', '承認待ち', '非公開']

// Display-only status layered on top of AdminPublishStatus: a listing whose DB status is still
// '公開中' but whose event date/deadline (or, for 定期・継続活動, expiresAt) has already passed is
// shown and filtered as '終了' everywhere in this tab, without touching the underlying DB value —
// an admin can still explicitly flip it to 非公開 via the dropdown.
type EffectivePublishStatus = AdminPublishStatus | '終了'

function getEffectivePublishStatus(listing: AdminActivityListing): EffectivePublishStatus {
  if (listing.publishStatus === '公開中' && isActivityListingExpired(listing)) return '終了'
  return listing.publishStatus
}

const effectiveStatusStyles: Record<EffectivePublishStatus, string> = {
  ...publishStatusStyles,
  '終了': 'bg-slate-200 text-slate-600',
}

const publishStatusFilters: ('すべて' | EffectivePublishStatus)[] = ['すべて', '承認待ち', '公開中', '終了', '非公開']

const listingTypeLabels: Record<AdminListingType, string> = {
  event: '単発イベント',
  regular: '定期・継続活動',
}

const listingTypeStyles: Record<AdminListingType, string> = {
  event: 'bg-sky-100 text-sky-700',
  regular: 'bg-violet-100 text-violet-700',
}

const supportGenres: { id: AdminSupportGenre; emoji: string }[] = [
  { id: '医療・休日当番医', emoji: '🏥' },
  { id: '施設・練習場所', emoji: '🏟' },
  { id: '仕出し・お弁当', emoji: '🍱' },
  { id: '補助金・助成金', emoji: '💰' },
  { id: '宿泊・滞在・キャンプ', emoji: '🏡' },
]

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ${className}`}>{children}</span>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="モーダルを閉じる" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  )
}

const inputClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary'

function csvEscape(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const csvContent = `\uFEFF${[header.join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n')}`
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function downloadInquiriesCsv(inquiries: AdminInquiry[]) {
  const header = ['受付日時', 'お名前/団体名', '種別', 'メールアドレス', '電話番号', '内容', '対応ステータス']
  const rows = inquiries.map((inquiry) => [
    inquiry.receivedAt, inquiry.name, inquiry.genre, inquiry.email ?? '', inquiry.phone ?? '', inquiry.message, inquiry.status,
  ])
  downloadCsv('knot-inquiries.csv', header, rows)
}

// Builds and downloads a real .xlsx workbook (not CSV text). Excel/Mac Excel
// opens native .xlsx files directly with no "テキストファイルウィザード"
// prompt and no mojibake, since there is no encoding to guess.
// `textColumnIndexes` marks columns (e.g. phone numbers) whose cells must be
// forced to Excel's text format so values like "0985-00-1111" keep their
// leading zero instead of being reinterpreted as a number.
function downloadXlsx(filename: string, sheetName: string, header: string[], rows: string[][], textColumnIndexes: number[] = []) {
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows])
  const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (const col of textColumnIndexes) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
      if (cell) {
        cell.t = 's'
        cell.z = '@'
      }
    }
  }

  worksheet['!cols'] = header.map(() => ({ wch: 20 }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' })
}

function downloadMembersXlsx(members: AdminMember[]) {
  const header = [
    'お名前/団体名', 'フリガナ', 'メールアドレス', '会員種別', '個人/団体', '生年月日', '性別', '登録日', 'ステータス',
    '住所', '��表者電話', '担当者名', '担当者電話', '担当者メール', '公式HP', 'SNSリンク', 'ボランティア意向', '関心ジャンル',
  ]
  const rows = members.map((member) => [
    member.name, member.kana ?? '', member.email, member.types.join('・'), member.accountKind === 'organization' ? '団体' : '個人',
    member.birthdate ?? '', member.gender ?? '', member.registeredAt, member.status,
    member.address ?? '', member.repPhone ?? '', member.contactPersonName ?? '', member.contactPersonPhone ?? '', member.contactPersonEmail ?? '',
    member.website ?? '', member.sns ?? '',
    (member.volunteerIntent ?? []).join('・'), (member.interestGenres ?? []).join('・'),
  ])
  downloadXlsx('knot-members.xlsx', '名簿', header, rows, [8])
}

function downloadActivityListingsXlsx(listings: AdminActivityListing[]) {
  const header = [
    'ID', '募集区分', '活動・イベント名', '主催団体名', 'エリア', 'ジャンル',
    '開催日時/頻度', '会場名', '住所',
    '参加対象', '定員・申込状況', '参加費', '持ち物',
    '団体HP', 'SNSリンク', '受付先',
    '申込者氏名', '担当者メール', '担当者電話番号',
    '公開ステータス',
  ]
  const rows = listings.map((listing) => [
    listing.id, listingTypeLabels[listing.listingType], listing.title, listing.organizer, listing.area, listing.genre,
    listing.eventDate, listing.venue, listing.address,
    listing.audience, `${listing.capacity} / ${listing.applicants}`, listing.fee, listing.whatToBring,
    listing.website, listing.sns, listing.intakeContact,
    listing.applicantName, listing.contactEmail, listing.contactPhone,
    listing.publishStatus,
  ])
  downloadXlsx('knot-activity-listings.xlsx', 'イベント一覧', header, rows, [15, 18])
}

function MemberDetailPanel({
  member,
  onClose,
  onStatusChange,
  statusPending,
}: {
  member: AdminMember
  onClose: () => void
  onStatusChange: (status: AdminMemberStatus) => void
  statusPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/50" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-primary">会員詳細カード</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{member.name}</h2>
          </div>
          <button onClick={onClose} aria-label="詳細カードを閉じる" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <AdminRoleBadge member={member} />
          {member.types.map((type) => (
            <Badge key={type} className={memberTypeStyles[type]}>{type}</Badge>
          ))}
          <Badge className="bg-slate-100 text-slate-600">{member.accountKind === 'organization' ? '団体' : '個人'}</Badge>
          <select
            value={member.status}
            disabled={statusPending}
            onChange={(event) => onStatusChange(event.target.value as AdminMemberStatus)}
            className={`rounded-full border-0 px-2.5 py-1 text-xs font-black outline-none disabled:cursor-wait disabled:opacity-60 ${memberStatusStyles[member.status]}`}
          >
            {memberStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <dl className="mt-6 space-y-4 text-sm">
          {member.kana && (
            <div>
              <dt className="text-xs font-black text-slate-400">フリガナ</dt>
              <dd className="mt-1 font-bold text-slate-700">{member.kana}</dd>
            </div>
          )}
          {member.orgDetail && (
            <div>
              <dt className="text-xs font-black text-slate-400">団体詳細情報</dt>
              <dd className="mt-1 leading-6 text-slate-700">{member.orgDetail}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-black text-slate-400">メールアドレス</dt>
            <dd className="mt-1">
              <a href={`mailto:${member.email}`} className="font-bold text-primary hover:underline">
                {member.email}
              </a>
            </dd>
          </div>
          {member.repPhone && (
            <div>
              <dt className="text-xs font-black text-slate-400">{member.accountKind === 'organization' ? '代表者電話' : '電話番号'}</dt>
              <dd className="mt-1 font-bold text-slate-700">{member.repPhone}</dd>
            </div>
          )}
          {member.address && (
            <div>
              <dt className="text-xs font-black text-slate-400">住所</dt>
              <dd className="mt-1 font-bold text-slate-700">{member.address}</dd>
            </div>
          )}
          {member.birthdate && (
            <div>
              <dt className="text-xs font-black text-slate-400">生年月日</dt>
              <dd className="mt-1 font-bold text-slate-700">{member.birthdate}</dd>
            </div>
          )}
          {member.gender && (
            <div>
              <dt className="text-xs font-black text-slate-400">性別</dt>
              <dd className="mt-1 font-bold text-slate-700">{{ male: '男性', female: '女性', other: 'その他' }[member.gender] ?? member.gender}</dd>
            </div>
          )}
          {member.contactPersonName && (
            <div>
              <dt className="text-xs font-black text-slate-400">担当者名</dt>
              <dd className="mt-1 font-bold text-slate-700">
                {member.contactPersonName}
                {member.contactPersonPhone && ` / ${member.contactPersonPhone}`}
              </dd>
            </div>
          )}
          {member.contactPersonEmail && (
            <div>
              <dt className="text-xs font-black text-slate-400">担当者メールアドレス</dt>
              <dd className="mt-1">
                <a href={`mailto:${member.contactPersonEmail}`} className="font-bold text-primary hover:underline">
                  {member.contactPersonEmail}
                </a>
              </dd>
            </div>
          )}
          {member.website && (
            <div>
              <dt className="text-xs font-black text-slate-400">公式HP</dt>
              <dd className="mt-1 break-all">
                <a href={member.website} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                  {member.website}
                </a>
              </dd>
            </div>
          )}
          {member.sns && (
            <div>
              <dt className="text-xs font-black text-slate-400">SNSリンク</dt>
              <dd className="mt-1 break-all">
                <a href={member.sns} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                  {member.sns}
                </a>
              </dd>
            </div>
          )}
          {member.volunteerIntent && member.volunteerIntent.length > 0 && (
            <div>
              <dt className="text-xs font-black text-slate-400">ボランティア意向</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {member.volunteerIntent.map((item) => (
                  <Badge key={item} className="bg-violet-100 text-violet-700">{item}</Badge>
                ))}
              </dd>
            </div>
          )}
          {member.interestGenres && member.interestGenres.length > 0 && (
            <div>
              <dt className="text-xs font-black text-slate-400">関心ジャンル</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {member.interestGenres.map((item) => (
                  <Badge key={item} className="bg-emerald-100 text-emerald-700">{item}</Badge>
                ))}
              </dd>
            </div>
          )}
          {member.skillNotes && (
            <div>
              <dt className="text-xs font-black text-slate-400">スキル・伝えたいこと</dt>
              <dd className="mt-1 leading-6 text-slate-700">{member.skillNotes}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-black text-slate-400">登録日</dt>
            <dd className="mt-1 font-bold text-slate-700">{member.registeredAt}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// Newest registration first, so today's sign-ups appear at the top of the list.
function sortMembersByRegisteredAt(members: AdminMember[]): AdminMember[] {
  return [...members].sort((a, b) => {
    const diff = new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    return Number.isNaN(diff) ? 0 : diff
  })
}

const MEMBER_PROFILE_COLUMNS =
  'id, email, full_name, organization_name, kana, phone, role, status, created_at, account_kind, birthdate, gender, address, member_types, contact_person_name, contact_person_phone, contact_person_email, website, sns_url, volunteer_intent, interest_genres, skill_notes, is_master_admin'

function MembersTab() {
  // The roster only ever shows real accounts fetched live from Supabase's `profiles`
  // table. There is no static sample/demo data and no local-only fallback account mixed
  // in, so a status change or deletion made here always reflects the real, single source
  // of truth and can never silently revert after a reload.
  const [members, setMembers] = useState<AdminMember[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // Tracks only the one row currently saving so its dropdown can show a busy state and
  // reject repeat clicks without disabling every other row's select while it waits.
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)

  const applyDbMembers = useCallback((data: DbProfileRow[]) => {
    setMembers(sortMembersByRegisteredAt(data.map(mapDbProfileToAdminMember)))
  }, [])

  // Shared by the initial load, the realtime resync, and a manual refetch right after a
  // status update — always re-reading from Supabase (never trusting only local state) is
  // what guarantees the list on screen matches the actual `profiles` row.
  const refetchMembers = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('profiles').select(MEMBER_PROFILE_COLUMNS).order('created_at', { ascending: false })
    if (!error && data) {
      applyDbMembers(data as DbProfileRow[])
    } else if (error) {
      console.error('[v0] Failed to load members from Supabase:', error.message)
    }
  }, [applyDbMembers])

  useEffect(() => {
    refetchMembers()

    // Keep the members list in sync immediately when a new registration or profile
    // update happens elsewhere (e.g. sign-up, mypage profile save).
    const supabase = createClient()
    const channel = supabase
      .channel('admin-profiles-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        refetchMembers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refetchMembers])

  const updateStatus = async (index: number, status: AdminMemberStatus) => {
    const member = members[index]
    if (!member.id) return
    // Already saving this same row — ignore the extra change instead of firing a second
    // overlapping request (that overlap, not a real freeze, is what made the dropdown feel
    // stuck: the row's displayed value could flicker between two in-flight responses).
    if (pendingStatusId === member.id) return

    setPendingStatusId(member.id)
    try {
      // Goes through the server (authenticated via the admin's cookie session) instead of a
      // plain client-side `.update()`. The route selects the row back after writing it, so a
      // write that is silently blocked (RLS, stale id, etc.) surfaces as a real error here
      // instead of a false "更新しました" toast while the DB keeps its old value. Sending
      // email/fullName lets the server auto-provision a missing profiles row (e.g. a
      // Supabase signUp that created the auth account but never got a profile row synced)
      // instead of failing with "対象の会員が見つからない".
      const response = await fetch('/api/admin/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, status: memberStatusToDb(status), email: member.email, fullName: member.name }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        console.error('[v0] Failed to update member status:', json?.error)
        toast.error(`更新失敗: ${json?.error ?? '時間をおいて再度お試しください。'}`)
        return
      }

      // Re-sync the whole list from Supabase rather than trusting local state alone, so the
      // displayed status always matches what is actually stored in the DB.
      await refetchMembers()
      toast.success(`ステータスを${status}に更新しました`)
    } finally {
      setPendingStatusId(null)
    }
  }

  const deleteMember = async (index: number) => {
    const member = members[index]
    if (member.isMasterAdmin) {
      toast.error('マスター管理者は削除できません。')
      return
    }
    // Deleting a member here removes their entire profiles row (and auth account below),
    // so an admin's role column disappears along with everything else — no separate step
    // is needed to also strip their admin access, but the confirm text calls this out so
    // it's never a silent side effect.
    const confirmMessage =
      member.role === 'admin'
        ? `「${member.name}」を削除しますか？この会員は管理者権限も持っています。削除すると会員データと管理者権限の両方が完全に削除され、取り消せません。`
        : `「${member.name}」を削除しますか？この操作は取り消せません。`
    if (!window.confirm(confirmMessage)) return
    if (member.id) {
      // Routes through the server so the profile row AND the corresponding auth.users
      // account are removed together, instead of only deleting the profile row.
      const response = await fetch('/api/admin/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(json?.error ?? '削除に失敗しました。時間をおいて再度お試しください。')
        return
      }
    }
    setMembers((current) => current.filter((_, i) => i !== index))
    setSelectedIndex(null)
    toast.success('会員を削除しました')
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => downloadMembersXlsx(members)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:border-primary hover:text-primary"
        >
          <Download size={14} />
          名簿Excelダウンロード（.xlsx）
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
              <th className="px-5 py-3">お名前 / 団体名</th>
              <th className="px-5 py-3">メールアドレス</th>
              <th className="px-5 py-3">会員種別</th>
              <th className="px-5 py-3">登録日</th>
              <th className="px-5 py-3">ステータス</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr
                key={member.id ?? member.email}
                onClick={() => setSelectedIndex(index)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="px-5 py-4 font-black text-slate-900">{member.name}</td>
                <td className="px-5 py-4 text-slate-500">
                  <a
                    href={`mailto:${member.email}`}
                    onClick={(event) => event.stopPropagation()}
                    className="hover:text-primary hover:underline"
                  >
                    {member.email}
                  </a>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    <AdminRoleBadge member={member} />
                    {member.types.map((type) => (
                      <Badge key={type} className={memberTypeStyles[type]}>{type}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500">{member.registeredAt}</td>
                <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                  <select
                    value={member.status}
                    disabled={Boolean(member.id) && pendingStatusId === member.id}
                    onChange={(event) => updateStatus(index, event.target.value as AdminMemberStatus)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-black outline-none disabled:cursor-wait disabled:opacity-60 ${memberStatusStyles[member.status]}`}
                  >
                    {memberStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                  {!member.isMasterAdmin && (
                    <button
                      onClick={() => deleteMember(index)}
                      aria-label={`${member.name}を削除`}
                      className="inline-flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedIndex !== null && (
        <MemberDetailPanel
          member={members[selectedIndex]}
          onClose={() => setSelectedIndex(null)}
          onStatusChange={(status) => updateStatus(selectedIndex, status)}
          statusPending={pendingStatusId !== null && pendingStatusId === members[selectedIndex].id}
        />
      )}
    </div>
  )
}

const emptySupportDraft = (genre: AdminSupportGenre): AdminSupportEntry => ({
  genre,
  municipality: supportMunicipalityOptions[0],
  name: '',
  address: '',
  phone: '',
  url: '',
  comment: '',
  deliveryAvailable: '配達可能',
  reservationRequired: false,
  capacity: '',
  grantField: '',
  grantAmount: '',
  deadlineType: '締切日指定',
  deadlineDate: '',
})

function SupportEntryForm({ draft, setDraft }: { draft: AdminSupportEntry; setDraft: (draft: AdminSupportEntry) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="市町村選択（必須）">
          <select value={draft.municipality} onChange={(event) => setDraft({ ...draft, municipality: event.target.value })} className={inputClass}>
            {supportMunicipalityOptions.map((place) => (
              <option key={place}>{place}</option>
            ))}
          </select>
        </FormField>
        <FormField label="名称（必須）">
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例：宮崎市 施設予約システム" className={inputClass} />
        </FormField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="住所">
          <input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} className={inputClass} />
        </FormField>
        <FormField label="電話番号">
          <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={inputClass} />
        </FormField>
      </div>
      <FormField label="URLリンク">
        <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://..." className={inputClass} />
      </FormField>

      {draft.genre === '仕出し・お弁当' && (
        <div className="grid gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3 sm:grid-cols-3">
          <FormField label="配達可否">
            <select
              value={draft.deliveryAvailable}
              onChange={(event) => setDraft({ ...draft, deliveryAvailable: event.target.value as AdminSupportEntry['deliveryAvailable'] })}
              className={inputClass}
            >
              <option value="配達可能">配達可能</option>
              <option value="配達不可">配達不可</option>
            </select>
          </FormField>
          <FormField label="対応個数（◯個〜）">
            <input value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: event.target.value })} placeholder="例：10個〜" className={inputClass} />
          </FormField>
          <label className="mt-6 flex items-center gap-2 text-xs font-black text-slate-600 sm:mt-0">
            <input
              type="checkbox"
              checked={Boolean(draft.reservationRequired)}
              onChange={(event) => setDraft({ ...draft, reservationRequired: event.target.checked })}
              className="size-4 rounded border-slate-300"
            />
            要事前予約
          </label>
        </div>
      )}

      {draft.genre === '補助金・助成金' && (
        <div className="grid gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3 sm:grid-cols-2">
          <FormField label="ジャンル">
            <input value={draft.grantField} onChange={(event) => setDraft({ ...draft, grantField: event.target.value })} placeholder="例：地域交流・伝統文化" className={inputClass} />
          </FormField>
          <FormField label="助成金額">
            <input value={draft.grantAmount} onChange={(event) => setDraft({ ...draft, grantAmount: event.target.value })} placeholder="例：上限20万円" className={inputClass} />
          </FormField>
          <FormField label="締切タイプ">
            <select
              value={draft.deadlineType}
              onChange={(event) => setDraft({ ...draft, deadlineType: event.target.value as AdminSupportEntry['deadlineType'] })}
              className={inputClass}
            >
              <option value="締切日指定">締切日指定</option>
              <option value="随時受付">随時受付</option>
            </select>
          </FormField>
          {draft.deadlineType === '締切日指定' && (
            <FormField label="締切日">
              <input type="date" value={draft.deadlineDate} onChange={(event) => setDraft({ ...draft, deadlineDate: event.target.value })} className={inputClass} />
            </FormField>
          )}
        </div>
      )}

      <FormField label="コメント（任意）">
        <textarea rows={3} value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} className={inputClass} />
      </FormField>
    </div>
  )
}

function SupportEntryCard({
  entry,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  entry: AdminSupportEntry
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-800">{entry.name}</p>
          <Badge className="bg-white text-slate-500">{entry.municipality}</Badge>
          {entry.genre === '仕出し・お弁当' && entry.deliveryAvailable && <Badge className="bg-amber-100 text-amber-800">{entry.deliveryAvailable}</Badge>}
          {entry.genre === '仕出し・お弁当' && entry.reservationRequired && <Badge className="bg-amber-100 text-amber-800">要事前予約</Badge>}
          {entry.genre === '仕出し・お弁当' && entry.capacity && <Badge className="bg-amber-100 text-amber-800">{entry.capacity}対応</Badge>}
          {entry.genre === '補助金・助成金' && entry.grantField && <Badge className="bg-sky-100 text-sky-700">{entry.grantField}</Badge>}
          {entry.genre === '補助金・助成金' && entry.grantAmount && <Badge className="bg-emerald-100 text-emerald-700">{entry.grantAmount}</Badge>}
          {entry.genre === '補助金・助成金' && entry.deadlineType && (
            <Badge className="bg-rose-100 text-rose-700">{entry.deadlineType === '締切日指定' ? entry.deadlineDate || '締切日指定' : '随時受付'}</Badge>
          )}
        </div>
        {entry.address && <p className="mt-1 text-xs font-bold text-slate-400">{entry.address}</p>}
        {entry.phone && <p className="mt-0.5 text-xs font-bold text-slate-400">{entry.phone}</p>}
        {entry.url && <p className="mt-0.5 break-all text-xs font-bold text-slate-400">{entry.url}</p>}
        {entry.comment && <p className="mt-1 text-xs leading-5 text-slate-500">{entry.comment}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`${entry.name}を上へ移動`}
          className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`${entry.name}を下へ移動`}
          className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronDown size={14} />
        </button>
        <button onClick={onEdit} aria-label={`${entry.name}を編集`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} aria-label={`${entry.name}を削除`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-rose-500">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function SupportEntriesTab() {
  const [entries, setEntries] = useState<AdminSupportEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalGenre, setModalGenre] = useState<AdminSupportGenre | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<AdminSupportEntry>(emptySupportDraft('医療・休日当番医'))
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('support_links')
      .select('id, category, municipality, title, address, phone, link_url, notes, details, sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setEntries(data.map(mapDbSupportLinkToAdminSupportEntry))
        } else if (error) {
          console.log('[v0] Failed to load support_links:', error.message)
        }
        setIsLoading(false)
      })
  }, [])

  const startAdd = (genre: AdminSupportGenre) => {
    // New entries always land after the current last item in their genre, so the
    // ▲/▼ reorder buttons below have a stable, gap-free order to work from.
    const maxSortOrder = entries.filter((entry) => entry.genre === genre).reduce((max, entry) => Math.max(max, entry.sortOrder ?? 0), 0)
    setDraft({ ...emptySupportDraft(genre), sortOrder: maxSortOrder + 10 })
    setEditingIndex(null)
    setErrorMessage(null)
    setModalGenre(genre)
  }

  const startEdit = (entry: AdminSupportEntry, index: number) => {
    // 旧データで municipality が 'その他' のまま保存されている場合、選択肢からは既に
    // 削除しているため編集モーダルの表記を新しい「県全域/オンライン」に揃える。
    setDraft(entry.municipality === 'その他' ? { ...entry, municipality: '県全域/オンライン' } : entry)
    setEditingIndex(index)
    setErrorMessage(null)
    setModalGenre(entry.genre)
  }

  const save = async () => {
    if (!draft.name.trim()) return
    setIsSaving(true)
    setErrorMessage(null)
    const supabase = createClient()
    const payload = supportEntryToDbPayload(draft)

    if (editingIndex !== null && draft.id) {
      const { error } = await supabase.from('support_links').update(payload).eq('id', draft.id)
      if (error) {
        setErrorMessage('保存に失敗しました。時間をおいて再度お試しください。')
        setIsSaving(false)
        return
      }
      setEntries((current) => current.map((item, index) => (index === editingIndex ? draft : item)))
    } else {
      const { data, error } = await supabase.from('support_links').insert(payload).select('id').single()
      if (error) {
        setErrorMessage('保存に失敗しました。時間をおいて再度お試しください。')
        setIsSaving(false)
        return
      }
      setEntries((current) => [...current, { ...draft, id: data?.id }])
    }

    setIsSaving(false)
    setModalGenre(null)
    setEditingIndex(null)
  }

  const remove = async (index: number) => {
    const entry = entries[index]
    if (entry.id) {
      const supabase = createClient()
      const { error } = await supabase.from('support_links').delete().eq('id', entry.id)
      if (error) return
    }
    setEntries((current) => current.filter((_, i) => i !== index))
  }

  // Swaps sort_order with the neighboring entry within the same genre (not the
  // whole list, which interleaves genres) and persists both rows immediately so
  // the new order survives a reload and is reflected in the public support hub.
  const move = async (entry: AdminSupportEntry, direction: 'up' | 'down') => {
    if (!entry.id) return
    const genreEntries = entries.filter((item) => item.genre === entry.genre)
    const position = genreEntries.findIndex((item) => item.id === entry.id)
    const swapPosition = direction === 'up' ? position - 1 : position + 1
    if (position === -1 || swapPosition < 0 || swapPosition >= genreEntries.length) return
    const neighbor = genreEntries[swapPosition]
    if (!neighbor.id) return

    const entrySortOrder = entry.sortOrder ?? 0
    const neighborSortOrder = neighbor.sortOrder ?? 0

    const supabase = createClient()
    const [{ error: entryError }, { error: neighborError }] = await Promise.all([
      supabase.from('support_links').update({ sort_order: neighborSortOrder }).eq('id', entry.id),
      supabase.from('support_links').update({ sort_order: entrySortOrder }).eq('id', neighbor.id),
    ])
    if (entryError || neighborError) {
      toast.error('並び順の変更に失敗しました。時間をおいて再度お試しください。')
      return
    }

    setEntries((current) =>
      current
        .map((item) => {
          if (item.id === entry.id) return { ...item, sortOrder: neighborSortOrder }
          if (item.id === neighbor.id) return { ...item, sortOrder: entrySortOrder }
          return item
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    )
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
          <Loader2 size={16} className="animate-spin" />読み込み中...
        </div>
      ) : (
        supportGenres.map(({ id, emoji }) => (
          <div key={id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-black text-slate-900">
              <span className="mr-1.5">{emoji}</span>
              {id}
            </p>
            <div className="mt-4 space-y-3">
              {entries
                .map((entry, index) => ({ entry, index }))
                .filter(({ entry }) => entry.genre === id)
                .map(({ entry, index }, positionInGenre, genreList) => (
                  <SupportEntryCard
                    key={entry.id ?? index}
                    entry={entry}
                    onEdit={() => startEdit(entry, index)}
                    onDelete={() => remove(index)}
                    onMoveUp={() => move(entry, 'up')}
                    onMoveDown={() => move(entry, 'down')}
                    isFirst={positionInGenre === 0}
                    isLast={positionInGenre === genreList.length - 1}
                  />
                ))}
            </div>
            <button
              onClick={() => startAdd(id)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-black text-slate-500 hover:border-primary hover:text-primary"
            >
              <Plus size={16} />＋ 新しいリンクを追加
            </button>
          </div>
        ))
      )}

      {modalGenre && (
        <Modal title={`${editingIndex !== null ? 'リンクを編集' : '新しいリンクを追加'}（${modalGenre}）`} onClose={() => setModalGenre(null)}>
          <SupportEntryForm draft={draft} setDraft={setDraft} />
          {errorMessage && <p className="mt-2 text-xs font-bold text-rose-500">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModalGenre(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              キャンセル
            </button>
            <button onClick={save} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-60">
              {isSaving && <Loader2 size={14} className="animate-spin" />}保存する
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// 「サポート情報・URL管理」タブの中で「外部リンク管理」と「ゆずりあい・貸し借り投稿一覧」を
// 切り替えるラッパー。つとむん掲示板（運営告知）とは別管理のため、ここにぶら下げる。
function SupportInfoTab() {
  const [subTab, setSubTab] = useState<'links' | 'share'>('links')

  return (
    <div className="space-y-5">
      <div className="inline-flex gap-1 rounded-full bg-slate-100 p-1 text-sm font-black">
        <button
          onClick={() => setSubTab('links')}
          className={`rounded-full px-4 py-2 transition ${subTab === 'links' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          外部リンク管理（医療・施設・助成金等）
        </button>
        <button
          onClick={() => setSubTab('share')}
          className={`rounded-full px-4 py-2 transition ${subTab === 'share' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
        >
          ゆずりあい・貸し借り投稿一覧
        </button>
      </div>
      {subTab === 'links' ? <SupportEntriesTab /> : <ShareItemsManagementTab />}
    </div>
  )
}

const shareItemTypeStyles: Record<ShareItem['type'], string> = {
  '貸します': 'bg-sky-100 text-sky-700',
  '借りたい': 'bg-amber-100 text-amber-800',
  '譲ります': 'bg-emerald-100 text-emerald-700',
  '探してます': 'bg-violet-100 text-violet-700',
}

const shareItemStatusStyles: Record<ShareItem['status'], string> = {
  '受付中': 'bg-emerald-100 text-emerald-700',
  '解決済み・終了': 'bg-slate-100 text-slate-500',
}

// 実テーブル（share_items）に保存された投稿と、DB保存が未対応な環境で
// knot/store.tsx がlocalStorageへ一時保存した投稿（id が "local-" 始まり）を
// 同じ一覧としてマージする。id が重複する場合はDB側のレコードを優先する。
function mergeWithLocalShareItems(dbItems: ShareItem[]): ShareItem[] {
  const localItems = loadLocalShareItems()
  if (localItems.length === 0) return dbItems
  const dbIds = new Set(dbItems.map((it) => it.id))
  return [...localItems.filter((it) => !dbIds.has(it.id)), ...dbItems]
}

function ShareItemsManagementTab() {
  const [items, setItems] = useState<ShareItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    fetch('/api/admin/share-items')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!isMounted) return
        if (!res.ok) {
          console.log('[v0] Failed to load share_items:', body?.error)
          // share_items テーブル未作成・RLS拒否などでDB取得に失敗した場合でも、
          // localStorageへ一時保存された投稿だけは表示できるようにする。
          setItems(mergeWithLocalShareItems([]))
          setIsLoading(false)
          return
        }
        setItems(mergeWithLocalShareItems(((body?.items ?? []) as DbShareItemRow[]).map(mapDbShareItemToShareItem)))
        setIsLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.log('[v0] Failed to load share_items:', err)
        setItems(mergeWithLocalShareItems([]))
        setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const persistLocalItems = (nextItems: ShareItem[]) => {
    saveLocalShareItems(nextItems.filter((it) => (it.id ?? '').startsWith('local-')))
  }

  const toggleStatus = async (item: ShareItem) => {
    if (!item.id) return
    const nextStatus: ShareItem['status'] = item.status === '受付中' ? '解決済み・終了' : '受付中'
    setActioningId(item.id)
    // localStorageへの一時保存分（id が "local-" 始まり）は実テーブルに行が無いため、
    // APIへ送らずlocalStorage/クライアント状態を直接更新する。
    if (item.id.startsWith('local-')) {
      setItems((current) => {
        const next = current.map((entry) => (entry.id === item.id ? { ...entry, status: nextStatus } : entry))
        persistLocalItems(next)
        return next
      })
      setActioningId(null)
      toast.success(nextStatus === '解決済み・終了' ? '投稿を非公開（受付終了）にしました' : '投稿を受付中に戻しました')
      return
    }
    const res = await fetch('/api/admin/share-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: nextStatus }),
    })
    const body = await res.json().catch(() => ({}))
    setActioningId(null)
    if (!res.ok) {
      toast.error(body?.error ? `ステータスの変更に失敗しました: ${body.error}` : 'ステータスの変更に失敗しました。時間をおいて再度お試しください。')
      return
    }
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: nextStatus } : entry)))
    toast.success(nextStatus === '解決済み・終了' ? '投稿を非公開（受付終了）にしました' : '投稿を受付中に戻しました')
  }

  const remove = async (item: ShareItem) => {
    if (!item.id) return
    if (!window.confirm(`「${item.title}」を削除しますか？この操作は取り消せません。`)) return
    setActioningId(item.id)
    // localStorageへの一時保存分はAPIへ送らずlocalStorage/クライアント状態から直接取り除く。
    if (item.id.startsWith('local-')) {
      setItems((current) => {
        const next = current.filter((entry) => entry.id !== item.id)
        persistLocalItems(next)
        return next
      })
      setActioningId(null)
      toast.success('投稿を削除しました')
      return
    }
    const res = await fetch('/api/admin/share-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    const body = await res.json().catch(() => ({}))
    setActioningId(null)
    if (!res.ok) {
      toast.error(body?.error ? `削除に失敗しました: ${body.error}` : '削除に失敗しました。時間をおいて再度お試しください。')
      return
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    toast.success('投稿を削除しました')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-black text-slate-900">ゆずりあい・貸し借り投稿一覧</p>
        <p className="mt-1 text-xs text-slate-500">
          サポート便利帳「ゆずりあい・貸し借り」タブに掲載される会員の投稿を管理します。不適切な投稿は非公開（受付終了）または削除してください。
        </p>
      </div>

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
          <Loader2 size={16} className="animate-spin" />読み込み中...
        </div>
      ) : items.length === 0 ? (
        <p className="mt-6 py-8 text-center text-sm font-bold text-slate-400">まだ投稿がありません。</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
                <th className="px-4 py-3">登録日時</th>
                <th className="px-4 py-3">区分</th>
                <th className="px-4 py-3">品名・タイトル</th>
                <th className="px-4 py-3">市町村</th>
                <th className="px-4 py-3">無償/有償</th>
                <th className="px-4 py-3">画像</th>
                <th className="px-4 py-3">投稿者メールアドレス</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString('ja-JP') : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={shareItemTypeStyles[item.type]}>{item.type}</Badge>
                  </td>
                  <td className="px-4 py-4 max-w-[220px] truncate font-black text-slate-900">{item.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-slate-500">{item.municipality || '—'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-slate-500">{item.priceType}</td>
                  <td className="px-4 py-4">
                    {item.imageUrl ? (
                      <img src={item.imageUrl || '/placeholder.svg'} alt={item.title} className="size-12 rounded-lg object-cover" />
                    ) : (
                      <span className="text-xs text-slate-300">なし</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-slate-500">{item.contactEmail}</td>
                  <td className="px-4 py-4">
                    <Badge className={shareItemStatusStyles[item.status]}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleStatus(item)}
                        disabled={actioningId === item.id}
                        aria-label={item.status === '受付中' ? `${item.title}を非公開にする` : `${item.title}を受付中に戻す`}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {actioningId === item.id ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                        {item.status === '受付中' ? '非公開にする' : '受付中に戻す'}
                      </button>
                      <button
                        onClick={() => remove(item)}
                        disabled={actioningId === item.id}
                        aria-label={`${item.title}を削除`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500 hover:border-rose-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const emptyProductDraft = (): ShopProduct => ({
  name: '',
  organization: '',
  price: '',
  image: '',
  url: '',
  area: allMunicipalities[0],
  tagline: '',
  expiresAt: '',
  contactEmail: '',
})

// expires_at (timestamp with time zone) へ安全にISO文字列変換する。無効な日付文字列が
// 渡された場合は保存を落とさず null にフォールバックする。
function toIsoOrNull(dateInput?: string | null): string | null {
  if (!dateInput) return null
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function shopProductToDbPayload(product: ShopProduct) {
  return {
    name: product.name,
    organization: product.organization,
    price: product.price || null,
    image_url: product.image || null,
    product_url: product.url || null,
    area: product.area || null,
    tagline: product.tagline || null,
    expires_at: toIsoOrNull(product.expiresAt),
    contact_email: product.contactEmail || null,
  }
}

function ShopManagementTab() {
  const [guideUrl, setGuideUrl] = useState(officialShopSettings.guideUrl)
  const [isSavingGuideUrl, setIsSavingGuideUrl] = useState(false)
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<ShopProduct>(emptyProductDraft())
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const maxProducts = 6

  useEffect(() => {
    const supabase = createClient()
    const legacyColumns = 'id, name, organization, price, image_url, product_url, area, tagline, display_order'
    supabase
      .from('shop_products')
      .select(`${legacyColumns}, expires_at, contact_email, expiry_notified_30d`)
      .order('display_order', { ascending: true, nullsFirst: false })
      .then(async ({ data, error }) => {
        if (!error && data) {
          setProducts(data.map(mapDbShopProductToShopProduct))
          setIsLoading(false)
          return
        }
        // scripts/sql/2025_expiry_management.sql が未適用の環境向けフォールバック。
        const fallback = await supabase.from('shop_products').select(legacyColumns).order('display_order', { ascending: true, nullsFirst: false })
        if (!fallback.error && fallback.data) setProducts(fallback.data.map(mapDbShopProductToShopProduct))
        setIsLoading(false)
      })
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', shopGuideUrlSettingKey)
      .maybeSingle()
      .then(({ data }) => {
        const url = (data?.value as { url?: string } | null)?.url
        if (url) setGuideUrl(url)
      })
  }, [])

  const saveGuideUrl = async () => {
    setIsSavingGuideUrl(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: shopGuideUrlSettingKey, value: { url: guideUrl } })
    setIsSavingGuideUrl(false)
    if (error) {
      toast.error('公式SHOPリンクの保存に失敗しました')
    } else {
      toast.success('公式SHOPリンクを保存しました。')
    }
  }

  const startAdd = () => {
    setDraft(emptyProductDraft())
    setEditingIndex(null)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const startEdit = (product: ShopProduct, index: number) => {
    setDraft(product)
    setEditingIndex(index)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (!draft.name.trim() || !draft.organization.trim()) return
    setIsSaving(true)
    setErrorMessage(null)
    const supabase = createClient()
    const payload = shopProductToDbPayload(draft)

    const { expires_at, contact_email, ...payloadWithoutExpiry } = payload

    if (editingIndex !== null && draft.id) {
      let { error } = await supabase.from('shop_products').update(payload).eq('id', draft.id)
      if (error && isMissingExpiryColumnError(error.message)) {
        toast.error('掲載期限管理のデータベース更新が未適用のため、掲載期限は保存されませんでした。')
        ;({ error } = await supabase.from('shop_products').update(payloadWithoutExpiry).eq('id', draft.id))
      }
      if (error) {
        console.error('[v0] Failed to update shop_products:', error.message)
        setErrorMessage(`保存に失敗しました：${error.message}`)
        toast.error(`保存に失敗しました：${error.message}`)
        setIsSaving(false)
        return
      }
      setProducts((current) => current.map((item, index) => (index === editingIndex ? draft : item)))
    } else if (products.length < maxProducts) {
      let { data, error } = await supabase
        .from('shop_products')
        .insert({ ...payload, display_order: products.length })
        .select('id')
        .single()
      if (error && isMissingExpiryColumnError(error.message)) {
        toast.error('掲載期限管理のデータベース更新が未適用のため、掲載期限は保存されませんでした。')
        ;({ data, error } = await supabase
          .from('shop_products')
          .insert({ ...payloadWithoutExpiry, display_order: products.length })
          .select('id')
          .single())
      }
      if (error) {
        console.error('[v0] Failed to insert shop_products:', error.message)
        setErrorMessage(`保存に失敗しました：${error.message}`)
        toast.error(`保存に失敗しました：${error.message}`)
        setIsSaving(false)
        return
      }
      setProducts((current) => [...current, { ...draft, id: data?.id }])
    }

    setIsSaving(false)
    setModalOpen(false)
    setEditingIndex(null)
    toast.success('保存しました')
  }

  const remove = async (index: number) => {
    const product = products[index]
    if (product.id) {
      const supabase = createClient()
      const { error } = await supabase.from('shop_products').delete().eq('id', product.id)
      if (error) return
    }
    setProducts((current) => current.filter((_, i) => i !== index))
  }

  // Swaps display_order with the neighboring card and persists both rows
  // immediately, so the new order survives a reload and carries over to the
  // top page's 応援SHOP section (which also sorts by display_order).
  const move = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= products.length) return
    const current = products[index]
    const neighbor = products[swapIndex]
    if (!current.id || !neighbor.id) return

    const currentOrder = current.sortOrder ?? index
    const neighborOrder = neighbor.sortOrder ?? swapIndex

    const supabase = createClient()
    const [{ error: currentError }, { error: neighborError }] = await Promise.all([
      supabase.from('shop_products').update({ display_order: neighborOrder }).eq('id', current.id),
      supabase.from('shop_products').update({ display_order: currentOrder }).eq('id', neighbor.id),
    ])
    if (currentError || neighborError) {
      toast.error('並び順の変更に失敗しました。時間をおいて再度お試しください。')
      return
    }

    setProducts((prev) => {
      const next = [...prev]
      next[index] = { ...neighbor, sortOrder: currentOrder }
      next[swapIndex] = { ...current, sortOrder: neighborOrder }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-black text-slate-900">つとむん公式 / 応援委託SHOP 誘導リンク</p>
        <p className="mt-1 text-xs font-bold text-slate-400">トップページの応援SHOPセクションから遷移する公式SHOPのURLを設定します。</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={guideUrl} onChange={(event) => setGuideUrl(event.target.value)} placeholder="https://..." className={inputClass} />
          <button
            onClick={saveGuideUrl}
            disabled={isSavingGuideUrl}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground disabled:opacity-60"
          >
            {isSavingGuideUrl && <Loader2 size={14} className="animate-spin" />}保存する
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-900">商品カード（上限{maxProducts}枠 / 現在{products.length}枠）</p>
          <button
            onClick={startAdd}
            disabled={products.length >= maxProducts}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-black text-slate-500 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />商品を追加
          </button>
        </div>
        {isLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
            <Loader2 size={16} className="animate-spin" />読み込み中...
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {products.map((product, index) => (
              <div key={product.id ?? `${product.name}-${index}`} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-800">{product.name}</p>
                      {product.tagline && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">{product.tagline}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">{product.organization}{product.area ? ` ／ ${product.area}` : ''}</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-600">{product.price}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => move(index, 'up')}
                      disabled={index === 0}
                      aria-label={`${product.name}を上へ移動`}
                      className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => move(index, 'down')}
                      disabled={index === products.length - 1}
                      aria-label={`${product.name}を下へ移動`}
                      className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => startEdit(product, index)} aria-label={`${product.name}を編集`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(index)} aria-label={`${product.name}を削除`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-rose-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {product.url && <p className="break-all text-xs font-bold text-slate-400">{product.url}</p>}
                <ExpiryBadgeAndResend expiresAt={product.expiresAt} contactEmail={product.contactEmail} type="shop" id={product.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editingIndex !== null ? '商品カードを編集' : '商品カードを追加'} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="エリア（市町村選択）">
                <select value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} className={inputClass}>
                  {allMunicipalities.map((place) => (
                    <option key={place}>{place}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="出品者 / 団体名（必須）">
                <input value={draft.organization} onChange={(event) => setDraft({ ...draft, organization: event.target.value })} className={inputClass} />
              </FormField>
            </div>
            <FormField label="商品画像">
              <div className="flex items-center gap-3">
                {draft.image && (
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={draft.image} alt="商品画像プレビュー" className="size-full object-cover" />
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-xs font-black text-slate-500 hover:border-primary hover:text-primary">
                  端末からアップロード
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => setDraft({ ...draft, image: reader.result as string })
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              </div>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="商品名（必須）">
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} />
              </FormField>
              <FormField label="税込価格">
                <input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="例：850円（税込）" className={inputClass} />
              </FormField>
            </div>
            <FormField label="一言メッセージ（最大15文字）">
              <input
                value={draft.tagline ?? ''}
                onChange={(event) => setDraft({ ...draft, tagline: event.target.value.slice(0, 15) })}
                placeholder="例：おすすめ！、数量限定"
                maxLength={15}
                className={inputClass}
              />
            </FormField>
            <FormField label="「ショップを見る」リンクURL">
              <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://..." className={inputClass} />
            </FormField>
            <FormField label="出品者の連絡先メール（更新案内メールの送付先）">
              <input
                type="email"
                value={draft.contactEmail}
                onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })}
                placeholder="contact@example.com"
                className={inputClass}
              />
            </FormField>
            <ExpiryDateField value={draft.expiresAt} onChange={(nextDateInput) => setDraft({ ...draft, expiresAt: nextDateInput })} />
            {errorMessage && <p className="text-xs font-bold text-rose-500">{errorMessage}</p>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              キャンセル
            </button>
            <button onClick={save} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-60">
              {isSaving && <Loader2 size={14} className="animate-spin" />}保存する
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const emptyPartnerDraft = (): OfficialPartner => ({
  name: '',
  category: '',
  message: '',
  logo: '',
  url: '',
  urlLabel: '',
  subUrl: '',
  subUrlLabel: '',
  phone: '',
  phoneNote: '',
  expiresAt: '',
  contactEmail: '',
  supporterArea: undefined,
})

function partnerToDbPayload(partner: OfficialPartner) {
  return {
    company_name: partner.name,
    sub_title: partner.category || null,
    support_message: partner.message || null,
    logo_url: partner.logo || null,
    website_url: partner.url || null,
    website_label: partner.urlLabel || null,
    sub_url: partner.subUrl || null,
    sub_url_label: partner.subUrlLabel || null,
    phone: partner.phone || null,
    phone_note: partner.phoneNote || null,
    expires_at: toIsoOrNull(partner.expiresAt),
    contact_email: partner.contactEmail || null,
    supporter_area: partner.supporterArea || null,
  }
}

// scripts/sql/2025_expiry_management.sql が未適用の環境では expires_at / contact_email /
// expiry_notified_30d カラムが無く、INSERT・UPDATEがこのエラーで失敗する。その場合だけ
// これらのフィールドを外して再送し、他の項目の保存は失敗させない。
  function isMissingExpiryColumnError(message?: string): boolean {
    // Supabase's "Could not find the 'X' column" message puts the column name *before*
    // the word "column", so a regex requiring "column" first would never match here -
    // check for the two independently instead of relying on their order.
    return Boolean(message && /column/i.test(message) && /(expires_at|contact_email|expiry_notified)/i.test(message))
  }

// 掲載期限バッジ + 「更新案内メールを手動再送する」ボタン。応援企業（partners）と
// SHOP（shop_products）の両タブで同じ見た目・挙動を使う。
function ExpiryBadgeAndResend({
  expiresAt,
  contactEmail,
  type,
  id,
}: {
  expiresAt?: string
  contactEmail?: string
  type: 'partner' | 'shop'
  id?: string
}) {
  const [sending, setSending] = useState(false)
  const status = getExpiryStatus(expiresAt)
  const days = getDaysUntilExpiry(expiresAt)

  const resend = async () => {
    if (!id) return
    setSending(true)
    try {
      const response = await fetch('/api/notify/partner-shop-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(result?.error || '更新案���メールの再送に失敗しました。')
        return
      }
      toast.success('更新案内メールを再送しました。')
    } catch {
      toast.error('更新案内メールの再送に失敗しました。')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${expiryStatusStyle[status]}`}>{expiryStatusLabel[status]}</span>
      {expiresAt && (
        <span className="text-[11px] font-bold text-slate-400">
          掲載期限: {new Date(expiresAt).toLocaleDateString('ja-JP')}
          {days !== null && (status === 'warning' || status === 'expired') && (
            <span className="ml-1">{days < 0 ? `（${Math.abs(days)}日超過）` : `（残り${days}日）`}</span>
          )}
        </span>
      )}
      {id && (
        <button
          onClick={resend}
          disabled={sending || !contactEmail}
          title={contactEmail ? undefined : '連絡先メールが未設定です'}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          更新案内メールを再送
        </button>
      )}
    </div>
  )
}

// 掲載期限の日付入力＋クイック加算ボタン（+1ヶ月 / +3ヶ月 / +6ヶ月 / +1年）。
function ExpiryDateField({ value, onChange }: { value?: string; onChange: (nextDateInput: string) => void }) {
  const dateInputValue = value ? value.slice(0, 10) : ''
  return (
    <FormField label="掲載期限（契約期間）">
      <input type="date" value={dateInputValue} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          { label: '+1ヶ月', months: 1 },
          { label: '+3ヶ月', months: 3 },
          { label: '+6ヶ月', months: 6 },
          { label: '+1年', months: 12 },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(addMonthsToDateInput(dateInputValue || undefined, option.months))}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:border-primary hover:text-primary"
          >
            {option.label}
          </button>
        ))}
      </div>
    </FormField>
  )
}

function PartnersManagementTab() {
  const [partners, setPartners] = useState<OfficialPartner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<OfficialPartner>(emptyPartnerDraft())
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const legacyColumns =
      'id, partner_type, company_name, sub_title, support_message, website_url, website_label, sub_url, sub_url_label, phone, phone_note, logo_url, display_order'
    supabase
      .from('partners')
      .select(`${legacyColumns}, expires_at, contact_email, expiry_notified_30d, supporter_area`)
      .order('display_order', { ascending: true, nullsFirst: false })
      .then(async ({ data, error }) => {
        if (!error && data) {
          setPartners(data.map(mapDbPartnerToOfficialPartner))
          setIsLoading(false)
          return
        }
        // scripts/sql/2025_expiry_management.sql が未適用の環境向けフォールバック。
        // supporter_area カラムが無い場合は expires_at 等と同様に外して再取得する。
        const withoutExpiry = await supabase
          .from('partners')
          .select(`${legacyColumns}, supporter_area`)
          .order('display_order', { ascending: true, nullsFirst: false })
        if (!withoutExpiry.error && withoutExpiry.data) {
          setPartners(withoutExpiry.data.map(mapDbPartnerToOfficialPartner))
          setIsLoading(false)
          return
        }
        const fallback = await supabase.from('partners').select(legacyColumns).order('display_order', { ascending: true, nullsFirst: false })
        if (!fallback.error && fallback.data) setPartners(fallback.data.map(mapDbPartnerToOfficialPartner))
        setIsLoading(false)
      })
  }, [])

  const startAdd = () => {
    setDraft(emptyPartnerDraft())
    setEditingIndex(null)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const startEdit = (partner: OfficialPartner, index: number) => {
    setDraft(partner)
    setEditingIndex(index)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (!draft.name.trim()) return
    setIsSaving(true)
    setErrorMessage(null)
    const supabase = createClient()
    const payload = partnerToDbPayload(draft)

    const { expires_at, contact_email, ...payloadWithoutExpiry } = payload

    if (editingIndex !== null && draft.id) {
      let { error } = await supabase.from('partners').update(payload).eq('id', draft.id)
      if (error && isMissingExpiryColumnError(error.message)) {
        toast.error('掲載期限管理のデータベース更新が未適用のため、掲載期限は保存されませんでした。')
        ;({ error } = await supabase.from('partners').update(payloadWithoutExpiry).eq('id', draft.id))
      }
      if (error) {
        console.error('[v0] Failed to update partners:', error.message)
        setErrorMessage(`保存に失敗しました：${error.message}`)
        toast.error(`保存に失敗しました：${error.message}`)
        setIsSaving(false)
        return
      }
      setPartners((current) => current.map((item, index) => (index === editingIndex ? draft : item)))
    } else {
      let { data, error } = await supabase
        .from('partners')
        .insert({ ...payload, partner_type: 'sponsor', display_order: partners.length })
        .select('id')
        .single()
      if (error && isMissingExpiryColumnError(error.message)) {
        toast.error('掲載期限管理のデータベース更新が未適用のため、掲載期限は保存されませんでした。')
        ;({ data, error } = await supabase
          .from('partners')
          .insert({ ...payloadWithoutExpiry, partner_type: 'sponsor', display_order: partners.length })
          .select('id')
          .single())
      }
      if (error) {
        console.error('[v0] Failed to insert partners:', error.message)
        setErrorMessage(`保存に失敗しました：${error.message}`)
        toast.error(`保存に失敗しました：${error.message}`)
        setIsSaving(false)
        return
      }
      setPartners((current) => [...current, { ...draft, id: data?.id }])
    }

    setIsSaving(false)
    setModalOpen(false)
    setEditingIndex(null)
    toast.success('保存しました')
  }

  const remove = async (index: number) => {
    const partner = partners[index]
    if (partner.id) {
      const supabase = createClient()
      const { error } = await supabase.from('partners').delete().eq('id', partner.id)
      if (error) return
    }
    setPartners((current) => current.filter((_, i) => i !== index))
  }

  // Swaps display_order with the neighboring partner and persists both rows
  // immediately, so the new order survives a reload and carries over to the
  // top page's 協賛パートナー section (which also sorts by display_order).
  const move = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= partners.length) return
    const current = partners[index]
    const neighbor = partners[swapIndex]
    if (!current.id || !neighbor.id) return

    const currentOrder = current.sortOrder ?? index
    const neighborOrder = neighbor.sortOrder ?? swapIndex

    const supabase = createClient()
    const [{ error: currentError }, { error: neighborError }] = await Promise.all([
      supabase.from('partners').update({ display_order: neighborOrder }).eq('id', current.id),
      supabase.from('partners').update({ display_order: currentOrder }).eq('id', neighbor.id),
    ])
    if (currentError || neighborError) {
      toast.error('並び順の変更に失敗しました。時間をおいて再度お試しください。')
      return
    }

    setPartners((prev) => {
      const next = [...prev]
      next[index] = { ...neighbor, sortOrder: currentOrder }
      next[swapIndex] = { ...current, sortOrder: neighborOrder }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-900">協賛パートナー一覧</p>
          <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-black text-slate-500 hover:border-primary hover:text-primary">
            <Plus size={16} />パートナーを追加
          </button>
        </div>
        {isLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
            <Loader2 size={16} className="animate-spin" />読み込み中...
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {partners.map((partner, index) => (
              <div key={partner.id ?? `${partner.name}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">{partner.category}</p>
                  <p className="mt-0.5 text-sm font-black text-slate-800">{partner.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{partner.message}</p>
                  {partner.url && (
                    <p className="mt-1 break-all text-xs font-bold text-slate-400">
                      {partner.urlLabel ? `${partner.urlLabel}: ` : ''}{partner.url}
                    </p>
                  )}
                  {partner.subUrl && (
                    <p className="mt-1 break-all text-xs font-bold text-slate-400">
                      {partner.subUrlLabel ? `${partner.subUrlLabel}: ` : ''}{partner.subUrl}
                    </p>
                  )}
                  {partner.phone && (
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                      TEL: {partner.phone}{partner.phoneNote ? `（${partner.phoneNote}）` : ''}
                    </p>
                  )}
                  <ExpiryBadgeAndResend expiresAt={partner.expiresAt} contactEmail={partner.contactEmail} type="partner" id={partner.id} />
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => move(index, 'up')}
                    disabled={index === 0}
                    aria-label={`${partner.name}を上へ移動`}
                    className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(index, 'down')}
                    disabled={index === partners.length - 1}
                    aria-label={`${partner.name}を下へ移動`}
                    className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => startEdit(partner, index)} aria-label={`${partner.name}を編集`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(index)} aria-label={`${partner.name}を削除`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editingIndex !== null ? 'パートナーを編集' : 'パートナーを追加'} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="企業ロゴ画像">
              <div className="flex items-center gap-3">
                {draft.logo && (
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img src={draft.logo} alt="ロゴプレビュー" className="size-full object-cover" />
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-xs font-black text-slate-500 hover:border-primary hover:text-primary">
                  端末からアップロード
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => setDraft({ ...draft, logo: reader.result as string })
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
              </div>
              <input
                value={draft.logo}
                onChange={(event) => setDraft({ ...draft, logo: event.target.value })}
                placeholder="または画像URLを直接入力"
                className={`${inputClass} mt-2`}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="小タイトル（業種・肩書）">
                <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={inputClass} />
              </FormField>
              <FormField label="企業 / 団体名（必須）">
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} />
              </FormField>
            </div>
            <FormField label="応援コメント">
              <textarea rows={3} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} className={inputClass} />
            </FormField>
            <FormField label="公式サポート窓口の指定">
              <select
                value={draft.supporterArea ?? ''}
                onChange={(event) => setDraft({ ...draft, supporterArea: event.target.value || undefined })}
                className={inputClass}
              >
                <option value="">指定なし（一般パートナー）</option>
                {officialMunicipalities.map((place) => (
                  <option key={place} value={place}>{place}</option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] font-bold text-slate-400">
                指定すると、応援パートナー一覧のカードに「🤝 〇〇 公式サポート窓口」の特別バッジが表示されます。
              </p>
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="電話番号（Webがない企業向け）">
                <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={inputClass} />
              </FormField>
              <FormField label="電話受付時間の補足">
                <input value={draft.phoneNote} onChange={(event) => setDraft({ ...draft, phoneNote: event.target.value })} placeholder="例: 平日 9:00〜13:00" className={inputClass} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="ボタン1: リンクURL">
                <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://..." className={inputClass} />
              </FormField>
              <FormField label="ボタン1: ボタン表示名">
                <input value={draft.urlLabel} onChange={(event) => setDraft({ ...draft, urlLabel: event.target.value })} placeholder="例: 企業サイトを見る" className={inputClass} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="ボタン2: リンクURL（任意）">
                <input value={draft.subUrl} onChange={(event) => setDraft({ ...draft, subUrl: event.target.value })} placeholder="https://..." className={inputClass} />
              </FormField>
              <FormField label="ボタン2: ボタン��示名">
                <input value={draft.subUrlLabel} onChange={(event) => setDraft({ ...draft, subUrlLabel: event.target.value })} placeholder="例: 運営会社概要を見る" className={inputClass} />
              </FormField>
            </div>
            <FormField label="ご担当者連絡先メール（更新案内メールの送付先）">
              <input
                type="email"
                value={draft.contactEmail}
                onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })}
                placeholder="contact@example.com"
                className={inputClass}
              />
            </FormField>
            <ExpiryDateField value={draft.expiresAt} onChange={(nextDateInput) => setDraft({ ...draft, expiresAt: nextDateInput })} />
          </div>
          {errorMessage && <p className="mt-3 text-xs font-bold text-rose-500">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              キャンセル
            </button>
            <button onClick={save} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-60">
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              保存する
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function todayLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyBulletinDraft(): BulletinPost {
  return { title: '', body: '', postDate: todayLocalDateString(), isImportant: false }
}

function BulletinBoardManagementTab() {
  const [posts, setPosts] = useState<BulletinPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<BulletinPost>(emptyBulletinDraft())
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // Fall back to post_date/created_at descending if sort_order isn't
    // available (e.g. the column hasn't been migrated on this project yet),
    // so the list still loads instead of erroring out.
    supabase
      .from('bulletin_posts')
      .select('id, title, body, post_date, is_important, created_at, sort_order')
      .order('sort_order', { ascending: true })
      .then(async ({ data, error }) => {
        if (!error && data) {
          setPosts(data.map(mapDbBulletinPostToBulletinPost))
          setIsLoading(false)
          return
        }
        const fallback = await supabase
          .from('bulletin_posts')
          .select('id, title, body, post_date, is_important, created_at')
          .order('post_date', { ascending: false })
          .order('created_at', { ascending: false })
        if (!fallback.error && fallback.data) {
          setPosts(fallback.data.map(mapDbBulletinPostToBulletinPost))
        }
        setIsLoading(false)
      })
  }, [])

  // Reflects the persisted sort_order (kept in sync by the ▲/▼ handlers below)
  // rather than re-deriving order from postDate, so manual reordering sticks.
  const sortedPosts = [...posts].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  const startAdd = () => {
    const maxSortOrder = posts.reduce((max, post) => Math.max(max, post.sortOrder ?? 0), 0)
    setDraft({ ...emptyBulletinDraft(), sortOrder: maxSortOrder + 10 })
    setEditingIndex(null)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const startEdit = (post: BulletinPost, index: number) => {
    setDraft(post)
    setEditingIndex(index)
    setErrorMessage(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return
    setIsSaving(true)
    setErrorMessage(null)
    const supabase = createClient()
    const payload = {
      title: draft.title,
      body: draft.body,
      post_date: draft.postDate,
      is_important: draft.isImportant,
      ...(typeof draft.sortOrder === 'number' ? { sort_order: draft.sortOrder } : {}),
    }

    // sort_order may not exist yet on every environment's bulletin_posts
    // table. If Supabase reports an undefined-column error (42703) for it,
    // drop sort_order from the payload and retry once instead of failing
    // the whole save.
    const { sort_order: _sortOrder, ...payloadWithoutSortOrder } = payload as typeof payload & { sort_order?: number }
    const isMissingSortOrderColumn = (error: { code?: string; message?: string } | null) =>
      error?.code === '42703' || (error?.message ?? '').toLowerCase().includes('sort_order')

    if (editingIndex !== null && draft.id) {
      let { error } = await supabase.from('bulletin_posts').update(payload).eq('id', draft.id)
      if (error && isMissingSortOrderColumn(error)) {
        ;({ error } = await supabase.from('bulletin_posts').update(payloadWithoutSortOrder).eq('id', draft.id))
      }
      if (error) {
        setErrorMessage('保存に失敗しました。時間をおいて再度お試しください。')
        setIsSaving(false)
        return
      }
      setPosts((current) => current.map((item) => (item.id === draft.id ? draft : item)))
    } else {
      let { data, error } = await supabase.from('bulletin_posts').insert(payload).select('id').single()
      if (error && isMissingSortOrderColumn(error)) {
        ;({ data, error } = await supabase.from('bulletin_posts').insert(payloadWithoutSortOrder).select('id').single())
      }
      if (error) {
        setErrorMessage('保存に失敗しました。時間をおいて再度お試しください。')
        setIsSaving(false)
        return
      }
      setPosts((current) => [{ ...draft, id: data?.id }, ...current])
    }

    setIsSaving(false)
    setModalOpen(false)
    setEditingIndex(null)
  }

  const remove = async (post: BulletinPost) => {
    if (!window.confirm(`「${post.title}」を削除しますか？この操作は取り消せません。`)) return
    if (post.id) {
      const supabase = createClient()
      const { error } = await supabase.from('bulletin_posts').delete().eq('id', post.id)
      if (error) {
        toast.error('削除に失敗しました。時間をおいて再度お試しください。')
        return
      }
      setPosts((current) => current.filter((item) => item.id !== post.id))
    } else {
      setPosts((current) => current.filter((item) => item !== post))
    }
    toast.success('お知らせを削除しました')
  }

  // Swaps sort_order with the neighboring post (based on the current
  // sort_order-ordered list) and persists both rows immediately, so the new
  // order survives a reload and carries over to the top page's つとむん掲示板 section.
  const move = async (post: BulletinPost, direction: 'up' | 'down') => {
    if (!post.id) return
    const position = sortedPosts.findIndex((item) => item.id === post.id)
    const swapPosition = direction === 'up' ? position - 1 : position + 1
    if (position === -1 || swapPosition < 0 || swapPosition >= sortedPosts.length) return
    const neighbor = sortedPosts[swapPosition]
    if (!neighbor.id) return

    const postSortOrder = post.sortOrder ?? 0
    const neighborSortOrder = neighbor.sortOrder ?? 0

    const supabase = createClient()
    const [{ error: postError }, { error: neighborError }] = await Promise.all([
      supabase.from('bulletin_posts').update({ sort_order: neighborSortOrder }).eq('id', post.id),
      supabase.from('bulletin_posts').update({ sort_order: postSortOrder }).eq('id', neighbor.id),
    ])
    if (postError || neighborError) {
      toast.error('並び順の変更に失敗しました。時間をおいて再度お試しください。')
      return
    }

    setPosts((current) =>
      current.map((item) => {
        if (item.id === post.id) return { ...item, sortOrder: neighborSortOrder }
        if (item.id === neighbor.id) return { ...item, sortOrder: postSortOrder }
        return item
      }),
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">つとむん掲示板 / 運営からのおしらせ</p>
            <p className="mt-1 text-xs text-slate-500">トップページの「つとむん掲示板」枠に表示されるお知らせを管理・更新します。</p>
          </div>
          <button onClick={startAdd} className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-black text-slate-500 hover:border-primary hover:text-primary">
            <Plus size={16} />お知らせを追加
          </button>
        </div>
        {isLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
            <Loader2 size={16} className="animate-spin" />読み込み中...
          </div>
        ) : sortedPosts.length === 0 ? (
          <p className="mt-6 py-8 text-center text-sm font-bold text-slate-400">まだお知らせがありません。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedPosts.map((post, index) => (
              <div key={post.id ?? `${post.title}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-400">{post.postDate}</p>
                    {post.isImportant && <Badge className="bg-amber-100 text-amber-700">重要</Badge>}
                  </div>
                  <p className="mt-1 text-sm font-black text-slate-800">{post.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{post.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => move(post, 'up')}
                    disabled={index === 0}
                    aria-label={`${post.title}を上へ移動`}
                    className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(post, 'down')}
                    disabled={index === sortedPosts.length - 1}
                    aria-label={`${post.title}を下へ移動`}
                    className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button onClick={() => startEdit(post, posts.indexOf(post))} aria-label={`${post.title}を編集`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-primary">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(post)} aria-label={`${post.title}を削除`} className="grid size-8 place-items-center rounded-full bg-white text-slate-500 hover:text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title={editingIndex !== null ? 'お知らせを編集' : 'お知らせを追加'} onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="タイトル（必須）">
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={inputClass} />
            </FormField>
            <FormField label="本文（必須）">
              <textarea rows={4} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} className={inputClass} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="日付">
                <input type="date" value={draft.postDate} onChange={(event) => setDraft({ ...draft, postDate: event.target.value })} className={inputClass} />
              </FormField>
              <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={draft.isImportant} onChange={(event) => setDraft({ ...draft, isImportant: event.target.checked })} className="size-4 accent-primary" />
                重要なお知らせとして表示する
              </label>
            </div>
          </div>
          {errorMessage && <p className="mt-3 text-xs font-bold text-rose-500">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              キャンセル
            </button>
            <button onClick={save} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-60">
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              保存する
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

type AdminAccount = {
  id: string
  email: string
  fullName: string
  status: string
  createdAt: string
  isMasterAdmin: boolean
}

function emptyAdminAccountDraft() {
  return { fullName: '', email: '', password: '' }
}

const adminStatusLabels: Record<string, string> = {
  active: '有効',
  pending: '招待中',
  suspended: '停止中',
}

function AdminAccountsTab({ currentAdminEmail }: { currentAdminEmail: string }) {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState(emptyAdminAccountDraft())
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminAccount | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const loadAdmins = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/admins')
      const json = await response.json().catch(() => null)
      if (response.ok && Array.isArray(json?.admins)) {
        setAdmins(
          json.admins.map((row: { id: string; email: string; full_name: string | null; status: string; created_at: string; is_master_admin?: boolean }) => ({
            id: row.id,
            email: row.email,
            fullName: row.full_name ?? '',
            status: row.status,
            createdAt: row.created_at,
            isMasterAdmin: Boolean(row.is_master_admin),
          })),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  const startAdd = () => {
    setDraft(emptyAdminAccountDraft())
    setErrorMessage(null)
    setModalOpen(true)
  }

  const save = async () => {
    // Password is only required for a genuinely new account (self-service sign-up).
    // Whether that email already has a member profile — which just gets promoted to
    // admin in place, no password needed — is something only the server can know, so
    // the field is optional here and the server returns its own error if a real
    // sign-up turns out to be required and no password was given.
    if (!draft.fullName.trim() || !draft.email.trim()) {
      setErrorMessage('氏名とメールアドレスを入力してください。')
      return
    }
    if (draft.password && draft.password.length < 8) {
      setErrorMessage('パスワードを入力する場合は8文字以上にしてください。')
      return
    }
    setIsSaving(true)
    setErrorMessage(null)
    const response = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: draft.fullName, email: draft.email, password: draft.password }),
    })
    const json = await response.json().catch(() => null)
    setIsSaving(false)
    if (!response.ok) {
      setErrorMessage(json?.error ?? '登録に失敗しました。')
      return
    }
    setModalOpen(false)
    toast.success(
      json?.mode === 'promoted'
        ? '既存の会員アカウントに管理者権限を付与しました。'
        : '管理者宛に認証・招待メールを送信しました。',
    )
    loadAdmins()
  }

  const requestRemove = (admin: AdminAccount) => {
    if (admins.length <= 1) {
      toast.error('最後の管理者は削除できません。')
      return
    }
    setConfirmText('')
    setPendingDelete(admin)
  }

  const confirmRemove = async () => {
    if (!pendingDelete) return
    const admin = pendingDelete
    setDeletingId(admin.id)
    const response = await fetch('/api/admin/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: admin.id }),
    })
    const json = await response.json().catch(() => null)
    setDeletingId(null)
    if (!response.ok) {
      toast.error(json?.error ?? '管理者の削除に失敗しました。時間をおいて再度お試しください。')
      return
    }
    toast.success(`${admin.fullName || admin.email}の管理者権限を削除しました。会員データは維持されています。`)
    setAdmins((current) => current.filter((item) => item.id !== admin.id))
    setPendingDelete(null)
    setConfirmText('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">管理者・権限管理</p>
            <p className="mt-1 text-xs text-slate-500">
              管理ダッシュボードにログインできる管理者アカウントを管理します。新しい管理者は登録後、本人のメールに届く確認リンクからメール認証を完了すると「有効」になりログインできます。
            </p>
          </div>
          <button
            onClick={startAdd}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-black text-slate-500 hover:border-primary hover:text-primary"
          >
            <Plus size={16} />
            新しい管理者を登録
          </button>
        </div>

        {isLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            読み込み中...
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
                  <th className="px-5 py-3">名前</th>
                  <th className="px-5 py-3">メールアドレス</th>
                  <th className="px-5 py-3">登録日</th>
                  <th className="px-5 py-3">状態</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-900">
                      {admin.fullName || '（未設定）'}
                      {admin.email === currentAdminEmail && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          あなた
                        </span>
                      )}
                      {admin.isMasterAdmin && (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-black text-sky-700">
                          マスター管理者
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{admin.email}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(admin.createdAt).toLocaleDateString('ja-JP')}</td>
                    <td className="px-5 py-4">
                      <Badge className="bg-emerald-100 text-emerald-700">{adminStatusLabels[admin.status] ?? admin.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {!(admin.email === currentAdminEmail || admin.isMasterAdmin) && (
                        <button
                          onClick={() => requestRemove(admin)}
                          disabled={deletingId === admin.id || admins.length <= 1}
                          aria-label={`${admin.fullName || admin.email}を削除`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500 hover:border-rose-400 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deletingId === admin.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          削除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="管理者追加モーダル" onClose={() => setModalOpen(false)}>
          <div className="space-y-3">
            <FormField label="氏名（必須）">
              <input value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} className={inputClass} />
            </FormField>
            <FormField label="メールアドレス（必須）">
              <input
                type="email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                className={inputClass}
              />
            </FormField>
            <FormField label="初期パスワード（新規登録の場合のみ・8文字以上）">
              <input
                type="text"
                value={draft.password}
                onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                placeholder="本人に共有し、初回ログイン後の変更を推奨します"
                className={inputClass}
              />
            </FormField>
            <p className="text-[11px] leading-relaxed text-slate-400">
              入力したメールアドレスが既存の会員アカウントの場合、そのアカウントに管理者権限が付与されます（パスワードは不要・無視されます）。まだ登録されていないメールアドレスの場合は新規管理者として招待され、確認メールが送信されます。本人がリンクをクリックしてメール認証を完了するまでログインできません。
            </p>
          </div>
          {errorMessage && <p className="mt-3 text-xs font-bold text-rose-500">{errorMessage}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              キャンセル
            </button>
            <button
              onClick={save}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground disabled:opacity-60"
            >
              {isSaving && <Loader2 size={13} className="animate-spin" />}
              登録する
            </button>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <Modal title="管理者の削除" onClose={() => setPendingDelete(null)}>
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
            この操作は取り消せません。{pendingDelete.fullName || pendingDelete.email}さんは管理者権限を失い、管理ダッシュボードにログインできなくなります。会員データ（マイページアカウント）は削除されず、そのまま維持されます。
          </div>
          <p className="mt-4 text-xs font-black text-slate-600">
            確認のため、削除する管理者のメールアドレス（<span className="font-mono text-slate-800">{pendingDelete.email}</span>）を入力してください。
          </p>
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={pendingDelete.email}
            autoFocus
            className={`${inputClass} mt-2`}
          />
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setPendingDelete(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              キャンセル
            </button>
            <button
              onClick={confirmRemove}
              disabled={confirmText.trim() !== pendingDelete.email || deletingId === pendingDelete.id}
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {deletingId === pendingDelete.id && <Loader2 size={13} className="animate-spin" />}
              権限を削除する
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InquiryDetailModal({
  inquiry,
  onClose,
  onStatusChange,
  onDelete,
}: {
  inquiry: AdminInquiry
  onClose: () => void
  onStatusChange: (status: AdminInquiryStatus) => void
  onDelete: () => void
}) {
  const isStale = inquiry.status === '未対応' && daysSinceInquiryReceived(inquiry.receivedAt) >= STALE_INQUIRY_DAYS

  return (
    <Modal title="お問い合わせ詳細" onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={inquiryStatusStyles[inquiry.status]}>{inquiry.status}</Badge>
        <Badge className="bg-slate-100 text-slate-600">{inquiry.genre}</Badge>
        {isStale && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white">
            <AlertTriangle size={12} /> 要対応（受付から{daysSinceInquiryReceived(inquiry.receivedAt)}日経過）
          </span>
        )}
      </div>
      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="text-xs font-black text-slate-400">受付��時</dt>
          <dd className="mt-1 font-bold text-slate-700">{formatInquiryReceivedAt(inquiry.receivedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-black text-slate-400">お名前 / 企業・団体名</dt>
          <dd className="mt-1 font-bold text-slate-700">{inquiry.name}</dd>
        </div>
        {inquiry.email && (
          <div>
            <dt className="text-xs font-black text-slate-400">メールアドレス</dt>
            <dd className="mt-1 break-all font-bold text-slate-700">{inquiry.email}</dd>
          </div>
        )}
        {inquiry.phone && (
          <div>
            <dt className="text-xs font-black text-slate-400">電話番号</dt>
            <dd className="mt-1 font-bold text-slate-700">
              <a href={`tel:${inquiry.phone}`} className="text-primary hover:underline">
                {inquiry.phone}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-black text-slate-400">お問い合わせ・推薦内容</dt>
          <dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{inquiry.message}</dd>
        </div>
        <div>
          <dt className="text-xs font-black text-slate-400">対応ステータス</dt>
          <dd className="mt-1.5">
            <select
              value={inquiry.status}
              onChange={(event) => onStatusChange(event.target.value as AdminInquiryStatus)}
              className={`rounded-full border-0 px-2.5 py-1 text-xs font-black outline-none ${inquiryStatusStyles[inquiry.status]}`}
            >
              {inquiryStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        {inquiry.email && (
          <a
            href={`mailto:${inquiry.email}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"
          >
            <Mail size={15} />メールで返信する
          </a>
        )}
        {inquiry.phone && (
          <a
            href={`tel:${inquiry.phone}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:border-primary hover:text-primary"
          >
            <Phone size={15} />電話をかける
          </a>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-black text-rose-500 hover:border-rose-300"
        >
          <Trash2 size={15} />削除する
        </button>
      </div>
    </Modal>
  )
}

function InquiriesTab() {
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
  const supabase = createClient()
  supabase
  .from('inquiries')
  .select('id, applicant_name, company_or_org, email, phone, inquiry_type, message, status, created_at')
  .order('created_at', { ascending: false })
  .then(({ data, error }) => {
  if (!error && data) {
  setInquiries(data.map(mapDbInquiryToAdminInquiry))
  }
  })
  }, [])
  
  const updateStatus = async (index: number, status: AdminInquiryStatus) => {
  const inquiry = inquiries[index]
  if (inquiry.id) {
  const supabase = createClient()
  const { error } = await supabase.from('inquiries').update({ status: inquiryStatusToDb(status) }).eq('id', inquiry.id)
  if (error) {
  toast.error('更新に失敗しました。時間をおいて再度お試しください。')
  return
  }
  }
  setInquiries((current) => current.map((item, i) => (i === index ? { ...item, status } : item)))
  toast.success(`ステータスを${status}に更新しました`)
  }

  const removeInquiry = async (index: number) => {
    const inquiry = inquiries[index]
    if (!window.confirm('このお問い合わせを削除してもよろしいですか？')) return
    if (inquiry.id) {
      const supabase = createClient()
      // .select() after delete() so a delete that is silently blocked (e.g. missing RLS
      // policy) and matches zero rows comes back as an empty array instead of a false
      // success — otherwise the row survives in the DB and reappears on the next reload
      // even though local state (and the confirm dialog) made it look deleted.
      const { data, error } = await supabase.from('inquiries').delete().eq('id', inquiry.id).select('id')
      if (error) {
        console.error('[v0] Failed to delete inquiry from Supabase:', error.message)
        toast.error(`削除に失敗しました: ${error.message}`)
        return
      }
      if (!data || data.length === 0) {
        toast.error('削除に失敗しました: 対象のお問い合わせが見つかりませんでした。')
        return
      }
    }
    setInquiries((current) => current.filter((_, i) => i !== index))
    setSelectedIndex(null)
    toast.success('お問い合わせを削除しました')
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => downloadInquiriesCsv(inquiries)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:border-primary hover:text-primary"
        >
          <Download size={14} />
          お問い合わせCSVダウンロード
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
              <th className="px-5 py-3">受付日時</th>
              <th className="px-5 py-3">お名前</th>
              <th className="px-5 py-3">種別</th>
              <th className="px-5 py-3">内容</th>
              <th className="px-5 py-3">対応ステータス</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry, index) => {
              const isStale = inquiry.status === '未対応' && daysSinceInquiryReceived(inquiry.receivedAt) >= STALE_INQUIRY_DAYS
              return (
              <tr
                key={inquiry.id ?? index}
                onClick={() => setSelectedIndex(index)}
                className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-100 ${isStale ? 'bg-rose-50' : ''}`}
              >
                <td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatInquiryReceivedAt(inquiry.receivedAt)}</td>
                <td className="px-5 py-4 font-black text-slate-900">
                  <div className="flex items-center gap-2">
                    {inquiry.name}
                    {isStale && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                        <AlertTriangle size={11} /> 要対応
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{inquiry.genre}</span>
                </td>
                <td className="max-w-xs truncate px-5 py-4 text-slate-500">{inquiry.message}</td>
                <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                  <select
                    value={inquiry.status}
                    onChange={(event) => updateStatus(index, event.target.value as AdminInquiryStatus)}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-black outline-none ${inquiryStatusStyles[inquiry.status]}`}
                  >
                    {inquiryStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(event) => { event.stopPropagation(); setSelectedIndex(index) }}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-500 hover:border-primary hover:text-primary"
                    >
                      詳細を見る
                    </button>
                    <button
                      onClick={(event) => { event.stopPropagation(); removeInquiry(index) }}
                      aria-label={`${inquiry.name}のお問い合わせを削除`}
                      className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selectedIndex !== null && (
        <InquiryDetailModal
          inquiry={inquiries[selectedIndex]}
          onClose={() => setSelectedIndex(null)}
          onStatusChange={(status) => updateStatus(selectedIndex, status)}
          onDelete={() => removeInquiry(selectedIndex)}
        />
      )}
    </div>
  )
}

function DetailRow({ label, value, href }: { label: string; value?: string; href?: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-black text-slate-400">{label}</dt>
      <dd className="mt-1 break-words font-bold text-slate-700">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function ActivityListingDetailModal({
  listing,
  onClose,
  onStatusChange,
  onDelete,
  onPreview,
  onViewApplicants,
}: {
  listing: AdminActivityListing
  onClose: () => void
  onStatusChange: (status: AdminPublishStatus) => void
  onDelete: () => void
  onPreview: () => void
  onViewApplicants: () => void
}) {
  return (
    <Modal title="掲載内容の詳細" onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={listingTypeStyles[listing.listingType]}>{listingTypeLabels[listing.listingType]}</Badge>
        <Badge className={effectiveStatusStyles[getEffectivePublishStatus(listing)]}>{getEffectivePublishStatus(listing)}</Badge>
        <Badge className="bg-slate-100 text-slate-600">{listing.genre}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-900">{listing.title}</h3>

      <p className="mt-6 text-xs font-black text-primary">基本情報</p>
      <dl className="mt-3 space-y-4 border-b border-slate-100 pb-6 text-sm">
        <DetailRow label="エリア" value={listing.area} />
      </dl>

      <p className="mt-6 text-xs font-black text-primary">日時・場所</p>
      <dl className="mt-3 space-y-4 border-b border-slate-100 pb-6 text-sm">
        <DetailRow label="開催日時・活動頻度" value={formatEventDateTime(listing.eventDate)} />
        <DetailRow label="会場名称" value={listing.venue} />
        <DetailRow label="住所" value={listing.address} />
      </dl>

      <p className="mt-6 text-xs font-black text-primary">参加条件</p>
      <dl className="mt-3 space-y-4 border-b border-slate-100 pb-6 text-sm">
        <DetailRow label="参加対象" value={listing.audience} />
        <DetailRow label="定員・現在の申込状況" value={`${listing.capacity} / ${listing.applicants}`} />
        <DetailRow label="参加費" value={listing.fee} />
        <DetailRow label="持ち物・準備" value={listing.whatToBring} />
      </dl>

      <p className="mt-6 text-xs font-black text-primary">団体の公開情報</p>
      <dl className="mt-3 space-y-4 border-b border-slate-100 pb-6 text-sm">
        <DetailRow label="主催団体名" value={listing.organizer} />
        <DetailRow label="団体HP" value={listing.website} href={listing.website || undefined} />
        <DetailRow label="SNSリンク" value={listing.sns} href={listing.sns || undefined} />
        <DetailRow label="見学・体験の受付先" value={listing.intakeContact} />
      </dl>

      <p className="mt-6 text-xs font-black text-slate-400">運営確認用情報（非公開）</p>
      <dl className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <DetailRow label="申請者氏名" value={listing.applicantName} />
        <DetailRow label="担当者メールアドレス" value={listing.contactEmail} href={listing.contactEmail ? `mailto:${listing.contactEmail}` : undefined} />
        <DetailRow label="担当者電話番号" value={listing.contactPhone} href={listing.contactPhone ? `tel:${listing.contactPhone}` : undefined} />
      </dl>

      <div className="mt-6">
        <p className="mb-1.5 text-xs font-black text-slate-500">審査・公開ステータス</p>
        <select
          value={getEffectivePublishStatus(listing)}
          onChange={(event) => onStatusChange(event.target.value as AdminPublishStatus)}
          className={`rounded-full border-0 px-3 py-1.5 text-xs font-black outline-none ${effectiveStatusStyles[getEffectivePublishStatus(listing)]}`}
        >
          {getEffectivePublishStatus(listing) === '終了' && <option value="終了">終了</option>}
          {publishStatusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground hover:opacity-90"
        >
          <ExternalLink size={15} />掲載ページをプレビューする
        </button>
        <button
          type="button"
          onClick={onViewApplicants}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:border-primary hover:text-primary"
        >
          <Users size={15} />申込者一覧を確認する
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2.5 text-sm font-black text-rose-500 hover:bg-rose-50"
        >
          <Trash2 size={15} />この掲載を削除する
        </button>
      </div>
    </Modal>
  )
}

type AdminApplicant = { name: string; phone: string; email: string; breakdown: string; note: string }

function AdminApplicantListModal({ listing, onClose }: { listing: AdminActivityListing; onClose: () => void }) {
  const [applicants, setApplicants] = useState<AdminApplicant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('participation_applications')
      .select('applicant_name, applicant_phone, applicant_email, participant_breakdown, question')
      .eq('activity_title', listing.title)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setApplicants(
            data.map((row) => ({
              name: row.applicant_name ?? '（未入力）',
              phone: row.applicant_phone ?? '未入力',
              email: row.applicant_email ?? '未入力',
              breakdown: row.participant_breakdown ?? '未入力',
              note: row.question || '特になし',
            })),
          )
        }
        setLoading(false)
      })
  }, [listing.title])

  const handleExportXlsx = () => {
    const header = ['氏名', '電話番号', 'メールアドレス', '参加人数/内訳', '質問・事前連絡']
    const rows = applicants.map((applicant) => [applicant.name, applicant.phone, applicant.email, applicant.breakdown, applicant.note])
    downloadXlsx(`${listing.title.replace(/[【】\s]/g, '')}_申込者一覧.xlsx`, '申込者一覧', header, rows, [1])
  }

  return (
    <Modal title="申込者一覧" onClose={onClose}>
      <p className="text-sm text-slate-500">{listing.title}</p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleExportXlsx}
          disabled={applicants.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Download size={14} />
          申込者一覧Excelダウンロード（.xlsx）
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {loading && <p className="py-8 text-center text-sm font-bold text-slate-400">読み込み中...</p>}
        {!loading && applicants.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">まだ申込者はいません</p>}
        {applicants.map((applicant, index) => (
          <article key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="font-black text-slate-900">{applicant.name}</p>
              <p className="text-slate-600">電話番号：{applicant.phone}</p>
              <p className="text-slate-600">メール：{applicant.email}</p>
              <p className="text-slate-600">参加人数/区分：{applicant.breakdown}</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">質問・事前連絡：{applicant.note}</p>
          </article>
        ))}
      </div>
    </Modal>
  )
}

function ActivityPublicPreviewModal({ listing, onClose }: { listing: AdminActivityListing; onClose: () => void }) {
  const [isFavorited, setIsFavorited] = useState(false)

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="preview-dialog-title" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800">
          <Eye size={14} />
          👀 管理者プレビュー表示中（一般公開時の見え方）
        </div>
        <div className="relative h-52 sm:h-64">
          {listing.image ? (
            <Image src={listing.image} alt={listing.title} fill className="object-cover" crossOrigin="anonymous" />
          ) : (
            <NoImagePlaceholder />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 to-transparent" />
          <button onClick={onClose} aria-label="プレビューを閉じる" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white">
            <X size={19} />
          </button>
          <div className="absolute bottom-5 left-6 right-6">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-primary">{listing.genre}</span>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">{listing.area}</span>
            </div>
            <h2 id="preview-dialog-title" className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{listing.title}</h2>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-7 text-slate-600">{listing.description}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <Users size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-black text-slate-400">参加対象</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{listing.audience}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-black text-slate-400">活動日時</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{formatEventDateTime(listing.eventDate)}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-black text-slate-400">活動場所</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{listing.venue}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="text-lg leading-none text-primary">￥</span>
              <div>
                <p className="text-xs font-black text-slate-400">参加費</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{listing.fee}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <span className="text-lg leading-none text-primary">＋</span>
            <div>
              <p className="text-xs font-black text-slate-400">持ち物・服装</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{listing.whatToBring}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {listing.sns && (
              <a href={listing.sns} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-primary hover:text-primary">SNS</a>
            )}
            {listing.website && (
              <a href={listing.website} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-primary hover:text-primary">公式Webサイト</a>
            )}
          </div>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button
              onClick={() => setIsFavorited((current) => !current)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-black hover:border-rose-300 hover:text-rose-500 ${isFavorited ? 'border-rose-300 text-rose-500' : 'border-slate-200 text-slate-600'}`}
            >
              <Heart size={17} fill={isFavorited ? 'currentColor' : 'none'} />お気に入り保存
            </button>
            <button className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground shadow-sm hover:opacity-90">
              体験・見学の申込・お問い合わせ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 活動・イベント管理一覧の「掲載期間・ステータス」列。掲載日を大きく太字で明記し、定例活動
// （regular）は掲載期限＋残り日数、単発イベント（event）は開催日/締切日を表示する。ステータス
// バッジは残り日数から一括で算出する共通ヘルパー（getExpiryStatus）に揃える。
function ActivityExpiryCell({ listing }: { listing: AdminActivityListing }) {
  const status = getExpiryStatus(listing.expiresAt)
  const days = getDaysUntilExpiry(listing.expiresAt)
  const expiresAtLabel = listing.expiresAt ? new Date(listing.expiresAt).toLocaleDateString('ja-JP') : null
  const eventExpired = listing.listingType === 'event' && isActivityListingExpired(listing)

  return (
  <div className="max-w-full text-xs text-muted-foreground">
  <div className="font-black text-slate-800">掲載日: {listing.listedAt}</div>
  {expiresAtLabel ? (
  <div className="mt-1 font-bold">
  {listing.listingType === 'regular' ? '期限' : '開催日/締切日'}: {expiresAtLabel}
  {listing.listingType === 'regular' && days !== null && (
  <span> {days < 0 ? `（${Math.abs(days)}日超過）` : `（残り${days}日）`}</span>
  )}
  </div>
  ) : (
  <div className="mt-1 font-bold">開催日時: {formatEventDateTime(listing.eventDate)}</div>
  )}
  {listing.listingType === 'regular' && (
  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${expiryStatusStyle[status]}`}>
  {status === 'warning' && days !== null ? `更新案内中（残り${days}日）` : expiryStatusLabel[status]}
  </span>
  )}
  {eventExpired && (
  <span className="mt-1.5 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">掲載終了（受付終了）</span>
  )}
  </div>
  )
  }

function ActivityListingsTab() {
  const [listings, setListings] = useState<AdminActivityListing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [applicantsIndex, setApplicantsIndex] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<'すべて' | EffectivePublishStatus>('すべて')
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [extendingId, setExtendingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // legacyColumns は掲載期限管理のマイグレーション（scripts/sql/2025_expiry_management.sql）が
    // 未適用の環境向けフォールバック。expires_at 等のカラムが無ければ再送する。
    const legacyColumns =
      'id, category_type, title, organizer_name, area, genre, date_schedule, venue_name, address, target_audience, audience_detail, capacity_info, fee_info, fee_detail, application_deadline, belongings, website_url, sns_url, contact_info, applicant_name, contact_email, contact_phone, status, created_at, image_url, genre_tags, time_slots, feature_tags, recruitment_types, audience_tags'
    const withExpiryColumns = `${legacyColumns}, expires_at, expiry_notified_30d, expiry_notified_7d, expiry_notified_end`

    const applyResults = (rows: DbActivityRow[], applicationsResult: { data: { activity_title: string }[] | null }) => {
      const counts: Record<string, number> = {}
      for (const row of applicationsResult.data ?? []) {
        counts[row.activity_title] = (counts[row.activity_title] ?? 0) + 1
      }
      setListings(
        rows.map((row) => ({
          ...mapDbActivityToAdminListing(row),
          applicants: String(counts[row.title] ?? 0),
          applicationSummary: `${counts[row.title] ?? 0}�� / ${row.capacity_info ?? '定員未定'}`,
        })),
      )
    }

    Promise.all([
      supabase.from('activities').select(withExpiryColumns).order('created_at', { ascending: false }),
      supabase.from('participation_applications').select('activity_title'),
    ]).then(([activitiesResult, applicationsResult]) => {
      if (!activitiesResult.error && activitiesResult.data) {
        applyResults(activitiesResult.data as unknown as DbActivityRow[], applicationsResult as { data: { activity_title: string }[] | null })
        setLoading(false)
        return
      }
      supabase
        .from('activities')
        .select(legacyColumns)
        .order('created_at', { ascending: false })
        .then((fallbackResult) => {
          if (!fallbackResult.error && fallbackResult.data) {
            applyResults(fallbackResult.data as unknown as DbActivityRow[], applicationsResult as { data: { activity_title: string }[] | null })
          }
          setLoading(false)
        })
    })
  }, [])

  const isDbId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const updatePublishStatus = async (index: number, publishStatus: AdminPublishStatus) => {
    const listing = listings[index]
    if (isDbId(listing.id)) {
      const supabase = createClient()
      const { error } = await supabase.from('activities').update({ status: publishStatusToDb(publishStatus) }).eq('id', listing.id)
      if (error) {
        toast.error('更新に失敗しました。時間をおいて再度お試しください。')
        return
      }
    }
    setListings((current) => current.map((item, i) => (i === index ? { ...item, publishStatus } : item)))
    toast.success(`ステータスを${publishStatus}に更新しました`)

    // Only fire on an actual pending -> published transition, not on every reselect of an
    // already-published listing, and only when we have somewhere to send it.
    if (publishStatus === '公開中' && listing.publishStatus !== '公開中' && listing.contactEmail) {
      const activityUrl = new URL(window.location.origin)
      activityUrl.searchParams.set('activity', listing.id || listing.title)
      fetch('/api/notify/listing-approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: listing.title,
          organizerName: listing.applicantName || listing.organizer,
          organizerEmail: listing.contactEmail,
          activityUrl: activityUrl.toString(),
        }),
      }).catch((error) => {
        console.log('[v0] Failed to send listing-approved notification:', error)
      })
    }
  }

  const deleteListing = async (index: number) => {
    const listing = listings[index]
    if (!window.confirm(`「${listing.title}」を削除しますか？この操作は取り消せません。`)) return

    if (isDbId(listing.id)) {
      const supabase = createClient()
      const { error } = await supabase.from('activities').delete().eq('id', listing.id)
      if (error) {
        toast.error('削除に失敗しました。時間をおいて再度お試しください。')
        return
      }
    }
    setListings((current) => current.filter((_, i) => i !== index))
    setSelectedIndex(null)
    toast.success('掲載を削除しました')
  }

  // 定例活動の期限行から、管理者が「更新案内メールを再送する」を手動で行うためのアクション。
  const resendExpiryEmail = async (index: number) => {
    const listing = listings[index]
    if (!isDbId(listing.id)) return
    setResendingId(listing.id)
    try {
      const response = await fetch('/api/notify/activity-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: listing.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(result?.error || '更新案内メールの再送に失敗しました。')
        return
      }
      toast.success('更新案内メールを再送しました')
    } catch (error) {
      console.error('[v0] Failed to resend activity expiry email:', error)
      toast.error('更新案内メールの再送に失敗しました。')
    } finally {
      setResendingId(null)
    }
  }

  // 「掲載期限を手動延長（+1年）する」クイック操作。マイページ側の更新導線（renewListing）と
  // 同じく、期限を現在日時+1年に更新し、通知フラグをリセットする。
  const extendExpiryOneYear = async (index: number) => {
    const listing = listings[index]
    if (!isDbId(listing.id)) return
    if (!window.confirm(`「${listing.title}」の掲載期限を本日から1年後まで延長しますか？`)) return
    setExtendingId(listing.id)
    const supabase = createClient()
    const newExpiresAt = oneYearFromNowIso()
    const { error } = await supabase
      .from('activities')
      .update({ expires_at: newExpiresAt, expiry_notified_30d: false, expiry_notified_7d: false })
      .eq('id', listing.id)
    setExtendingId(null)
    if (error) {
      console.error('[v0] Failed to extend activity expiry:', error.message)
      toast.error(`掲載期限の延長に失敗しました：${error.message}`)
      return
    }
    setListings((current) => current.map((item, i) => (i === index ? { ...item, expiresAt: newExpiresAt } : item)))
    toast.success('掲載期限を1年間延長しました')
  }

  const safeListings = listings ?? []

  const statusCounts: Record<'すべて' | EffectivePublishStatus, number> = {
    'すべて': safeListings.length,
    '承認待ち': safeListings.filter((listing) => listing && getEffectivePublishStatus(listing) === '承認待ち').length,
    '公開中': safeListings.filter((listing) => listing && getEffectivePublishStatus(listing) === '公開中').length,
    '終了': safeListings.filter((listing) => listing && getEffectivePublishStatus(listing) === '終了').length,
    '非公開': safeListings.filter((listing) => listing && getEffectivePublishStatus(listing) === '非公開').length,
  }

  const filteredListings = safeListings
    .map((listing, index) => ({ listing, index }))
    .filter(({ listing }) => statusFilter === 'すべて' || (listing && getEffectivePublishStatus(listing) === statusFilter))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 text-xs font-black">
          {publishStatusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-4 py-2 transition ${
                statusFilter === filter ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'
              }`}
            >
              {filter}
              <span className="ml-1.5 text-slate-400">{statusCounts[filter]}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => downloadActivityListingsXlsx(listings)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:border-primary hover:text-primary"
        >
          <Download size={14} />
          イベント一覧Excelダウンロード（.xlsx）
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1210px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[90px]" />
            <col className="w-[200px]" />
            <col className="w-[220px]" />
            <col className="w-[180px]" />
            <col className="w-[80px]" />
            <col className="w-[100px]" />
            <col className="w-[100px]" />
            <col className="w-[110px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-black text-slate-500">
              <th className="px-4 py-3 text-center">募集区分</th>
              <th className="px-4 py-3">掲載・開催情報</th>
              <th className="px-4 py-3">活動・イベント名</th>
              <th className="px-4 py-3">主催団体名</th>
              <th className="px-4 py-3 text-center">エリア</th>
              <th className="px-4 py-3 text-center">ジャンル</th>
              <th className="px-4 py-3 text-center">申込状況</th>
              <th className="px-4 py-3 text-center">公開ステータス</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm font-bold text-slate-400">読み込み中...</td>
              </tr>
            )}
            {!loading && filteredListings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm font-bold text-slate-400">
                  {statusFilter === 'すべて' ? '掲載中の活動・イベントはまだありません' : '該当する活動・イベントはありません'}
                </td>
              </tr>
            )}
            {filteredListings.filter(({ listing }) => !!listing).map(({ listing, index }) => (
              <tr key={listing.id ?? index} onClick={() => setSelectedIndex(index)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="whitespace-normal px-4 py-3 text-center align-top">
                  <Badge className={listingTypeStyles[listing.listingType] ?? ''}>{listingTypeLabels[listing.listingType] ?? listing.listingType}</Badge>
                </td>
                <td className="whitespace-normal px-4 py-3 align-top">
                  <ActivityExpiryCell listing={listing} />
                </td>
                <td className="whitespace-normal break-words px-4 py-3 align-top font-black text-slate-900">{listing.title ?? '（無題）'}</td>
                <td className="whitespace-normal break-words px-4 py-3 align-top text-slate-600">{listing.organizer ?? '—'}</td>
                <td className="whitespace-normal px-4 py-3 text-center align-top">
                  <Badge className="bg-slate-100 text-slate-600">{listing.area ?? '—'}</Badge>
                </td>
                <td className="whitespace-normal px-4 py-3 text-center align-top text-slate-500">{listing.genre ?? '—'}</td>
                <td className="whitespace-normal px-4 py-3 text-center align-top text-xs font-bold leading-snug text-slate-500">{listing.applicationSummary ?? '—'}</td>
                <td className="whitespace-normal px-4 py-3 text-center align-top" onClick={(event) => event.stopPropagation()}>
                  <select
                    value={getEffectivePublishStatus(listing)}
                    onChange={(event) => updatePublishStatus(index, event.target.value as AdminPublishStatus)}
                    className={`w-full rounded-full border-0 px-2.5 py-1 text-xs font-black outline-none ${effectiveStatusStyles[getEffectivePublishStatus(listing)] ?? ''}`}
                  >
                    {getEffectivePublishStatus(listing) === '終了' && <option value="終了">終了</option>}
                    {publishStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-normal px-3 py-3 align-top">
                  <div className="flex flex-row flex-wrap items-center justify-center gap-1.5">
                    {listing.publishStatus === '承認待ち' && (
                      <button
                        onClick={(event) => { event.stopPropagation(); updatePublishStatus(index, '公開中') }}
                        className="whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-1.5 text-xs font-black text-white hover:bg-emerald-700"
                      >
                        承認
                      </button>
                    )}
                    <ShareMenu activity={listing} />
                    {listing.listingType === 'regular' && getExpiryStatus(listing.expiresAt) !== 'active' && getExpiryStatus(listing.expiresAt) !== 'none' && (
                      <>
                        <button
                          onClick={(event) => { event.stopPropagation(); resendExpiryEmail(index) }}
                          disabled={resendingId === listing.id || !listing.contactEmail}
                          title={listing.contactEmail ? '更新案内メールを再送する' : '連絡先メールが未設定です'}
                          aria-label="更新案内メールを再送する"
                          className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {resendingId === listing.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        </button>
                        <button
                          onClick={(event) => { event.stopPropagation(); extendExpiryOneYear(index) }}
                          disabled={extendingId === listing.id}
                          title="掲載期限を+1年延長する"
                          aria-label="掲載期限を+1年延長する"
                          className="grid size-8 place-items-center rounded-full border border-primary/30 text-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {extendingId === listing.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        </button>
                      </>
                    )}
                    <button
                      onClick={(event) => { event.stopPropagation(); setSelectedIndex(index) }}
                      className="whitespace-nowrap rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-black text-slate-500 hover:border-primary hover:text-primary"
                    >
                      詳細
                    </button>
                    <button
                      onClick={(event) => { event.stopPropagation(); deleteListing(index) }}
                      aria-label={`${listing.title}を削除`}
                      className="grid size-8 place-items-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedIndex !== null && (
        <ActivityListingDetailModal
          listing={listings[selectedIndex]}
          onClose={() => setSelectedIndex(null)}
          onStatusChange={(status) => updatePublishStatus(selectedIndex, status)}
          onDelete={() => deleteListing(selectedIndex)}
          onPreview={() => {
            setPreviewIndex(selectedIndex)
            setSelectedIndex(null)
          }}
          onViewApplicants={() => {
            setApplicantsIndex(selectedIndex)
            setSelectedIndex(null)
          }}
        />
      )}
      {previewIndex !== null && (
        <ActivityPublicPreviewModal listing={listings[previewIndex]} onClose={() => setPreviewIndex(null)} />
      )}
      {applicantsIndex !== null && (
        <AdminApplicantListModal listing={listings[applicantsIndex]} onClose={() => setApplicantsIndex(null)} />
      )}
    </div>
  )
}

function AdminDashboardContent({ adminEmail, onLogout }: { adminEmail: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-xs font-black text-primary">TAMENI ADMIN</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">つとむん 管理ダッシュボード</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                <ShieldCheck size={14} />{adminEmail}として閲覧中
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:border-primary hover:text-primary">
              <ArrowLeft size={16} />トップページに戻る
            </Link>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-600 hover:border-rose-400 hover:text-rose-600">
              <LogOut size={16} />ログアウト
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 text-xs font-black sm:inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2.5 transition ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {activeTab === '会員・ユーザー名簿' && <MembersTab />}
          {activeTab === 'サポート情報・URL管理' && <SupportInfoTab />}
          {activeTab === '応援SHOP管理' && <ShopManagementTab />}
          {activeTab === '協賛パートナー管理' && <PartnersManagementTab />}
          {activeTab === '活動・イベント管理' && <ActivityListingsTab />}
          {activeTab === 'お問い合わせ・掲載依頼一覧' && <InquiriesTab />}
          {activeTab === 'つとむん掲示板管理' && <BulletinBoardManagementTab />}
          {activeTab === '管理者・権限管理' && <AdminAccountsTab currentAdminEmail={adminEmail} />}
        </div>
      </div>
    </main>
  )
}

type AdminSession = { email: string } | null

export function AdminDashboard() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState<AdminSession>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const checkAdminRole = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSession(null)
      setChecking(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') {
      setSession({ email: user.email ?? '' })
      setChecking(false)
      return
    }
    // A signed-in but non-admin account (general member, supporter, etc.) hit /admin
    // directly. Bounce them back to the top page instead of showing the admin login
    // form or signing them out of their own account — this route simply isn't theirs.
    setSession(null)
    router.replace('/')
  }

  useEffect(() => {
    checkAdminRole()
    const supabase = createClient()
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAdminRole()
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoggingIn(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoggingIn(false)
    if (error) {
      console.log('[v0] Admin login failed:', error.message)
      setLoginError('メールアドレスまたはパスワードが正しくありません。')
      return
    }
    setPassword('')
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSession(null)
  }

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <Loader2 className="animate-spin text-primary" size={28} />
      </main>
    )
  }

  if (session) {
    return <AdminDashboardContent adminEmail={session.email} onLogout={handleLogout} />
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black text-primary">TAMENI ADMIN</p>
        <h1 className="mt-1 text-xl font-black tracking-tight">管理者ログイン</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">管理者権限を持つアカウントでログインしてください。</p>
        <form onSubmit={handleLogin} className="mt-6 space-y-3">
          <input
            required
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            required
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {loginError ? <p className="text-xs font-bold text-red-600">{loginError}</p> : null}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {loggingIn ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
        <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-primary">
          <ArrowLeft size={14} />トップページに戻る
        </Link>
      </div>
    </main>
  )
}
