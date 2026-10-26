'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { RivalriesClient } from './rivalries-client'

export default function RivalriesPage() {
  return (
    <MainLayout>
      <RivalriesClient />
    </MainLayout>
  )
}