import type { Metadata } from 'next'
import { AdminDashboard } from '@/components/knot/admin/admin-dashboard'

export const metadata: Metadata = {
  title: 'つとむん 管理ダッシュボード | Tameni運営者用',
description: 'つとむんの会員名簿・サポート情報URL・お問い合わせ一覧を管理するTameni運営者向けダッシュボードです。',
}

export default function AdminPage() {
  return <AdminDashboard />
}
