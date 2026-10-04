'use client'

import { Mail, Plus } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import type { ShareItem, ShareItemType } from '@/lib/knot/types'

const typeFilters: (ShareItemType | 'すべて')[] = ['すべて', '貸します', '借りたい', '譲ります', '探してます']

const typeBadgeStyle: Record<ShareItemType, string> = {
  貸します: 'bg-sky-100 text-sky-700',
  借りたい: 'bg-amber-100 text-amber-700',
  譲ります: 'bg-emerald-100 text-emerald-700',
  探してます: 'bg-violet-100 text-violet-700',
}

function ShareItemCard({ item }: { item: ShareItem }) {
  const { openShareContactModal } = useKnot()
  const isResolved = item.status === '解決済み・終了'

  return (
    <div className={`rounded-2xl border p-4 ${isResolved ? 'border-slate-200 bg-slate-50 opacity-70' : 'border-slate-200 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${typeBadgeStyle[item.type]}`}>{item.type}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{item.municipality}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{item.priceType}</span>
        {isResolved && <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-600">解決済み・終了</span>}
      </div>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl || '/placeholder.svg'} alt={item.title} className="mt-3 h-40 w-full rounded-xl object-cover" />
      )}
      <h3 className="mt-3 font-black text-slate-900">{item.title}</h3>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.description}</p>

      {!isResolved && (
        <button
          onClick={() => openShareContactModal(item)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground"
        >
          <Mail size={14} /> 問い合わせる
        </button>
      )}
    </div>
  )
}

// 「宮崎の活動サポート便利帳」モーダルの「ゆずりあい・貸し借り」タブの中に直接埋め込む
// パネル（独自のオーバーレイ・開閉状態を持たない）。以前は単独モーダルだったが、導線を
// サポート便利帳モーダルに統合したため、タブ切り替えで表示するだけのコンテンツに変更した。
export function ShareBoardPanel() {
  const {
    shareItems,
    shareItemsLoading,
    shareBoardTypeFilter,
    setShareBoardTypeFilter,
    openShareItemForm,
    organizationProfile,
  } = useKnot()

  const currentUserId = organizationProfile.id
  const publicItems = shareItems.filter((item) => item.status === '受付中')
  const filteredItems = publicItems.filter((item) => shareBoardTypeFilter === 'すべて' || item.type === shareBoardTypeFilter)

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">体験・ワークで使う道具や備品を、地域のみんなで貸し借り・譲り合いしませんか。</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {typeFilters.map((type) => (
          <button
            key={type}
            onClick={() => setShareBoardTypeFilter(type)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${
              shareBoardTypeFilter === type ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:text-primary'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <button
        onClick={() => openShareItemForm()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-black text-primary-foreground"
      >
        <Plus size={16} /> 投稿する
      </button>

      <div className="space-y-3">
        {shareItemsLoading ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">読み込み中です...</p>
        ) : filteredItems.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">まだ投稿がありません。最初の投稿をしてみませんか？</p>
        ) : (
          filteredItems.map((item) => <ShareItemCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
