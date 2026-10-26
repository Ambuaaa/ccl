'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { TournamentsClient } from './tournaments-client'

export default function TournamentsPage() {
  return (
    <MainLayout>
      <TournamentsClient />
    </MainLayout>
  )
}