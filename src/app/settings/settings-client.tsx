'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Settings,
  Users,
  Shield,
  Bell,
  Palette,
  Database,
  LogOut,
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { signOut } from '@/lib/actions/auth'
import { useRouter } from 'next/navigation'

interface Club {
  id: string
  name: string
  slug: string | null
}

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
  user_id: string | null
  is_active: boolean
}

export function SettingsClient() {
  const router = useRouter()
  const [club, setClub] = useState<Club | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [clubName, setClubName] = useState('')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const targetClubId = await getClubId(supabase)

      const { data: clubData } = await supabase
        .from('clubs')
        .select('id, name, slug')
        .eq('id', targetClubId)
        .maybeSingle()

      if (clubData) {
        setClub(clubData as unknown as Club)
        setClubName(clubData.name || '')
      }

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', targetClubId)
        .order('display_name')

      if (playersData) setPlayers(playersData)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveClub() {
    if (!club) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase
        .from('clubs')
        .update({ name: clubName })
        .eq('id', club.id)

      if (error) throw error
      setSuccess('Club name updated successfully')
    } catch (err) {
      setError('Failed to update club name')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400">Manage your league and club settings</p>
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your league and club settings</p>
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

      <Tabs defaultValue="club" className="space-y-6">
        <TabsList className="bg-slate-900/50">
          <TabsTrigger value="club">
            <Settings className="mr-2 h-4 w-4" />
            Club
          </TabsTrigger>
          <TabsTrigger value="players">
            <Users className="mr-2 h-4 w-4" />
            Players
          </TabsTrigger>
        </TabsList>

        {/* Club Settings */}
        <TabsContent value="club">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Club Details
              </CardTitle>
              <CardDescription>Manage your club's basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="club_name">Club Name</Label>
                <Input
                  id="club_name"
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  placeholder="Enter club name"
                />
              </div>
              <div>
                <Label>Club Slug</Label>
                <Input value={club?.slug || '—'} disabled />
                <p className="text-xs text-slate-500 mt-1">Slug cannot be changed after creation</p>
              </div>
              <div>
                <Label>Club ID</Label>
                <Input value={club?.id || '—'} disabled />
              </div>
              <Button onClick={handleSaveClub} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Players Settings */}
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Club Players
              </CardTitle>
              <CardDescription>Manage player profiles and link accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <div className="empty-state py-8">
                  <Users className="empty-state-icon h-12 w-12" />
                  <h3 className="empty-state-title">No players yet</h3>
                  <p className="empty-state-description">Players will appear here after they sign up.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {players.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={player.avatar_url || ''} alt={player.display_name} />
                          <AvatarFallback className="bg-slate-700 text-slate-300">
                            {player.display_name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{player.display_name}</p>
                          <p className="text-sm text-slate-400">
                            {player.user_id ? 'Linked to account' : 'No account linked'}
                            {player.is_active ? ' · Active' : ' · Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(player.is_active ? 'badge-green' : 'badge-slate')}>
                          {player.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}