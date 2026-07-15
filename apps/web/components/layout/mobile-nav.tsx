'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// The five daily-use destinations live in the bottom tab bar (app-style).
// Leaderboard + Premium are reachable from the top header to keep the bar
// uncluttered — five tabs is the comfortable maximum on a ~360px screen.
const TABS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/learn', label: 'Learn', icon: '📖' },
  { href: '/speak', label: 'Speak', icon: '🎙️' },
  { href: '/vocabulary', label: 'Vocab', icon: '🃏' },
  { href: '/progress', label: 'Progress', icon: '📊' },
]

export function MobileHeader() {
  const { user, logout } = useAuthStore()

  return (
    <header className="md:hidden shrink-0 flex items-center justify-between gap-2 px-4 h-14 border-b border-[var(--border)] bg-[var(--surface-2)]">
      <Link href="/dashboard" className="flex items-baseline gap-2 min-w-0">
        <span className="text-lg font-black gold-text">Sprich</span>
        <span className="text-[11px] text-[var(--faint)] truncate">
          {user?.level ?? 'A1'} · {user?.xp ?? 0} XP
        </span>
      </Link>
      <div className="flex items-center gap-1">
        <Link
          href="/leaderboard"
          aria-label="Leaderboard"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base hover:bg-[var(--overlay)]"
        >
          🏆
        </Link>
        <Link
          href="/premium"
          aria-label="Premium"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base hover:bg-[var(--overlay)]"
        >
          ✨
        </Link>
        <ThemeToggle />
        <button
          onClick={logout}
          aria-label="Log out"
          className="w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-red-400 hover:border-red-400/40 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden shrink-0 border-t border-[var(--border)] bg-[var(--surface-2)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium transition-colors ${
                active ? 'text-[var(--gold)]' : 'text-[var(--faint)] hover:text-[var(--text)]'
              }`}
            >
              <span className={`text-lg leading-none ${active ? '' : 'grayscale opacity-80'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
