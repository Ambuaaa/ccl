'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { StandingsClient } from './standings-client'

export default function StandingsPage() {
  return (
    <MainLayout>
      <StandingsClient />
    </MainLayout>
  )
}