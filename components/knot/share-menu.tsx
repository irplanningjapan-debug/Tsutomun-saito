'use client'

import { useState } from 'react'
import { Link2, MessageCircle, QrCode, X, Download } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

type ShareableActivity = { id?: string; title: string }

function buildShareUrl(activity: ShareableActivity) {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set('activity', activity.id || activity.title)
  return url.toString()
}

export function ShareMenu({ activity, className = 'relative inline-block' }: { activity: ShareableActivity; className?: string }) {
  const [open, setOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrOpen, setQrOpen] = useState(false)

  const handleCopyLink = async (event: React.MouseEvent) => {
    event.stopPropagation()
    const url = buildShareUrl(activity)
    try {
      await navigator.clipboard.writeText(url)
      toast.success('リンクをコピーしました！友達にシェアできます')
    } catch {
      toast.error('コピーに失敗しました。時間をおいて再度お試しください。')
    }
    setOpen(false)
  }

  const handleLineShare = (event: React.MouseEvent) => {
    event.stopPropagation()
    const url = buildShareUrl(activity)
    const text = `${activity.title}\n${url}`
    window.open(`https://line.me/R/msg/text/?${new URLSearchParams({ text }).toString()}`, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleShowQr = async (event: React.MouseEvent) => {
    event.stopPropagation()
    const url = buildShareUrl(activity)
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 })
      setQrDataUrl(dataUrl)
      setQrOpen(true)
    } catch {
      toast.error('QRコードの生成に失敗しました。')
    }
    setOpen(false)
  }

  return (
    <div className={className} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        aria-label={`${activity.title}をシェアする`}
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm transition hover:text-primary"
      >
        <Link2 size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[89]" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-11 z-[90] w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
            <button type="button" role="menuitem" onClick={handleCopyLink} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
              <Link2 size={16} className="text-primary" />リンクをコピー
            </button>
            <button type="button" role="menuitem" onClick={handleLineShare} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
              <MessageCircle size={16} className="text-emerald-500" />LINEで送る
            </button>
            <button type="button" role="menuitem" onClick={handleShowQr} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
              <QrCode size={16} className="text-slate-700" />QRコード表示
            </button>
          </div>
        </>
      )}
      {qrOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QRコード"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-5"
          onClick={(event) => {
            event.stopPropagation()
            setQrOpen(false)
          }}
        >
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">QRコードでシェア</p>
              <button type="button" onClick={() => setQrOpen(false)} aria-label="閉じる" className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-600">
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{activity.title}</p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl || '/placeholder.svg'} alt={`${activity.title}の詳細ページQRコード`} className="mx-auto mt-4 size-56 rounded-xl border border-slate-100" />
            )}
            <a
              href={qrDataUrl}
              download={`${activity.title}-qr.png`}
              onClick={(event) => event.stopPropagation()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground"
            >
              <Download size={16} />画像を保存
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
