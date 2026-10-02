'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useKnot } from '@/lib/knot/store'

type Applicant = {
  name: string
  phone: string
  email: string
  breakdown: string
  note: string
}

export function ApplicantListModal() {
  const { applicantListActivity, setApplicantListActivity } = useKnot()
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)

  // Goes through /api/organizer/participation-applicants (server-side, service-role key)
  // instead of querying participation_applications directly with the browser's anon-key
  // client: that table has RLS enabled with no SELECT policy, so the anon-key client always
  // got back zero rows here, which is why this modal always showed "まだ申込者はいません" even
  // after applicants had submitted. The API route also verifies the caller actually owns
  // this activity before returning anything.
  useEffect(() => {
    if (!applicantListActivity) return
    setLoading(true)
    fetch(`/api/organizer/participation-applicants?title=${encodeURIComponent(applicantListActivity.title)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok) {
          console.log('[v0] Failed to load applicants:', body?.error)
          return
        }
        const rows = (body?.applicants ?? []) as {
          applicant_name: string | null
          applicant_phone: string | null
          applicant_email: string | null
          participant_breakdown: string | null
          group_size: string | null
          question: string | null
        }[]
        setApplicants(
          rows.map((row) => ({
            name: row.applicant_name ?? '（未入力）',
            phone: row.applicant_phone ?? '未入力',
            email: row.applicant_email ?? '未入力',
            breakdown: row.participant_breakdown || row.group_size || '未入力',
            note: row.question || '特になし',
          })),
        )
      })
      .finally(() => setLoading(false))
  }, [applicantListActivity])

  if (!applicantListActivity) return null

  const handleExportXlsx = () => {
    const header = ['氏名', '電話番号', 'メールアドレス', '参加人数/内訳', '質問・事前連絡']
    const rows = applicants.map((applicant) => [applicant.name, applicant.phone, applicant.email, applicant.breakdown, applicant.note])
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows])
    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1')
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]
      if (cell) {
        cell.t = 's'
        cell.z = '@'
      }
    }
    worksheet['!cols'] = header.map(() => ({ wch: 20 }))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '申込者一覧')
    const filename = `${applicantListActivity.title.replace(/[【】\s]/g, '')}_申込者一覧.xlsx`
    XLSX.writeFile(workbook, filename, { bookType: 'xlsx' })
  }

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setApplicantListActivity(null)}>
      <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-primary">申込管理</p>
            <h2 className="mt-1 text-xl font-black">申込者一覧</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={applicants.length === 0}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-primary hover:text-primary disabled:opacity-40"
            >
              <Download size={14} />申込者一覧Excelダウンロード（.xlsx）
            </button>
            <button type="button" onClick={() => setApplicantListActivity(null)} aria-label="閉じる" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100"><X size={18} /></button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">{applicantListActivity.title}</p>
        <div className="mt-5 space-y-3">
          {loading && <p className="py-8 text-center text-sm font-bold text-slate-400">読み込み中...</p>}
          {!loading && applicants.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">まだ申込者はいません</p>}
          {applicants.map((applicant, index) => (
            <article key={index} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="font-black">{applicant.name}</p>
                <p>電話番号：{applicant.phone}</p>
                <p>メール：{applicant.email}</p>
                <p>参加人数/区分：{applicant.breakdown}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">質問・事前連絡：{applicant.note}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
