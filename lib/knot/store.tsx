'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
 import { compressImageFile, estimateDataUrlBytes } from '@/lib/knot/image-utils'

 // ゆずりあい掲示板の投稿画像（base64データURL）の上限サイズ。activities の
 // MAX_IMAGE_PAYLOAD_BYTES と同じ考え方で、巨大なペイロードによる保存失敗を防ぐ。
 const MAX_SHARE_ITEM_IMAGE_BYTES = 400_000
import { activityTimeSlotOptions, audienceOptions, sortByAudienceOrder, regionConfig, municipalityCoordinates, matchesTimeSlot, normalizeArea, recruitmentOptions, scheduleFilterOptions, tagOptions, mapDbActivityToActivity, mapDbProfileToOrganizationProfile, mapDbSupportLinkToAdminSupportEntry, mapDbShareItemToShareItem, shareItemToDbPayload, dbActivityDefaultImage, oneYearFromNowIso, parseJstDateTime, isActivityListingExpired, type DbActivityRow, type DbProfileRow, type DbSupportLinkRow, type DbShareItemRow, type AdminSupportEntry } from './data'
import type { Activity, OrganizationProfile, RegistrationDraft, ShareItem, ShareItemType } from './types'
import { createClient } from '@/lib/supabase/client'

// share_items テーブル未作成・RLS拒否などでDBへのINSERT/UPDATEが通らない環境向けの
// フォールバック保存先。id が "local-" で始まる投稿はこの localStorage キーに保存し、
// 同一ブラウザ内であればマイページ・便利帳一覧・管理ダッシュボード（/admin）の
// どこからでも同じ内容を読み込めるようにする（本来はscripts/sql/2025_share_items.sql
// の適用が必要な一時的な回避策）。
export const SHARE_ITEMS_LOCAL_STORAGE_KEY = 'knot_share_items_local_fallback_v1'

export function loadLocalShareItems(): ShareItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SHARE_ITEMS_LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ShareItem[]) : []
  } catch {
    return []
  }
}

export function saveLocalShareItems(items: ShareItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SHARE_ITEMS_LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // localStorageが使用不可（プライベートモード等）の場合は画面表示のみのフォールバックとする。
  }
}

// Supabaseから返ったエラーの message / details / hint をまとめて画面表示用の1行にする。
// 「保存に失敗しました」という汎用文言だけでは原因（テーブル未作成・RLS拒否など）が
// 分からないため、原因特定に必要な生の情報をそのままユーザー（管理者）に見せる。
function formatSupabaseErrorMessage(error: { message?: string; details?: string | null; hint?: string | null; code?: string } | null): string {
  if (!error) return '保存に失敗しました。時間をおいて再度お試しください。'
  const parts = [error.message, error.details, error.hint].filter((part): part is string => Boolean(part && part.trim()))
  const detail = parts.length > 0 ? parts.join(' / ') : '原因不明のエラー'
  const code = error.code ? `(code: ${error.code}) ` : ''
  return `保存に失敗しました: ${code}${detail}`
}

type AuthMode = 'login' | 'signup' | 'google'
type ViewMode = 'home' | 'map'
type MyPageTab = 'listings' | 'profile'
type LegalModal = 'contact' | 'privacy' | 'terms' | null
type EventListingType = 'regular' | 'event'
type EventExpiryMode = 'event' | 'deadline'
type IntakeMethod = 'knot' | 'external'
type ApplicationStatus = 'open' | 'limited' | 'full'

// Master admin allowlist, checked case-insensitively and trimmed so a stray space or
// differing capitalization (e.g. from a login form) never blocks a real admin account.
// Combined with profiles.role === 'admin' so either signal is sufficient. Only put a
// real admin's email here — anyone listed gets the admin menu and dashboard regardless
// of their profiles.role.
const ADMIN_EMAILS = ['ishikawa.rie@tamenijapan.com']

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

const defaultOrganizationProfile: OrganizationProfile = {
  name: '',
  kana: '',
  address: '',
  phone: '',
  email: '',
  birthdate: '',
  gender: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  website: '',
  social: '',
  area: '',
  instagram: '',
  line: '',
  accountKind: 'individual',
  memberTypes: [],
  volunteerIntent: [],
  interestGenres: [],
  skillNotes: '',
}

// When duplicate submissions share the same title, prefer the record that actually
// carries a real image and tag data over an older/incomplete one, regardless of order.
function activityCompletenessScore(item: Activity): number {
  let score = 0
  if (item.image && item.image !== dbActivityDefaultImage) score += 4
  if (item.genre && item.genre.length > 0) score += 1
  if (item.tags && item.tags.length > 0) score += 1
  if (item.audienceTags && item.audienceTags.length > 0) score += 1
  if (item.timeSlots && item.timeSlots.length > 0) score += 1
  return score
}

function pickRicherActivity(a: Activity, b: Activity): Activity {
  const scoreA = activityCompletenessScore(a)
  const scoreB = activityCompletenessScore(b)
  if (scoreA !== scoreB) return scoreA > scoreB ? a : b
  if (a.createdAt && b.createdAt) return a.createdAt > b.createdAt ? a : b
  return a
}

type ParticipationForm = {
  applicantName: string
  applicantKana: string
  applicantEmail: string
  applicantPhone: string
  groupSize: string
  participantBreakdown: string
  question: string
}

// Client-side shape of a row read back from participation_applications for the "自分の
//参加予定・申込中の活動" section of My Page. Matching against the signed-in account is done
// by applicant_email (the table has no user_id/activity_id column), so an application only
// shows up here if it was submitted with the account's own email address.
type MyApplicationRow = {
  id: string
  activityTitle: string
  activityArea: string
  activityDate: string
  groupSize: string
  status: string
  createdAt: string
}

const defaultParticipationForm: ParticipationForm = {
  applicantName: '',
  applicantKana: '',
  applicantEmail: '',
  applicantPhone: '',
  groupSize: '',
  participantBreakdown: '',
  question: '',
}

const defaultRegistration: RegistrationDraft = {
  title: '',
  genre: ['スポーツ'],
  area: '宮崎市',
  description: '',
  schedule: '',
  audience: '一般',
  venue: '',
  fee: '',
  feeDetail: '',
  belongings: '',
  contactName: '',
  contactEmail: '',
  phone: '',
  website: '',
  instagram: '',
  line: '',
  tags: '',
  eventDate: '',
  capacity: '',
  deadline: '',
}

const defaultShareItemDraft: ShareItem = {
  type: '譲ります',
  priceType: '無償',
  title: '',
  municipality: '宮崎市',
  imageUrl: '',
  description: '',
  contactEmail: '',
  status: '受付中',
}

const defaultShareContactForm = {
  senderName: '',
  senderEmail: '',
  senderPhone: '',
  message: '',
}

