'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { PlayersClient } from './players-client'

export default function PlayersPage() {
  return (
    <MainLayout>
      <PlayersClient />
    </MainLayout>
  )
}