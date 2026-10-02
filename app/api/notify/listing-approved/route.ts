import { NextResponse } from 'next/server'
import { sendListingApprovedNotification } from '@/lib/knot/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (
    !body ||
    typeof body.title !== 'string' ||
    typeof body.organizerEmail !== 'string' ||
    typeof body.activityUrl !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const result = await sendListingApprovedNotification({
    title: body.title,
    organizerName: body.organizerName ?? '',
    organizerEmail: body.organizerEmail,
    activityUrl: body.activityUrl,
  })

  return NextResponse.json(result)
}
