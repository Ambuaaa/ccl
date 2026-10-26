'use client'

import { Button } from '@/components/ui/button'
import { Plus, Users, Trophy } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">
            Cousins Cricket League
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hidden sm:inline-flex">
            <Link href="/tournaments">
              <Trophy className="mr-1.5 h-4 w-4 text-amber-400" />
              Tournaments
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:text-white hidden sm:inline-flex">
            <Link href="/players">
              <Users className="mr-1.5 h-4 w-4 text-green-400" />
              Players
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            <Link href="/sessions/new">
              <Plus className="mr-1 h-4 w-4" />
              New Match
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}