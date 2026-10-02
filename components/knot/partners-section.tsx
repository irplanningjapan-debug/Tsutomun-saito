'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, Handshake, Phone } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { getExpiryStatus, mapDbPartnerToOfficialPartner, type DbPartnerRow, type OfficialPartner } from '@/lib/knot/data'
import { createClient } from '@/lib/supabase/client'

export function PartnersSection() {
  const { openContact } = useKnot()
  const [dbPartners, setDbPartners] = useState<OfficialPartner[]>([])

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()
    const legacyColumns =
      'id, partner_type, company_name, sub_title, support_message, website_url, website_label, sub_url, sub_url_label, phone, phone_note, logo_url, display_order'
    const applyVisiblePartners = (data: DbPartnerRow[]) => {
      // 掲載期限（expires_at）が過去のパートナーは公開サイト上では非表示にする。
      const visible = data.filter((row) => getExpiryStatus(row.expires_at) !== 'expired')
      if (isMounted) setDbPartners(visible.map(mapDbPartnerToOfficialPartner))
    }
    supabase
      .from('partners')
      .select(`${legacyColumns}, expires_at, supporter_area`)
      .order('display_order', { ascending: true })
      .then(async ({ data, error }) => {
        if (error) {
          console.log('[v0] Failed to load partners from Supabase (retrying without expires_at/supporter_area):', error.message)
          // scripts/sql/2025_expiry_management.sql が未適用の環境向けフォールバック。
          const withoutExpiry = await supabase.from('partners').select(`${legacyColumns}, supporter_area`).order('display_order', { ascending: true })
          if (!withoutExpiry.error && withoutExpiry.data) {
            applyVisiblePartners(withoutExpiry.data as DbPartnerRow[])
            return
          }
          const fallback = await supabase.from('partners').select(legacyColumns).order('display_order', { ascending: true })
          if (!fallback.error && fallback.data) applyVisiblePartners(fallback.data as DbPartnerRow[])
          return
        }
        if (data) applyVisiblePartners(data as DbPartnerRow[])
      })
    return () => {
      isMounted = false
    }
  }, [])

  const allPartners = dbPartners

  const openPartnerContact = () => openContact('🏢 企業協賛・パートナー相談')

  return (
    <section id="partners" className="bg-slate-50 px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-primary">OFFICIAL PARTNERS</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">西都の地域活動・伝統文化を応援する企業・団体</h2>
          </div>
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:items-end">
            <p className="text-sm font-black text-slate-700">つとむんパートナーとして西都の現場を応援しませんか？</p>
            <button
              onClick={openPartnerContact}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-xs font-black text-primary-foreground transition hover:opacity-90"
              <Handshake size={14} />パートナー協賛について相談する
            </button>
          </div>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {allPartners.map((partner) => (
            <article
              key={partner.name}
              className={`flex flex-col rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                partner.supporterArea ? 'border-primary/30 bg-gradient-to-b from-sky-50 to-white' : 'border-slate-200 bg-white'
              }`}
            >
              {partner.supporterArea && (
                <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-white text-xs font-bold"
                  <Handshake size={12} />
                  {partner.supporterArea} 公式サポート窓口
                </div>
              )}
              <div className="flex h-20 items-center">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  <Image src={partner.logo} alt={`${partner.name}のロゴ`} fill className="object-cover" />
                </div>
              </div>
              <p className="mt-4 text-[11px] font-bold text-slate-400">{partner.category}</p>
              <h3 className="mt-1 font-black leading-6 text-slate-900">{partner.name}</h3>
              <p className="mt-2 flex-1 text-xs leading-5 text-slate-500">{partner.message}</p>
              {partner.phone && (
                <a
                  href={`tel:${partner.phone.replace(/[^0-9+]/g, '')}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-slate-700 transition hover:text-primary"
                >
                  <Phone size={12} />
                  TEL: {partner.phone}
                  {partner.phoneNote && <span className="font-bold text-slate-400">（{partner.phoneNote}）</span>}
                </a>
              )}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {partner.url && (
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-primary px-3 py-2.5 text-center text-[11px] font-bold text-primary-foreground transition hover:opacity-90"
                  >
                    {partner.urlLabel ?? '企業サイトを見る'} <ArrowUpRight size={13} className="shrink-0" />
                  </a>
                )}
                {partner.subUrl && (
                  <a
                    href={partner.subUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 px-3 py-2.5 text-center text-[11px] font-black leading-tight text-sky-700 transition hover:bg-sky-100"
                  >
                    {partner.subUrlLabel ?? '関連サイトを見る'} <ArrowUpRight size={13} className="shrink-0" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
