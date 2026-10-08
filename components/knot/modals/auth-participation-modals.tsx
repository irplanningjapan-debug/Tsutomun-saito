'use client'

import { useState } from 'react'
import { Calendar, CheckCircle2, Eye, EyeOff, LogIn, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { formatEventDateTime, genres, memberTypeOptions, volunteerIntentOptions } from '@/lib/knot/data'
import { BirthdateSelect } from '@/components/knot/modals/birthdate-select'
import { LegalConsentCheckbox } from '@/components/knot/modals/legal-consent-checkbox'
import { LegalConsentCheckbox } from '@/components/knot/modals/legal-consent-checkbox'
import { createClient } from '@/lib/supabase/client'
function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

const genderOptions = [
  { value: '', label: '未回答' },
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
] as const

export function AuthModal() {
  const {
    authModal, setAuthModal, authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authSubmitting, authError, setAuthError,
    signUpWithEmail, signInWithEmail, completeLogin,
    authView, setAuthView, resetEmail, setResetEmail, resetSent, setResetSent,
    resetSubmitting, resetError, setResetError, requestPasswordReset,
    organizationProfile, setOrganizationProfile, setViewMode,
  } = useKnot()
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showAgreementError, setShowAgreementError] = useState(false)
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  if (!authModal) return null

  const isOrganization = organizationProfile.accountKind === 'organization'
  const includesSupporterType = organizationProfile.memberTypes.includes('サポーター（指導者・ボランティア）')

  const switchMode = (mode: typeof authMode) => {
    setAuthMode(mode)
    setAuthView('form')
    setAuthError('')
  }

  const backToLogin = () => {
    setAuthView('form')
    setResetSent(false)
    setResetError('')
    setResetEmail('')
  }

  const closeOrgSignupNotice = () => {
    setAuthModal(false)
    setAuthView('form')
    setViewMode('home')
  }
const signInWithGoogle = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        alert('Googleログインエラー: ' + error.message)
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + (err?.message || err))
    }
  }
  if (authView === 'emailConfirmPending') {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
        <div role="dialog" aria-modal="true" aria-labelledby="email-confirm-pending-title" className="w-full max-w-md rounded-t-3xl bg-white p-6 text-center shadow-2xl sm:rounded-3xl sm:p-8">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={28} /></div>
          <h2 id="email-confirm-pending-title" className="mt-5 text-xl font-black">確認メールを送信しました</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            ご入力いただいたメールアドレスに確認メールをお送りしました。メール内のリンクをクリックすると登録が完了します。
          </p>
          <button onClick={closeOrgSignupNotice} className="mt-7 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground">
            確認してトップへ戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" onClick={() => setAuthModal(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black text-primary">KNOT ACCOUNT</p>
            <h2 id="auth-title" className="mt-1 text-2xl font-black">{authView === 'reset' ? 'パスワード再設定' : 'ログイン / 新規登録'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {authView === 'reset' ? 'ご登録のメールアドレスを入力してください。再設定用リンクをお送りします。' : '個人（サポーター・一般参加者）または団体（主催者・パートナー企業）としてご登録いただけます。'}
            </p>
          </div>
          <button onClick={() => setAuthModal(false)} aria-label="ログインモーダルを閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        {authView === 'reset' ? (
          resetSent ? (
            <div className="mt-8 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={26} /></div>
              <h3 className="mt-5 text-lg font-black">再設定リンクを送信しました</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{resetEmail || 'ご登録のメールアドレス'} 宛にパスワード再設定用のご案内をお送りしました。メール内のリンクから新しいパスワードを設定してください。</p>
              <button onClick={backToLogin} className="mt-6 text-sm font-black text-primary underline underline-offset-4">ログイン画面に戻る</button>
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); requestPasswordReset() }} className="mt-6 space-y-4">
              {resetError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{resetError}</p>}
              <input type="email" required value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="メールアドレス" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
              <button type="submit" disabled={resetSubmitting} className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60">
                {resetSubmitting ? '送信中…' : '再設定メールを送信する'}
              </button>
              <button type="button" onClick={backToLogin} className="w-full text-center text-sm font-black text-slate-500 hover:text-primary">ログイン画面に戻る</button>
            </form>
          )
        ) : (
          <>
            <div className="mt-6 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-xs font-black">
              <button onClick={() => switchMode('login')} className={`rounded-lg px-2 py-2 ${authMode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>ログイン</button>
              <button onClick={() => switchMode('signup')} className={`rounded-lg px-2 py-2 ${authMode === 'signup' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>新規登録</button>
              <button onClick={() => switchMode('google')} className={`rounded-lg px-2 py-2 ${authMode === 'google' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Google</button>
            </div>
            {authMode === 'google' ? (
              <button onClick={signInWithGoogle} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
  <LogIn size={17} />Googleでログイン
</button>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (authMode === 'signup') {
                    if (!agreedToTerms) {
                      setShowAgreementError(true)
                      return
                    }
                    setShowAgreementError(false)
                    signUpWithEmail()
                  } else {
                    signInWithEmail()
                  }
                }}
                className="mt-6 space-y-4"
              >
                {authError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{authError}</p>}
                <input type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="メールアドレス" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary" />
                <div>
                  <div className="relative">
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="パスワード（6文字以上）"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((current) => !current)}
                      aria-label={showAuthPassword ? 'パスワードを非表示にする' : 'パスワードを表示する'}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
                    >
                      {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {authMode === 'login' && (
                    <button type="button" onClick={() => setAuthView('reset')} className="mt-2 text-xs font-bold text-primary underline underline-offset-4">
                      パスワードをお忘れの方はこちら
                    </button>
                  )}
                </div>
                {authMode === 'signup' && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div>
                      <p className="mb-2 text-xs font-black text-slate-600">登録区分</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['individual', 'organization'] as const).map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => setOrganizationProfile((current) => ({ ...current, accountKind: kind }))}
                            className={`rounded-lg py-2 text-xs font-black ${organizationProfile.accountKind === kind ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-500'}`}
                          >
                            {kind === 'individual' ? '個人として登録' : '団体として登録'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block text-xs font-black text-slate-600">
                      {isOrganization ? '団体名・企業名' : 'お名前（漢字）'}
                      <input
                        required
                        value={organizationProfile.name}
                        onChange={(event) => setOrganizationProfile((current) => ({ ...current, name: event.target.value }))}
                        placeholder={isOrganization ? '例：西米良神楽保存会' : '例：宮崎 花子'}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                      />
                    </label>
                    <label className="block text-xs font-black text-slate-600">
                      {isOrganization ? '団体名（よみ・フリガナ）' : 'フリガナ'}
                      <input
                        value={organizationProfile.kana}
                        onChange={(event) => setOrganizationProfile((current) => ({ ...current, kana: event.target.value }))}
                        placeholder={isOrganization ? '例：ニシメラカグラホゾンカイ' : '例：ミヤザキ ハナコ'}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                      />
                    </label>
                    {isOrganization ? (
                      <>
                        <label className="block text-xs font-black text-slate-600">
                          代表電話番号
                          <input
                            type="tel"
                            value={organizationProfile.phone}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, phone: event.target.value }))}
                            placeholder="例：0985-00-0000"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block text-xs font-black text-slate-600">
                          団体の所在地・住所
                          <textarea
                            value={organizationProfile.address}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, address: event.target.value }))}
                            placeholder="例：宮崎県宮崎市橘通西1-1-1"
                            rows={2}
                            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal leading-relaxed outline-none focus:border-primary"
                          />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-xs font-black text-slate-600">
                            ご担当者氏名
                            <input
                              value={organizationProfile.contactName}
                              onChange={(event) => setOrganizationProfile((current) => ({ ...current, contactName: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                            />
                          </label>
                          <label className="block text-xs font-black text-slate-600">
                            担当者携帯番号
                            <input
                              type="tel"
                              value={organizationProfile.contactPhone}
                              onChange={(event) => setOrganizationProfile((current) => ({ ...current, contactPhone: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                            />
                          </label>
                        </div>
                        <label className="block text-xs font-black text-slate-600">
                          ご担当者メールアドレス
                          <input
                            type="email"
                            value={organizationProfile.contactEmail}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, contactEmail: event.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                          />
                        </label>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-xs font-black text-slate-600">
                            公式HP URL（任意）
                            <input
                              value={organizationProfile.website}
                              onChange={(event) => setOrganizationProfile((current) => ({ ...current, website: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                            />
                          </label>
                          <label className="block text-xs font-black text-slate-600">
                            公式SNS URL（任意）
                            <input
                              value={organizationProfile.social}
                              onChange={(event) => setOrganizationProfile((current) => ({ ...current, social: event.target.value }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                            />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-xs font-black text-slate-600">
                            生年月日
                            <BirthdateSelect
                              value={organizationProfile.birthdate}
                              onChange={(next) => setOrganizationProfile((current) => ({ ...current, birthdate: next }))}
                            />
                          </label>
                          <label className="block text-xs font-black text-slate-600">
                            性別
                            <select
                              value={organizationProfile.gender}
                              onChange={(event) => setOrganizationProfile((current) => ({ ...current, gender: event.target.value as typeof current.gender }))}
                              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                            >
                              {genderOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label className="block text-xs font-black text-slate-600">
                          電話番号（任意）
                          <input
                            type="tel"
                            value={organizationProfile.phone}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, phone: event.target.value }))}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal outline-none focus:border-primary"
                          />
                        </label>
                        <label className="block text-xs font-black text-slate-600">
                          お住まいの地域・住所（任意）
                          <textarea
                            value={organizationProfile.address}
                            onChange={(event) => setOrganizationProfile((current) => ({ ...current, address: event.target.value }))}
                            placeholder="例：宮崎県宮崎市橘通西1-1-1"
                            rows={2}
                            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal leading-relaxed outline-none focus:border-primary"
                          />
                        </label>
                      </>
                    )}
                    <div>
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
                    {includesSupporterType && (
                      <>
                        <div>
                          <p className="mb-2 text-xs font-black text-slate-600">ボランティア・サポーターとしての希望（複数選択可）</p>
                          <div className="flex flex-wrap gap-2">
                            {volunteerIntentOptions.map((option) => (
                              <label key={option} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${organizationProfile.volunteerIntent.includes(option) ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>
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
                              <label key={genre.label} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${organizationProfile.interestGenres.includes(genre.label) ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>
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
                            placeholder="例：小学校で10年間サッカー指導をしていました。土日の午前中に参加できます。"
                            className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-normal leading-6 outline-none focus:border-primary"
                          />
                        </label>
                      </>
                    )}
                  </div>
                )}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-800">KNOTでは常に最新の情報を届けるため、期限切れ・休止中の活動を自動整理しています。</div>
                {authMode === 'signup' && (
                  <LegalConsentCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} showError={showAgreementError} />
                )}
                <button type="submit" disabled={authSubmitting} className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60">
                  {authSubmitting ? '処理中…' : authMode === 'signup' ? 'アカウントを作成する' : 'メールアドレスでログイン'}
                </button>
                <button type="button" onClick={() => switchMode('google')} className="w-full rounded-xl border border-slate-200 py-3.5 text-sm font-black text-slate-700">Googleでログイン</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function ParticipationModal() {
  const {
  selectedParticipation, setSelectedParticipation, participationSent,
  participationForm, updateParticipationForm, participationSubmitting, participationSendError,
  submitParticipation, submittedOrganizerContact,
  } = useKnot()
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showAgreementError, setShowAgreementError] = useState(false)
  if (!selectedParticipation) return null

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={() => setSelectedParticipation(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="participation-title" onClick={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">JOIN ACTIVITY</p>
            <h2 id="participation-title" className="mt-1 text-xl font-black">参加申込・問い合わせ</h2>
          </div>
          <button onClick={() => setSelectedParticipation(null)} aria-label="参加申込フォームを閉じる" className="grid size-9 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>
        {participationSent ? (
          <div className="px-6 py-12 text-center sm:py-16">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={32} /></div>
            <h3 className="mt-6 text-2xl font-black">お申し込み・お問い合わせを受け付けました</h3>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500">
              {participationForm.applicantEmail || 'ご入力いただいたメールアドレス'} 宛に、受付確認メール（自動送信）をお送りしました。
            </p>
  <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">内容確認後、2〜3日中に主催者（{submittedOrganizerContact.orgName}）より詳細のご連絡を差し上げますので、しばらくお待ちください。</p>
  <div className="mx-auto mt-6 max-w-md rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-600">
  <p className="font-black text-slate-900">{submittedOrganizerContact.orgName}</p>
  {submittedOrganizerContact.contactName && <p className="mt-1">担当：{submittedOrganizerContact.contactName}</p>}
  <p className="mt-1">
  お急ぎのお問い合わせ：{submittedOrganizerContact.phone || '－'} / {submittedOrganizerContact.email || '－'}
  </p>
  </div>
            <button onClick={() => setSelectedParticipation(null)} className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground">トップ画面へ戻る</button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!agreedToTerms) {
                setShowAgreementError(true)
                return
              }
              setShowAgreementError(false)
              submitParticipation()
            }}
            className="space-y-6 px-6 py-7"
          >
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-black text-primary">申込先の活動</p>
              <p className="mt-1 font-black text-slate-900">{selectedParticipation.title}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{selectedParticipation.area} / {formatEventDateTime(selectedParticipation.date)}</p>
            </div>
            {participationSendError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{participationSendError}</p>}
            <fieldset className="space-y-3">
              <legend className="text-base font-black">申込者（保護者）情報</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  placeholder="お名前"
                  value={participationForm.applicantName}
                  onChange={(event) => updateParticipationForm('applicantName', event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <input
                  required
                  placeholder="フリガナ"
                  value={participationForm.applicantKana}
                  onChange={(event) => updateParticipationForm('applicantKana', event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  required
                  type="email"
                  placeholder="メールアドレス"
                  value={participationForm.applicantEmail}
                  onChange={(event) => updateParticipationForm('applicantEmail', event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <input
                  required
                  type="tel"
                  placeholder="電話番号"
                  value={participationForm.applicantPhone}
                  onChange={(event) => updateParticipationForm('applicantPhone', event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-base font-black">参加する方について</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  required
                  value={participationForm.groupSize}
                  onChange={(event) => updateParticipationForm('groupSize', event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                >
                  <option value="" disabled>参加人数 / 組数を選択</option>
                  {['1組', '2組', '3組', '4組', '5組', '1名', '2名', '3名', '4名', '5名', '6名', '7名', '8名', '9名', '10名'].map((option) => <option key={option}>{option}</option>)}
                </select>
                <input
                  required
                  placeholder="内訳・参加者の年代・学年（例：大人2名、小学2年生1名、年長1名）"
                  value={participationForm.participantBreakdown}
                  onChange={(event) => updateParticipationForm('participantBreakdown', event.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <p className="text-xs leading-5 text-slate-500">ご家族や複数人で参加される場合は、それぞれの年代・学年をご記入ください</p>
            </fieldset>
            {selectedParticipation.listingType === 'event' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-400 text-slate-900"><Calendar size={14} /></span>
                  <p className="font-black text-slate-900">イベント参加情報</p>
                </div>
                <p className="mt-2">参加希望日時：{formatEventDateTime(selectedParticipation.date)}</p>
                <p className="mt-1">参加費：{selectedParticipation.fee || '主催者へ確認'}</p>
              </div>
            )}
            <div>
              <label className="text-base font-black">質問・事前に伝えておきたいこと</label>
              <textarea
                rows={5}
                placeholder="見学のみ希望です。全くの初心者ですが参加できますか？"
                value={participationForm.question}
                onChange={(event) => updateParticipationForm('question', event.target.value)}
                className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-primary"
              />
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold leading-5 text-emerald-800">KNOTでは常に最新の情報を届けるため、期限切れ・休止中の活動を自動整理しています。</div>
            <LegalConsentCheckbox checked={agreedToTerms} onChange={setAgreedToTerms} showError={showAgreementError} />
            <button
              type="submit"
              disabled={participationSubmitting}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
            >
              {participationSubmitting ? '送信中…' : '主催者へ申し込む（問い合わせる）'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
