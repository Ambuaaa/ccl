'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { SessionsClient } from './sessions-client'

export default function SessionsPage() {
  return (
    <MainLayout>
      <SessionsClient />
    </MainLayout>
  )
}