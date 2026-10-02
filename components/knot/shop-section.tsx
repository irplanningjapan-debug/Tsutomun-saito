'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { useKnot } from '@/lib/knot/store'
import { getExpiryStatus, mapDbShopProductToShopProduct, shopGuideUrlSettingKey, type DbShopProductRow, type ShopProduct } from '@/lib/knot/data'
import { createClient } from '@/lib/supabase/client'

export function ShopSection() {
  const { openContact } = useKnot()
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [guideUrl, setGuideUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()
    const legacyColumns = 'id, name, organization, price, image_url, product_url, area, tagline, display_order'
    const applyVisibleProducts = (data: DbShopProductRow[]) => {
      // 掲載期限（expires_at）が過去の商品は公開サイト上では非表示にする。
      const visible = data.filter((row) => getExpiryStatus(row.expires_at) !== 'expired')
      if (isMounted) setProducts(visible.map(mapDbShopProductToShopProduct))
    }
    supabase
      .from('shop_products')
      .select(`${legacyColumns}, expires_at`)
      .order('display_order', { ascending: true })
      .then(async ({ data, error }) => {
        if (error) {
          console.log('[v0] Failed to load shop products from Supabase (retrying without expires_at):', error.message)
          // scripts/sql/2025_expiry_management.sql が未適用の環境向けフォールバック。
          const fallback = await supabase.from('shop_products').select(legacyColumns).order('display_order', { ascending: true })
          if (!fallback.error && fallback.data) applyVisibleProducts(fallback.data as DbShopProductRow[])
          return
        }
        if (data) applyVisibleProducts(data as DbShopProductRow[])
      })
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', shopGuideUrlSettingKey)
      .maybeSingle()
      .then(({ data }) => {
        const url = (data?.value as { url?: string } | null)?.url
        if (isMounted && url) setGuideUrl(url)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const openShopContact = () => openContact('🛍 応援SHOP掲載・EC相談')

  const goToOfficialShop = () => {
    if (guideUrl) {
      window.open(guideUrl, '_blank', 'noopener,noreferrer')
    } else {
      openShopContact()
    }
  }

  return (
    <section id="shop" className="bg-amber-50/50 px-5 py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-black text-primary">SUPPORT SHOP</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">地域の暮らし応援SHOP</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">地域特産品やオリジナルグッズを購入して、西都の現場を応援しよう。</p>
        </div>
        <div className="mt-10 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <article className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-amber-400 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex h-36 shrink-0 flex-col justify-center gap-2 bg-gradient-to-br from-amber-400 to-amber-500 px-5 text-slate-900">
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-amber-300"><Sparkles size={12} /> つとむん公式 / 応援委託SHOP</span>
              <p className="text-base font-black leading-snug">自前ECがなくても出品OK！<br />地域の暮らし応援セレクト</p>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="text-xs leading-5 text-slate-500">ネットショップをお持ちでない方・団体・企業も、つとむん運営（株式会社Tameni）が代理で掲載・販売をバックアップします。</p>
              {guideUrl ? (
                <button
                  onClick={goToOfficialShop}
                  className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  公式SHOPを見る <ArrowUpRight size={14} />
                </button>
              ) : (
                <button
                  onClick={openShopContact}
                  className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  委託販売・掲載について相談する
                </button>
              )}
            </div>
          </article>
          {products.map((product) => (
            <article
              key={product.id ?? product.name}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-36 shrink-0 overflow-hidden">
                <Image src={product.image || '/placeholder.svg'} alt={product.name} fill className="object-cover" />
                <span className="absolute left-3 top-3 z-10 max-w-[80%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  {product.organization}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                {product.tagline && (
                  <p className="mb-2 line-clamp-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-black leading-4 text-primary">
                    {product.tagline}
                  </p>
                )}
                <h3 className="font-black leading-6 text-slate-900">{product.name}</h3>
                <p className="mt-1 text-sm font-bold text-slate-600">{product.price}</p>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex w-full items-center justify-center gap-1 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-900 transition hover:bg-amber-300"
                >
                  ショップを見る <ArrowUpRight size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button
            onClick={openShopContact}
            className="text-sm font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-primary"
          >
            地域特産品・オリジナルグッズを掲載したい方はこちら（掲載・EC開設相談）
          </button>
        </div>
      </div>
    </section>
  )
}
