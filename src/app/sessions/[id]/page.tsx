'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { SessionDetailClient } from './session-detail-client'

interface SessionDetailPageProps {
  params: Promise<{ id: string }>
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  return (
    <MainLayout>
      <SessionDetailClient params={params} />
    </MainLayout>
  )
}