const ADMIN_EMAIL = 'ishikawa.rie@tamenijapan.com'

const FROM_ADDRESS = 'つとむん運営事務局 <noreply@mail.tamenijapan.com>'

type SendEmailInput = {
  to: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
}

type SendEmailResult = { sent: true } | { sent: false; reason: string }

async function sendEmail({ to, bcc, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log('[v0] RESEND_API_KEY is not set. Skipping email send:', { to, subject })
    return { sent: false, reason: 'RESEND_API_KEY is not configured' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(to) ? to : [to],
        ...(bcc ? { bcc: Array.isArray(bcc) ? bcc : [bcc] } : {}),
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[v0] Resend API error:', response.status, errorText)
      return { sent: false, reason: `Resend API error: ${response.status}` }
    }

    return { sent: true }
  } catch (error) {
    console.log('[v0] Failed to send email via Resend:', error)
    return { sent: false, reason: 'Network error while calling Resend API' }
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailShell(title: string, bodyHtml: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <div style="background: #0ea5e9; padding: 20px 28px; border-radius: 16px 16px 0 0;">
        <p style="margin: 0; font-size: 13px; font-weight: 900; color: #ffffff; letter-spacing: 0.05em;">つとむん 西都ワークプラットフォーム</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; padding: 28px;">
        <h1 style="margin: 0 0 16px; font-size: 18px; font-weight: 900;">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </div>
    </div>
  `
}

export type ListingApplicationEmailInput = {
  title: string
  listingTypeLabel: string
  area: string
  genre: string
  organizerName: string
  organizerEmail: string
  organizerPhone?: string
  schedule?: string
  eventDate?: string
}

export async function sendListingApplicationNotification(input: ListingApplicationEmailInput) {
  const rows = [
    ['掲載タイプ', input.listingTypeLabel],
    ['体験・ワーク名', input.title],
    ['エリア', input.area],
    ['ジャンル', input.genre],
    ['申請者名', input.organizerName],
    ['連絡先メール', input.organizerEmail],
    ...(input.organizerPhone ? [['電話番号', input.organizerPhone]] : []),
    ...(input.eventDate ? [['開催日時', input.eventDate]] : []),
    ...(input.schedule ? [['日時・頻度', input.schedule]] : []),
  ]

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-weight: 700;">${escapeHtml(value)}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
  `

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: '【つとむん】新規体験掲載申請が届きました',
    html: emailShell(
      '新規体験掲載申請が届きました',
      `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">以下の内容で体験・ワークの掲載申請がありました。管理画面から内容を確認し、公開の承認をお願いします。</p>${tableHtml}`,
    ),
  })
}

