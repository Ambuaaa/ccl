'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { SessionDetailClient } from '../../[id]/session-detail-client'

interface SessionEditPageProps {
  params: Promise<{ id: string }>
}

export default function SessionEditPage({ params }: SessionEditPageProps) {
  return (
    <MainLayout>
      <SessionDetailClient params={params} />
    </MainLayout>
  )
}