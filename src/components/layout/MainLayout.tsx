'use client'

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className={cn('transition-all duration-300 min-h-screen', 'lg:ml-64')}>
        <Header />
        <main className="p-4 lg:p-6 pt-6" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
