'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileHeader, MobileBottomNav } from '@/components/layout/mobile-nav'

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

  // Fixed-height shell: on mobile the header sits above and the tab bar below
  // a scrollable <main>, so nothing ever overlaps content. Desktop keeps the
  // sidebar. [height:100dvh] tracks mobile browser chrome; h-screen is the
  // fallback where dvh is unsupported.
  return (
    <div className="flex h-screen [height:100dvh] bg-[var(--bg)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