export async function sendListingApplicationConfirmationEmail(input: ListingApplicationEmailInput) {
  const rows = [
    ['掲載タイプ', input.listingTypeLabel],
    ['体験・ワーク名', input.title],
    ['エリア', input.area],
    ['ジャンル', input.genre],
    ...(input.eventDate ? [['開催日時', input.eventDate]] : []),
    ...(input.schedule ? [['日時・頻度', input.schedule]] : []),
  ]

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-weight: 700;">${escapeHtml(value)}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
  `

  return sendEmail({
    to: input.organizerEmail,
    subject: '【つとむん】体験掲載申請を受け付けました',
    html: emailShell(
      '体験掲載申請を受け付けました',
      `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          ${escapeHtml(input.organizerName)} 様<br />
          以下の内容で体験・ワークの掲載申請を受け付けました。運営事務局にて内容を確認のうえ、公開までにお時間をいただく場合があります。今しばらくお待ちください。
        </p>
        ${tableHtml}
      `,
    ),
  })
}

export type ListingApprovedEmailInput = {
  title: string
  organizerName: string
  organizerEmail: string
  activityUrl: string
}

export async function sendListingApprovedNotification(input: ListingApprovedEmailInput) {
  return sendEmail({
    to: input.organizerEmail,
    subject: '【つとむん】申請いただいた体験・ワークが承認・公開されました',
    html: emailShell(
      '体験・ワークが承認・公開されました',
      `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          ${escapeHtml(input.organizerName)} 様<br />
          ご申請いただいた体験・ワーク「${escapeHtml(input.title)}」が運営事務局にて承認され、つとむんサイト上に公開されました。
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">体験・ワーク名</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.title)}</td></tr>
        </table>
        <p style="margin: 20px 0 0; font-size: 14px; line-height: 1.7; color: #334155;">
          以下のURLから、公開された内容をご確認いただけます。
        </p>
        <p style="margin: 12px 0 0;">
          <a href="${escapeHtml(input.activityUrl)}" style="display: inline-block; background: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 999px; text-decoration: none;">
            公開ページを見る
          </a>
        </p>
        <p style="margin: 12px 0 0; font-size: 12px; line-height: 1.6; color: #94a3b8; word-break: break-all;">
          ${escapeHtml(input.activityUrl)}
        </p>
      `,
    ),
  })
}

export type ParticipationEmailInput = {
  activityTitle: string
  activityArea: string
  activityDate: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  groupSize: string
  participantBreakdown: string
  question?: string
  organizerName: string
  organizerEmail?: string
}

export async function sendParticipationConfirmationEmail(input: ParticipationEmailInput) {
  return sendEmail({
    to: input.applicantEmail,
    subject: '【つとむん】お申し込みを受け付けました',
    html: emailShell(
      'お申し込みを受け付けました',
      `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          ${escapeHtml(input.applicantName)} 様<br />
          以下の内容でお申し込みを受け付けました。内容確認後、2〜3日中に主催者（${escapeHtml(input.organizerName)}）より詳細のご連絡を差し上げます。
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 120px;">体験・ワーク名</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.activityTitle)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">エリア / 日時</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.activityArea)} / ${escapeHtml(input.activityDate)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">参加人数</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.groupSize)}</td></tr>
        </table>
      `,
    ),
  })
}

// 参加申込があったことを、その体験・ワークの主催者（掲載元）宛に通知する。
// 主催者のメールアドレスが取得できなかった場合のみ、フォールバックとして運営事務局(ADMIN_EMAIL)宛に送信する。
// 主催者へ送信できた場合、運営事務局は毎回のメール通知を必須とはせず、必要に応じてBCCで控えを受け取る
// （ダッシュボード上での把握が基本運用のため）。
export async function sendParticipationOrganizerNotification(input: ParticipationEmailInput) {
  const rows = [
    ['体験・ワーク名', input.activityTitle],
    ['エリア / 日時', `${input.activityArea} / ${input.activityDate}`],
    ['申込者名', input.applicantName],
    ['メールアドレス', input.applicantEmail],
    ['電話番号', input.applicantPhone],
    ['参加人数', input.groupSize],
    ['内訳', input.participantBreakdown],
    ...(input.question ? [['質問・伝達事項', input.question]] : []),
  ]

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-weight: 700; vertical-align: top;">${escapeHtml(value)}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
  `

  const organizerEmail = input.organizerEmail?.trim()
  const recipient = organizerEmail || ADMIN_EMAIL

  return sendEmail({
    to: recipient,
    // 主催者へ送れた場合のみ運営事務局をBCCに入れる。主催者のメールが無くADMIN_EMAILに直接
    // 送る場合は、同じ宛先へ二重に送らないようBCCは付けない。
    bcc: organizerEmail ? ADMIN_EMAIL : undefined,
    subject: `【つとむん】「${input.activityTitle}」に参加申し込みがありました`,
    html: emailShell(
      `「${input.activityTitle}」に参加申し込みがありました`,
      `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">以下の内容で参加申込がありました。内容をご確認のうえ、申込者へ詳細のご連絡をお願いします。</p>${tableHtml}`,
    ),
  })
}

export type ContactEmailInput = {
  applicantName: string
  companyOrOrg?: string
  email: string
  phone?: string
  inquiryType: string
  message: string
}

