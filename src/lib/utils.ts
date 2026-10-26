import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (typeof window === 'undefined') {
    return formatDate(d)
  }
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function ballsToOvers(balls: number): string {
  const overs = Math.floor(balls / 6)
  const remainingBalls = balls % 6
  return `${overs}.${remainingBalls}`
}

export function oversToBalls(overs: string): number {
  const parts = overs.split('.')
  const wholeOvers = parseInt(parts[0]) || 0
  const balls = parseInt(parts[1]) || 0
  return wholeOvers * 6 + balls
}

export function calculateNRR(
  runsScored: number,
  ballsFaced: number,
  runsConceded: number,
  ballsBowled: number
): number | null {
  if (ballsFaced === 0 || ballsBowled === 0) return null
  const runRateFor = (runsScored / ballsFaced) * 6
  const runRateAgainst = (runsConceded / ballsBowled) * 6
  return Math.round((runRateFor - runRateAgainst) * 1000) / 1000
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}