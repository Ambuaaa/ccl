'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { SettingsClient } from './settings-client'

export default function SettingsPage() {
  return (
    <MainLayout>
      <SettingsClient />
    </MainLayout>
  )
}