export async function sendContactConfirmationEmail(input: ContactEmailInput) {
  return sendEmail({
    to: input.email,
    subject: '【つとむん】お問い合わせを受け付けました',
    html: emailShell(
      'お問い合わせを受け付けました',
      `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          ${escapeHtml(input.applicantName)} 様<br />
          以下の内容でお問い合わせを受け付けました。担当者より2〜3日中にご連絡いたします。
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">お問い合わせ種別</td><td style="padding: 8px 0; font-weight: 700;">${escapeHtml(input.inquiryType)}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b; vertical-align: top;">お問い合わせ内容</td><td style="padding: 8px 0; font-weight: 700; white-space: pre-wrap;">${escapeHtml(input.message)}</td></tr>
        </table>
      `,
    ),
  })
}

const MYPAGE_URL = 'https://knot-miyazaki.tamenijapan.com/mypage'

export type ActivityExpiryStage = '30d' | '7d' | 'end'

export type ActivityExpiryEmailInput = {
  title: string
  organizerName: string
  organizerEmail: string
  expiresAtLabel: string
}

const activityExpirySubjects: Record<ActivityExpiryStage, (title: string) => string> = {
  '30d': (title) => `【つとむん】掲載中のワーク情報「${title}」の掲載期限が近づいています（残り30日）`,
  '7d': (title) => `【重要・残り7日】「${title}」の掲載期限が迫っています`,
  end: (title) => `【つとむん】「${title}」の掲載期間が終了しました`,
}

function activityExpiryBodyHtml(stage: ActivityExpiryStage, input: ActivityExpiryEmailInput) {
  const greeting = `${escapeHtml(input.organizerName)} 様<br />いつもつとむんをご利用いただきありがとうございます。`
  if (stage === '30d') {
    return `
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">${greeting}</p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
        掲載中の「${escapeHtml(input.title)}」は <strong>${escapeHtml(input.expiresAtLabel)}</strong> をもって掲載終了（非表示）となります。<br />
        継続して掲載を希望される場合は、マイページより「掲載期間の更新（1年延長）」を行ってください。
      </p>
      <p style="margin: 12px 0 0;">
        <a href="${MYPAGE_URL}" style="display: inline-block; background: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 999px; text-decoration: none;">マイページを開く</a>
      </p>
      <p style="margin: 16px 0 0; font-size: 12px; line-height: 1.6; color: #94a3b8;">※更新手続きを行わない場合は期日をもって自動的に非表示となります。</p>
    `
  }
  if (stage === '7d') {
    return `
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">${greeting}</p>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
        「${escapeHtml(input.title)}」の掲載終了まで残り<strong>7日</strong>となりました（掲載期限：${escapeHtml(input.expiresAtLabel)}）。<br />
        引き続き募集を行う場合は、お早めにマイページから更新手続きをお願いいたします。
      </p>
      <p style="margin: 12px 0 0;">
        <a href="${MYPAGE_URL}" style="display: inline-block; background: #ef4444; color: #ffffff; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 999px; text-decoration: none;">今すぐ更新する</a>
      </p>
    `
  }
  return `
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">${greeting}</p>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
      「${escapeHtml(input.title)}」は掲載期限（${escapeHtml(input.expiresAtLabel)}）を迎えましたので、サイト上の表示を「掲載終了（非表示）」に切り替えました。<br />
      再開を希望の場合は、いつでもマイページから内容をご確認の上、再掲載（更新）が可能です。
    </p>
    <p style="margin: 12px 0 0;">
      <a href="${MYPAGE_URL}" style="display: inline-block; background: #0ea5e9; color: #ffffff; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 999px; text-decoration: none;">マイページから再掲載する</a>
    </p>
  `
}

export async function sendActivityExpiryEmail(stage: ActivityExpiryStage, input: ActivityExpiryEmailInput) {
  const subject = activityExpirySubjects[stage](input.title)
  return sendEmail({
    to: input.organizerEmail,
    subject,
    html: emailShell(subject.replace(/^【[^】]+】/, ''), activityExpiryBodyHtml(stage, input)),
  })
}

