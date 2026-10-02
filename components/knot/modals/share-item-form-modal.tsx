'use client'

import { X } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { allMunicipalities } from '@/lib/knot/data'
import type { ShareItemPriceType, ShareItemType } from '@/lib/knot/types'

const typeOptions: ShareItemType[] = ['貸します', '借りたい', '譲ります', '探してます']
const priceTypeOptions: ShareItemPriceType[] = ['無償', '有償・要相談']

export function ShareItemFormModal() {
  const {
    shareItemFormOpen,
    closeShareItemForm,
    editingShareItemId,
    shareItemDraft,
    setShareItemDraft,
    shareItemSaving,
    shareItemSaveError,
    saveShareItem,
    shareItemImageUploading,
    uploadShareItemImage,
  } = useKnot()

  if (!shareItemFormOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={closeShareItemForm}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-black">{editingShareItemId ? '投稿を編集する' : 'ゆずりあい掲示板に投稿する'}</h2>
          <button onClick={closeShareItemForm} aria-label="モーダルを閉じる" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <label className="text-xs font-black text-slate-500">投稿の種類</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {typeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setShareItemDraft({ ...shareItemDraft, type })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-black transition ${
                    shareItemDraft.type === type ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 text-slate-600 hover:border-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500">タイトル</label>
            <input
              value={shareItemDraft.title}
              onChange={(event) => setShareItemDraft({ ...shareItemDraft, title: event.target.value })}
              placeholder="例：テント一式お譲りします"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-500">市町村</label>
              <select
                value={shareItemDraft.municipality}
                onChange={(event) => setShareItemDraft({ ...shareItemDraft, municipality: event.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                {allMunicipalities.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500">価格タイプ</label>
              <select
                value={shareItemDraft.priceType}
                onChange={(event) => setShareItemDraft({ ...shareItemDraft, priceType: event.target.value as ShareItemPriceType })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              >
                {priceTypeOptions.map((price) => (
                  <option key={price} value={price}>
                    {price}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500">画像（任意）</label>
            {shareItemDraft.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shareItemDraft.imageUrl || '/placeholder.svg'} alt="投稿する画像" className="mt-1.5 h-40 w-full rounded-xl object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              disabled={shareItemImageUploading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) uploadShareItemImage(file)
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-primary focus:border-primary disabled:opacity-60"
            />
            {shareItemImageUploading && <p className="mt-1 text-[11px] text-slate-400">アップロード中です...</p>}
            <p className="mt-1 text-[11px] text-slate-400">スマートフォンやPCのアルバム・カメラから画像を選択できます。</p>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500">内容・詳細</label>
            <textarea
              value={shareItemDraft.description}
              onChange={(event) => setShareItemDraft({ ...shareItemDraft, description: event.target.value })}
              rows={4}
              placeholder="状態、サイズ、受け渡し方法などをご記入ください"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-500">連絡先メールアドレス</label>
            <input
              type="email"
              value={shareItemDraft.contactEmail}
              onChange={(event) => setShareItemDraft({ ...shareItemDraft, contactEmail: event.target.value })}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-slate-400">問い合わせがあった際、このメールアドレス宛に内容が届きます。</p>
          </div>

          {shareItemSaveError && <p className="text-sm font-bold text-rose-600">{shareItemSaveError}</p>}

          <button
            onClick={saveShareItem}
            disabled={shareItemSaving}
            className="w-full rounded-full bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {shareItemSaving ? '保存中...' : editingShareItemId ? 'この内容で更新する' : 'この内容で投稿する'}
          </button>
        </div>
      </div>
    </div>
  )
}
