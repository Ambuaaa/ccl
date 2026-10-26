'use client'

import { MainLayout } from '@/components/layout/MainLayout'
import { DashboardClient } from './dashboard-client'

export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardClient />
    </MainLayout>
  )
}