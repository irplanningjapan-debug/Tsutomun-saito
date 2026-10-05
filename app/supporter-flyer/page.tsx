import type { Metadata } from 'next'
import Image from 'next/image'
import { HandHeart, Heart, MessageCircleHeart, Milestone, ScanLine, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { PrintButton } from './print-button'

export const metadata: Metadata = {
  title: 'つとむんサポーター募集案内 | つとむん',
  description: '地域ワークプラットフォーム「つとむん」の相談・掲載サポート窓口「つとむんサポーター」募集のご案内チラシです。',
}

const tasks = [
  {
    icon: HandHeart,
    title: '店頭・受付への案内チラシ設置＆サポーターステッカー掲示',
    body: 'お店や施設の目立つ場所にチラシとステッカーを置いていただくだけでOKです。',
  },
  {
    icon: MessageCircleHeart,
    title: '「これどうやって載せるの？」への最初の一声',
    body: 'デジタルが苦手な地域の方に、スマホ画面を一緒に開く程度の声かけをお願いします。',
  },
  {
    icon: ScanLine,
    title: '専門的な相談・操作の困りごとは事務局（Tameni）へパス',
    body: '難しい内容は抱え込まず、そのまま運営事務局にお繋ぎいただくだけで大丈夫です。',
  },
]

const merits = [
  {
    icon: ShieldCheck,
    title: '認定特別バッジを掲示',
    body: 'KNOT公式サイトにて「◯◯市 公式サポート窓口」として掲載されます。',
  },
  {
    icon: Users,
    title: '来店・交流の促進',
    body: '相談をきっかけに、地域住民や活動団体の方が店舗・施設に足を運ぶきっかけになります。',
  },
  {
    icon: Heart,
    title: '認知・信頼性の向上',
    body: '「地域のコミュニティ活動を応援する企業・団体」として認知・信頼を高めます。',
  },
]

// A4縦・片面の印刷専用チラシ。@page指定と印刷時の周辺UI非表示（.no-print）はこのページ内の
// globals.css追記分（print-flyer.css は使わず同ファイル内メディアクエリ）で制御している。
export default function SupporterFlyerPage() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-slate-100 py-8 print:min-h-0 print:bg-white print:py-0">
      <div className="no-print flex flex-col items-center gap-2 px-4 text-center">
        <p className="text-sm font-bold text-slate-500">A4・縦・片面 印刷用チラシプレビュー</p>
        <PrintButton />
      </div>

      <main
        aria-label="つとむんサポーター募集案内チラシ"
        className="flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white text-[#12183a] shadow-xl print:h-[297mm] print:w-[210mm] print:shadow-none"
      >
        {/* ヘッダー */}
        <header className="relative flex flex-col gap-3 bg-[#0066FF] px-[14mm] pb-[9mm] pt-[10mm] text-white">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-lg font-black text-[#0066FF]">K</span>
            <div className="leading-none">
              <p className="text-[10px] font-bold text-white/80">みやざき</p>
              <p className="text-lg font-black tracking-tight">KNOT</p>
            </div>
          </div>
          <div>
            <h1 className="text-[26px] font-black leading-tight tracking-tight">
              「KNOTサポーター」<br />募集のご案内
            </h1>
            <p className="mt-2 max-w-[145mm] text-[12px] font-bold leading-6 text-white/95">
              各市町村に1つの「つとむん」を。地域ワークと人をリアルで繋ぐ公式窓口になりませんか？
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-[6mm] px-[14mm] py-[7mm]">
          {/* コンセプト枠 */}
          <section className="flex items-start gap-3 rounded-2xl border border-[#0066FF]/25 bg-[#0066FF]/[0.05] px-[6mm] py-[5mm]">
            <Milestone size={20} className="mt-0.5 shrink-0 text-[#0066FF]" />
            <p className="text-[11.5px] leading-6 text-slate-700">
              <span className="mr-1.5 rounded-full bg-[#0066FF] px-2.5 py-0.5 text-[11px] font-black text-white">Webは道具、主役は人</span>
              デジタルが苦手な方でも安心して活動を発信できるよう、地域の顔が見える相談窓口ネットワークをつくります。
            </p>
          </section>

          {/* お願いしたいこと */}
          <section>
            <SectionHeading eyebrow="ASK" title="お願いしたいこと" note="無理のない3つのサポート" />
            <div className="mt-[3.5mm] grid gap-[3mm]">
              {tasks.map((task, index) => (
                <div key={task.title} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-[5mm] py-[4mm]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0066FF] text-xs font-black text-white">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-black leading-5 text-[#12183a]">
                      <task.icon size={14} className="shrink-0 text-[#0066FF]" />
                      {task.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-600">{task.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* メリット */}
          <section>
            <SectionHeading eyebrow="MERIT" title="サポーター（パートナー）のメリット" />
            <div className="mt-[3.5mm] grid grid-cols-3 gap-[3mm]">
              {merits.map((merit) => (
                <div key={merit.title} className="flex flex-col gap-1.5 rounded-2xl border border-[#0066FF]/20 bg-white px-[4mm] py-[4mm]">
                  <merit.icon size={16} className="text-[#0066FF]" />
                  <p className="text-[11px] font-black leading-5 text-[#12183a]">{merit.title}</p>
                  <p className="text-[10px] leading-[15px] text-slate-600">{merit.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ステッカー紹介枠 */}
          <section className="mt-auto flex items-center gap-[6mm] rounded-2xl border border-[#0066FF]/20 bg-gradient-to-r from-[#eaf2ff] to-white px-[6mm] py-[5mm]">
            <div className="relative size-[26mm] shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
              <Image src="/images/knot-supporter-sticker.png" alt="KNOT公式サポーターステッカーのイメージ" fill sizes="26mm" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[12px] font-black text-[#0066FF]">
                <Sparkles size={14} />
                プレゼント
              </p>
              <p className="mt-1 text-[11.5px] font-bold leading-5 text-slate-700">
                公式サポーターステッカー（店頭・卓上用）を進呈いたします
              </p>
            </div>
          </section>
        </div>

        {/* フッター */}
        <footer className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-[14mm] py-[6mm]">
          <div>
            <p className="text-[10px] font-bold text-slate-400">企画・運営</p>
            <p className="text-[12px] font-black text-[#12183a]">株式会社Tameni（つとむん運営事務局）</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400">お問い合わせ・お申し込み窓口</p>
            <p className="text-[11.5px] font-black text-[#12183a]">公式LINE：@knot-miyazaki</p>
            <p className="text-[11.5px] font-black text-[#12183a]">メール：info@tamenijapan.com</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

function SectionHeading({ eyebrow, title, note }: { eyebrow: string; title: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b-2 border-[#0066FF] pb-1.5">
      <span className="rounded bg-[#12183a] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white">{eyebrow}</span>
      <h2 className="text-[15px] font-black text-[#12183a]">{title}</h2>
      {note && <span className="text-[10px] font-bold text-slate-500">（{note}）</span>}
    </div>
  )
}
