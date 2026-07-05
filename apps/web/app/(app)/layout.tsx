'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)

  // The auth store is restored from localStorage asynchronously. Until that
  // finishes, `token` is null even for logged-in users — so we must wait for
  // hydration before deciding to redirect, or a hard reload kicks you to login.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated())
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  useEffect(() => {
    if (hydrated && !token) router.replace('/login')
  }, [hydrated, token, router])

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg)]">
        <span className="w-6 h-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!token) return null

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
