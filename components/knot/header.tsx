'use client'

import { LogOut, Menu, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'

export function Header() {
  const {
    menuOpen, setMenuOpen, isLoggedIn, organizationProfile, setMyPageOpen, openAuth, openRegistration, openContact, setViewMode, setSupportHubOpen, signOut,
  } = useKnot()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label="みやざき KNOT ホーム">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-xl font-black text-primary-foreground shadow-sm">K</span>
          <span>
            <span className="block text-[10px] font-bold leading-none text-primary">みやざき</span>
            <span className="text-xl font-black tracking-tight">KNOT</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex">
          <a href="#activities" className="hover:text-primary">活動を探す</a>
          <button onClick={() => setViewMode('map')} className="hover:text-primary">マップ</button>
          <a href="#genres" className="hover:text-primary">ジャンルから探す</a>
          <a href="#how" className="hover:text-primary">KNOTとは</a>
          <button onClick={() => setSupportHubOpen(true)} className="hover:text-primary">サポート情報</button>
          <button onClick={() => openContact('その他')} className="hover:text-primary">お問い合わせ・ご依頼</button>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <button onClick={() => (isLoggedIn ? setMyPageOpen(true) : openAuth())} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-primary">
            {isLoggedIn ? (organizationProfile.name ? `マイページ（${organizationProfile.name}）` : 'マイページ') : 'ログイン'}
          </button>
          {isLoggedIn && (
            <button onClick={() => signOut()} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-primary" aria-label="ログアウト">
              <LogOut size={14} />ログアウト
            </button>
          )}
          <button onClick={openRegistration} className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm">活動・イベントを掲載する</button>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg p-2 md:hidden" aria-label="メニュー">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <a href="#activities" onClick={() => setMenuOpen(false)}>活動を探す</a>
            <button className="text-left" onClick={() => { setViewMode('map'); setMenuOpen(false) }}>マップ</button>
            <a href="#genres" onClick={() => setMenuOpen(false)}>ジャンルから探す</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>KNOTとは</a>
            <button className="text-left" onClick={() => { setMenuOpen(false); setSupportHubOpen(true) }}>サポート情報</button>
            <button className="text-left" onClick={() => { setMenuOpen(false); openContact('その他') }}>お問い合わせ・ご依頼</button>
            <button className="text-left text-primary" onClick={() => { setMenuOpen(false); openRegistration() }}>活動・イベントを掲載する →</button>
            {isLoggedIn ? (
              <>
                <button className="text-left" onClick={() => { setMenuOpen(false); setMyPageOpen(true) }}>
                  {organizationProfile.name ? `マイページ（${organizationProfile.name}）` : 'マイページ'}
                </button>
                <button className="flex items-center gap-1.5 text-left text-muted-foreground" onClick={() => { setMenuOpen(false); signOut() }}>
                  <LogOut size={14} />ログアウト
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                <button className="flex-1 rounded-full border border-slate-200 px-5 py-2.5 text-center font-bold" onClick={() => { setMenuOpen(false); openAuth('login') }}>ログイン</button>
                <button className="flex-1 rounded-full bg-primary px-5 py-2.5 text-center font-bold text-primary-foreground" onClick={() => { setMenuOpen(false); openAuth('signup') }}>新規登録</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
