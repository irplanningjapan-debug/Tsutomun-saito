import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseUrl } from '@/lib/supabase/config'
import { sendActivityExpiryEmail, sendPartnerShopExpiryEmail, type ActivityExpiryStage } from '@/lib/knot/email'

// 掲載期限管理の日次バッチ。Vercel Cron（vercel.json）から1日1回呼ばれ、
// activities / partners / shop_products の expires_at を見て、通知がまだ済んでいない
// 対象に該当ステージのメールを送り、送信済みフラグを立てる。
// - activities: 30日前 / 7日前 / 当日(終了) の3段階
// - partners, shop_products: 残り30日の1段階のみ（仕様どおり）
//
// 手動実行や重複実行があっても安全なように、各段階は expiry_notified_* フラグで
// 一度だけ送る（フラグが立っていれば何もしない）。

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  // Vercel Cron が自動付与する Authorization: Bearer <CRON_SECRET> を、設定されている
  // 場合のみ検証する（未設定なら誰でも叩けるプレビュー環境として動作を許容する）。
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
  }
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const results = { activities: { sent: 0, failed: 0 }, partners: { sent: 0, failed: 0 }, shops: { sent: 0, failed: 0 } }

  // --- 1. activities（30日前 / 7日前 / 当日） ---
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('id, title, organizer_name, contact_email, expires_at, expiry_notified_30d, expiry_notified_7d, expiry_notified_end, status')
    .eq('status', 'published')
    .not('expires_at', 'is', null)

  if (!activitiesError && activities) {
    for (const row of activities as Array<Record<string, unknown>>) {
      const expiresAt = row.expires_at as string
      const days = daysUntil(expiresAt)
      if (days === null) continue
      const contactEmail = row.contact_email as string | null
      if (!contactEmail) continue

      const expiresAtLabel = new Date(expiresAt).toLocaleDateString('ja-JP')
      const baseInput = {
        title: row.title as string,
        organizerName: (row.organizer_name as string) || '',
        organizerEmail: contactEmail,
        expiresAtLabel,
      }

      let stage: ActivityExpiryStage | null = null
      if (days <= 0 && !row.expiry_notified_end) stage = 'end'
      else if (days <= 7 && !row.expiry_notified_7d) stage = '7d'
      else if (days <= 30 && !row.expiry_notified_30d) stage = '30d'
      if (!stage) continue

      const result = await sendActivityExpiryEmail(stage, baseInput)
      if (result.sent) {
        results.activities.sent += 1
        const flagColumn = stage === '30d' ? 'expiry_notified_30d' : stage === '7d' ? 'expiry_notified_7d' : 'expiry_notified_end'
        await supabase.from('activities').update({ [flagColumn]: true }).eq('id', row.id as string)
      } else {
        results.activities.failed += 1
      }
    }
  }

  // --- 2. partners / shop_products（残り30日のみ） ---
  const partnerLikeTables: Array<{ table: 'partners' | 'shop_products'; nameColumn: string; kindLabel: '応援企業' | 'SHOP'; bucket: 'partners' | 'shops' }> = [
    { table: 'partners', nameColumn: 'company_name', kindLabel: '応援企業', bucket: 'partners' },
    { table: 'shop_products', nameColumn: 'name', kindLabel: 'SHOP', bucket: 'shops' },
  ]

  for (const { table, nameColumn, kindLabel, bucket } of partnerLikeTables) {
    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, ${nameColumn}, expires_at, contact_email, expiry_notified_30d`)
      .not('expires_at', 'is', null)
      .eq('expiry_notified_30d', false)
    if (error || !rows) continue

    for (const row of rows as unknown as Array<Record<string, unknown>>) {
      const expiresAt = row.expires_at as string
      const days = daysUntil(expiresAt)
      if (days === null || days > 30) continue
      const contactEmail = row.contact_email as string | null
      if (!contactEmail) continue

      const result = await sendPartnerShopExpiryEmail({
        name: row[nameColumn] as string,
        kindLabel,
        contactEmail,
        expiresAtLabel: new Date(expiresAt).toLocaleDateString('ja-JP'),
      })
      if (result.sent) {
        results[bucket].sent += 1
        await supabase.from(table).update({ expiry_notified_30d: true }).eq('id', row.id as string)
      } else {
        results[bucket].failed += 1
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
