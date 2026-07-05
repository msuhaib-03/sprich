'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Sub {
  plan: string
  status: string
  currentPeriodEnd?: string | null
}

const COMPARISON: { feature: string; free: string; premium: string }[] = [
  { feature: 'Lessons per day', free: '2', premium: 'Unlimited' },
  { feature: 'Levels', free: 'A1 only', premium: 'A1 → C2' },
  { feature: 'AI conversation practice', free: '5 min / day', premium: 'Unlimited' },
  { feature: 'Speaking analysis', free: 'Basic', premium: 'Detailed (hesitation, speed, accent)' },
  { feature: 'Certificates', free: '—', premium: 'All levels' },
  { feature: 'Job-specific vocab packs', free: '—', premium: 'Included' },
  { feature: 'Offline mode', free: '—', premium: 'Yes' },
  { feature: 'Progress reports', free: 'Weekly', premium: 'Daily' },
]

export default function PremiumPage() {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual')
  const [sub, setSub] = useState<Sub | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Sub>('/subscriptions/me').then(setSub).catch(() => setSub(null))
  }, [])

  const isPremium = !!sub && sub.plan !== 'free'

  async function upgrade() {
    setError('')
    setLoading(true)
    try {
      const plan = cycle === 'monthly' ? 'premium_monthly' : 'premium_annual'
      const res = await api.post<{ url: string }>('/subscriptions/checkout', { plan })
      if (res.url) window.location.href = res.url
      else setError('Could not start checkout. Please try again.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payments are not available right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <p className="text-[#d4a843] text-sm mb-1">✨ Premium</p>
        <h1 className="text-3xl font-black">Unlock the full journey</h1>
        <p className="text-[#888] mt-2">From A1 to C2, unlimited speaking, and certificates you can share.</p>
      </div>

      {isPremium ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center mb-8">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-bold text-lg">You&apos;re on Premium</p>
          <p className="text-[#888] text-sm mt-1">
            {sub?.currentPeriodEnd
              ? `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
              : 'Enjoy full access to everything Sprich offers.'}
          </p>
        </div>
      ) : (
        <>
          {/* Cycle toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-xl border border-white/10 bg-[#111] p-1">
              {(['monthly', 'annual'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                    cycle === c ? 'gold-gradient text-black' : 'text-[#888] hover:text-white'
                  }`}
                >
                  {c}
                  {c === 'annual' && <span className="ml-1.5 text-xs opacity-80">save 34%</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Price card */}
          <div className="rounded-2xl border border-[#d4a843]/30 bg-gradient-to-br from-[#d4a843]/8 to-transparent p-8 text-center mb-8">
            <p className="text-5xl font-black">
              {cycle === 'monthly' ? '$9.99' : '$79'}
              <span className="text-lg text-[#888] font-normal">/{cycle === 'monthly' ? 'mo' : 'yr'}</span>
            </p>
            {cycle === 'annual' && (
              <p className="text-[#888] text-sm mt-1">Just $6.58/month, billed yearly</p>
            )}
            <button
              onClick={upgrade}
              disabled={loading}
              className="mt-6 w-full py-3.5 rounded-xl gold-gradient text-black font-bold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-black/40 border-t-transparent rounded-full animate-spin" />
              )}
              Upgrade to Premium →
            </button>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            <p className="text-[#555] text-xs mt-3">Cancel anytime. Secure checkout via Stripe.</p>
          </div>
        </>
      )}

      {/* Comparison */}
      <div className="rounded-2xl border border-white/8 bg-[#111] overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] text-sm">
          <div className="px-4 py-3 text-[#555] font-medium">Feature</div>
          <div className="px-4 py-3 text-[#888] font-medium text-center border-l border-white/5">Free</div>
          <div className="px-4 py-3 gold-text font-bold text-center border-l border-white/5">Premium</div>
          {COMPARISON.map((row, i) => (
            <div key={i} className="contents">
              <div className={`px-4 py-3 border-t border-white/5 ${i % 2 ? 'bg-white/[0.015]' : ''}`}>
                {row.feature}
              </div>
              <div className={`px-4 py-3 text-center text-[#888] border-t border-l border-white/5 ${i % 2 ? 'bg-white/[0.015]' : ''}`}>
                {row.free}
              </div>
              <div className={`px-4 py-3 text-center text-white border-t border-l border-white/5 ${i % 2 ? 'bg-white/[0.015]' : ''}`}>
                {row.premium}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
