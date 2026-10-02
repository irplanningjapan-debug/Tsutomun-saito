import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseUrl } from '@/lib/supabase/config'
import { sendPartnerShopExpiryEmail } from '@/lib/knot/email'

// 管理ダッシュボード（応援企業管理・SHOP管理）の一覧から「更新案内メールを手動再送する」を
// 押したときに呼ばれる。partners / shop_products は RLS 越しの匿名クライアントでも読めるが、
// 通知フラグの更新まで一貫させるため service-role キーで処理する。
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const type = body?.type
  const id = body?.id

  if ((type !== 'partner' && type !== 'shop') || typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
  }
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const table = type === 'partner' ? 'partners' : 'shop_products'
  const nameColumn = type === 'partner' ? 'company_name' : 'name'

  const { data: row, error } = await supabase.from(table).select(`id, ${nameColumn}, expires_at, contact_email`).eq('id', id).maybeSingle()
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? '対象データが見つかりませんでした。' }, { status: 404 })
  }

  const contactEmail = (row as Record<string, unknown>).contact_email as string | null
  if (!contactEmail) {
    return NextResponse.json({ error: '連絡先メールアドレスが未設定です。先に登録してください。' }, { status: 400 })
  }

  const expiresAt = (row as Record<string, unknown>).expires_at as string | null
  const expiresAtLabel = expiresAt ? new Date(expiresAt).toLocaleDateString('ja-JP') : '未設定'
  const name = (row as Record<string, unknown>)[nameColumn] as string

  const result = await sendPartnerShopExpiryEmail({
    name,
    kindLabel: type === 'partner' ? '応援企業' : 'SHOP',
    contactEmail,
    expiresAtLabel,
  })

  if (!result.sent) {
    return NextResponse.json({ error: result.reason }, { status: 502 })
  }

  await supabase.from(table).update({ expiry_notified_30d: true }).eq('id', id)

  return NextResponse.json({ sent: true })
}
