'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  CalendarClock,
  BarChart2,
  Users,
  GitBranch,
  Award,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Sessions', href: '/sessions', icon: Calendar },
  { name: 'Tournaments', href: '/tournaments', icon: Trophy },
  { name: 'Fixtures & Results', href: '/fixtures', icon: CalendarClock },
  { name: 'Standings', href: '/standings', icon: BarChart2 },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Rivalries', href: '/rivalries', icon: GitBranch },
  { name: 'Records', href: '/records', icon: Award },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Cousins Cricket League">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-white">CCL</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-slate-400 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1" role="navigation" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-green-600/20 text-green-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                collapsed && 'justify-center'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-3" aria-hidden={collapsed}>
        <p className="text-xs text-slate-500 text-center">v1.0.0</p>
      </div>
    </aside>
  )
}