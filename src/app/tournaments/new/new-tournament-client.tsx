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
import { ArrowLeft, Plus, Trophy, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/lib/actions/tournaments'
import { getPlayers } from '@/lib/actions/players'

interface Player {
  id: string
  display_name: string
  avatar_url: string | null
}

export function NewTournamentClient() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    format: 'single_round_robin_final' as 'single_round_robin_final' | 'double_round_robin_final' | 'custom',
    has_final: true,
    qualifiers_count: 2,
    points_for_win: 2,
    points_for_tie: 1,
    points_for_no_result: 1,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      start_date: prev.start_date || new Date().toISOString().slice(0, 10),
    }))
    loadData()
  }, [])

  async function loadData() {
    try {
      const targetClubId = await getClubId(supabase)

      const playersData = await getPlayers(targetClubId)
      if (playersData) {
        setPlayers(playersData)
        setSelectedPlayers(playersData.map(p => p.id))
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
    if (selectedPlayers.length < 2) {
      setError('Please select at least 2 players')
      return
    }
    if (!formData.name.trim()) {
      setError('Please enter a tournament name')
      return
    }

    setSubmitting(true)
    setError(null)

    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('description', formData.description)
    formDataObj.append('start_date', formData.start_date)
    if (formData.end_date) formDataObj.append('end_date', formData.end_date)
    formDataObj.append('format', formData.format)
    formDataObj.append('has_final', String(formData.has_final))
    formDataObj.append('qualifiers_count', String(formData.qualifiers_count))
    formDataObj.append('points_for_win', String(formData.points_for_win))
    formDataObj.append('points_for_tie', String(formData.points_for_tie))
    formDataObj.append('points_for_no_result', String(formData.points_for_no_result))
    selectedPlayers.forEach(id => formDataObj.append('player_ids', id))

    const result = await createTournament(formDataObj)
    
    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      router.push(`/tournaments/${result.tournament?.id}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tournaments" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">New Tournament</h1>
            <p className="text-slate-400">Create a new tournament</p>
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
        <Link href="/tournaments" className="text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Tournament</h1>
          <p className="text-slate-400">Create a new tournament</p>
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
              <Trophy className="h-5 w-5 text-yellow-400" />
              Tournament Details
            </CardTitle>
            <CardDescription>Basic information about this tournament</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                placeholder="e.g., Winter Cup 2026"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Tournament details, rules notes, etc."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Format & Rules
            </CardTitle>
            <CardDescription>Configure tournament format and scoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-green-600/50 bg-slate-800/50">
                  <input
                    type="radio"
                    name="format"
                    value="single_round_robin_final"
                    checked={formData.format === 'single_round_robin_final'}
                    onChange={e => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="font-medium text-white">Single RR + Final</span>
                    <span className="text-xs text-slate-500">3 players = 3 matches + final</span>
                  </div>
                </label>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-yellow-600/50 bg-slate-800/50">
                  <input
                    type="radio"
                    name="format"
                    value="double_round_robin_final"
                    checked={formData.format === 'double_round_robin_final'}
                    onChange={e => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="font-medium text-white">Double RR + Final</span>
                    <span className="text-xs text-slate-500">3 players = 6 matches + final</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>
                  <Checkbox
                    checked={formData.has_final}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, has_final: checked === true }))}
                  />
                  Has Final Match
                </Label>
              </div>
              {formData.has_final && (
                <div>
                  <Label htmlFor="qualifiers_count">Qualifiers for Final</Label>
                  <Select value={String(formData.qualifiers_count)} onValueChange={v => setFormData(prev => ({ ...prev, qualifiers_count: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 (Top 2)</SelectItem>
                      <SelectItem value="4">4 (Semi-finals)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div>
              <Label>Points System</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="points_for_win" className="text-xs text-slate-400">Win</Label>
                  <Input
                    id="points_for_win"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.points_for_win}
                    onChange={e => setFormData(prev => ({ ...prev, points_for_win: parseInt(e.target.value) || 2 }))}
                    className="text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="points_for_tie" className="text-xs text-slate-400">Tie</Label>
                  <Input
                    id="points_for_tie"
                    type="number"
                    min="0"
                    max="5"
                    value={formData.points_for_tie}
                    onChange={e => setFormData(prev => ({ ...prev, points_for_tie: parseInt(e.target.value) || 1 }))}
                    className="text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="points_for_no_result" className="text-xs text-slate-400">No Result</Label>
                  <Input
                    id="points_for_no_result"
                    type="number"
                    min="0"
                    max="5"
                    value={formData.points_for_no_result}
                    onChange={e => setFormData(prev => ({ ...prev, points_for_no_result: parseInt(e.target.value) || 1 }))}
                    className="text-center"
                  />
                </div>
              </div>
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
            <CardDescription>Select players for this tournament (minimum 2)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {players.map(player => (
                <label
                  key={player.id}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                    selectedPlayers.includes(player.id)
                      ? 'border-yellow-600 bg-yellow-600/10'
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
            {selectedPlayers.length < 2 && (
              <p className="text-sm text-red-400 mt-2">Please select at least 2 players</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" asChild>
            <Link href="/tournaments">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="bg-yellow-600 hover:bg-yellow-700">
            {submitting ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>
      </form>
    </div>
  )
}