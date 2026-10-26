'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, UserPlus, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPlayer } from '@/lib/actions/players'
import { getInitials } from '@/lib/utils'

export default function NewPlayerPage() {
  return (
    <MainLayout>
      <NewPlayerForm />
    </MainLayout>
  )
}

function NewPlayerForm() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Please enter a player name')
      return
    }

    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.append('display_name', displayName.trim())
    formData.append('avatar_url', avatarUrl.trim())

    const result = await createPlayer(formData)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push('/players')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/players" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Player</h1>
          <p className="text-slate-400">Create a profile for a cousin or guest player</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Player Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={displayName || 'Player'} />
                <AvatarFallback className="bg-slate-700 text-slate-300 text-2xl">
                  {displayName ? getInitials(displayName) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar_url">Avatar URL (optional)</Label>
                <Input
                  id="avatar_url"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Rahul"
                required
                disabled={saving}
              />
              <p className="text-xs text-slate-500 mt-1">
                This name will appear on scorecards, standings, and records.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" asChild>
            <Link href="/players">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Player'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
