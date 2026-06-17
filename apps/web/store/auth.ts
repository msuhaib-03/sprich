'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
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
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('sprich_token', token)
        set({ token, user })
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('sprich_token')
        set({ token: null, user: null })
      },
    }),
    { name: 'sprich-auth', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
)
