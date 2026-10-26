'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Save, User, Camera, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updatePlayer } from '@/lib/actions/players'

interface PlayerEditPageProps {
  params: Promise<{ id: string }>
}

export default function PlayerEditPage({ params }: PlayerEditPageProps) {
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadPlayer()
  }, [params])

  async function loadPlayer() {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', (await params).id)
        .single()

      if (error) throw error
      setPlayer(data)
      if (data.avatar_url) setAvatarPreview(data.avatar_url)
    } catch (error) {
      console.error('Error loading player:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!player) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('display_name', player.display_name)
    formData.append('avatar_url', player.avatar_url || '')
    formData.append('is_active', String(player.is_active))

    const result = await updatePlayer(player.id, formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Player updated successfully')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/players" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="skeleton h-8 w-48" />
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="empty-state">
        <User className="empty-state-icon h-12 w-12" />
        <h3 className="empty-state-title">Player not found</h3>
        <Button asChild className="mt-4">
          <Link href="/players">Back to Players</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/players" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Player</h1>
          <p className="text-slate-400">Update player profile</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarPreview || player.avatar_url || ''} alt={player.display_name} />
                <AvatarFallback className="bg-slate-700 text-slate-300 text-2xl">
                  {player.display_name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Avatar URL</p>
                <Input
                  value={player.avatar_url || ''}
                  onChange={e => {
                    const url = e.target.value
                    setPlayer((prev: any) => prev ? { ...prev, avatar_url: url } : null)
                    if (url) setAvatarPreview(url)
                  }}
                  placeholder="https://example.com/avatar.png"
                />
                <p className="text-xs text-slate-500">Enter a direct image URL</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={player.display_name}
                onChange={e => setPlayer((prev: any) => prev ? { ...prev, display_name: e.target.value } : null)}
                required
              />
            </div>

            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="is_active"
                checked={player.is_active}
                onChange={e => setPlayer((prev: any) => prev ? { ...prev, is_active: e.target.checked } : null)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-green-600 focus:ring-green-600"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active Player
              </Label>
            </div>

            {player.user_id && (
              <div className="p-3 rounded-lg bg-green-600/10 border border-green-600/30">
                <p className="text-sm text-green-400">
                  This player is linked to a user account.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" asChild>
            <Link href="/players">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}