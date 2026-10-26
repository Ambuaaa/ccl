'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { FixturesClient } from './fixtures-client'

export default function FixturesPage() {
  return (
    <MainLayout>
      <FixturesClient />
    </MainLayout>
  )
}