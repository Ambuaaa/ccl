'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { NewSessionClient } from './new-session-client'

export default function NewSessionPage() {
  return (
    <MainLayout>
      <NewSessionClient />
    </MainLayout>
  )
}