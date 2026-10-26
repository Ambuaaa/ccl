'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { NewTournamentClient } from './new-tournament-client'

export default function NewTournamentPage() {
  return (
    <MainLayout>
      <NewTournamentClient />
    </MainLayout>
  )
}