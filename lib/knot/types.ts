export type RegionGroup = { label: string; places: string[] }
export type RegionConfig = { prefecture: string; groups: RegionGroup[] }

export type Genre = { label: string; description: string; icon: string; color: string }

export type ListingType = 'regular' | 'event'
export type IntakeMethod = 'knot' | 'external'
export type ApplicationStatus = 'open' | 'limited' | 'full'

export type Activity = {
  id?: string
  title: string
  genre: string[]
  area: string
  members: string
  date: string
  image: string
  tone: string
  tags?: string[]
  audienceTags?: string[]
  description?: string
  audience: string
  audienceDetail?: string
  schedule: string
  level?: string
  venue?: string
  fee?: string
  feeDetail?: string
  whatToBring?: string
  listingType?: ListingType
  eventDate?: string
  capacity?: string
  deadline?: string
  expiresAt?: string
  intakeMethod?: IntakeMethod
  applicationUrl?: string
  applicationPhone?: string
  applicationStatus?: ApplicationStatus
  reviewStatus?: 'pending' | 'published' | 'closed'
  applicants?: number
  recruitmentTypes?: string[]
  timeSlots?: string[]
  pickup?: boolean
  createdAt?: string
  favoriteCount?: number
  organizerOrgName?: string
  organizerLogoUrl?: string
  organizerBio?: string
  websiteUrl?: string
  instagramUrl?: string
  lineUrl?: string
}

export type ShareItemType = '貸します' | '借りたい' | '譲ります' | '探してます'
export type ShareItemPriceType = '無償' | '有償・要相談'
export type ShareItemStatus = '受付中' | '解決済み・終了'

export type ShareItem = {
  id?: string
  userId?: string
  type: ShareItemType
  priceType: ShareItemPriceType
  title: string
  municipality: string
  imageUrl?: string
  description: string
  contactEmail: string
  status: ShareItemStatus
  createdAt?: string
}

export type OrganizationProfile = {
  id?: string
  name: string
  kana: string
  address: string
  phone: string
  email: string
  birthdate: string
  gender: '' | 'male' | 'female' | 'other'
  contactName: string
  contactPhone: string
  contactEmail: string
  website: string
  social: string
  area: string
  instagram: string
  line: string
  accountKind: 'individual' | 'organization'
  memberTypes: string[]
  volunteerIntent: string[]
  interestGenres: string[]
  skillNotes: string
}

export type RegistrationDraft = {
  title: string
  genre: string[]
  area: string
  description: string
  schedule: string
  audience: string
  venue: string
  fee: string
  feeDetail: string
  belongings: string
  contactName: string
  contactEmail: string
  phone: string
  website: string
  instagram: string
  line: string
  tags: string
  eventDate: string
  capacity: string
  deadline: string
}