export type PartnerShopExpiryEmailInput = {
  name: string
  kindLabel: '応援企業' | 'SHOP'
  contactEmail: string
  expiresAtLabel: string
}

export async function sendPartnerShopExpiryEmail(input: PartnerShopExpiryEmailInput) {
  const title = `【つとむん】応援企業/SHOP ご掲載期間終了（残り30日）とご契約更新のご案内`
  return sendEmail({
    to: input.contactEmail,
    bcc: ADMIN_EMAIL,
    subject: title,
    html: emailShell(
      'ご掲載期間終了とご契約更新のご案内',
      `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          ${escapeHtml(input.name)} 様<br />
          いつもつとむんをご利用いただきありがとうございます。
        </p>
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          現在ご協賛・ご掲載いただいている「${escapeHtml(input.kindLabel)}」枠の掲載期限が <strong>${escapeHtml(input.expiresAtLabel)}</strong> となります。<br />
          次期のご継続手続き・掲載内容の変更につきましては、運営事務局までご連絡ください。
        </p>
      `,
    ),
  })
}

export type ShareItemContactEmailInput = {
  itemTitle: string
  itemType: string
  posterEmail: string
  senderName: string
  senderEmail: string
  senderPhone?: string
  message: string
}

// ゆずりあい掲示板の投稿に問い合わせがあったことを、投稿者本人へ通知する。
// メールアドレスは掲示板上には表示せず、このメール経由でのみ連絡先が伝わる。
export async function sendShareItemContactEmail(input: ShareItemContactEmailInput) {
  const rows = [
    ['投稿タイトル', input.itemTitle],
    ['投稿種別', input.itemType],
    ['お名前', input.senderName],
    ['メールアドレス', input.senderEmail],
    ...(input.senderPhone ? [['電話番号', input.senderPhone]] : []),
    ['メッセージ', input.message],
  ]

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-weight: 700; vertical-align: top; white-space: pre-wrap;">${escapeHtml(value)}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
  `

  return sendEmail({
    to: input.posterEmail,
    subject: `【つとむん】「${input.itemTitle}」に問い合わせがありました`,
    html: emailShell(
      `「${input.itemTitle}」に問い合わせがありました`,
      `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">ゆずりあい掲示板の投稿に、以下の内容で問い合わせがありました。返信は下記の連絡先まで直接お願いします。</p>${tableHtml}`,
    ),
  })
}

export async function sendShareItemContactConfirmationEmail(input: ShareItemContactEmailInput) {
  return sendEmail({
    to: input.senderEmail,
    subject: '【つとむん】お問い合わせを送信しました',
    html: emailShell(
      'お問い合わせを送信しました',
      `
        <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">
          ${escapeHtml(input.senderName)} 様<br />
          「${escapeHtml(input.itemTitle)}」の投稿者宛に、以下の内容でお問い合わせを送信しました。投稿者本人からの返信をお待ちください。
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">メッセージ</td><td style="padding: 8px 0; font-weight: 700; white-space: pre-wrap;">${escapeHtml(input.message)}</td></tr>
        </table>
      `,
    ),
  })
}

export async function sendContactAdminNotification(input: ContactEmailInput) {
  const rows = [
    ['お名前', input.applicantName],
    ...(input.companyOrOrg ? [['会社・団体名', input.companyOrOrg]] : []),
    ['メールアドレス', input.email],
    ...(input.phone ? [['電話番号', input.phone]] : []),
    ['お問い合わせ種別', input.inquiryType],
    ['お問い合わせ内容', input.message],
  ]

  const tableHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #64748b; width: 120px; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; font-weight: 700; vertical-align: top; white-space: pre-wrap;">${escapeHtml(value)}</td>
        </tr>
      `,
        )
        .join('')}
    </table>
  `

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: '【つとむん】新規お問い合わせを受け付けました',
    html: emailShell(
      '新規お問い合わせを受け付けました',
      `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #334155;">以下の内容でお問い合わせがありました。管理画面から内容を確認し、対応をお願いします。</p>${tableHtml}`,
    ),
  })
}
