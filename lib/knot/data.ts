import type { Activity, Genre, OrganizationProfile, RegionConfig, ShareItem } from './types'

export const regionConfig: RegionConfig = {
  prefecture: '西都市',
  groups: [
    {
      label: '西都市 7地区',
      places: ['妻北', '妻南', '穂北', '三納', '都於郡', '三財', '東米良'],
    },
  ],
}

export const officialMunicipalities = regionConfig.groups.flatMap((group) => group.places)
export const allMunicipalities = [...officialMunicipalities, 'その他']
// サポート情報・URL管理（便利帳）のエリア選択肢。便利帳モーダル側の絞り込み表記
// 「市全域/オンライン」と完全に一致させるため、末尾を 'その他' ではなくこちらにする。
// 既にDBに 'その他' として保存済みの既存データは、便利帳モーダルの絞り込み判定
// （matchesMunicipalityFilter）側で '市全域/オンライン' と同一視する互換処理でヒットさせる。
export const supportMunicipalityOptions = [...officialMunicipalities, '市全域/オンライン']

// Normalizes any birthdate value (Supabase `date` column, legacy slash-formatted string,
// or a stray timestamp) into the strict YYYY-MM-DD shape required by <input type="date">.
// Anything that cannot be parsed becomes an empty string rather than an invalid value,
// which is what triggers the browser's native "invalid value" popup.
export function toDateInputValue(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (slashMatch) {
    const [, y, m, d] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return ''
}

// Splits a normalized YYYY-MM-DD birthdate into the parts used by the year/month/day
// dropdowns. Any missing or malformed piece comes back as '' so the selects render
// with their placeholder option instead of a stray default value.
export function parseBirthdateParts(value?: string | null): { year: string; month: string; day: string } {
  const normalized = toDateInputValue(value)
  if (!normalized) return { year: '', month: '', day: '' }
  const [year, month, day] = normalized.split('-')
  return { year: year ?? '', month: month ?? '', day: day ?? '' }
}

// Combines year/month/day dropdown selections back into a YYYY-MM-DD string.
// Returns '' unless all three parts are selected, so an incomplete selection
// never gets saved as a partial or invalid date.
export function combineBirthdateParts(year: string, month: string, day: string): string {
  if (!year || !month || !day) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function normalizeArea(rawArea: string): string {
  if (!rawArea) return rawArea
  if (rawArea.includes('東米良')) return '東米良'
  const match = officialMunicipalities.find((name) => rawArea.includes(name))
  return match ?? rawArea
}

// Real-world latitude/longitude for each municipality's administrative center, used to
// place pins on the Leaflet map. Coordinates are geographically exact (not projected or
// scaled), so 宮崎市 sits precisely at the coastal center of the Miyazaki plain and every
// other municipality is positioned relative to it with no drift, regardless of viewport
// size or how many municipalities are added.
export const municipalityCoordinates: Record<string, { lat: number; lng: number }> = {
  '妻北': { lat: 32.1120, lng: 131.3980 },
  '妻南': { lat: 32.1000, lng: 131.4080 },
  '穂北': { lat: 32.1480, lng: 131.4050 },
  '三納': { lat: 32.1150, lng: 131.3450 },
  '都於郡': { lat: 32.0720, lng: 131.3850 },
  '三財': { lat: 32.1280, lng: 131.2750 },
  '東米良': { lat: 32.2680, lng: 131.2430 },
}

export const genres: Genre[] = [
  {
    icon: '🥬',
    label: '農ある暮らし・収穫',
    description: '畑仕事・収穫・特産づくり',
    color: 'bg-emerald-50 text-emerald-800',
  },
  {
    icon: '🏮',
    label: '地域・伝統・祭り',
    description: '神楽・祭り・まちづくり',
    color: 'bg-amber-50 text-amber-800',
  },
  {
    icon: '⛺',
    label: '自然・アウトドア',
    description: '山・川・キャンプ・散策',
    color: 'bg-teal-50 text-teal-800',
  },
  {
    icon: '☕',
    label: '食・カフェ・手仕事',
    description: '調理・郷土食・マルシェ',
    color: 'bg-orange-50 text-orange-800',
  },
  {
    icon: '🎨',
    label: 'ものづくり・創作',
    description: 'クラフト・アート・DIY',
    color: 'bg-rose-50 text-rose-800',
  },
  {
    icon: '💻',
    label: 'デジタル・事務・発信',
    description: 'PC作業・事務サポート・SNS運用',
    color: 'bg-indigo-50 text-indigo-800',
  },
  {
    icon: '⚽',
    label: 'スポーツ・健康',
    description: '体を動かす・クラブ指導',
    color: 'bg-sky-50 text-sky-800',
  },
  {
    icon: '🎒',
    label: '学び・キッズ・子育て',
    description: '教室・ワーク・世代間交流',
    color: 'bg-pink-50 text-pink-800',
  },
]

export function formatEventDateBadge(raw?: string): string {
  if (!raw) return ''
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, , m, d] = isoMatch
    return `${Number(m)}月${Number(d)}日`
  }
  return raw
}

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土']

