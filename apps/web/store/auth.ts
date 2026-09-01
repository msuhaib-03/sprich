'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  // `true` once we've checked the session (via /users/me) at least once this
  // load — lets route guards tell "not logged in" from "not checked yet".
  ready: boolean
  setUser: (user: User) => void
  setReady: (ready: boolean) => void
  logout: () => Promise<void>
}

export interface User {
  id: string
  email: string
  name: string
  level: string
  profile: string | null
  goal: string | null
  dailyMinutes: number
  streak: number
  xp: number
  isPremium?: boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      ready: false,
      setUser: (user) => set({ user, ready: true }),
      setReady: (ready) => set({ ready }),
      logout: async () => {
        // Clears the HttpOnly session cookie server-side.
        try {
          await api.post('/auth/logout', {})
        } catch {
          // best effort — still drop local state
        }
        set({ user: null, ready: true })
        // Hard nav so no in-memory state survives into the logged-out app.
        if (typeof window !== 'undefined') window.location.href = '/login'
      },
    }),
    {
      name: 'dolang-auth',
      // Cache the profile for a flash-free reload; the cookie is the real
      // source of truth and is re-verified on mount.
      partialize: (s) => ({ user: s.user }),
    },
  ),
)
