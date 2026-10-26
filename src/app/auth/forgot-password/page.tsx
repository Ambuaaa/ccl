'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Mail, KeyRound, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import { resetPasswordForEmail } from '@/lib/actions/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const result = await resetPasswordForEmail(email.trim())

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Password reset instructions sent to ${email.trim()}. Check your inbox!`)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-slate-900/90 border-slate-800 shadow-2xl relative z-10 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 shadow-lg shadow-green-900/30 text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Reset Password
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-lg bg-green-950/50 border border-green-800/50 text-green-300 text-sm flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-400" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="reset-email" className="text-slate-300 text-sm font-medium">
                Email Address
              </Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-green-500"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-md shadow-green-900/40 transition-all mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          <Separator className="bg-slate-800/80 my-4" />

          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-green-400 hover:text-green-300 font-medium"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
