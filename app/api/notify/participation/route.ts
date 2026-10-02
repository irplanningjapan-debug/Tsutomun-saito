import { NextResponse } from 'next/server'
import { sendParticipationOrganizerNotification, sendParticipationConfirmationEmail } from '@/lib/knot/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.applicantEmail !== 'string' || typeof body.activityTitle !== 'string') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const input = {
    activityTitle: body.activityTitle,
    activityArea: body.activityArea ?? '',
    activityDate: body.activityDate ?? '',
    applicantName: body.applicantName ?? '',
    applicantEmail: body.applicantEmail,
    applicantPhone: body.applicantPhone ?? '',
    groupSize: body.groupSize ?? '',
    participantBreakdown: body.participantBreakdown ?? '',
    question: body.question || undefined,
    organizerName: body.organizerName || '主催者',
    organizerEmail: typeof body.organizerEmail === 'string' ? body.organizerEmail : undefined,
  }

  // 参加申込通知は主催者（掲載元）宛に送信する。運営事務局は毎回のメール通知の宛先ではなく、
  // 主催者へ送信できた場合のみBCCで控えを受け取る（sendParticipationOrganizerNotification内で処理）。
  const [confirmation, organizerNotice] = await Promise.all([
    sendParticipationConfirmationEmail(input),
    sendParticipationOrganizerNotification(input),
  ])

  return NextResponse.json({ confirmation, organizerNotice })
}
