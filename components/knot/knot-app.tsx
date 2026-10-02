'use client'

import { useEffect, useRef } from 'react'
import { KnotProvider, useKnot } from '@/lib/knot/store'
import { Header } from './header'
import { HeroSection } from './hero-section'
import { BulletinBoardSection } from './bulletin-board-section'
import { SupportInfoSection } from './support-info-section'
import { MapSection } from './map-section'
import { EventsSection } from './events-section'
import { GenresSection } from './genres-section'
import { BrowseSection } from './browse-section'
import { ActivitiesSection } from './activities-section'
import { ShopSection } from './shop-section'
import { RecruitSection, HowSection } from './recruit-how-section'
import { FaqSection, ContactFooterSection } from './faq-footer-section'
import { PartnersSection } from './partners-section'
import { ModalsRoot } from './modals/modals-root'

function KnotAppContent() {
  const { viewMode, allActivities, setSelectedActivity, setSelectedEvent, openAuth, setSupportHubOpen } = useKnot()
  const deepLinkHandled = useRef(false)
  const authDeepLinkHandled = useRef(false)
  const supportHubDeepLinkHandled = useRef(false)

  useEffect(() => {
    if (deepLinkHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const sharedTitle = params.get('activity')
    if (!sharedTitle) return
    const matched = allActivities.find((item) => item.title === sharedTitle)
    if (matched) {
      deepLinkHandled.current = true
      if (matched.listingType === 'event') {
        setSelectedEvent(matched)
      } else {
        setSelectedActivity(matched)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allActivities])

  // Lets other pages (e.g. /auth/update-password after a successful password change)
  // redirect back here with ?auth=login to auto-open the login modal.
  useEffect(() => {
    if (authDeepLinkHandled.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') !== 'login') return
    authDeepLinkHandled.current = true
    openAuth('login')
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    window.history.replaceState(null, '', url.toString())
  }, [openAuth])

  // LINEリッチメニューや外部リンクから ?modal=support 付きでトップページに来た場合、
  // 読み込み完了時に「西都の体験・ワークサポート便利帳」モーダルを自動的に開く。
  useEffect(() => {
    if (supportHubDeepLinkHandled.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('modal') !== 'support') return
    supportHubDeepLinkHandled.current = true
    setSupportHubOpen(true)
    const url = new URL(window.location.href)
    url.searchParams.delete('modal')
    window.history.replaceState(null, '', url.toString())
  }, [setSupportHubOpen])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      {viewMode === 'map' ? (
        <MapSection />
      ) : (
        <>
          <HeroSection />
          <BulletinBoardSection />
          <SupportInfoSection />
          <EventsSection />
          <GenresSection />
          <BrowseSection />
          <ActivitiesSection />
          <ShopSection />
          <RecruitSection />
          <HowSection />
          <FaqSection />
          <PartnersSection />
          <ContactFooterSection />
        </>
      )}
      <ModalsRoot />
    </main>
  )
}

export function KnotApp() {
  return (
    <KnotProvider>
      <KnotAppContent />
    </KnotProvider>
  )
}
