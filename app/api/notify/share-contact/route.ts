import { NextResponse } from 'next/server'
import { sendShareItemContactConfirmationEmail, sendShareItemContactEmail } from '@/lib/knot/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (
    !body ||
    typeof body.posterEmail !== 'string' ||
    typeof body.senderEmail !== 'string' ||
    typeof body.message !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const input = {
    itemTitle: body.itemTitle ?? '',
    itemType: body.itemType ?? '',
    posterEmail: body.posterEmail,
    senderName: body.senderName ?? '',
    senderEmail: body.senderEmail,
    senderPhone: body.senderPhone || undefined,
    message: body.message,
  }

  const [posterNotice, confirmation] = await Promise.all([
    sendShareItemContactEmail(input),
    sendShareItemContactConfirmationEmail(input),
  ])

  return NextResponse.json({ posterNotice, confirmation })
}
