'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/learn', label: 'Learn', icon: '📖' },
  { href: '/speak', label: 'Speak', icon: '🎙️' },
  { href: '/vocabulary', label: 'Vocabulary', icon: '🃏' },
  { href: '/progress', label: 'Progress', icon: '📊' },
  { href: '/premium', label: 'Premium', icon: '✨' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-[var(--border)] bg-[var(--surface-2)] px-3 py-6">
      {/* Logo */}
      <Link href="/dashboard" className="px-3 mb-8 block">
        <span className="text-xl font-black gold-text">Sprich</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#d4a843]/10 text-[var(--gold)]'
                  : 'text-[var(--faint)] hover:text-[var(--text)] hover:bg-[var(--overlay)]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-[var(--border)] pt-4 px-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-black font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-[var(--faint)] truncate">{user?.level ?? 'A1'} · {user?.xp ?? 0} XP</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={logout} className="text-xs text-[var(--faint-2)] hover:text-[var(--muted)] transition-colors">
            Log out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
