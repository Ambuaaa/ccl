'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { TournamentDetailClient } from '../../[id]/tournament-detail-client'

interface TournamentEditPageProps {
  params: Promise<{ id: string }>
}

export default function TournamentEditPage({ params }: TournamentEditPageProps) {
  return (
    <MainLayout>
      <TournamentDetailClient params={params} />
    </MainLayout>
  )
}