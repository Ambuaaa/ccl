'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { getClubId } from '@/lib/club'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, Calendar, Users, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSession } from '@/lib/actions/sessions'
import { getPlayers } from '@/lib/actions/players'
import { getTournaments } from '@/lib/actions/tournaments'

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
}

interface Tournament {
  id: string
  name: string
  status: string
}

export function NewSessionClient() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    session_date: '',
    session_type: 'casual' as 'casual' | 'tournament',
    notes: '',
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      session_date: prev.session_date || new Date().toISOString().slice(0, 10),
    }))
    loadData()
  }, [])

  async function loadData() {
    try {
      const targetClubId = await getClubId(supabase)

      // Load players
      const playersData = await getPlayers(targetClubId)
      if (playersData) {
        setPlayers(playersData)
        setSelectedPlayers(playersData.map(p => p.id))
      }

      // Load active/upcoming tournaments
      const tournamentsData = await getTournaments(targetClubId)
      if (tournamentsData) {
        const activeTournaments = tournamentsData.filter(t => 
          ['draft', 'upcoming', 'active'].includes(t.status)
        )
        setTournaments(activeTournaments)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePlayerToggle(playerId: string) {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player')
      return
    }
    if (formData.session_type === 'tournament' && !selectedTournament) {
      setError('Please select a tournament for tournament sessions')
      return
    }

    setSubmitting(true)
    setError(null)

    const formDataObj = new FormData()
    formDataObj.append('title', formData.title)
    formDataObj.append('session_date', formData.session_date)
    formDataObj.append('session_type', formData.session_type)
    formDataObj.append('notes', formData.notes)
    selectedPlayers.forEach(id => formDataObj.append('player_ids', id))
    if (selectedTournament) formDataObj.append('tournament_id', selectedTournament)

    const result = await createSession(formDataObj)
    
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      router.push(`/sessions/${result.session?.id}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/sessions" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">New Session</h1>
            <p className="text-slate-400">Create a new gaming session</p>
          </div>
        </div>
        <Card className="skeleton h-96" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/sessions" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Session</h1>
          <p className="text-slate-400">Create a new gaming session</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Session Details
            </CardTitle>
            <CardDescription>Basic information about this gaming session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Session Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Winter Break Gaming Night"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
              <p className="text-xs text-slate-500 mt-1">
                Leave blank for auto-generated title like "Gaming Session — 23 Oct 2026"
              </p>
            </div>

            <div>
              <Label htmlFor="session_date">Session Date</Label>
              <Input
                id="session_date"
                type="date"
                value={formData.session_date}
                onChange={e => setFormData(prev => ({ ...prev, session_date: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Session Type</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-green-600/50 bg-slate-800/50">
                  <input
                    type="radio"
                    name="session_type"
                    value="casual"
                    checked={formData.session_type === 'casual'}
                    onChange={e => setFormData(prev => ({ ...prev, session_type: e.target.value as 'casual' }))}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium text-white">Casual Play</span>
                    <span className="text-xs text-slate-500">Just for fun</span>
                  </div>
                </label>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-yellow-600/50 bg-slate-800/50">
                  <input
                    type="radio"
                    name="session_type"
                    value="tournament"
                    checked={formData.session_type === 'tournament'}
                    onChange={e => setFormData(prev => ({ ...prev, session_type: e.target.value as 'tournament' }))}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium text-white">Tournament</span>
                    <span className="text-xs text-slate-500">Part of a competition</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Location, special rules, memorable moments..."
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participating Players
            </CardTitle>
            <CardDescription>Select who played in this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {players.map(player => (
                <label
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    selectedPlayers.includes(player.id)
                      ? 'border-green-600 bg-green-600/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedPlayers.includes(player.id)}
                    onCheckedChange={() => handlePlayerToggle(player.id)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-white">{player.display_name}</p>
                    <p className="text-xs text-slate-500">Player</p>
                  </div>
                </label>
              ))}
            </div>
            {selectedPlayers.length === 0 && (
              <p className="text-sm text-red-400 mt-2">Please select at least one player</p>
            )}
          </CardContent>
        </Card>

        {/* Tournament Selection */}
        {formData.session_type === 'tournament' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Tournament
              </CardTitle>
              <CardDescription>Link this session to a tournament</CardDescription>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <div className="p-4 rounded-lg bg-yellow-600/10 border border-yellow-600/30 text-yellow-400 text-sm">
                  No active tournaments found. <Link href="/tournaments/new" className="underline">Create one first</Link>.
                </div>
              ) : (
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournaments.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" asChild>
            <Link href="/sessions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
            {submitting ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </form>
    </div>
  )
}