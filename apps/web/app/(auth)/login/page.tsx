'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore, type User } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post<{ accessToken: string; user: User }>('/auth/login', form)
      setAuth(res.accessToken, res.user)
      // If onboarding not done, send there; otherwise dashboard
      const needsOnboarding = !res.user.profile || !res.user.goal
      router.push(needsOnboarding ? '/onboarding' : '/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black gold-text">Sprich</Link>
          <p className="text-[var(--faint)] text-sm mt-1">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2">
            Log in
          </Button>
        </form>

        <p className="text-center text-[var(--faint)] text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[var(--gold)] hover:text-[var(--gold-light)]">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
