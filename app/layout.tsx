import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP, Shippori_Mincho } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-jp',
})

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-serif-jp',
})

export const metadata: Metadata = {
  title: 'KNOT（ノット）| 宮崎の地域活動・体験予約プラットフォーム',
  description:
    'KNOTは宮崎県内の地域活動・体験会・イベントを探して申し込める予約プラットフォームです。あなたの「やってみたい」が、ここでつながる。',
  generator: 'v0.app',
  // iOS's "Add to Home Screen" uses this exact title for the app name/label under the
  // icon (falling back to <title>, which is far too long for that slot) — this is what
  // makes the default home-screen name "KNOT 宮崎" instead of the full page title.
  appleWebApp: {
    title: 'KNOT 宮崎',
  },
  // app/icon.png, app/icon.svg, app/apple-icon.png, and app/favicon.ico (the Next.js
  // file-convention icons) are auto-detected and already get a unique, content-hashed
  // query param from Next itself, so their cache always busts on change without help
  // from here. This explicit block instead points browsers at the /public copies (same
  // source image, copied to public/icon.png etc.) so this is the icon entry every
  // browser sees first, ahead of Next's own auto-detected tags. /public isn't hashed by
  // Next, so a browser can keep serving a stale favicon from cache indefinitely after
  // the file's bytes change unless the URL itself changes - the "?v=7" below is that
  // manual cache-buster. Bump it (v8, v9, ...) any time these icon files are replaced.
  icons: {
    icon: [
      { url: '/favicon.ico?v=7', sizes: 'any' },
      { url: '/icon.png?v=7', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png?v=7', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=7', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png?v=7',
  },
  openGraph: {
    title: 'KNOT（ノット）| 宮崎の地域活動・体験予約プラットフォーム',
    description:
      'KNOTは宮崎県内の地域活動・体験会・イベントを探して申し込める予約プラットフォームです。あなたの「やってみたい」が、ここでつながる。',
    siteName: 'KNOT 宮崎',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/og-image.png?v=1',
        width: 1200,
        height: 630,
        alt: 'KNOT 宮崎',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KNOT（ノット）| 宮崎の地域活動・体験予約プラットフォーム',
    description:
      'KNOTは宮崎県内の地域活動・体験会・イベントを探して申し込める予約プラットフォームです。あなたの「やってみたい」が、ここでつながる。',
    images: ['/og-image.png?v=1'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#12181f' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`bg-background ${notoSansJP.variable} ${shipporiMincho.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
