'use client'

import { useState, type ReactNode } from 'react'
import { ArrowUpRight, Phone, X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { allMunicipalities, formatDeadlineDateTime, type AdminSupportEntry, type AdminSupportGenre } from '@/lib/knot/data'
import { ShareBoardPanel } from './share-board-modal'

// 「すべて」＋西都市内全エリア（管理画面のサポート情報登録フォームと同じ一覧）＋広域・オンライン
// 情報向けの選択肢。DBの `municipality` が未設定の場合は 'その他' にフォールバックしている
// (mapDbSupportLinkToAdminSupportEntry) ため、'市全域/オンライン' の絞り込みではその両方を対象にする。
const municipalityFilters = ['すべて', ...allMunicipalities.filter((place) => place !== 'その他'), '市全域/オンライン']

function matchesMunicipalityFilter(entry: AdminSupportEntry, selected: string): boolean {
  if (selected === 'すべて') return true
  if (selected === '市全域/オンライン') return entry.municipality === '市全域/オンライン' || entry.municipality === 'その他'
  return entry.municipality === selected
}

// 選択中のジャンルには情報があるが、選んだエリアに一致するものが無い場合の優しい案内。
// ジャンルに1件も登録が無い場合は呼び出し側の既存メッセージ（まだ登録された情報がありません）を使う。
function MunicipalityEmptyState({ selectedMunicipality }: { selectedMunicipality: string }) {
  return (
    <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-4 py-6 text-center text-sm leading-6 text-slate-500">
      {selectedMunicipality === '市全域/オンライン' ? '市全域/オンライン' : `${selectedMunicipality}`}の情報はまだ登録されていません。おすすめの情報があればぜひ下部のボタンから推薦・掲載依頼をお願いします！
    </p>
  )
}

const tabs = [
  { id: 'medical', emoji: '🏥', label: '医療・休日当番医・ケア' },
  { id: 'facility', emoji: '🏟', label: '施設・練習場所' },
  { id: 'catering', emoji: '🍱', label: '仕出し・お弁当' },
  { id: 'grant', emoji: '💰', label: '補助金・助成金' },
  { id: 'stay', emoji: '🏡', label: '宿泊・滞在・キャンプ' },
  { id: 'share', emoji: '🔄', label: 'ゆずりあい・貸し借り' },
] as const

// Maps each tab id to the genre value the admin dashboard's サポート情報・URL管理
// screen stores in `support_links.category`, so entries added/edited/deleted there
// appear here without any hardcoded duplicate list. The 'share' tab has no genre
// (it renders ShareBoardPanel instead), so it's typed as undefined there.
const genreByTab: Record<(typeof tabs)[number]['id'], AdminSupportGenre | undefined> = {
  medical: '医療・休日当番医',
  facility: '施設・練習場所',
  catering: '仕出し・お弁当',
  grant: '補助金・助成金',
  stay: '宿泊・滞在・キャンプ',
  share: undefined,
}

function cateringBadges(entry: AdminSupportEntry): string[] {
  const badges: string[] = []
  if (entry.reservationRequired) badges.push('要事前予約')
  else if (entry.deliveryAvailable) badges.push(entry.deliveryAvailable)
  if (entry.capacity) badges.push(`${entry.capacity}対応`)
  return badges
}

function grantDeadlineLabel(entry: AdminSupportEntry): string {
  if (entry.deadlineType === '随時受付') return '随時受付（予算枠まで）'
  return entry.deadlineDate ? formatDeadlineDateTime(entry.deadlineDate) : '締切日未定'
}

// Shared card used by every tab so a registered URL always opens the site in a
// new tab (via the card itself and an explicit link button) and a registered
// phone number is always tappable as a tel: link. Cards without a URL show no
// link button and don't get the pointer cursor, per the "no dead links" requirement.
function SupportEntryCard({ entry, badges, children }: { entry: AdminSupportEntry; badges?: ReactNode; children?: ReactNode }) {
  const hasUrl = Boolean(entry.url)
  const telHref = entry.phone ? `tel:${entry.phone.replace(/[^0-9+]/g, '')}` : undefined

  return (
    <div
      role={hasUrl ? 'link' : undefined}
      tabIndex={hasUrl ? 0 : undefined}
      onClick={hasUrl ? () => window.open(entry.url, '_blank', 'noopener,noreferrer') : undefined}
      onKeyDown={
        hasUrl
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                window.open(entry.url, '_blank', 'noopener,noreferrer')
              }
            }
          : undefined
      }
      className={`rounded-xl border border-slate-200 p-4 transition ${hasUrl ? 'cursor-pointer hover:border-primary hover:shadow-sm' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-black text-slate-900">{entry.name}</h3>
        {entry.municipality && entry.municipality !== 'その他' && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{entry.municipality}</span>
        )}
        {badges}
      </div>
      {entry.address && <p className="mt-1 text-xs leading-5 text-slate-500">{entry.address}</p>}
      {entry.comment && <p className="mt-2 text-xs leading-5 text-slate-500">{entry.comment}</p>}
      {children}
      {(telHref || hasUrl) && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {telHref && (
            <a
              href={telHref}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-black text-slate-600 hover:text-primary"
            >
              <Phone size={14} /> {entry.phone}
            </a>
          )}
          {hasUrl && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-black text-primary hover:underline"
            >
              公式ホームページを見る <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function SupportHubModal() {
  const { supportHubOpen, setSupportHubOpen, supportHubTab, setSupportHubTab, supportEntries, openContact } = useKnot()
  const [selectedMunicipality, setSelectedMunicipality] = useState('すべて')
  if (!supportHubOpen) return null

  // 「ゆずりあい・貸し借り」タブは支援リンク集（supportEntries）ではなく、独立した
  // share_items テーブルを扱うタブなので genreByTab には存在しない。他のタブと同じ
  // entriesForTab/filteredEntries の仕組みは使わないため、その場合は空配列にしておく。
  const genre = genreByTab[supportHubTab as (typeof tabs)[number]['id']] as AdminSupportGenre | undefined
  const entriesForTab = genre ? supportEntries.filter((entry) => entry.genre === genre) : []
  const filteredEntries = entriesForTab.filter((entry) => matchesMunicipalityFilter(entry, selectedMunicipality))

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={() => setSupportHubOpen(false)}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-primary">CONVENIENCE LEDGER</p>
            <h2 className="mt-1 text-2xl font-black">西都ワークサポート便利帳</h2>
            <p className="mt-1 text-sm text-slate-500">地域で仕事をするための「困りごと」を、ジャンル別にサポートします。</p>
          </div>
          <button onClick={() => setSupportHubOpen(false)} aria-label="モーダルを閉じる" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSupportHubTab(tab.id)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${supportHubTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:text-primary'}`}
            >
              <span className="mr-1.5">{tab.emoji}</span>{tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="shrink-0 text-[11px] font-black text-slate-400">市町村で絞り込み：</span>
          {municipalityFilters.map((place) => (
            <button
              key={place}
              onClick={() => setSelectedMunicipality(place)}
              aria-pressed={selectedMunicipality === place}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black transition ${
                selectedMunicipality === place
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary'
              }`}
            >
              {place}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {supportHubTab === 'medical' && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">
                活動中のケガや急な体調不良時の休日当番医情報に加え、日常の身体のケアやコンディション調整を支える地域の整骨院・整体院・治療院をまとめています。
              </p>
              {entriesForTab.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">まだ登録された情報がありません。</p>
              ) : filteredEntries.length === 0 ? (
                <MunicipalityEmptyState selectedMunicipality={selectedMunicipality} />
              ) : (
                <div className="space-y-2.5">
                  {filteredEntries.map((entry, index) => (
                    <SupportEntryCard key={entry.id ?? `${entry.name}-${index}`} entry={entry} />
                  ))}
                </div>
              )}
              <button
                onClick={() => openContact('🩺 医療・ケア機関の推薦/掲載', { fromHub: true })}
                className="w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground"
              >
                ＋ おすすめの整骨院・整体院・医療機関を推薦・掲載依頼する
              </button>
              <p className="text-center text-xs text-slate-400">ワークを支える治療院・整骨院のみなさまからの掲載依頼も歓迎しています。</p>
            </div>
          )}

          {supportHubTab === 'facility' && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">体育館・競技場・公民館などの予約窓口案内です。</p>
              {entriesForTab.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">まだ登録された情報がありません。</p>
              ) : filteredEntries.length === 0 ? (
                <MunicipalityEmptyState selectedMunicipality={selectedMunicipality} />
              ) : (
                <div className="space-y-2.5">
                  {filteredEntries.map((entry, index) => (
                    <SupportEntryCard key={entry.id ?? `${entry.name}-${index}`} entry={entry} />
                  ))}
                </div>
              )}
              <button onClick={() => openContact('🏟️ 施設・練習場所の推薦/掲載', { fromHub: true })} className="w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground">
                施設・練習場所の推薦・掲載依頼
              </button>
            </div>
          )}

          {supportHubTab === 'catering' && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">合宿・大会・イベント時の配達弁当や仕出しの手配サポート。</p>
              {entriesForTab.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">まだ登録された情報がありません。</p>
              ) : filteredEntries.length === 0 ? (
                <MunicipalityEmptyState selectedMunicipality={selectedMunicipality} />
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => (
                    <SupportEntryCard
                      key={entry.id ?? `${entry.name}-${index}`}
                      entry={entry}
                      badges={cateringBadges(entry).map((badge) => (
                        <span key={badge} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800">{badge}</span>
                      ))}
                    />
                  ))}
                </div>
              )}
              <button onClick={() => openContact('🍱 お弁当・仕出しの推薦/掲載', { fromHub: true })} className="w-full rounded-full bg-primary py-3 text-sm font-black text-primary-foreground">
                おすすめのお弁当屋さんを推薦・掲載する
              </button>
            </div>
          )}

          {supportHubTab === 'grant' && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">地域サークルや任意団体でも申請可能な助成金情報。</p>
              <button
                onClick={() => openContact('💰 助成金・補助金情報の掲載依頼（行政・支援団体の方へ）', { fromHub: true })}
                className="w-full rounded-full border-2 border-primary bg-white py-3 text-sm font-black text-primary hover:bg-primary/5"
              >
                ＋ 助成金・補助金情報の掲載依頼（行政・支援団体の方へ）
              </button>
              {entriesForTab.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">まだ登録された情報がありません。</p>
              ) : filteredEntries.length === 0 ? (
                <MunicipalityEmptyState selectedMunicipality={selectedMunicipality} />
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => (
                    <SupportEntryCard
                      key={entry.id ?? `${entry.name}-${index}`}
                      entry={entry}
                      badges={
                        <>
                          {entry.grantField && <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-black text-sky-700">{entry.grantField}</span>}
                          {entry.grantAmount && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">{entry.grantAmount}</span>}
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700">{grantDeadlineLabel(entry)}</span>
                        </>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {supportHubTab === 'stay' && (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-slate-600">体験・ワークでの滞在拠点（格安民宿・公民館宿泊・指定野営キャンプ場）。</p>
              {entriesForTab.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">まだ登録された情報がありません。</p>
              ) : filteredEntries.length === 0 ? (
                <MunicipalityEmptyState selectedMunicipality={selectedMunicipality} />
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry, index) => (
                    <SupportEntryCard key={entry.id ?? `${entry.name}-${index}`} entry={entry} />
                  ))}
                </div>
              )}
              <button onClick={() => openContact('🏡 宿泊・滞在の推薦/掲載', { fromHub: true })} className="w-full rounded-full bg-[#1d82f5] py-3 text-sm font-black text-white">
                宿泊・滞在先を推薦・掲載する
              </button>
            </div>
          )}

          {supportHubTab === 'share' && <ShareBoardPanel />}
        </div>
      </div>
    </div>
  )
}
