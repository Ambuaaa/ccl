'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { TournamentDetailClient } from './tournament-detail-client'

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>
}

export default function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  return (
    <MainLayout>
      <TournamentDetailClient params={params} />
    </MainLayout>
  )
}