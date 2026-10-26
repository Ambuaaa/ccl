'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { RecordsClient } from './records-client'

export default function RecordsPage() {
  return (
    <MainLayout>
      <RecordsClient />
    </MainLayout>
  )
}