'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  setUser: (user: User) => void
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

const STORAGE_KEY = 'dolang-auth'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: async () => {
        // Clears the HttpOnly session cookie server-side.
        try {
          await api.post('/auth/logout', {})
        } catch {
          // best effort — still drop local state
        }
        set({ user: null })
        if (typeof window !== 'undefined') {
          // Drop the persisted profile now; the hard nav below can otherwise
          // fire before zustand-persist flushes, leaving a stale user behind.
          try {
            window.localStorage.removeItem(STORAGE_KEY)
          } catch {
            /* private mode / storage disabled */
          }
          window.location.href = '/login'
        }
      },
    }),
    {
      name: STORAGE_KEY,
      // Cache the profile for a flash-free reload; the cookie is the real
      // source of truth and is re-verified on mount.
      partialize: (s) => ({ user: s.user }),
    },
  ),
)