// Formats a raw ISO datetime (e.g. Supabase timestamp or a <input type="datetime-local">
// value like "2026-10-01T19:00") into a human-readable Japanese date, e.g.
// "2026年10月1日(木) 19:00〜". Any non-ISO value (already-formatted strings like
// "毎週土曜 7:00〜") is returned unchanged.
export function formatEventDateTime(raw?: string): string {
  if (!raw) return ''
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (isoMatch) {
    const [, y, m, d, h, min] = isoMatch
    const weekday = weekdayLabels[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
    const datePart = `${Number(y)}年${Number(m)}月${Number(d)}日(${weekday})`
    return h != null ? `${datePart} ${h}:${min}〜` : datePart
  }
  return raw
}

// Same ISO parsing as formatEventDateTime, but for application-deadline display,
// e.g. "2026年9月23日(水) 17:00まで".
export function formatDeadlineDateTime(raw?: string): string {
  if (!raw) return ''
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (isoMatch) {
    const [, y, m, d, h, min] = isoMatch
    const weekday = weekdayLabels[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
    const datePart = `${Number(y)}年${Number(m)}月${Number(d)}日(${weekday})`
    return h != null ? `${datePart} ${h}:${min}まで` : `${datePart}まで`
  }
  return raw
}

// Formats an inquiry's received-at value (ISO "YYYY-MM-DDTHH:MM..." from Supabase,
// or the already-space-separated "YYYY-MM-DD HH:MM" the fallback data and the
// admin mapper use) into "2026年9月15日(火) 14:00" for display in the inquiries list/modal.
export function formatInquiryReceivedAt(raw?: string): string {
  if (!raw) return ''
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (isoMatch) {
    const [, y, m, d, h, min] = isoMatch
    const weekday = weekdayLabels[new Date(Number(y), Number(m) - 1, Number(d)).getDay()]
    const datePart = `${Number(y)}年${Number(m)}月${Number(d)}日(${weekday})`
    return h != null ? `${datePart} ${h}:${min}` : datePart
  }
  return raw
}

// Whole days elapsed since an inquiry's receivedAt value, used to flag
// long-unattended (未対応) inquiries. Returns 0 if the value can't be parsed.
export function daysSinceInquiryReceived(raw?: string): number {
  if (!raw) return 0
  const parsed = new Date(raw.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return 0
  const diffMs = Date.now() - parsed.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

// Parses a naive "YYYY-MM-DDTHH:mm" (from <input type="datetime-local">) or
// "YYYY-MM-DD" string as Japan Standard Time (UTC+9), regardless of the
// runtime's local timezone. Server-side code (Vercel functions, `new Date()`
// on the server) runs in UTC, so treating these naive, timezone-less strings
// with plain `new Date(...)` silently shifts event/deadline cutoffs by 9
// hours (e.g. an event set to end at "17:00 JST" would actually expire at
// "17:00 UTC" = "02:00 JST the next day"). Values that already carry an
// explicit timezone designator (Z or +HH:mm) are parsed as-is. When no time
// portion is present, defaults to the end of that day (23:59:59 JST) so a
// deadline with only a date still holds through the whole day.
export function parseJstDateTime(raw?: string | null): Date | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (!match) {
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const [, y, m, d, h, min] = match
  const time = h != null ? `${h}:${min}:00` : '23:59:59'
  const parsed = new Date(`${y}-${m}-${d}T${time}+09:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// True once an event/activity listing's expiresAt (either the "開催当日まで掲載"
// event datetime or the "申込締切日まで掲載" deadline) has passed, compared in
// JST regardless of server timezone. Used to auto-hide expired events from
// public listings (近日開催の体験会・イベント, トップページ).
export function isEventExpired(expiresAt?: string | null): boolean {
  const parsed = parseJstDateTime(expiresAt)
  if (!parsed) return false
  return parsed.getTime() < Date.now()
}

// Expiry check for event-type listings (イベント). `expiresAt` is computed at save time from
// the SINGLE cutoff the organizer actually selected via the 掲載終了タイミング radio button
// ("イベント開催当日まで掲載" -> eventDate, or "申込締切日まで掲載" -> deadline), so it is the
// authoritative source and must be trusted as-is. It must NOT be combined (e.g. via min()) with
// the other, unselected date field: doing so previously caused events set to run until their
// event date to be hidden early because a stale/irrelevant 申込締切日 value happened to be in
// the past. Only when `expiresAt` itself is missing do we fall back to eventDate (the default
// mode) and then deadline, purely as a last resort for legacy rows saved without expiresAt.
export function isActivityListingExpired(activity: {
  listingType?: string
  expiresAt?: string
  eventDate?: string
  deadline?: string
}): boolean {
  if (activity.listingType !== 'event') return isEventExpired(activity.expiresAt)
  if (activity.expiresAt) return isEventExpired(activity.expiresAt)
  return isEventExpired(activity.eventDate) || (!activity.eventDate && isEventExpired(activity.deadline))
}

export function parseActivityCalendarDate(activity: Activity): Date | null {
  const candidates = [activity.eventDate, activity.date].filter(Boolean) as string[]

  for (const raw of candidates) {
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      const [, y, m, d] = isoMatch
      return new Date(Number(y), Number(m) - 1, Number(d))
    }
    const fullMatch = raw.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (fullMatch) {
      const [, y, m, d] = fullMatch
      return new Date(Number(y), Number(m) - 1, Number(d))
    }
  }

  const currentYear = new Date().getFullYear()
  for (const raw of candidates) {
    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})/)
    if (slashMatch) {
      const [, m, d] = slashMatch
      return new Date(currentYear, Number(m) - 1, Number(d))
    }
    const mdMatch = raw.match(/(\d{1,2})月(\d{1,2})日/)
    if (mdMatch) {
      const [, m, d] = mdMatch
      return new Date(currentYear, Number(m) - 1, Number(d))
    }
  }

  return null
}

export const faqs: [string, string][] = [
  ['つとむんはどんなサービスですか？', 'つとむんは、好きなことや興味のあることをきっかけに、気軽に参加できる体験やワークと出会えるサービスです。'],
  ['参加するのに料金はかかりますか？', 'つとむんへの登録・活動の検索は無料です。内容によって参加費などが必要な場合があります。'],
  ['ひとりでも参加できますか？', 'もちろんです。ひとり参加の方が多い活動やワークもたくさんあります。初参加の方向けの活動やワークも見つけられます。'],
  ['自分で体験・ワークを掲載することもできますか？', 'はい、できます。体験やワークを掲載したい方は、マイページからかんたんに募集カードを作成できます。'],
]

export const contactGenres = [
  '📌 サポート情報の推薦/掲載',
  '🏟️ 施設・活動場所の推薦/掲載',
  '🍱 お弁当・仕出しの推薦/掲載',
  '🏡 宿泊・滞在の推薦/掲載',
  '💰 助成金・補助金情報の掲載依頼（行政・支援団体の方へ）',
  '🩺 医療・ケア機関の推薦/掲載',
  '🛍 応援SHOP掲載・EC相談',
  '🤝 事務局・ITサポート相談',
  '🏢 企業協賛・パートナー相談',
  '💡 アプリ改善・もっとこうしてほしい！',
  '📋 活動掲載・利用相談',
  'その他',
] as const

export type DbActivityRow = {
  id: string
  user_id?: string | null
  category_type: string | null
  title: string
  organizer_name: string | null
  area: string
  genre: string | null
  date_schedule: string | null
  venue_name: string | null
  address: string | null
  target_audience: string | null
  audience_detail?: string | null
  capacity_info: string | null
  fee_info: string | null
  fee_detail?: string | null
  application_deadline?: string | null
  belongings: string | null
  website_url: string | null
  sns_url: string | null
  description?: string | null
  contact_info: string | null
  applicant_name: string | null
  contact_email: string | null
  contact_phone: string | null
  status: string
  created_at: string
  image_url: string | null
  genre_tags: string[] | null
  time_slots: string[] | null
  feature_tags: string[] | null
  recruitment_types: string[] | null
  audience_tags: string[] | null
  organizer_org_name?: string | null
  organizer_logo_url?: string | null
  organizer_bio?: string | null
  expires_at?: string | null
  expiry_notified_30d?: boolean | null
  expiry_notified_7d?: boolean | null
  expiry_notified_end?: boolean | null
}

// 掲載期限の残り日数と表示ステータスを一括で算出する共通ヘルパー。
// 管理ダッシュボード（応援企業・SHOP）とマイページ（活動）の両方で使う。
export type ExpiryStatus = 'active' | 'warning' | 'expired' | 'none'

export function getDaysUntilExpiry(expiresAt?: string | null): number | null {
  // Uses parseJstDateTime rather than a plain `new Date(expiresAt)` so naive,
  // timezone-less values are read as JST regardless of the runtime's local
  // timezone (see parseJstDateTime above) — otherwise this silently drifts by
  // 9 hours on servers that run in UTC.
  const parsed = parseJstDateTime(expiresAt)
  if (!parsed) return null
  const diffMs = parsed.getTime() - Date.now()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function getExpiryStatus(expiresAt?: string | null): ExpiryStatus {
  const days = getDaysUntilExpiry(expiresAt)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days < 30) return 'warning'
  return 'active'
}

export const expiryStatusLabel: Record<ExpiryStatus, string> = {
  active: '掲載中',
  warning: '更新案内中',
  expired: '掲載終了',
  none: '期限なし',
}

export const expiryStatusStyle: Record<ExpiryStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  expired: 'bg-rose-100 text-rose-700',
  none: 'bg-slate-100 text-slate-500',
}

// クイック加算ボタン（+1ヶ月 / +3ヶ月 / +6ヶ月 / +1年）用: 現在保持している期限（未設定な
// ら今日）から months ヶ月加算した日付を YYYY-MM-DD で返す。
export function addMonthsToDateInput(baseDateInput: string | null | undefined, months: number): string {
  const base = baseDateInput ? new Date(baseDateInput) : new Date()
  const next = new Date(base)
  next.setMonth(next.getMonth() + months)
  return next.toISOString().slice(0, 10)
}

export function oneYearFromNowIso(): string {
  const next = new Date()
  next.setFullYear(next.getFullYear() + 1)
  return next.toISOString()
}

// Empty string marks "no photo uploaded" so consumers can render the branded
// NoImagePlaceholder instead of falling back to an unrelated stock photo.
export const dbActivityDefaultImage = ''
const dbActivityDefaultTone = 'from-amber-100 to-yellow-50'

function parseGenreTags(row: DbActivityRow): string[] {
  if (row.genre_tags && row.genre_tags.length > 0) return row.genre_tags
  if (!row.genre) return ['地域・伝統文化']
  return row.genre.split('/').map((item) => item.trim()).filter(Boolean)
}

export function mapDbActivityToActivity(row: DbActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    genre: parseGenreTags(row),
    area: normalizeArea(row.area),
    members: row.capacity_info ?? '募集中',
    date: row.date_schedule ?? '',
    image: row.image_url || dbActivityDefaultImage,
    tone: dbActivityDefaultTone,
    tags: row.feature_tags && row.feature_tags.length > 0 ? row.feature_tags : undefined,
    // audience_tags was historically saved in whatever order the organizer happened to click
    // the checkboxes, not the canonical audienceOptions order - sort here so badges on
    // existing listings display in the same order as the (now-sorted) form, without needing
    // a data migration.
    audienceTags: row.audience_tags && row.audience_tags.length > 0 ? sortByAudienceOrder(row.audience_tags) : undefined,
    description: row.description ?? undefined,
    audience: row.target_audience ?? '一般',
    audienceDetail: row.audience_detail ?? undefined,
    schedule: row.date_schedule ?? '',
    venue: row.venue_name ?? undefined,
    fee: row.fee_info ?? undefined,
    feeDetail: row.fee_detail ?? undefined,
    whatToBring: row.belongings ?? undefined,
    listingType: row.category_type === 'event' ? 'event' : 'regular',
    eventDate: row.date_schedule ?? undefined,
    capacity: row.capacity_info ?? undefined,
    deadline: row.application_deadline ?? undefined,
    intakeMethod: 'knot',
    applicationUrl: row.contact_info ?? undefined,
    applicationPhone: row.contact_phone ?? undefined,
    reviewStatus: row.status === 'published' || row.status === 'closed' ? row.status : 'pending',
    recruitmentTypes: row.recruitment_types && row.recruitment_types.length > 0 ? row.recruitment_types : undefined,
    timeSlots: row.time_slots && row.time_slots.length > 0 ? row.time_slots : undefined,
    createdAt: row.created_at,
    favoriteCount: 0,
    organizerOrgName: row.organizer_org_name || row.organizer_name || undefined,
    organizerLogoUrl: row.organizer_logo_url ?? undefined,
    organizerBio: row.organizer_bio ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    // The DB currently has a single sns_url column shared by Instagram and LINE (see
    // registration save: `sns_url: registration.instagram || registration.line`), so we
    // sniff the domain here to route it to the right button instead of showing both/neither.
    ...splitSnsUrl(row.sns_url),
  }
}

function splitSnsUrl(snsUrl: string | null | undefined): { instagramUrl?: string; lineUrl?: string } {
  if (!snsUrl) return {}
  const isLine = /line\.me|lin\.ee|liff\.line/i.test(snsUrl)
  return isLine ? { lineUrl: snsUrl } : { instagramUrl: snsUrl }
}

export type DbPartnerRow = {
  id: string
  partner_type: string | null
  company_name: string
  sub_title: string | null
  support_message: string | null
  website_url: string | null
  website_label: string | null
  sub_url: string | null
  sub_url_label: string | null
  phone: string | null
  phone_note: string | null
  logo_url: string | null
  display_order: number | null
  expires_at?: string | null
  contact_email?: string | null
  expiry_notified_30d?: boolean | null
  supporter_area?: string | null
}

const dbPartnerDefaultLogo = '/images/partners/miyazaki-shinkin.png'

export function mapDbPartnerToOfficialPartner(row: DbPartnerRow): OfficialPartner {
  return {
    id: row.id,
    name: row.company_name,
    category: row.sub_title ?? '協賛パートナー',
    message: row.support_message ?? '',
    logo: row.logo_url ?? dbPartnerDefaultLogo,
    url: row.website_url ?? row.sub_url ?? '',
    urlLabel: row.website_label ?? undefined,
    subUrl: row.sub_url ?? undefined,
    subUrlLabel: row.sub_url_label ?? undefined,
    phone: row.phone ?? undefined,
    phoneNote: row.phone_note ?? undefined,
    sortOrder: row.display_order ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    expiryNotified30d: row.expiry_notified_30d ?? undefined,
    supporterArea: row.supporter_area ?? undefined,
  }
}

export type OfficialPartner = {
  id?: string
  name: string
  category: string
  message: string
  logo: string
  url: string
  urlLabel?: string
  subUrl?: string
  subUrlLabel?: string
  phone?: string
  phoneNote?: string
  sortOrder?: number
  expiresAt?: string
  contactEmail?: string
  expiryNotified30d?: boolean
  // KNOTサポーター（公式サポート窓口）に指定されている市町村名。未指定の場合は undefined。
  supporterArea?: string
}

export type ShopProduct = {
  id?: string
  name: string
  organization: string
  price: string
  image: string
  url: string
  area?: string
  tagline?: string
  sortOrder?: number
  expiresAt?: string
  contactEmail?: string
  expiryNotified30d?: boolean
}

export type DbShopProductRow = {
  id: string
  name: string
  organization: string
  price: string | null
  image_url: string | null
  product_url: string | null
  area: string | null
  tagline: string | null
  display_order: number | null
  expires_at?: string | null
  contact_email?: string | null
  expiry_notified_30d?: boolean | null
}

export function mapDbShopProductToShopProduct(row: DbShopProductRow): ShopProduct {
  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    price: row.price ?? '',
    image: row.image_url ?? '',
    url: row.product_url ?? '',
    area: row.area ?? undefined,
    tagline: row.tagline ?? undefined,
    sortOrder: row.display_order ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    expiryNotified30d: row.expiry_notified_30d ?? undefined,
  }
}

export type OfficialShopSettings = {
  guideUrl: string
}

export const officialShopSettings: OfficialShopSettings = {
  guideUrl: '',
}

export const shopGuideUrlSettingKey = 'shop_guide_url'

export type AdminMemberType = '一般' | 'サポーター（指導者・ボランティア）' | '主催者' | 'パートナー企業・団体'

export const memberTypeOptions: AdminMemberType[] = ['一般', 'サポーター（指導者・ボランティア）', '主催者', 'パートナー企業・団体']

export const volunteerIntentOptions = ['指導者・コーチとして関わりたい', 'イベント運営のお手伝いをしたい', '不定期でもボランティア活動に参加したい']

// There is no admin-approval step: every account becomes usable the moment it registers.
// '停止中' remains as a manual admin action for suspending an account after the fact.
export type AdminMemberStatus = '有効' | '停止中'

export type AdminAccountKind = 'individual' | 'organization'

export type AdminMember = {
  id?: string
  name: string
  email: string
  kana?: string
  types: AdminMemberType[]
  registeredAt: string
  status: AdminMemberStatus
  role?: string
  accountKind?: AdminAccountKind
  birthdate?: string
  gender?: string
  orgDetail?: string
  address?: string
  repPhone?: string
  contactPersonName?: string
  contactPersonPhone?: string
  contactPersonEmail?: string
  website?: string
  sns?: string
  volunteerIntent?: string[]
  interestGenres?: string[]
  skillNotes?: string
  isMasterAdmin?: boolean
}

export const memberStatusOptions: AdminMemberStatus[] = ['有効', '停止中']

const memberStatusDbToUi: Record<string, AdminMemberStatus> = {
  active: '有効',
  pending: '有効',
  suspended: '停止中',
}

const memberStatusUiToDb: Record<AdminMemberStatus, string> = {
  '有効': 'active',
  '停止中': 'suspended',
}

export function memberStatusToDb(status: AdminMemberStatus): string {
  return memberStatusUiToDb[status]
}

export function dbToMemberStatus(status: string): AdminMemberStatus {
  return memberStatusDbToUi[status] ?? '有効'
}

export type DbProfileRow = {
  id: string
  email: string
  full_name: string | null
  organization_name: string | null
  kana?: string | null
  phone: string | null
  role: string | null
  status: string
  created_at: string
  account_kind?: string | null
  birthdate?: string | null
  gender?: string | null
  address?: string | null
  member_types?: string[] | null
  contact_person_name?: string | null
  contact_person_phone?: string | null
  contact_person_email?: string | null
  website?: string | null
  sns_url?: string | null
  volunteer_intent?: string[] | null
  interest_genres?: string[] | null
  skill_notes?: string | null
  is_master_admin?: boolean | null
}

export function mapDbProfileToAdminMember(row: DbProfileRow): AdminMember {
  const validTypes = new Set<AdminMemberType>(memberTypeOptions)
  const types = (row.member_types ?? []).filter((type): type is AdminMemberType => validTypes.has(type as AdminMemberType))
  return {
    id: row.id,
    name: row.full_name?.trim() || row.organization_name?.trim() || row.email,
    email: row.email,
    kana: row.kana ?? undefined,
    types: types.length > 0 ? types : ['一般'],
    registeredAt: row.created_at ? row.created_at.slice(0, 10) : '',
    status: dbToMemberStatus(row.status),
    role: row.role ?? undefined,
    accountKind: row.account_kind === 'organization' ? 'organization' : 'individual',
    birthdate: toDateInputValue(row.birthdate) || undefined,
    gender: row.gender ?? undefined,
    orgDetail: row.organization_name ?? undefined,
    address: row.address ?? undefined,
    repPhone: row.phone ?? undefined,
    contactPersonName: row.contact_person_name ?? undefined,
    contactPersonPhone: row.contact_person_phone ?? undefined,
    contactPersonEmail: row.contact_person_email ?? undefined,
    website: row.website ?? undefined,
    sns: row.sns_url ?? undefined,
    volunteerIntent: row.volunteer_intent ?? undefined,
    interestGenres: row.interest_genres ?? undefined,
    skillNotes: row.skill_notes ?? undefined,
    isMasterAdmin: Boolean(row.is_master_admin),
  }
}

export function mapDbProfileToOrganizationProfile(row: DbProfileRow): OrganizationProfile {
  const accountKind = row.account_kind === 'organization' ? 'organization' : 'individual'
  return {
    id: row.id,
    name: accountKind === 'organization' ? row.organization_name ?? '' : row.full_name ?? '',
    kana: row.kana ?? '',
    address: row.address ?? '',
    phone: row.phone ?? '',
    email: row.email,
    birthdate: toDateInputValue(row.birthdate),
    gender: row.gender === 'male' || row.gender === 'female' || row.gender === 'other' ? row.gender : '',
    contactName: row.contact_person_name ?? '',
    contactPhone: row.contact_person_phone ?? '',
    contactEmail: row.contact_person_email ?? '',
    website: row.website ?? '',
    social: row.sns_url ?? '',
    area: '',
    instagram: row.sns_url ?? '',
    line: '',
    accountKind,
    memberTypes: row.member_types ?? [],
    volunteerIntent: row.volunteer_intent ?? [],
    interestGenres: row.interest_genres ?? [],
    skillNotes: row.skill_notes ?? '',
  }
}

export type AdminSupportGenre = '医療・休日当番医' | '施設・活動場所' | '仕出し・お弁当' | '補助金・助成金' | '宿泊・滞在・キャンプ'

export type AdminSupportEntry = {
  id?: string
  genre: AdminSupportGenre
  municipality: string
  name: string
  address?: string
  phone?: string
  url?: string
  comment?: string
  deliveryAvailable?: '配達可能' | '配達不可'
  reservationRequired?: boolean
  capacity?: string
  grantField?: string
  grantAmount?: string
  deadlineType?: '締切日指定' | '随時受付'
  deadlineDate?: string
  sortOrder?: number
}

export type DbSupportLinkRow = {
  id: string
  category: string
  municipality: string | null
  title: string
  address: string | null
  phone: string | null
  link_url: string | null
  notes: string | null
  details: Record<string, unknown> | null
  sort_order?: number | null
}

export function mapDbSupportLinkToAdminSupportEntry(row: DbSupportLinkRow): AdminSupportEntry {
  const details = row.details ?? {}
  return {
    id: row.id,
    genre: row.category as AdminSupportGenre,
    municipality: row.municipality ?? 'その他',
    name: row.title,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    url: row.link_url ?? undefined,
    comment: row.notes ?? undefined,
    deliveryAvailable: (details.deliveryAvailable as AdminSupportEntry['deliveryAvailable']) ?? undefined,
    reservationRequired: typeof details.reservationRequired === 'boolean' ? details.reservationRequired : undefined,
    capacity: (details.capacity as string) ?? undefined,
    grantField: (details.grantField as string) ?? undefined,
    grantAmount: (details.grantAmount as string) ?? undefined,
    deadlineType: (details.deadlineType as AdminSupportEntry['deadlineType']) ?? undefined,
    deadlineDate: (details.deadlineDate as string) ?? undefined,
    sortOrder: row.sort_order ?? undefined,
  }
}

export function supportEntryToDbPayload(entry: AdminSupportEntry) {
  return {
    category: entry.genre,
    municipality: entry.municipality || null,
    title: entry.name,
    address: entry.address || null,
    phone: entry.phone || null,
    link_url: entry.url || null,
    notes: entry.comment || null,
    details: {
      deliveryAvailable: entry.deliveryAvailable ?? null,
      reservationRequired: entry.reservationRequired ?? null,
      capacity: entry.capacity || null,
      grantField: entry.grantField || null,
      grantAmount: entry.grantAmount || null,
      deadlineType: entry.deadlineType ?? null,
      deadlineDate: entry.deadlineDate || null,
    },
    // Omitted (rather than sent as null) when unset, so inserts fall back to the
    // NOT NULL default on support_links.sort_order instead of violating it.
    ...(typeof entry.sortOrder === 'number' ? { sort_order: entry.sortOrder } : {}),
  }
}

export const shareItemTypes = ['貸します', '借りたい', '譲ります', '探してます'] as const
export const shareItemPriceTypes = ['無償', '有償・要相談'] as const

export type DbShareItemRow = {
  id: string
  user_id: string
  type: string
  price_type: string
  title: string
  municipality: string | null
  image_url: string | null
  description: string | null
  contact_email: string
  status: string
  created_at: string
}

export function mapDbShareItemToShareItem(row: DbShareItemRow): ShareItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type as ShareItem['type']) || '譲ります',
    priceType: (row.price_type as ShareItem['priceType']) || '無償',
    title: row.title,
    municipality: row.municipality ?? '',
    imageUrl: row.image_url ?? undefined,
    description: row.description ?? '',
    contactEmail: row.contact_email,
    status: (row.status as ShareItem['status']) || '受付中',
    createdAt: row.created_at,
  }
}

export function shareItemToDbPayload(item: ShareItem, userId: string) {
  return {
    user_id: userId,
    type: item.type,
    price_type: item.priceType,
    title: item.title,
    municipality: item.municipality || null,
    image_url: item.imageUrl || null,
    description: item.description || null,
    contact_email: item.contactEmail,
    status: item.status,
  }
}

export type AdminInquiryStatus = '未対応' | '対応中' | '完了'

export type AdminInquiry = {
  id?: string
  receivedAt: string
  name: string
  genre: string
  message: string
  status: AdminInquiryStatus
  email?: string
  phone?: string
}

const inquiryStatusDbToUi: Record<string, AdminInquiryStatus> = {
  unread: '未対応',
  in_progress: '対応中',
  done: '完了',
}

const inquiryStatusUiToDb: Record<AdminInquiryStatus, string> = {
  '未対応': 'unread',
  '対応中': 'in_progress',
  '完了': 'done',
}

export function inquiryStatusToDb(status: AdminInquiryStatus): string {
  return inquiryStatusUiToDb[status]
}

export function dbToInquiryStatus(status: string): AdminInquiryStatus {
  return inquiryStatusDbToUi[status] ?? '未対応'
}

export type DbInquiryRow = {
  id: string
  applicant_name: string
  company_or_org: string | null
  email: string
  phone: string | null
  inquiry_type: string | null
  message: string
  status: string
  created_at: string
}

export function mapDbInquiryToAdminInquiry(row: DbInquiryRow): AdminInquiry {
  return {
    id: row.id,
    receivedAt: row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '',
    name: row.company_or_org ? `${row.applicant_name}（${row.company_or_org}）` : row.applicant_name,
    genre: row.inquiry_type ?? 'その他',
    message: row.message,
    status: dbToInquiryStatus(row.status),
    email: row.email,
    phone: row.phone ?? undefined,
  }
}

export const adminInquiries: AdminInquiry[] = [
  { receivedAt: '2026-08-30 10:12', name: '山田 太郎', genre: '🏟 施設・活動場所の推薦/掲載', message: '西都市内で使える体育館を紹介したいです。市の総合体育館が空き時間に一般開放されているので、KNOTのサポート情報に掲載してもらえると助かります。予約方法や利用料金も分かればぜひ教えてください。', status: '未対応', email: 'yamada.taro@example.com', phone: '090-1234-5678' },
  { receivedAt: '2026-08-29 16:40', name: '株式会社ひなた物産', genre: '🏢 企業協賛・パートナー相談', message: '地域スポーツクラブへの協賛を検討しています。弊社は宮崎市内で食品加工業を営んでおり、地域の子どもたちの活動を支援したいと考えています。協賛の枠組みや掲載条件について詳しくお伺いできますでしょうか。', status: '対応中', email: 'kikaku@hinata-bussan.example.com', phone: '0985-22-3344' },
  { receivedAt: '2026-08-28 09:05', name: '鈴木 美咲', genre: '🍱 お弁当・仕出しの推薦/掲載', message: 'おすすめの弁当店があります。掲載できますか？西都市内で子ども向けの行事用弁当を専門に作っているお店で、アレルギー対応もしてくれるのでおすすめです。', status: '完了', email: 'misaki.suzuki@example.com', phone: '090-9876-5432' },
  { receivedAt: '2026-08-25 13:22', name: '西米良村 観光協会', genre: '🏡 宿泊・滞在の推薦/掲載', message: '村内の民泊施設を紹介したいです。合宿や遠征で村を訪れる団体向けに、格安で泊まれる古民家民泊が数軒あります。掲載用の��真や連絡先はこちらで用意できます。', status: '未対応', email: 'kanko@nishimera-kanko.example.jp', phone: '0983-00-5566' },
  { receivedAt: '2026-08-20 11:47', name: '高橋 直人', genre: '💡 アプリ改善・もっとこうしてほしい！', message: '検索結果をエリアごとに絞り込みたいです。現在はジャンルでの絞り込みのみですが、市町村単位で結果を並べ替えたり、地図上で見られるようになると使いやすくなると思います。', status: '完了', email: 'naoto.takahashi@example.com' },
]

export type AdminPublishStatus = '公開中' | '承認待ち' | '非公開'
export type AdminListingType = 'event' | 'regular'

export type AdminActivityListing = {
  id: string
  image: string
  description: string
  listingType: AdminListingType
  eventDate: string
  listedAt: string
  title: string
  organizer: string
  area: string
  genre: string
  applicationSummary: string
  publishStatus: AdminPublishStatus
  venue: string
  address: string
  audience: string
  capacity: string
  applicants: string
  fee: string
  whatToBring: string
  website: string
  sns: string
  intakeContact: string
  applicantName: string
  contactEmail: string
  contactPhone: string
  previewUrl: string
  expiresAt?: string
}

const publishStatusDbToUi: Record<string, AdminPublishStatus> = {
  pending: '承認待ち',
  published: '公開中',
  closed: '非公開',
}

const publishStatusUiToDb: Record<AdminPublishStatus, string> = {
  '承認待ち': 'pending',
  '公開中': 'published',
  '非公開': 'closed',
}

export function publishStatusToDb(status: AdminPublishStatus): string {
  return publishStatusUiToDb[status]
}

export function dbToPublishStatus(status: string): AdminPublishStatus {
  return publishStatusDbToUi[status] ?? '承認待ち'
}

export function mapDbActivityToAdminListing(row: DbActivityRow): AdminActivityListing {
  return {
    id: row.id,
    image: row.image_url || dbActivityDefaultImage,
    description: '',
    listingType: row.category_type === 'event' ? 'event' : 'regular',
    eventDate: row.date_schedule ?? '',
    listedAt: row.created_at ? row.created_at.slice(0, 10) : '',
    title: row.title,
    organizer: row.organizer_name ?? '',
    area: normalizeArea(row.area),
    genre: row.genre ?? '',
    applicationSummary: row.capacity_info ?? '募集中',
    publishStatus: dbToPublishStatus(row.status),
    venue: row.venue_name ?? '',
    address: row.address ?? '',
    audience: row.audience_detail ? `${row.target_audience ?? ''}（${row.audience_detail}）`.trim() : row.target_audience ?? '',
    capacity: row.capacity_info ?? '',
    applicants: '',
    fee: row.fee_detail ? `${row.fee_info ?? ''}（${row.fee_detail}）`.trim() : row.fee_info ?? '',
    whatToBring: row.belongings ?? '',
    website: row.website_url ?? '',
    sns: row.sns_url ?? '',
    intakeContact: row.contact_info ?? '',
    applicantName: row.applicant_name ?? '',
    contactEmail: row.contact_email ?? '',
    contactPhone: row.contact_phone ?? '',
    previewUrl: '',
    expiresAt: row.expires_at ?? undefined,
  }
}

export const tagOptions = ['初心者歓迎', '見学OK', '親子参加OK', '土日のみ', '未経験大歓迎', '送迎相談可']
export const audienceOptions = [
  '誰でも歓迎・制限なし',
  '障がいの有無に関わらず歓迎',
  'サポート・介助者同伴OK',
  '初心者歓迎',
  '未就学児・キッズ',
  '小学生',
  '中高生',
  '大人・一般',
  'シニア',
]
export const recruitmentOptions = ['参加者募集', '正社員・スタッフ募集', 'パート・アルバイト募集', 'ボランティア・サポーター募集']

// Selection order (the order a user happens to click checkboxes in) has nothing to do with
// the canonical display order above, but audienceTags/audience get built straight from that
// click order at submission time. Sorting through this before persisting or rendering keeps
// badges, the join()'d "対象" text, and the DB row consistent with the order editors and
// visitors actually see the checkboxes in. Anything not in audienceOptions (older free-text
// values entered before this list existed) is kept, appended after the known ones, rather
// than silently dropped.
export function sortByAudienceOrder(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const indexA = audienceOptions.indexOf(a)
    const indexB = audienceOptions.indexOf(b)
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })
}

const recruitmentBadgeLabels: Record<string, string> = {
  '参加者募集': '参加者募集',
  '正社員・スタッフ募集': '正社員・スタッフ',
  'パート・アルバイト募集': 'パート・アルバイト',
  'ボランティア・サポーター募集': 'ボランティア',
  // 過去データの互換用
  '参加者募集（体験・生徒・会員など）': '参加者募集',
  '指導者・講師・サポーター募集': 'サポーター募集',
  'ボランティア・イベントスタッフ募集': 'ボランティア',
  '活動場所・施設の提供依頼': '場所提供',
}

export function shortRecruitmentLabel(option: string): string {
  return recruitmentBadgeLabels[option] ?? option
}

const timeSlotOptions = ['すべて', '平日', '平日午前', '平日午後', '平日夜', '土日祝日', '不定期'] as const
export type TimeSlotOption = (typeof timeSlotOptions)[number]
export const scheduleFilterOptions: readonly string[] = timeSlotOptions
export const activityTimeSlotOptions: readonly string[] = timeSlotOptions.slice(1)

const weekdayKeywords = ['月曜', '火曜', '水曜', '木曜', '金曜', '平日']
const weekendKeywords = ['土曜', '日曜', '土日', '祝日', '祝']

function detectDayType(text: string): 'weekday' | 'weekend' | 'unknown' {
  const parenMatch = text.match(/[（(]([月火水木金土日祝])[）)]/)
  if (parenMatch) return ['土', '日', '祝'].includes(parenMatch[1]) ? 'weekend' : 'weekday'
  if (weekendKeywords.some((keyword) => text.includes(keyword))) return 'weekend'
  if (weekdayKeywords.some((keyword) => text.includes(keyword))) return 'weekday'
  return 'unknown'
}

function extractStartHour(text: string): number | null {
  const match = text.match(/(\d{1,2}):\d{2}/)
  return match ? Number.parseInt(match[1], 10) : null
}

export type BulletinPost = {
  id?: string
  title: string
  body: string
  postDate: string
  isImportant: boolean
  sortOrder?: number
}

export type DbBulletinPostRow = {
  id: string
  title: string
  body: string
  post_date: string
  is_important: boolean
  created_at: string
  sort_order?: number | null
}

export function mapDbBulletinPostToBulletinPost(row: DbBulletinPostRow): BulletinPost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    postDate: row.post_date,
    isImportant: row.is_important,
    sortOrder: row.sort_order ?? undefined,
  }
}

export function matchesTimeSlot(activity: Activity, slot: string): boolean {
  if (slot === 'すべて') return true
  if (activity.timeSlots && activity.timeSlots.length > 0) return activity.timeSlots.includes(slot)
  const text = `${activity.date ?? ''} ${activity.schedule ?? ''}`
  const dayType = detectDayType(text)
  const startHour = extractStartHour(text)
  switch (slot) {
    case '平日':
      return dayType !== 'weekend'
    case '平日午前':
      return dayType !== 'weekend' && ((startHour !== null && startHour < 12) || text.includes('午前'))
    case '平日午後':
      return dayType !== 'weekend' && ((startHour !== null && startHour >= 12 && startHour < 18) || text.includes('午後'))
    case '平日夜':
      return dayType !== 'weekend' && ((startHour !== null && startHour >= 18) || text.includes('夜'))
    case '土日祝日':
      return dayType === 'weekend'
    case '不定期':
      return text.includes('不定期') || text.includes('随時')
    default:
      return true
  }
}
