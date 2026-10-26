'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { MatchDetailClient } from '../../[id]/match-detail-client'

interface MatchEditPageProps {
  params: Promise<{ id: string }>
}

export default function MatchEditPage({ params }: MatchEditPageProps) {
  return (
    <MainLayout>
      <MatchDetailClient params={params} />
    </MainLayout>
  )
}