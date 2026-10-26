'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { PlayerProfileClient } from './player-profile-client'

interface PlayerProfilePageProps {
  params: Promise<{ id: string }>
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  return (
    <MainLayout>
      <PlayerProfileClient params={params} />
    </MainLayout>
  )
}