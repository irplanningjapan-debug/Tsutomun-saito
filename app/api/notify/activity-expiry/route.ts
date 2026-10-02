import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabaseUrl } from '@/lib/supabase/config'
import { sendActivityExpiryEmail, type ActivityExpiryStage } from '@/lib/knot/email'

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// 管理ダッシュボード（活動・イベント管理）の一覧から「更新案内メールを再送する」を押したときに
// 呼ばれる。cron（/api/cron/expiry-check）と同じステージ判定（30日前 / 7日前 / 当日）を使い、
// 現在の残り日数に応じたメール本文を送る。手動再送のため、送信済みフラグの有無に関わらず送信
// し、送信後にそのステージのフラグだけ立てておく（以降の自動送信の重複を防ぐ）。
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = body?.id

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 500 })
  }
  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: row, error } = await supabase
    .from('activities')
    .select('id, title, organizer_name, contact_email, expires_at')
    .eq('id', id)
    .maybeSingle()
  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? '対象データが見つかりませんでした。' }, { status: 404 })
  }

  const contactEmail = (row as Record<string, unknown>).contact_email as string | null
  if (!contactEmail) {
    return NextResponse.json({ error: '連絡先メールアドレスが未設定です。' }, { status: 400 })
  }

  const expiresAt = (row as Record<string, unknown>).expires_at as string | null
  const days = daysUntil(expiresAt)
  const stage: ActivityExpiryStage = days === null ? '30d' : days <= 0 ? 'end' : days <= 7 ? '7d' : '30d'
  const expiresAtLabel = expiresAt ? new Date(expiresAt).toLocaleDateString('ja-JP') : '未設定'

  const result = await sendActivityExpiryEmail(stage, {
    title: (row as Record<string, unknown>).title as string,
    organizerName: ((row as Record<string, unknown>).organizer_name as string) || '',
    organizerEmail: contactEmail,
    expiresAtLabel,
  })

  if (!result.sent) {
    return NextResponse.json({ error: result.reason }, { status: 502 })
  }

  const flagColumn = stage === '30d' ? 'expiry_notified_30d' : stage === '7d' ? 'expiry_notified_7d' : 'expiry_notified_end'
  await supabase.from('activities').update({ [flagColumn]: true }).eq('id', id)

  return NextResponse.json({ sent: true })
}