function useKnotStore() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('おすすめ')
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [searched, setSearched] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [browseGenre, setBrowseGenre] = useState<string | null>(null)
  const [audience, setAudience] = useState('すべて')
  const [schedule, setSchedule] = useState('すべて')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [selectedParticipation, setSelectedParticipation] = useState<Activity | null>(null)
  // Holds the activity a signed-out visitor tried to apply to, so the participation form can
  // be reopened for that same activity automatically once they finish logging in / signing up
  // (see the resume effect below), instead of dropping them back on the homepage.
  const [pendingParticipation, setPendingParticipation] = useState<Activity | null>(null)
  const [participationSent, setParticipationSent] = useState(false)
  const [participationForm, setParticipationForm] = useState<ParticipationForm>(defaultParticipationForm)
  const [participationSubmitting, setParticipationSubmitting] = useState(false)
  const [participationSendError, setParticipationSendError] = useState('')
  // Holds the actual organizer/contact info for the activity just applied to (fetched fresh
  // from `activities` at submission time - see submitParticipation), so the "受付完了" screen
  // can show who will follow up. This is intentionally separate from organizationProfile,
  // which is the signed-in applicant's own profile, not the event organizer's.
  const [submittedOrganizerContact, setSubmittedOrganizerContact] = useState({ orgName: '', contactName: '', phone: '', email: '' })
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authModal, setAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authView, setAuthView] = useState<'form' | 'reset' | 'emailConfirmPending'>('form')
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [organizationProfile, setOrganizationProfile] = useState<OrganizationProfile>(defaultOrganizationProfile)
  const [myPageTab, setMyPageTab] = useState<MyPageTab>('listings')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null)
  const [eventListingType, setEventListingType] = useState<EventListingType>('regular')
  const [eventExpiryMode, setEventExpiryMode] = useState<EventExpiryMode>('event')
  const [intakeMethod, setIntakeMethod] = useState<IntakeMethod>('knot')
  const [applicationUrl, setApplicationUrl] = useState('')
  const [applicationPhone, setApplicationPhone] = useState('')
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>('open')
  const [applicationModal, setApplicationModal] = useState<Activity | null>(null)
  const [applicantListActivity, setApplicantListActivity] = useState<Activity | null>(null)
  const [participantType, setParticipantType] = useState('family')
  const [adultCount, setAdultCount] = useState('1')
  const [childCount, setChildCount] = useState('0')
  const [withdrawnTitles, setWithdrawnTitles] = useState<string[]>([])
  const [myPageOpen, setMyPageOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [withdrawalTarget, setWithdrawalTarget] = useState<string | null>(null)
  const [renewalTarget, setRenewalTarget] = useState<Activity | null>(null)
  const [renewingListing, setRenewingListing] = useState(false)
  const [returnToMyPage, setReturnToMyPage] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalModal>(null)
  const [contactSent, setContactSent] = useState(false)
  const [contactGenre, setContactGenre] = useState('📋 活動掲載・利用相談')
  const [returnToSupportHub, setReturnToSupportHub] = useState(false)
  const [supportHubOpen, setSupportHubOpen] = useState(false)
  const [supportHubTab, setSupportHubTab] = useState('medical')
  const [supportEntries, setSupportEntries] = useState<AdminSupportEntry[]>([])
  const [shareItems, setShareItems] = useState<ShareItem[]>([])
  const [shareItemsLoading, setShareItemsLoading] = useState(false)
  // マイページ「ゆずりあい投稿の管理」用：ログイン中の自分が投稿した share_items のみ。
  const myShareItems = shareItems.filter((item) => item.userId === organizationProfile.id)
  const myShareItemsLoading = shareItemsLoading

  // 初回マウント時に、過去のセッションでDB保存に失敗してlocalStorageへ一時保存された
  // 投稿（id が "local-" 始まり）を読み込み、一覧に復元する。これにより便利帳一覧・
  // マイページ・管理ダッシュボードのいずれから見ても同じ内容が表示されるようになる。
  useEffect(() => {
    const localItems = loadLocalShareItems()
    if (localItems.length > 0) {
      setShareItems((prev) => {
        const existingIds = new Set(prev.map((it) => it.id))
        return [...localItems.filter((it) => !existingIds.has(it.id)), ...prev]
      })
    }
  }, [])
  const [shareBoardTypeFilter, setShareBoardTypeFilter] = useState<ShareItemType | 'すべて'>('すべて')
  const [shareItemFormOpen, setShareItemFormOpen] = useState(false)
  const [editingShareItemId, setEditingShareItemId] = useState<string | null>(null)
  const [shareItemDraft, setShareItemDraft] = useState<ShareItem>(defaultShareItemDraft)
  const [shareItemSaving, setShareItemSaving] = useState(false)
  const [shareItemSaveError, setShareItemSaveError] = useState('')
  const [shareItemImageUploading, setShareItemImageUploading] = useState(false)
  const [shareContactTarget, setShareContactTarget] = useState<ShareItem | null>(null)
  const [shareItemActionError, setShareItemActionError] = useState('')
  const [shareContactForm, setShareContactForm] = useState(defaultShareContactForm)
  const [shareContactSubmitting, setShareContactSubmitting] = useState(false)
  const [shareContactSent, setShareContactSent] = useState(false)
  const [shareContactError, setShareContactError] = useState('')
  const [isRegistrationOpen, setRegistrationOpen] = useState(false)
  const [registrationPreview, setRegistrationPreview] = useState(false)
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false)
  const [registrationError, setRegistrationError] = useState('')
  const [registrationFieldErrors, setRegistrationFieldErrors] = useState<string[]>([])
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false)
  const [newActivities, setNewActivities] = useState<Activity[]>([])
  const [dbActivities, setDbActivities] = useState<Activity[]>([])
  const [ownActivities, setOwnActivities] = useState<Activity[]>([])
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({})
  const [myApplications, setMyApplications] = useState<MyApplicationRow[]>([])
  const [myApplicationsLoading, setMyApplicationsLoading] = useState(false)
  const [registrationPhoto, setRegistrationPhoto] = useState('')
  const [recruitmentTypes, setRecruitmentTypes] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([])
  const [audienceDetails, setAudienceDetails] = useState('')
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])
  const defaultListingExpiry = useMemo(
    () => new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    [],
  )
  const [listingExpiry, setListingExpiry] = useState(defaultListingExpiry)
  const [registration, setRegistration] = useState<RegistrationDraft>(defaultRegistration)
  const [viewMode, setViewMode] = useState<ViewMode>('home')
  const [mapGenre, setMapGenre] = useState('すべて')
  const [mapArea, setMapArea] = useState('すべて')
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null)

  const updateRegistration = (key: keyof RegistrationDraft, value: string) =>
    setRegistration((current) => ({
      ...current,
      [key]: key === 'genre' ? (current.genre.includes(value) ? current.genre.filter((item) => item !== value) : [...current.genre, value]) : value,
    }))

  const updateParticipationForm = (key: keyof ParticipationForm, value: string) =>
    setParticipationForm((current) => ({ ...current, [key]: value }))

  const toggleRecruitmentType = (value: string) =>
    setRecruitmentTypes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))

  const toggleTimeSlot = (value: string) =>
    setSelectedTimeSlots((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))

  const openAuth = (mode: typeof authMode = 'login') => {
    setAuthModal(true)
    setAuthMode(mode)
    setAuthView('form')
    setResetSent(false)
  }

  const openContact = (genre?: string, options?: { fromHub?: boolean }) => {
    if (!isLoggedIn) {
      toast.error('お問い合わせ・ご依頼にはログインが必要です')
      openAuth()
      return
    }
    if (genre) setContactGenre(genre)
    setContactSent(false)
    setReturnToSupportHub(Boolean(options?.fromHub))
    setSupportHubOpen(false)
    setLegalModal('contact')
  }

  const closeContact = () => {
    setLegalModal(null)
    if (returnToSupportHub) {
      setReturnToSupportHub(false)
      setSupportHubOpen(true)
    }
  }

  const openRegistration = () => {
    if (!isLoggedIn) {
      openAuth()
      return
    }
    setRegistration((current) => ({
      ...current,
      area: organizationProfile.area,
      contactName: organizationProfile.name,
      contactEmail: organizationProfile.email,
      phone: organizationProfile.phone,
      instagram: organizationProfile.instagram,
      line: organizationProfile.line,
    }))
    setRegistrationOpen(true)
    setRegistrationPreview(false)
    setRegistrationSubmitted(false)
    setRegistrationError('')
    setRegistrationPhoto('')
    setRecruitmentTypes([])
    setSelectedTags([])
    setCustomTag('')
    setSelectedAudiences([])
    setAudienceDetails('')
    setSelectedTimeSlots([])
    setListingExpiry(defaultListingExpiry)
    setEditingTitle(null)
    setEditingId(null)
    setApplicationUrl('')
    setApplicationPhone('')
    setIntakeMethod('knot')
  }

  const completeLogin = () => {
    setIsLoggedIn(true)
    setAuthModal(false)
  }

  // authEmail is the Supabase Auth session email (always present once signed in) and is
  // used as a robust fallback so a missing/out-of-sync profiles.role never hides the
  // admin dashboard link for one of the allowlisted admin accounts.
  const loadProfile = useCallback(async (userId: string, authEmail?: string | null) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, organization_name, kana, phone, account_kind, birthdate, gender, address, member_types, contact_person_name, contact_person_phone, contact_person_email, website, sns_url, volunteer_intent, interest_genres, skill_notes, role',
      )
      .eq('id', userId)
      .single()
    if (error || !data) {
      console.log('[v0] Failed to load profile from Supabase:', error?.message)
      setIsAdmin(isAdminEmail(authEmail))
      return
    }
    const profile = data as DbProfileRow
    setOrganizationProfile(mapDbProfileToOrganizationProfile(profile))
    setIsAdmin(profile.role === 'admin' || isAdminEmail(profile.email) || isAdminEmail(authEmail))
  }, [])

  // Keeps isLoggedIn / isAdmin strictly in sync with the real Supabase Auth session
  // (never a manually-toggled/mock flag), so the header, my page, and admin link all
  // reflect the actual signed-in account across tabs and session refreshes.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setIsLoggedIn(true)
        loadProfile(data.user.id, data.user.email)
      } else {
        setIsLoggedIn(false)
        setIsAdmin(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
        setIsAdmin(false)
        setOrganizationProfile(defaultOrganizationProfile)
      } else if (event === 'PASSWORD_RECOVERY') {
        // Supabase's browser client auto-detects a recovery session from the URL
        // (hash tokens or a PKCE code) on whatever page it happens to load — which can be
        // any page, not just /auth/update-password, whenever the project's Supabase Auth
        // "Redirect URLs" allow list doesn't include our exact callback URL (Supabase then
        // silently falls back to the bare Site URL, dropping the intended path). The
        // session itself is still established correctly at this point, so just move the
        // user to the password form; it re-detects this same already-stored session itself.
        if (typeof window !== 'undefined' && window.location.pathname !== '/auth/update-password') {
          window.location.replace('/auth/update-password')
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setIsLoggedIn(true)
          loadProfile(session.user.id, session.user.email)
        }
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  // Completes registration by logging the user in immediately and routing them to My
  // Page. All accounts (individual and organization) are active from the moment they
  // register — there is no admin approval step, so there is nothing to wait for.
  const finishSignUpSuccess = (nextProfile: OrganizationProfile) => {
    setOrganizationProfile(nextProfile)
    setAuthPassword('')
    setIsLoggedIn(true)
    setAuthModal(false)
    toast.success('登録が完了しました！')
    // If this signup was triggered by the participation login gate, let the resume effect
    // reopen the participation form for that activity instead of taking over with My Page.
    if (!pendingParticipation) {
      setMyPageOpen(true)
    }
    setReturnToMyPage(false)
  }

  const signUpWithEmail = async () => {
    setAuthError('')
    const email = authEmail.trim()
    const password = authPassword
    if (!email || !password) {
      setAuthError('メールアドレスとパスワードをご入力ください。')
      return
    }
    if (!organizationProfile.name.trim()) {
      setAuthError(organizationProfile.accountKind === 'organization' ? '団体名をご入力ください。' : 'お名前をご入力ください。')
      return
    }
    setAuthSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
        data: {
          account_kind: organizationProfile.accountKind,
          full_name: organizationProfile.accountKind === 'individual' ? organizationProfile.name : null,
          organization_name: organizationProfile.accountKind === 'organization' ? organizationProfile.name : null,
          kana: organizationProfile.kana || null,
          phone: organizationProfile.phone || null,
          birthdate: organizationProfile.accountKind === 'individual' ? organizationProfile.birthdate || '' : '',
          gender: organizationProfile.accountKind === 'individual' ? organizationProfile.gender || null : null,
          address: organizationProfile.address || null,
          member_types: organizationProfile.memberTypes,
          contact_person_name: organizationProfile.accountKind === 'organization' ? organizationProfile.contactName || null : null,
          contact_person_phone: organizationProfile.accountKind === 'organization' ? organizationProfile.contactPhone || null : null,
          contact_person_email: organizationProfile.accountKind === 'organization' ? organizationProfile.contactEmail || null : null,
          website: organizationProfile.website || null,
          sns_url: organizationProfile.social || null,
          volunteer_intent: organizationProfile.volunteerIntent,
          interest_genres: organizationProfile.interestGenres,
          skill_notes: organizationProfile.skillNotes || null,
        },
      },
    })
    setAuthSubmitting(false)
    if (error) {
      console.log('[v0] Sign up failed:', error.message)
      if (/registered/i.test(error.message)) {
        setAuthError('このメールアドレスは既にご登録済みです。')
        return
      }
      if (/password/i.test(error.message) && /(least|short|weak)/i.test(error.message)) {
        setAuthError('パスワードは6文字以上でご入力ください。')
        return
      }
      if (/rate limit/i.test(error.message)) {
        setAuthError('リクエストが多すぎます。しばらく時間をおいて再度お試しください。')
        return
      }
      setAuthError('登録に失敗しました。時間をおいて再度お試しください。')
      return
    }
    if (data.session && data.user) {
      // Supabase granted a session immediately (email confirmation disabled in the
      // project's auth settings), so the account and profile row are both real right away.
      const nextProfile: OrganizationProfile = { ...organizationProfile, id: data.user.id, email }
      finishSignUpSuccess(nextProfile)
    } else {
      // Supabase accepted the signUp but is waiting on the user to click the confirmation
      // link before issuing a session. There is no real account to log into yet, so show a
      // "check your email" screen instead of faking a login — the profile row is created by
      // the DB trigger from signUp's metadata once the account exists, and the user can sign
      // in for real after confirming.
      setAuthEmail('')
      setAuthPassword('')
      setAuthView('emailConfirmPending')
    }
  }

  const signInWithEmail = async () => {
    setAuthError('')
    const email = authEmail.trim()
    const password = authPassword
    if (!email || !password) {
      setAuthError('メールアドレスとパスワードをご入力ください。')
      return
    }
    setAuthSubmitting(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthSubmitting(false)
    if (error) {
      console.log('[v0] Sign in failed:', error.message)
      if (/confirm/i.test(error.message)) {
        setAuthError('メール認証が完了していません。届いた確認メールのリンクをクリックしてください。')
        return
      }
      setAuthError('メールアドレスまたはパスワードが正しくありません。')
      return
    }
    if (data.user) await loadProfile(data.user.id)
    setAuthPassword('')
    setIsLoggedIn(true)
    setAuthModal(false)
  }

  // Sends a real Supabase password-recovery email. The link routes through /auth/callback
  // (which exchanges the code for a session) and on to /auth/update-password, where the
  // user sets their new password while that recovery session is active.
  const requestPasswordReset = async () => {
    setResetError('')
    const email = resetEmail.trim()
    if (!email) {
      setResetError('メールアドレスをご入力ください。')
      return
    }
    setResetSubmitting(true)
    const supabase = createClient()
    const redirectBase =
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
    const redirectTo = `${redirectBase}${redirectBase.includes('?') ? '&' : '?'}next=${encodeURIComponent('/auth/update-password')}`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setResetSubmitting(false)
    if (error) {
      console.log('[v0] Password reset request failed:', error.message)
      // Supabase's own rate limiter is the only realistic failure here (an unknown email
      // still returns success, by design, to avoid leaking which addresses are registered).
      if (/rate limit/i.test(error.message)) {
        setResetError('リクエストが多すぎます。しばらく時間をおいて再度お試しください。')
        return
      }
      setResetError('メール送信に失敗しました。時間��おいて再度お試しください。')
      return
    }
    setResetSent(true)
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setIsAdmin(false)
    setOrganizationProfile(defaultOrganizationProfile)
    // Clear the login/signup modal's form state so a previous account's email,
    // password, and error message never leak into the next account's registration.
    setAuthEmail('')
    setAuthPassword('')
    setAuthError('')
    setAuthMode('login')
  }

  // 退会（アカウント削除）: サーバー側で「掲載中の活動を非公開化 → Supabase Authのユーザー���除」の
  // 順に実行するAPIを呼び、成功したらローカルの状態もサインアウト相当にリセットしてトップページに戻す。
  //
  // v0のプレビューiframeなど、Cookieが正しく送られない環境ではサーバー側がクッキーからセッションを
  // 復元できず「ログイン状態を確認できませんでした」となることがあるため、現在のアクセストークンを
  // Authorizationヘッダーに明示的に載せてサーバー側で直接検証してもらう。
  const deleteAccount = async () => {
    setDeleteAccountError('')
    setDeletingAccount(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setDeleteAccountError('ログイン状態を確認できませんでした。再度ログインしてください。')
        return
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setDeleteAccountError(result?.error || '退会処理に失敗しました。時間をおいて再度お試しくださ��。')
        return
      }

      await supabase.auth.signOut()
      setIsLoggedIn(false)
      setIsAdmin(false)
      setOrganizationProfile(defaultOrganizationProfile)
      setAuthEmail('')
      setAuthPassword('')
      setAuthError('')
      setAuthMode('login')
      setDeleteAccountModalOpen(false)
      setMyPageOpen(false)
      setSelectedActivity(null)
      setViewMode('home')
      await refetchDbActivities()
    } catch (deleteError) {
      console.log('[v0] Failed to delete account:', deleteError)
      setDeleteAccountError('退会処理に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setDeletingAccount(false)
    }
  }

  const saveProfile = async () => {
    setProfileSaveError('')
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id ?? organizationProfile.id
    if (!userId) {
      setProfileSaveError('ログイン状態を確認できませんでした。再度ログインしてください。')
      return
    }
    if (!organizationProfile.name.trim()) {
      setProfileSaveError(organizationProfile.accountKind === 'organization' ? '団体名をご入力ください。' : 'お名前をご入力ください。')
      return
    }
    // The email field is read-only in the UI (users can't change their login email here), so
    // always resolve it from the live Supabase Auth session first. This guarantees a non-empty
    // value even if organizationProfile.email hasn't finished loading yet, satisfying the
    // profiles.email NOT NULL constraint and preventing a spurious save failure.
    const email = (userData.user?.email || organizationProfile.email || '').trim()
    if (!email) {
      setProfileSaveError('ログイン状態を確認できませんでした。再度ログインしてください。')
      return
    }
    setProfileSaving(true)

    const isOrg = organizationProfile.accountKind === 'organization'

    // Build a payload that matches the profiles table schema exactly (correct types for
    // birthdate/date, arrays default to [] instead of undefined, empty strings become null).
    const fullPayload = {
      id: userId,
      email,
      full_name: isOrg ? null : organizationProfile.name.trim(),
      organization_name: isOrg ? organizationProfile.name.trim() : null,
      kana: organizationProfile.kana?.trim() || null,
      phone: organizationProfile.phone?.trim() || null,
      account_kind: organizationProfile.accountKind,
      birthdate: !isOrg && organizationProfile.birthdate ? organizationProfile.birthdate : null,
      gender: !isOrg ? organizationProfile.gender || null : null,
      address: organizationProfile.address?.trim() || null,
      member_types: Array.isArray(organizationProfile.memberTypes) ? organizationProfile.memberTypes : [],
      contact_person_name: isOrg ? organizationProfile.contactName?.trim() || null : null,
      contact_person_phone: isOrg ? organizationProfile.contactPhone?.trim() || null : null,
      contact_person_email: isOrg ? organizationProfile.contactEmail?.trim() || null : null,
      website: organizationProfile.website?.trim() || null,
      sns_url: organizationProfile.social?.trim() || null,
      volunteer_intent: Array.isArray(organizationProfile.volunteerIntent) ? organizationProfile.volunteerIntent : [],
      interest_genres: Array.isArray(organizationProfile.interestGenres) ? organizationProfile.interestGenres : [],
      skill_notes: organizationProfile.skillNotes?.trim() || null,
    }

    // Use upsert (not update) so the save also succeeds when the profile row was never created
    // (e.g. the signup trigger hasn't run yet), instead of silently doing nothing.
    const { error } = await supabase.from('profiles').upsert(fullPayload, { onConflict: 'id' })

    if (error) {
      console.error('[v0] Failed to save profile to Supabase (full payload):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })

      // Fallback save: retry with only the core identity fields in case an optional
      // field (e.g. an array or date column) caused the failure, so the user's essential
      // changes are not lost.
      const fallbackPayload = {
        id: userId,
        email,
        full_name: fullPayload.full_name,
        organization_name: fullPayload.organization_name,
        kana: fullPayload.kana,
        phone: fullPayload.phone,
        account_kind: fullPayload.account_kind,
        address: fullPayload.address,
      }
      const { error: fallbackError } = await supabase.from('profiles').upsert(fallbackPayload, { onConflict: 'id' })

      if (fallbackError) {
        console.error('[v0] Fallback profile save also failed:', {
          message: fallbackError.message,
          details: fallbackError.details,
          hint: fallbackError.hint,
          code: fallbackError.code,
        })
        setProfileSaving(false)
        setProfileSaveError('保存に失敗しました。時間をおいて再度お試しください。')
        return
      }
    }

    // Keep local state in sync with what was actually persisted (rather than trusting the
    // form state alone), so the UI always reflects the real saved profile.
    setOrganizationProfile((current) => ({ ...current, email }))
    setProfileSaving(false)
    toast.success('基本情報を保存しました')
    // Close only the profile edit modal (return to the My Page listings view), not the whole
    // My Page overlay, so the user immediately sees their update reflected.
    setMyPageTab('listings')
  }

  // Actually opens the participation form, pre-filled from the signed-in account's own
  // profile (still fully editable, e.g. when a parent applies on a child's behalf). Only
  // called once we already know the user is logged in - either directly from
  // openParticipation, or from the resume effect below after login/signup completes.
  const openParticipationCore = (activity: Activity) => {
    setSelectedParticipation(activity)
    setParticipationSent(false)
    setParticipationForm({
      ...defaultParticipationForm,
      applicantName: organizationProfile.name,
      applicantKana: organizationProfile.kana,
      applicantEmail: organizationProfile.email,
      applicantPhone: organizationProfile.phone,
    })
    setParticipationSendError('')
    setSelectedActivity(null)
    setSelectedEvent(null)
  }

  const openParticipation = (activity: Activity) => {
    if (!isLoggedIn) {
      // Remember which activity they were trying to join and send them to log in / sign up
      // first. The event/activity detail modal underneath is intentionally left open (it sits
      // at a lower z-index than the auth modal), and the resume effect below reopens the
      // participation form for this same activity the moment login completes - so the visitor
      // lands right back where they started instead of losing their place.
      setPendingParticipation(activity)
      toast.error('参加申込にはログインまたは無料会員登録が必要です')
      openAuth()
      return
    }
    openParticipationCore(activity)
  }

  // Resumes a participation attempt that was interrupted by the login gate above. Waits for
  // organizationProfile.email to be populated (not just isLoggedIn) so the form is filled with
  // the freshly-loaded account details rather than stale/default ones, regardless of whether
  // the user just signed in, just signed up, or already had a session restored on load.
  useEffect(() => {
    if (isLoggedIn && pendingParticipation && organizationProfile.email) {
      const activity = pendingParticipation
      setPendingParticipation(null)
      openParticipationCore(activity)
    }
  }, [isLoggedIn, pendingParticipation, organizationProfile])

  const reuseListing = (activity: Activity) => {
    setRegistration({
      title: activity.title,
      genre: activity.genre,
      area: activity.area,
      description: activity.description || '',
      schedule: activity.schedule || '',
      audience: activity.audience || '一般',
      venue: activity.venue || '',
      fee: activity.fee || '',
      feeDetail: activity.feeDetail || '',
      belongings: activity.whatToBring || '',
      contactName: organizationProfile.name,
      contactEmail: organizationProfile.email,
      phone: organizationProfile.phone,
      website: '',
      instagram: organizationProfile.instagram,
      line: organizationProfile.line,
      tags: '',
      eventDate: activity.eventDate || '',
      capacity: activity.capacity || '',
      deadline: activity.deadline || '',
    })
    setEventListingType(activity.listingType === 'event' ? 'event' : 'regular')
    setSelectedTimeSlots(activity.timeSlots ?? [])
    setRegistrationPhoto(activity.image)
    setRecruitmentTypes(activity.recruitmentTypes ?? [])
    setSelectedTags(activity.tags ?? [])
    setCustomTag('')
    setSelectedAudiences(activity.audienceTags ?? [])
    setAudienceDetails(activity.audienceDetail || '')
    setApplicationUrl(activity.applicationUrl ?? '')
    setApplicationPhone(activity.applicationPhone ?? '')
    setIntakeMethod(activity.intakeMethod === 'external' ? 'external' : 'knot')
    setRegistrationOpen(true)
    setMyPageOpen(false)
    setReturnToMyPage(true)
    setRegistrationPreview(false)
    setRegistrationSubmitted(false)
    setEditingTitle(activity.title)
    setEditingId(activity.id ?? null)
  }

  const closeRegistration = () => {
    setRegistrationOpen(false)
    setMyPageOpen(true)
    setReturnToMyPage(false)
  }

  const deleteMyListing = async (item: Activity) => {
    if (typeof window !== 'undefined' && !window.confirm('この活動を削除しますか？')) return

    const email = organizationProfile.email.trim()
    const supabase = createClient()
    // Delete every DB row that matches this title for this organizer, not just the one
    // currently displayed, so leftover duplicate rows (e.g. from earlier resubmissions)
    // don't silently resurface on the next refetch.
    const query = supabase.from('activities').delete().eq('title', item.title)
    const { error } = await (email ? query.eq('contact_email', email) : item.id ? query.eq('id', item.id) : query)
    if (error) {
      console.log('[v0] Failed to delete listing from Supabase:', error.message)
      return
    }
    setNewActivities((current) => current.filter((listing) => listing.title !== item.title))
    setOwnActivities((current) => current.filter((listing) => listing.title !== item.title))
    await refetchDbActivities()
  }

  // マイページの「この内容で1年間延長する」確定ボタンから呼ばれる。掲載期限を実行日＋1年に
  // 更新し、30日前・7日前・当日の通知フラグをすべてリセットして、次の��限に向けて再度通知
  // できるようにする。
  const renewListing = async (item: Activity) => {
    if (!item.id) return
    setRenewingListing(true)
    const supabase = createClient()
    const newExpiresAt = oneYearFromNowIso()
    const { error } = await supabase
      .from('activities')
      .update({
        expires_at: newExpiresAt,
        expiry_notified_30d: false,
        expiry_notified_7d: false,
      })
      .eq('id', item.id)
    setRenewingListing(false)
    if (error) {
      console.log('[v0] Failed to renew listing expiry:', error.message)
      toast.error('掲載期間の更新に失敗しました。時間をおいて再度お試しください。')
      return
    }
    setOwnActivities((current) => current.map((listing) => (listing.id === item.id ? { ...listing, expiresAt: newExpiresAt } : listing)))
    setRenewalTarget(null)
    toast.success('掲載期間を1年間延長しました。')
    await refetchDbActivities()
  }

  const submitRegistration = async () => {
    const defaults = {
      title: 'みやざき地域交流イベント',
      description: '地域の仲間と楽しく交流できる活動です。',
      area: organizationProfile.area || '宮崎市',
      contactName: organizationProfile.contactName || organizationProfile.name || '運営事務局',
      contactEmail: organizationProfile.contactEmail || organizationProfile.email || 'contact@example.com',
      eventDate: registration.eventDate || '2026-10-01T10:00',
      deadline: registration.deadline || '2026-09-25T23:59',
      fee: registration.fee || '無料',
      capacity: registration.capacity || '20',
      venue: registration.venue || '宮崎市内',
      schedule: registration.schedule || '土曜日 10:00〜',
    }
    const nextRegistration = {
      ...registration,
      title: registration.title.trim() || defaults.title,
      description: registration.description.trim() || defaults.description,
      area: registration.area.trim() || defaults.area,
      contactName: registration.contactName.trim() || defaults.contactName,
      contactEmail: registration.contactEmail.trim() || defaults.contactEmail,
      eventDate: registration.eventDate || defaults.eventDate,
      deadline: registration.deadline || defaults.deadline,
      fee: registration.fee || defaults.fee,
      capacity: registration.capacity || defaults.capacity,
      venue: registration.venue || defaults.venue,
      schedule: registration.schedule || defaults.schedule,
    }
    const missing = Object.entries({
      title: registration.title,
      description: registration.description,
      area: registration.area,
      contactName: registration.contactName,
      contactEmail: registration.contactEmail,
    })
      .filter(([, value]) => !String(value).trim())
      .map(([key]) => key)
    setRegistrationFieldErrors(missing)
    setRegistrationError(missing.length ? '未入力項目をモックデータで補完して確認画面を表示します。' : '')
    setRegistration(nextRegistration)
    if (eventListingType === 'event' && intakeMethod === 'external' && !applicationUrl.trim() && !applicationPhone.trim()) {
      setApplicationUrl('https://forms.example.com/knot-event')
      setRegistrationError('外部受付情報をモックデータで補完しました。')
    }
    setRegistrationPreview(true)
    // Checkbox click order, not the canonical audienceOptions order, is what selectedAudiences
    // holds at this point - sort once here so every downstream use (badges, the join()'d
    // "対象" text, the DB row) is consistent with the order visitors see in the form.
    const orderedAudiences = sortByAudienceOrder(selectedAudiences)
    // nextRegistration.description may already carry a "【参加費についての詳細】" block appended
    // by a previous save of this same listing (it's loaded straight from the DB row when editing).
    // Strip any existing block before appending the current feeDetail so repeated edits/re-submits
    // don't keep stacking duplicate copies of the same text.
    const baseDescription = nextRegistration.description
      .replace(/\n*【参加費についての詳細】\n[\s\S]*$/, '')
      .trim()
    const combinedDescription = [
      baseDescription,
      registration.feeDetail.trim() ? `【参加費についての詳細】\n${registration.feeDetail.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    const nextListing: Activity = {
      id: editingId ?? undefined,
      title: nextRegistration.title,
      genre: registration.genre,
      area: nextRegistration.area,
      members: '新規募集',
      date: eventListingType === 'event' ? nextRegistration.eventDate : nextRegistration.schedule || '日時は主催者へ確認',
      image: registrationPhoto || dbActivityDefaultImage,
      tone: 'from-sky-100 to-cyan-50',
      tags: [...selectedTags, ...recruitmentTypes.map((item) => item.replace('募集', ''))].length
        ? [...selectedTags, ...recruitmentTypes.map((item) => item.replace('募集', ''))]
        : ['参加者募集中'],
      audienceTags: orderedAudiences,
      description: combinedDescription,
      audience: orderedAudiences.join('・') || registration.audience,
      audienceDetail: audienceDetails.trim() || undefined,
      schedule: nextRegistration.schedule || '要確認',
      venue: nextRegistration.venue,
      fee: nextRegistration.fee,
      feeDetail: registration.feeDetail.trim() || undefined,
      whatToBring: registration.belongings.trim() || undefined,
      listingType: eventListingType,
      eventDate: nextRegistration.eventDate,
      capacity: nextRegistration.capacity,
      deadline: nextRegistration.deadline,
      expiresAt: eventListingType === 'event' ? (eventExpiryMode === 'deadline' ? nextRegistration.deadline : nextRegistration.eventDate) : listingExpiry,
      intakeMethod: eventListingType === 'event' ? intakeMethod : undefined,
      applicationUrl: applicationUrl.trim() || undefined,
      applicationPhone: eventListingType === 'event' ? applicationPhone : undefined,
      applicationStatus: eventListingType === 'event' && intakeMethod === 'external' ? applicationStatus : undefined,
      reviewStatus: 'pending',
      applicants: 0,
      recruitmentTypes: [...recruitmentTypes],
      timeSlots: [...selectedTimeSlots],
      createdAt: new Date().toISOString(),
      favoriteCount: 0,
    }
    const isEditingExisting = Boolean(editingId)
    const newRowId = isEditingExisting ? editingId! : crypto.randomUUID()
    nextListing.id = newRowId
    setEditingTitle(null)
    setRegistrationError('')
    setRegistrationSubmitting(true)

    try {
      const supabase = createClient()
      // Defense in depth: the file input already downsizes/compresses photos on
      // selection, but guard the payload here too — a huge base64 string in the
      // image_url TEXT column is what caused Supabase's INSERT to hit the statement
      // timeout. Anything still this large gets dropped rather than risk the whole
      // submission failing.
      const MAX_IMAGE_PAYLOAD_BYTES = 400_000
      const safeImageUrl =
        registrationPhoto && estimateDataUrlBytes(registrationPhoto) <= MAX_IMAGE_PAYLOAD_BYTES ? registrationPhoto : null
      const activityPayload = {
        ...(isEditingExisting ? {} : { id: newRowId }),
        // Links the row to the signed-in organizer account so "掲載管理" can look it up
        // by a stable id instead of matching contact_email text, which breaks the moment
        // the listing's contact email differs from the account's login email.
        user_id: organizationProfile.id || null,
        category_type: eventListingType,
        title: nextRegistration.title,
        organizer_name: nextRegistration.contactName,
        organizer_org_name: organizationProfile.name || null,
        area: nextRegistration.area,
        genre: registration.genre.join(' / '),
        genre_tags: registration.genre,
        date_schedule: eventListingType === 'event' ? nextRegistration.eventDate : nextRegistration.schedule,
        venue_name: nextRegistration.venue || null,
        target_audience: orderedAudiences.join('・') || registration.audience,
        audience_tags: orderedAudiences,
        audience_detail: audienceDetails.trim() || null,
        capacity_info: eventListingType === 'event' ? nextRegistration.capacity : null,
        fee_info: nextRegistration.fee || null,
        fee_detail: registration.feeDetail.trim() || null,
        application_deadline: eventListingType === 'event' ? (nextRegistration.deadline || null) : null,
        belongings: registration.belongings.trim() || null,
        website_url: registration.website || null,
        sns_url: registration.instagram || registration.line || null,
        description: combinedDescription || null,
        contact_info:
          eventListingType === 'event'
            ? (intakeMethod === 'external' ? applicationUrl || applicationPhone || null : null)
            : (applicationUrl.trim() || null),
        applicant_name: nextRegistration.contactName,
        contact_email: nextRegistration.contactEmail,
        contact_phone: registration.phone || null,
        image_url: safeImageUrl,
        time_slots: selectedTimeSlots,
        feature_tags: selectedTags,
        recruitment_types: recruitmentTypes,
        // parseJstDateTime (not plain `new Date()`) so a naive "YYYY-MM-DDTHH:mm" value from the
        // datetime-local input is always treated as JST regardless of the runtime's own timezone,
        // avoiding a 9-hour shift that would let expired events keep showing well past their
        // actual cutoff.
        expires_at: nextListing.expiresAt ? (parseJstDateTime(nextListing.expiresAt)?.toISOString() ?? null) : null,
        // 公開中の活動を編集して再申請した場合も、新規申請と同様に必ず「承認待ち」へ戻す。
        // 管理者の再承認（公開中への変更）を経るまで一般公開画面には出さない。
        status: 'pending',
        // 内容の再編集・保存でも通知フラグをリセットする。掲載期限（expires_at）が変わって
        // いなくても、内容を見直して保存し直した時点で「更新済み」とみなし、次の期限が来る
        // まで再度30日前・7日前の通知を送れるようにする。
        // expiry_notified_end は本番Supabaseのマイグレーション未適用環境で列が存在しない
        // ケースがあり "Could not find the 'expiry_notified_end' column" エラーで保存自体が
        // 失敗するため、そもそも送��しない（30d/7dの通知抑止だけで十分足りる）。
        ...(isEditingExisting ? { expiry_notified_30d: false, expiry_notified_7d: false } : {}),
      }

      let { error } = isEditingExisting
        ? await supabase.from('activities').update(activityPayload).eq('id', editingId)
        : await supabase.from('activities').insert(activityPayload)

      // 掲載期限管理のマイグレーション（scripts/sql/2025_expiry_management.sql）がまだ本番
      // Supabaseに適用されていない環境では expires_at / expiry_notified_* カラムが無く、
      // INSERT/UPDATE自体が失敗する。その場合はこれらのカラムを外して再送し、掲載内容だけは
      // 確実に保存されるようにする（掲載期限は次回マイグレーション適用後の保存時に反映される）。
      // Supabase's "Could not find the 'X' column" message puts the column name *before*
      // the word "column", so a regex requiring "column" first would never match here -
      // check for the two independently instead of relying on their order.
      if (error && /column/i.test(error.message) && /(expires_at|expiry_notified)/i.test(error.message)) {
        console.error('[v0] Save failed due to missing expiry columns, retrying without them:', error)
        const { expires_at, expiry_notified_30d, expiry_notified_7d, expiry_notified_end, ...payloadWithoutExpiry } = activityPayload as Record<string, unknown>
        const retry = isEditingExisting
          ? await supabase.from('activities').update(payloadWithoutExpiry).eq('id', editingId)
          : await supabase.from('activities').insert(payloadWithoutExpiry)
        error = retry.error
      }

      // If the write still failed and it was carrying an image, retry once with the
      // image dropped — a timeout is frequently the image payload even after the
      // client-side size guard, and the text content of the listing should still save
      // immediately rather than be lost along with the photo.
      let savedWithoutImage = false
      if (error && activityPayload.image_url) {
        console.error('[v0] Save with image failed, retrying without image:', error)
        const payloadWithoutImage = { ...activityPayload, image_url: null }
        const retry = isEditingExisting
          ? await supabase.from('activities').update(payloadWithoutImage).eq('id', editingId)
          : await supabase.from('activities').insert(payloadWithoutImage)
        error = retry.error
        savedWithoutImage = !retry.error
      }

      if (error) {
        // The listing never made it into the database, so don't show a false success
        // state or send a "受付完了" email that implies otherwise — that combination is
        // what previously made submissions vanish silently while still looking accepted.
        console.error('[v0] Failed to save listing application to Supabase:', error)
        setRegistrationError(`保存エラー: ${error.message}`)
        return
      }

      // Only flip to the success screen and add the row to local state once Supabase has
      // actually confirmed the write — never optimistically, so a failed save can never
      // look accepted.
      const savedListing = savedWithoutImage ? { ...nextListing, image: dbActivityDefaultImage } : nextListing
      setNewActivities((current) => (editingTitle ? current.map((item) => (item.title === editingTitle ? savedListing : item)) : [savedListing, ...current]))
      if (savedWithoutImage) {
        toast.error('画像の保存に失敗したため、画像なしで掲載申請を受け付けました。')
      } else {
        toast.success('掲載申請を受け付けました')
      }
      setRegistrationSubmitted(true)
      setEditingId(null)

      await Promise.all([refetchOwnActivities(), refetchDbActivities()])

      // The confirmation email is a side effect of a successful save, not a condition for
      // it — a network hiccup here must not roll back a listing that is already persisted.
      try {
        const notifyResponse = await fetch('/api/notify/listing-application', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: nextRegistration.title,
            listingTypeLabel: eventListingType === 'event' ? '単発イベント・体験会' : '定期的な活動',
            area: nextRegistration.area,
            genre: registration.genre.join(' / '),
            organizerName: nextRegistration.contactName,
            organizerEmail: nextRegistration.contactEmail,
            organizerPhone: registration.phone,
            schedule: nextRegistration.schedule,
            eventDate: eventListingType === 'event' ? nextRegistration.eventDate : undefined,
          }),
        })
        if (!notifyResponse.ok) {
          console.error('[v0] Listing application saved, but confirmation email failed:', notifyResponse.status, await notifyResponse.text())
        }
      } catch (notifyError) {
        console.error('[v0] Listing application saved, but confirmation email request failed:', notifyError)
      }
    } catch (submissionError) {
      console.error('[v0] Failed to submit listing application:', submissionError)
      const message = submissionError instanceof Error ? submissionError.message : String(submissionError)
      setRegistrationError(`保存エラー: ${message}`)
    } finally {
      setRegistrationSubmitting(false)
    }
  }

  const submitParticipation = async () => {
    if (!selectedParticipation) return
    if (!participationForm.applicantName.trim() || !participationForm.applicantEmail.trim()) {
      setParticipationSendError('お名前と���ールアドレスをご入力ください。')
      return
    }

    setParticipationSendError('')
    setParticipationSubmitting(true)

    // 非公開化された活動への申し込みを遮断する。selectedParticipation は既に status='published'
    // で絞り���んだ一覧から選ばれているが、モーダルを開いたままの間に退会処理などでその活動が
    // 閉鎖（非公開化）される可能性があるため、送信直前にDBの最新状態を再確認する。activities は
    // 誰でもSELECT可能なテーブルなのでクライアントから直接検証できる。
    //
    // ここで見るのは活動自体の公開ステータスのみ。掲載元アカウント（user_id / profiles）の状態は
    // 意図的にチェックしない - 「公開中」の活動は、掲載元プロフィールの有無や状態に関わらず申込を
    // 受け付ける仕様のため（例: サンプル/初期投入データのように user_id が紐づいていない活動も含む）。
    //
    // 同じクエ��で、通知メール送付先となる主催者（掲載元）の連絡先情報も取得する。ここで見る
    // organizationProfile はログイン中の申込者自身のプロフィールであり、活動の主催者とは無関係
    // なので、通知先には絶対に使わない。
    let organizerOrgName = selectedParticipation.organizerOrgName || selectedParticipation.title
    let organizerContactName = ''
    let organizerContactEmail = ''
    let organizerContactPhone = ''
    if (selectedParticipation.id) {
      const supabase = createClient()
      const { data: latest, error: latestError } = await supabase
        .from('activities')
        .select('status, organizer_name, organizer_org_name, contact_email, contact_phone')
        .eq('id', selectedParticipation.id)
        .maybeSingle()
      if (latestError) {
        console.log('[v0] Failed to verify activity before participation submission:', latestError.message)
      } else if (!latest || latest.status !== 'published') {
        setParticipationSendError('この活動は現在申し込みを受け付けていません。')
        setParticipationSubmitting(false)
        return
      } else {
        organizerOrgName = latest.organizer_org_name || organizerOrgName
        organizerContactName = latest.organizer_name || ''
        organizerContactEmail = latest.contact_email || ''
        organizerContactPhone = latest.contact_phone || ''
      }
    }

    const payload = {
      activityTitle: selectedParticipation.title,
      activityArea: selectedParticipation.area,
      activityDate: selectedParticipation.listingType === 'event' ? selectedParticipation.eventDate || selectedParticipation.date : selectedParticipation.date,
      applicantName: participationForm.applicantName,
      applicantEmail: participationForm.applicantEmail,
      applicantPhone: participationForm.applicantPhone,
      groupSize: participationForm.groupSize,
      participantBreakdown: participationForm.participantBreakdown,
      question: participationForm.question,
      organizerName: organizerContactName || organizerOrgName,
      organizerEmail: organizerContactEmail,
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('participation_applications').insert({
        activity_title: payload.activityTitle,
        activity_area: payload.activityArea,
        activity_date: payload.activityDate,
        applicant_name: payload.applicantName,
        applicant_kana: participationForm.applicantKana || null,
        applicant_email: payload.applicantEmail,
        applicant_phone: payload.applicantPhone || null,
        group_size: payload.groupSize || null,
        participant_breakdown: payload.participantBreakdown || null,
        question: payload.question || null,
        organizer_name: payload.organizerName,
        organizer_email: payload.organizerEmail || null,
        status: 'new',
      })

      if (error) {
        console.log('[v0] Failed to save participation application to Supabase:', error.message)
      } else {
        await Promise.all([refetchApplicantCounts(), refetchMyApplications()])
      }

      await fetch('/api/notify/participation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setSubmittedOrganizerContact({
        orgName: organizerOrgName,
        contactName: organizerContactName,
        phone: organizerContactPhone,
        email: organizerContactEmail,
      })
      setParticipationSent(true)
    } catch (submissionError) {
      console.log('[v0] Failed to submit participation application:', submissionError)
      setParticipationSendError('送信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setParticipationSubmitting(false)
    }
  }

  const openBrowse = (genre: string | null) => {
    setBrowseGenre(genre)
    setAudience('すべて')
    setSchedule('すべて')
    requestAnimationFrame(() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const backToBrowseFromMap = () => {
    setViewMode('home')
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth', block: 'start' })))
  }

  // legacy* は掲載期限管理カラム（expires_at 等）のマイグレーション（scripts/sql/2025_expiry_management.sql）
  // がまだ本番Supabaseに適用されていない環境向けのフォールバック。カラムが無い場合は
  // "column ... does not exist" エラーになるので、その時だけ旧カラム構成で再取得する。
  const legacyActivitiesSelectColumns =
    'id, user_id, category_type, title, organizer_name, organizer_org_name, organizer_logo_url, organizer_bio, area, genre, date_schedule, venue_name, address, target_audience, audience_detail, capacity_info, fee_info, fee_detail, application_deadline, belongings, website_url, sns_url, description, contact_info, applicant_name, contact_email, contact_phone, status, created_at, image_url, genre_tags, time_slots, feature_tags, recruitment_types, audience_tags'
  const activitiesSelectColumns = `${legacyActivitiesSelectColumns}, expires_at, expiry_notified_30d, expiry_notified_7d, expiry_notified_end`

  const refetchDbActivities = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('activities')
      .select(activitiesSelectColumns)
      .eq('status', 'published')
      // 掲載期限（expires_at）が過去の活動は公開サイト上では自動的に非表示にする。
      // expires_at が未設定（期限なし）の行は引き続き表示する。
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
    if (error) {
      console.log('[v0] Failed to load activities from Supabase (retrying without expiry columns):', error.message)
      const fallback = await supabase
        .from('activities')
        .select(legacyActivitiesSelectColumns)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (!fallback.error && fallback.data) setDbActivities((fallback.data as DbActivityRow[]).map(mapDbActivityToActivity))
      else if (fallback.error) console.log('[v0] Failed to load activities from Supabase:', fallback.error.message)
      return
    }
    if (data) setDbActivities((data as DbActivityRow[]).map(mapDbActivityToActivity))
  }, [])

  // Loads サポート情報・URL管理 links from the same `support_links` table the admin
  // dashboard writes to, so anything added/edited/deleted there shows up in the public
  // support hub modal.
  const refetchSupportEntries = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('support_links')
      .select('id, category, municipality, title, address, phone, link_url, notes, details, sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (!error && data) {
      setSupportEntries((data as DbSupportLinkRow[]).map(mapDbSupportLinkToAdminSupportEntry))
    } else if (error) {
      console.log('[v0] Failed to load support_links:', error.message)
    }
  }, [])

  const refetchOwnActivities = useCallback(async () => {
    const userId = organizationProfile.id
    const email = organizationProfile.email.trim()
    if (!userId && !email) {
      setOwnActivities([])
      return
    }
    const supabase = createClient()
    // Match by the stable user_id first (set on every new submission), and also match by
    // contact_email so listings submitted before user_id existed, or under a different
    // contact address, still surface under "掲載管理" after a reload or re-login.
    const filters = [userId ? `user_id.eq.${userId}` : null, email ? `contact_email.eq.${email}` : null]
      .filter(Boolean)
      .join(',')
    const { data, error } = await supabase
      .from('activities')
      .select(activitiesSelectColumns)
      .or(filters)
      .order('created_at', { ascending: false })
    if (error) {
      console.log('[v0] Failed to load own listings from Supabase (retrying without expiry columns):', error.message)
      const fallback = await supabase
        .from('activities')
        .select(legacyActivitiesSelectColumns)
        .or(filters)
        .order('created_at', { ascending: false })
      if (!fallback.error && fallback.data) setOwnActivities((fallback.data as DbActivityRow[]).map(mapDbActivityToActivity))
      else if (fallback.error) console.log('[v0] Failed to load own listings from Supabase:', fallback.error.message)
      return
    }
    if (data) setOwnActivities((data as DbActivityRow[]).map(mapDbActivityToActivity))
  }, [organizationProfile.id, organizationProfile.email])

  // Goes through /api/organizer/participation-summary (server-side, service-role key)
  // instead of querying participation_applications directly: that table has RLS enabled with
  // no SELECT policy, so the anon-key client always got back zero rows, which is why
  // "申込者一覧 (0組) を確認" never counted up even though the applications were saved.
  const refetchApplicantCounts = useCallback(async () => {
    if (!isLoggedIn) {
      setApplicantCounts({})
      return
    }
    const response = await fetch('/api/organizer/participation-summary')
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      console.log('[v0] Failed to load applicant counts:', body?.error)
      return
    }
    setApplicantCounts((body?.counts ?? {}) as Record<string, number>)
  }, [isLoggedIn])

  useEffect(() => {
    refetchApplicantCounts()
  }, [refetchApplicantCounts])

  useEffect(() => {
    refetchDbActivities()
  }, [refetchDbActivities])

  useEffect(() => {
    refetchSupportEntries()
  }, [refetchSupportEntries])

  useEffect(() => {
    refetchOwnActivities()
  }, [refetchOwnActivities])

  // ゆずりあい掲示板（不用品の譲渡・貸し借り）の投稿一覧を読み込む。RLSにより、公開対象は
  // status='受付中' の投稿のみで、自分の投稿は状態を問わず取得できる。マイページの投稿管理
  // では myShareItems（下の allActivities 相当のメモ化）で自分の投稿だけを絞り込んで使う。
  const refetchShareItems = useCallback(async () => {
    setShareItemsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('share_items')
        .select('id, user_id, type, price_type, title, municipality, image_url, description, contact_email, status, created_at')
        .order('created_at', { ascending: false })
      if (error) {
        console.log('[v0] Failed to load share_items from Supabase:', error.message)
        return
      }
      if (data) setShareItems((data as DbShareItemRow[]).map(mapDbShareItemToShareItem))
    } finally {
      setShareItemsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetchShareItems()
  }, [refetchShareItems])

  // ゆずりあい掲示板は単独のモーダルではなく「宮崎の活動サポート便利帳」内の
  // 1タブとして表示する。サポート情報ハブを開き、タブを掲示板に切り替えるだけでよい。
  const openShareBoard = () => {
    setSupportHubTab('share')
    setSupportHubOpen(true)
    refetchShareItems()
  }

  const openShareItemForm = (existing?: ShareItem) => {
    if (!isLoggedIn) {
      setAuthModal(true)
      return
    }
    setShareItemSaveError('')
    if (existing) {
      setEditingShareItemId(existing.id ?? null)
      setShareItemDraft(existing)
    } else {
      setEditingShareItemId(null)
      setShareItemDraft({
        ...defaultShareItemDraft,
        contactEmail: organizationProfile.contactEmail || organizationProfile.email,
      })
    }
    setShareItemFormOpen(true)
  }

  const closeShareItemForm = () => {
    setShareItemFormOpen(false)
    setEditingShareItemId(null)
    setShareItemSaveError('')
  }

  const saveShareItem = async () => {
    if (!shareItemDraft.title.trim() || !shareItemDraft.description.trim() || !shareItemDraft.contactEmail.trim()) {
      setShareItemSaveError('タイトル・内容・連絡先メールは必須です。')
      return
    }
    setShareItemSaving(true)
    setShareItemSaveError('')
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setShareItemSaveError('投稿するにはログインが必要です。')
        return
      }
      const payload = shareItemToDbPayload(shareItemDraft, user.id)
      const { error } = editingShareItemId
        ? await supabase.from('share_items').update(payload).eq('id', editingShareItemId)
        : await supabase.from('share_items').insert(payload)
      if (error) {
        console.log('[v0] Failed to save share_item:', error)
        // Supabase から返った生のエラー内容（message / details / hint）をそのまま表示し、
        // 「share_items テーブルが未作成」「RLSポリシー違反」等の原因を特定できるようにする。
        setShareItemSaveError(formatSupabaseErrorMessage(error))
        // テーブル未作成・RLS拒否などでDBへの保存が通らない場合でも、入力内容が消えて
        // しまわないよう、フロントエンドの一覧にその場で一時表示するフォールバックを行う。
        // ページ再読み込みやrefetchShareItems()で消える一時的な表示であり、実データでは
        // ないことに注意（恒久的な保存にはscripts/sql/2025_share_items.sqlの適用が必要）。
        const fallbackItem: ShareItem = {
          ...shareItemDraft,
          id: editingShareItemId ?? `local-${Date.now()}`,
          userId: user.id,
          createdAt: shareItemDraft.createdAt || new Date().toISOString(),
        }
        setShareItems((prev) => {
          const next = editingShareItemId
            ? prev.map((it) => (it.id === editingShareItemId ? fallbackItem : it))
            : [fallbackItem, ...prev]
          saveLocalShareItems(next.filter((it) => (it.id ?? '').startsWith('local-')))
          return next
        })
        closeShareItemForm()
        return
      }
      await refetchShareItems()
      closeShareItemForm()
    } finally {
      setShareItemSaving(false)
    }
  }

  // 投稿フォームの「画像ファイルアップロード」。スマホ/PCから選んだファイルを、活動・イベント
  // 掲載フォーム（registrationPhoto）と全く同じ方式でクライアント側リサイズ・再エンコードし、
  // base64データURLとして shareItemDraft.imageUrl にそのまま保存する。Supabase Storage の
  // バケット作成・権限設定が未完了の環境でもアップロードが失敗しないよう、Storageには依存しない。
  const uploadShareItemImage = async (file: File) => {
    setShareItemImageUploading(true)
    setShareItemSaveError('')
    try {
      const compressed = await compressImageFile(file)
      if (!compressed) {
        setShareItemSaveError('画像の読み込みに失敗しました。別の画像でお試しください。')
        return
      }
      if (estimateDataUrlBytes(compressed) > MAX_SHARE_ITEM_IMAGE_BYTES) {
        setShareItemSaveError('画像サイズが大きすぎます。別の画像でお試しください。')
        return
      }
      setShareItemDraft((prev) => ({ ...prev, imageUrl: compressed }))
    } finally {
      setShareItemImageUploading(false)
    }
  }

  const deleteShareItem = async (id: string) => {
    setShareItemActionError('')
    // saveShareItem が share_items テーブル未作成・RLS拒否時にフロント側だけへ一時保存した
    // 投稿（id が "local-" で始まる）は実テーブルに行が存在しないため、Supabase への
    // delete は常に0件ヒットで失敗する。ローカル表示分はクライアント状態から直接取り除く。
    if (id.startsWith('local-')) {
      setShareItems((prev) => {
        const next = prev.filter((it) => it.id !== id)
        saveLocalShareItems(next.filter((it) => (it.id ?? '').startsWith('local-')))
        return next
      })
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('share_items').delete().eq('id', id)
    if (error) {
      console.log('[v0] Failed to delete share_item:', error.message)
      setShareItemActionError(formatSupabaseErrorMessage(error))
      return
    }
    await refetchShareItems()
  }

  const toggleShareItemStatus = async (item: ShareItem) => {
    if (!item.id) return
    setShareItemActionError('')
    const nextStatus: ShareItem['status'] = item.status === '受付中' ? '解決済み・終了' : '受付中'
    // ローカル一時表示分（id が "local-" 始まり）は実テーブルに行が無いため、Supabase への
    // update は常に対象0件で無反応になる。クライアント状態のステータスを直接書き換える。
    if (item.id.startsWith('local-')) {
      setShareItems((prev) => {
        const next = prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it))
        saveLocalShareItems(next.filter((it) => (it.id ?? '').startsWith('local-')))
        return next
      })
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('share_items').update({ status: nextStatus }).eq('id', item.id)
    if (error) {
      console.log('[v0] Failed to update share_item status:', error.message)
      setShareItemActionError(formatSupabaseErrorMessage(error))
      return
    }
    await refetchShareItems()
  }

  const openShareContactModal = (item: ShareItem) => {
    setShareContactTarget(item)
    setShareContactForm({
      ...defaultShareContactForm,
      senderName: organizationProfile.contactName || organizationProfile.name,
      senderEmail: organizationProfile.contactEmail || organizationProfile.email,
    })
    setShareContactSent(false)
    setShareContactError('')
  }

  const closeShareContactModal = () => {
    setShareContactTarget(null)
    setShareContactSent(false)
    setShareContactError('')
  }

  const updateShareContactForm = (patch: Partial<typeof defaultShareContactForm>) =>
    setShareContactForm((prev) => ({ ...prev, ...patch }))

  const submitShareContact = async () => {
    if (!shareContactTarget) return
    if (!shareContactForm.senderName.trim() || !shareContactForm.senderEmail.trim() || !shareContactForm.message.trim()) {
      setShareContactError('お名前・メールアドレス・メッセージは必須です。')
      return
    }
    setShareContactSubmitting(true)
    setShareContactError('')
    try {
      const response = await fetch('/api/notify/share-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemTitle: shareContactTarget.title,
          itemType: shareContactTarget.type,
          posterEmail: shareContactTarget.contactEmail,
          senderName: shareContactForm.senderName,
          senderEmail: shareContactForm.senderEmail,
          senderPhone: shareContactForm.senderPhone || undefined,
          message: shareContactForm.message,
        }),
      })
      if (!response.ok) {
        setShareContactError('送信に失敗しました。時間をおいて再度お試しください。')
        return
      }
      setShareContactSent(true)
    } catch (error) {
      console.log('[v0] Failed to submit share item contact:', error)
      setShareContactError('送信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setShareContactSubmitting(false)
    }
  }

  // Loads this account's own participation applications for the "参加予定・申込中の活動"
  // section of My Page. There's no user_id/activity_id column on participation_applications,
  // so matching is done by applicant_email - the same title/email-based approach the applicant
  // list modal already uses for the organizer side.
  //
  // This goes through /api/participation/mine (server-side, service-role key) rather than
  // querying participation_applications directly with the browser's anon-key client:
  // participation_applications has RLS enabled with no SELECT policy at all, so the anon-key
  // client always got back zero rows here regardless of the filter, and this section silently
  // stayed empty even though the applications were saved correctly.
  const refetchMyApplications = useCallback(async () => {
    if (!organizationProfile.email.trim()) {
      setMyApplications([])
      return
    }
    setMyApplicationsLoading(true)
    try {
      const response = await fetch('/api/participation/mine')
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        console.log('[v0] Failed to load my participation applications:', body?.error)
        return
      }
      const rows = (body?.applications ?? []) as {
        id: string
        activity_title: string
        activity_area: string
        activity_date: string
        group_size: string | null
        status: string
        created_at: string
      }[]
      setMyApplications(
        rows.map((row) => ({
          id: row.id,
          activityTitle: row.activity_title,
          activityArea: row.activity_area,
          activityDate: row.activity_date,
          groupSize: row.group_size || '',
          status: row.status,
          createdAt: row.created_at,
        })),
      )
    } finally {
      setMyApplicationsLoading(false)
    }
  }, [organizationProfile.email])

  useEffect(() => {
    if (isLoggedIn) {
      refetchMyApplications()
    } else {
      setMyApplications([])
    }
  }, [isLoggedIn, refetchMyApplications])

  // Ends an ongoing 継続活動 (circle) membership. Single-off event applications don't need
  // this - they just fall out of the "参加予定" list automatically once their date has passed
  // (see myUpcomingApplications below) - so this is only offered for regular listings.
  const leaveCircleApplication = async (application: MyApplicationRow) => {
    if (typeof window !== 'undefined' && !window.confirm(`「${application.activityTitle}」の参加を終了しますか？`)) return
    // Goes through /api/participation/withdraw (service-role key) for the same reason
    // refetchMyApplications does: participation_applications has no RLS UPDATE policy, so a
    // plain client-side .update() here would silently match zero rows.
    const response = await fetch('/api/participation/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: application.id }),
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      console.log('[v0] Failed to withdraw participation application:', body?.error)
      toast.error('退会処理に失敗しました。時間をおいて再度お試しください。')
      return
    }
    setMyApplications((current) => current.filter((item) => item.id !== application.id))
    toast.success('参加を終了しました')
  }

  const myListings = useMemo(() => {
    const seenIds = new Set<string>()
    const byTitle = new Map<string, Activity>()
    const titleOrder: string[] = []
    const addUnique = (item: Activity) => {
      if (item.id && seenIds.has(item.id)) return
      if (item.id) seenIds.add(item.id)
      const existing = byTitle.get(item.title)
      if (existing) {
        byTitle.set(item.title, pickRicherActivity(existing, item))
        return
      }
      byTitle.set(item.title, item)
      titleOrder.push(item.title)
    }
    for (const item of ownActivities) addUnique(item)
    for (const item of newActivities) addUnique(item)
    const merged = titleOrder.map((title) => byTitle.get(title)!)
    return merged.filter((item) => !withdrawnTitles.includes(item.title)).map((item) => ({ ...item, area: normalizeArea(item.area) }))
  }, [newActivities, ownActivities, withdrawnTitles])

  const allActivities = useMemo(() => {
    const seenIds = new Set<string>()
    const byTitle = new Map<string, Activity>()
    const titleOrder: string[] = []
    for (const item of [...newActivities, ...dbActivities]) {
      if (item.id && seenIds.has(item.id)) continue
      if (item.id) seenIds.add(item.id)
      const existing = byTitle.get(item.title)
      if (existing) {
        byTitle.set(item.title, pickRicherActivity(existing, item))
        continue
      }
      byTitle.set(item.title, item)
      titleOrder.push(item.title)
    }
    const merged = titleOrder.map((title) => byTitle.get(title)!)
    // Public-facing feed (browse/map/events/search all read from this): never show a listing
    // that isn't approved yet. `dbActivities` is already fetched with `.eq('status',
    // 'published')`, but `newActivities` is the local, same-session echo of whatever the
    // current user just submitted (reviewStatus: 'pending' until an admin approves it) — it's
    // merged in so the submitter sees their own draft reflected instantly. Without this filter
    // that pending echo would render in these public sections too, on the submitter's own
    // screen, before any admin review. Approval status belongs on the マイページ side
    // (`myListings`, which intentionally keeps pending items so the owner can track them), not
    // here.
    return merged
      .filter((item) => !withdrawnTitles.includes(item.title) && item.reviewStatus !== 'pending' && !isActivityListingExpired(item))
      .map((item) => ({ ...item, area: normalizeArea(item.area) }))
  }, [newActivities, dbActivities, withdrawnTitles])
  // Splits this account's own participation applications (see refetchMyApplications above)
  // into 単発イベント (auto-hidden starting the day *after* the event date - visible for the
  // entire day of the event itself, no explicit "leave" action needed) and 定期・継続活動/サーク��
  // (kept visible until the member explicitly ends their participation via
  // leaveCircleApplication). The activity's current listingType is looked up from allActivities
  // by title, matching how the rest of the app already links participation_applications rows
  // back to a listing (there's no id column to join on).
  const myEventApplications = useMemo(() => {
    const now = new Date()
    return myApplications.filter((application) => {
      const activity = allActivities.find((item) => item.title === application.activityTitle)
      if (activity && activity.listingType === 'regular') return false
      const eventDate = new Date(application.activityDate)
      // If the date doesn't parse (e.g. a freeform schedule string on an activity that's no
      // longer published), fail safe by keeping it visible rather than silently hiding it.
      if (Number.isNaN(eventDate.getTime())) return true
      // Hide starting at 00:00 of the day *after* the event, so the card stays visible for the
      // whole day the event actually takes place.
      const hideFrom = new Date(eventDate)
      hideFrom.setHours(0, 0, 0, 0)
      hideFrom.setDate(hideFrom.getDate() + 1)
      return now < hideFrom
    })
  }, [myApplications, allActivities])

  const myCircleApplications = useMemo(
    () => myApplications.filter((application) => allActivities.find((item) => item.title === application.activityTitle)?.listingType === 'regular'),
    [myApplications, allActivities],
  )

  const mapActivities = useMemo(
    () => allActivities.filter((item) => (mapGenre === 'すべて' || item.genre.includes(mapGenre)) && (mapArea === 'すべて' || item.area === mapArea)),
    [allActivities, mapGenre, mapArea],
  )
  const mapPoints = useMemo(
    () =>
      regionConfig.groups.flatMap((group) => group.places).map((place) => ({
        area: place,
        lat: municipalityCoordinates[place]?.lat ?? 32.15,
        lng: municipalityCoordinates[place]?.lng ?? 131.35,
        count: allActivities.filter((item) => item.area === place).length,
      })),
    [allActivities],
  )
  const visiblePoints = mapPoints.filter((point) => mapArea === 'すべて' || point.area === mapArea)
  const searchedActivities = useMemo(
    () => allActivities.filter((item) => `${item.title}${item.genre}${item.area}`.includes(query) && (!area || item.area === area)),
    [query, area, allActivities],
  )
  const tabActivities = useMemo(() => {
    const list = [...searchedActivities]
    if (activeTab === 'おすすめ') {
      return list.sort((a, b) => Number(Boolean(b.pickup)) - Number(Boolean(a.pickup)))
    }
    if (activeTab === '新着') {
      return list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
    }
    if (activeTab === '近くの活動') {
      const nearbyGroup = regionConfig.groups.find((group) => group.places.includes(area))
      const rank = (item: Activity) => {
        if (!area) return 0
        if (item.area === area) return 0
        if (nearbyGroup && nearbyGroup.places.includes(item.area)) return 1
        return 2
      }
      return list.sort((a, b) => rank(a) - rank(b))
    }
    return list
  }, [searchedActivities, activeTab, area])
  const browseActivities = useMemo(
    () =>
      allActivities.filter(
        (item) =>
          (!browseGenre || item.genre.includes(browseGenre)) &&
          (audience === 'すべて' || item.audience === audience) &&
          matchesTimeSlot(item, schedule),
      ),
    [browseGenre, audience, schedule, allActivities],
  )
  const regionCounts = useMemo(
    () => browseActivities.reduce<Record<string, number>>((counts, activity) => ({ ...counts, [activity.area]: (counts[activity.area] || 0) + 1 }), {}),
    [browseActivities],
  )

  return {
    menuOpen, setMenuOpen,
    activeTab, setActiveTab,
    query, setQuery,
    area, setArea,
    searched, setSearched,
    favorites, setFavorites,
    openFaq, setOpenFaq,
    browseGenre, setBrowseGenre,
    audience, setAudience,
    schedule, setSchedule,
    selectedActivity, setSelectedActivity,
    selectedParticipation, setSelectedParticipation,
    participationSent, setParticipationSent,
    participationForm, updateParticipationForm,
    participationSubmitting, participationSendError, submittedOrganizerContact,
    submitParticipation,
    isLoggedIn, setIsLoggedIn,
    isAdmin,
    authModal, setAuthModal,
    authMode, setAuthMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authSubmitting, authError, setAuthError,
    signUpWithEmail, signInWithEmail, signOut,
    authView, setAuthView,
    resetEmail, setResetEmail,
    resetSent, setResetSent,
    resetSubmitting, resetError, setResetError,
    requestPasswordReset,
    organizationProfile, setOrganizationProfile,
    myPageTab, setMyPageTab,
    profileSaving, profileSaveError, saveProfile,
    deleteAccountModalOpen, setDeleteAccountModalOpen,
    deletingAccount, deleteAccountError, deleteAccount,
    selectedEvent, setSelectedEvent,
    eventListingType, setEventListingType,
    eventExpiryMode, setEventExpiryMode,
    intakeMethod, setIntakeMethod,
    applicationUrl, setApplicationUrl,
    applicationPhone, setApplicationPhone,
    applicationStatus, setApplicationStatus,
    applicationModal, setApplicationModal,
    applicantListActivity, setApplicantListActivity,
    participantType, setParticipantType,
    adultCount, setAdultCount,
    childCount, setChildCount,
    withdrawnTitles, setWithdrawnTitles,
    myPageOpen, setMyPageOpen,
    editingTitle, setEditingTitle,
    editingId,
    withdrawalTarget, setWithdrawalTarget,
    renewalTarget, setRenewalTarget,
    renewingListing, renewListing,
    returnToMyPage, setReturnToMyPage,
    legalModal, setLegalModal,
    contactSent, setContactSent,
    contactGenre, setContactGenre,
    supportHubOpen, setSupportHubOpen,
    supportHubTab, setSupportHubTab,
    supportEntries,
    shareItems, shareItemsLoading,
    myShareItems, myShareItemsLoading,
    openShareBoard,
    shareBoardTypeFilter, setShareBoardTypeFilter,
    shareItemFormOpen, openShareItemForm, closeShareItemForm,
    editingShareItemId, shareItemDraft, setShareItemDraft,
    shareItemSaving, shareItemSaveError, saveShareItem,
    shareItemImageUploading, uploadShareItemImage,
        deleteShareItem, toggleShareItemStatus, shareItemActionError,
    shareContactTarget, openShareContactModal, closeShareContactModal,
    shareContactForm, updateShareContactForm,
    shareContactSubmitting, shareContactSent, shareContactError, submitShareContact,
    isRegistrationOpen, setRegistrationOpen,
    registrationPreview, setRegistrationPreview,
    registrationSubmitted, setRegistrationSubmitted,
    registrationError, setRegistrationError,
    registrationFieldErrors,
    registrationSubmitting,
    newActivities,
    applicantCounts,
    myApplications, myApplicationsLoading, myEventApplications, myCircleApplications, leaveCircleApplication,
    registrationPhoto, setRegistrationPhoto,
    recruitmentTypes, toggleRecruitmentType,
    selectedTags, setSelectedTags,
    customTag, setCustomTag,
    selectedAudiences, setSelectedAudiences,
    audienceDetails, setAudienceDetails,
    selectedTimeSlots, toggleTimeSlot,
    listingExpiry, setListingExpiry,
    registration, updateRegistration,
    viewMode, setViewMode,
    mapGenre, setMapGenre,
    mapArea, setMapArea,
    selectedPoint, setSelectedPoint,
    allActivities,
    myListings,
    mapActivities,
    visiblePoints,
    searchedActivities,
    tabActivities,
    browseActivities,
    regionCounts,
    openAuth,
    openContact,
    closeContact,
    openRegistration,
    completeLogin,
    openParticipation,
    reuseListing,
    closeRegistration,
    deleteMyListing,
    submitRegistration,
    openBrowse,
    backToBrowseFromMap,
    tagOptions,
    audienceOptions,
    recruitmentOptions,
    scheduleFilterOptions,
    activityTimeSlotOptions,
  }
}

type KnotStore = ReturnType<typeof useKnotStore>

const KnotContext = createContext<KnotStore | null>(null)

export function KnotProvider({ children }: { children: ReactNode }) {
  const store = useKnotStore()
  return <KnotContext.Provider value={store}>{children}</KnotContext.Provider>
}

export function useKnot() {
  const context = useContext(KnotContext)
  if (!context) throw new Error('useKnot must be used within a KnotProvider')
  return context
}
