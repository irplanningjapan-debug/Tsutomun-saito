'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#0066FF] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
    >
      <Printer size={16} />
      PDF保存・印刷する
    </button>
  )
}
