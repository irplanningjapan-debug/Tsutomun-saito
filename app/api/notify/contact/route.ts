import { NextResponse } from 'next/server'
import { sendContactAdminNotification, sendContactConfirmationEmail } from '@/lib/knot/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.email !== 'string' || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const input = {
    applicantName: body.applicantName ?? '',
    companyOrOrg: body.companyOrOrg || undefined,
    email: body.email,
    phone: body.phone || undefined,
    inquiryType: body.inquiryType || 'その他',
    message: body.message,
  }

  const [confirmation, adminNotice] = await Promise.all([
    sendContactConfirmationEmail(input),
    sendContactAdminNotification(input),
  ])

  return NextResponse.json({ confirmation, adminNotice })
}
