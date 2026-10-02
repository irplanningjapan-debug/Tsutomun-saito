import { NextResponse } from 'next/server'
import { sendListingApplicationConfirmationEmail, sendListingApplicationNotification } from '@/lib/knot/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.title !== 'string' || typeof body.organizerEmail !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const input = {
    title: body.title,
    listingTypeLabel: body.listingTypeLabel ?? '',
    area: body.area ?? '',
    genre: body.genre ?? '',
    organizerName: body.organizerName ?? '',
    organizerEmail: body.organizerEmail,
    organizerPhone: body.organizerPhone || undefined,
    schedule: body.schedule || undefined,
    eventDate: body.eventDate || undefined,
  }

  const [adminNotice, confirmation] = await Promise.all([
    sendListingApplicationNotification(input),
    sendListingApplicationConfirmationEmail(input),
  ])

  return NextResponse.json({ adminNotice, confirmation })
}
