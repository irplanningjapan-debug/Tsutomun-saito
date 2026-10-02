'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { contactGenres } from '@/lib/knot/data'
import { createClient } from '@/lib/supabase/client'
import { LegalConsentCheckbox } from '@/components/knot/modals/legal-consent-checkbox'

export function LegalModal() {
  const { legalModal, setLegalModal, closeContact, contactSent, setContactSent, contactGenre, setContactGenre, isLoggedIn, organizationProfile } = useKnot()
  const [applicantName, setApplicantName] = useState('')
  const [companyOrOrg, setCompanyOrOrg] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showAgreementError, setShowAgreementError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (legalModal === 'contact' && isLoggedIn && organizationProfile) {
      setApplicantName(organizationProfile.contactName || organizationProfile.name || '')
      setCompanyOrOrg(organizationProfile.name || '')
      setEmail(organizationProfile.contactEmail || organizationProfile.email || '')
      setPhone(organizationProfile.contactPhone || organizationProfile.phone || '')
    }
  }, [legalModal, isLoggedIn, organizationProfile])

  if (!legalModal) return null

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!agreedToTerms) {
      setShowAgreementError(true)
      return
    }
    setShowAgreementError(false)
    setSubmitError('')
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('inquiries').insert({
      applicant_name: applicantName,
      company_or_org: companyOrOrg || null,
      email,
      phone: phone || null,
      inquiry_type: contactGenre,
      message,
    })
    setSubmitting(false)
    if (error) {
      console.log('[v0] Failed to insert inquiry:', error.message)
      setSubmitError('送信に失敗しました。時間をおいて再度お試しください。')
      return
    }

    try {
      await fetch('/api/notify/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName,
          companyOrOrg,
          email,
          phone,
          inquiryType: contactGenre,
          message,
        }),
      })
    } catch (notifyError) {
      console.log('[v0] Failed to send contact notification emails:', notifyError)
    }

    setApplicantName('')
    setCompanyOrOrg('')
    setEmail('')
    setPhone('')
    setMessage('')
    setAgreedToTerms(false)
    setContactSent(true)
  }

  const dismiss = () => (legalModal === 'contact' ? closeContact() : setLegalModal(null))

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={dismiss}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-primary">KNOT / Tameni</p>
            <h2 className="mt-1 text-2xl font-black">{legalModal === 'contact' ? '運営窓口・お問い合わせ' : legalModal === 'privacy' ? 'プライバシーポリシー' : '利用規約'}</h2>
          </div>
          <button onClick={dismiss} aria-label="モーダルを閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        {legalModal === 'contact' ? (
          contactSent ? (
            <div className="py-12 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={26} /></div>
              <h3 className="mt-5 text-xl font-black">ご依頼・お問い合わせを受け付けました</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                受付確認メールをお送りしました。万一メールが届かない場合は、入力されたメールアドレスに誤りがある可能性がございますのでご確認ください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="mt-7 space-y-4">
              <input
                required
                placeholder="お名前"
                value={applicantName}
                onChange={(event) => setApplicantName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                placeholder="会社・団体名（任意）"
                value={companyOrOrg}
                onChange={(event) => setCompanyOrOrg(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                required
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                type="tel"
                placeholder="ご連絡先電話番号（携帯等）"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <div>
                <p className="mb-2 text-xs font-black text-slate-500">お問い合わせの種別を選択</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {contactGenres.map((genre) => (
                    <button
                      type="button"
                      key={genre}
                      onClick={() => setContactGenre(genre)}
                      aria-pressed={contactGenre === genre}
                      className={`rounded-xl border px-3 py-2.5 text-left text-xs font-black transition ${contactGenre === genre ? 'border-[#1d82f5] bg-[#1d82f5] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#1d82f5] hover:text-[#1d82f5]'}`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                rows={5}
                placeholder="ご依頼・お問い合わせ内容"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-800">KNOTでは常に最新の情報を届けるため、期限切れ・休止中の活動を自動整理しています。</div>
              <LegalConsentCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} showError={showAgreementError} />
              {submitError ? <p className="text-xs font-bold text-red-600">{submitError}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
              >
                {submitting ? '送信中…' : 'KNOT運営事務局へ送信する'}
              </button>
            </form>
          )
        ) : legalModal === 'privacy' ? (
          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-600">
            <p>株式会社Tameni（以下「当運営」）は、地域マッチングプラットフォーム「KNOT」（以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシー（個人情報保護方針）を定めます。</p>
            <div>
              <h3 className="font-black text-slate-900">第1条（個人情報の取得）</h3>
              <p>当運営は、会員登録、活動掲載依頼、お問い合わせの受付時等において、適法かつ公正な手段によって氏名、メールアドレス、電話番号、所属団体名等の個人情報を取得します。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第2条（利用目的）</h3>
              <p>取得した個人情報は、以下の目的で利用します。</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>本サービスの提供、本人確認、マッチングおよび連絡のため</li>
                <li>お問い合わせ・掲載依頼への回答およびサポート対応のため</li>
                <li>サービス改善、新機能のお知らせ、重要なお知らせの配信のため</li>
              </ol>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第3条（個人情報の第三者提供）</h3>
              <p>当運営は、法令に基づく場合を除き、ユーザーの同意を得ることなく個人情報を第三者に提供しません。ただし、マッチング成立に伴い、参加希望先団体へ連絡に必要な範囲で共有される場合があります。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第4条（安全管理措置）</h3>
              <p>当運営は、個人情報の漏洩、滅失または毀損の防止その他の安全管理のために、適切なセキュリティ対策を講じます。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第5条（お問い合わせ窓口）</h3>
              <p>個人情報の取扱いに関するお問い合わせは、本サービス内のお問い合わせフォーム、または下記窓口よりご連絡ください。</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>運営事業者：株式会社Tameni（KNOT運営事務局）</li>
                <li>連絡先：info@tamenijapan.com</li>
              </ul>
              <p className="mt-2 text-xs text-slate-400">（※システム自動送信メールアドレスへの直接の返信は受付できません）</p>
            </div>
            <p className="text-xs text-slate-400">2026年9月21日 制定</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-600">
            <div>
              <h3 className="font-black text-slate-900">第1条（目的・本サービスの内容）</h3>
              <p>本規約は、株式会社Tameni（以下「当運営」）が提供する地域マッチングプラットフォーム「KNOT」（以下「本サービス」）の利用条件を定めるものです。本サービスは、宮崎県内の地域活動、体験、情報提供および参加者同士のつながりを支援することを目的としています。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第2条（ユーザーの責任とマッチング）</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>ユーザーは、自己の責任において本サービスを利用し、他のユーザーまたは掲載団体との間で生じる連絡、契約、トラブル等について自ら解決するものとします。</li>
                <li>当運営は、マッチング成立後の活動現地での事故、怪我、トラブル、金銭の授受に関して、当運営に故意または重大な過失がある場合を除き、一切の責任を負いません。</li>
              </ol>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第3条（禁止事項）</h3>
              <p>ユーザーは以下の行為を行ってはなりません。</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>虚偽または誤解を招く情報の登録・投稿</li>
                <li>法令または公序良俗に反する行為</li>
                <li>他のユーザー、第三者または当運営の権利・名誉を侵害する行為</li>
                <li>政治活動、宗教活動、その他本来の目的から逸脱した宣伝・勧誘行為</li>
                <li>不正アクセスやサーバーに過度な負荷をかける行為</li>
              </ul>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第4条（掲載情報の審査・削除）</h3>
              <p>当運営は、投稿された活動、サポート情報、商品情報等が不適切と判断した場合、事前の通知なく非表示または削除できるものとします。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第5条（サービスの変更・中断・免責）</h3>
              <p>天災、システム保守、通信障害等により、事前の予告なくサービスを一時停止または変更することがあります。これによって生じた損害について当運営は責任を負いません。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第6条（規約の改定）</h3>
              <p>当運営は、必要と判断した場合には本規約を変更できるものとし、サイト上に掲示した時点で効力を生じるものとします。</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">第7条（お問い合わせ窓口）</h3>
              <p>本規約に関するお問い合わせは、本サービス内のお問い合わせフォーム、または下記窓口までご連絡ください。</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>運営事業者：株式会社Tameni（KNOT運営事務局）</li>
                <li>連絡先：info@tamenijapan.com</li>
              </ul>
              <p className="mt-2 text-xs text-slate-400">（※システム自動送信メールアドレスへの直接の返信は受付できません）</p>
            </div>
            <p className="text-xs text-slate-400">2026年9月21日 制定</p>
          </div>
        )}
      </div>
    </div>
  )
}
