'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { MatchDetailClient } from './match-detail-client'

interface MatchDetailPageProps {
  params: Promise<{ id: string }>
}

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  return (
    <MainLayout>
      <MatchDetailClient params={params} />
    </MainLayout>
  )
}