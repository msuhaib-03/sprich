'use client'

import Link from 'next/link'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const PROBLEMS = [
  {
    app: 'Duolingo',
    problem: 'Teaches you sentences. Never tells you WHY the article changed.',
  },
  {
    app: 'Babbel',
    problem: 'Vocabulary lists with no grammar context. You memorize, not understand.',
  },
  {
    app: 'Apps like GoGermany',
    problem: 'Look like blogs. Feel like blogs. No real learning happens.',
  },
]

const FEATURES = [
  {
    icon: '🧠',
    title: 'The WHY behind every rule',
    desc: 'When "der" becomes "den", we tell you exactly why — with color-coded grammar breakdowns. No more blind memorization.',
  },
  {
    icon: '🗣️',
    title: 'AI Conversation Partner',
    desc: 'Practice speaking with an AI that corrects your grammar, tracks your hesitation, and gradually adds pressure — like a real German would.',
  },
  {
    icon: '📈',
    title: 'Spaced Repetition, properly',
    desc: 'Vocabulary reviews scheduled exactly when your brain is about to forget — based on the SM-2 algorithm used by memory champions.',
  },
  {
    icon: '🎯',
    title: 'Goal-aware curriculum',
    desc: 'Job in Germany? Visa? Citizenship? Student? The path adapts to your actual life — not a one-size-fits-all course.',
  },
  {
    icon: '🏟️',
    title: 'Public Speaking Ladder',
    desc: 'From speaking to an AI alone → under time pressure → with background noise → real-world simulations. We train you to not freeze.',
  },
  {
    icon: '📜',
    title: 'Level Certificates',
    desc: 'Complete A1 through C2 with certificates you can share on LinkedIn and show to German employers.',
  },
]

const COMPARISON = [
  { feature: 'Grammar with reasoning (WHY)', sprich: true, duolingo: false, babbel: false },
  { feature: 'Color-coded case breakdowns', sprich: true, duolingo: false, babbel: false },
  { feature: 'AI conversation practice', sprich: true, duolingo: false, babbel: true },
  { feature: 'Public speaking confidence training', sprich: true, duolingo: false, babbel: false },
  { feature: 'Spaced repetition vocabulary', sprich: true, duolingo: true, babbel: true },
  { feature: 'Goal-personalized curriculum', sprich: true, duolingo: false, babbel: false },
  { feature: 'Level certificates', sprich: true, duolingo: false, babbel: true },
  { feature: 'Smart daily coach (not guilt streaks)', sprich: true, duolingo: false, babbel: false },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#fafafa]">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight gold-text">Sprich</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-[#888] hover:text-white">Log in</Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 rounded-lg gold-gradient text-black font-semibold hover:opacity-90"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/5 text-[#d4a843] text-xs font-medium mb-8">
          🇩🇪 The first German app that teaches you WHY
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto">
          Stop memorizing.<br />
          <span className="gold-text">Start understanding.</span>
        </h1>

        <p className="text-lg md:text-xl text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed">
          Duolingo gives you sentences. We give you the grammar logic behind them.
          From complete beginner to C2 — with real reasoning, AI speaking practice,
          and the confidence to use German in public.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="px-8 py-4 rounded-xl gold-gradient text-black font-bold text-lg hover:opacity-90 w-full sm:w-auto"
          >
            Start learning — it&apos;s free
          </Link>
          <Link
            href="#how-it-works"
            className="px-8 py-4 rounded-xl border border-white/10 text-[#888] hover:text-white hover:border-white/30 text-lg w-full sm:w-auto"
          >
            See how it works
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
          <span className="text-[#555] text-sm">Coverage:</span>
          {LEVELS.map((l) => (
            <span key={l} className="px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-[#888]">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 bg-[#111]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            What other apps won&apos;t tell you
          </h2>
          <p className="text-[#888] text-center mb-12 max-w-xl mx-auto">
            People are expiring their visas because they can&apos;t learn German properly.
          </p>
          <div className="grid gap-4">
            {PROBLEMS.map((p) => (
              <div key={p.app} className="flex items-start gap-4 p-5 rounded-xl border border-white/5 bg-[#0a0a0a]">
                <span className="text-red-400 text-xl mt-0.5">✗</span>
                <div>
                  <span className="font-semibold text-white">{p.app}: </span>
                  <span className="text-[#888]">{p.problem}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grammar Preview — The WHY */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">This is what we show you</h2>
            <p className="text-[#888] max-w-xl mx-auto">
              Every sentence broken down. Every case explained. Every rule with a reason.
            </p>
          </div>

          {/* Live grammar breakdown */}
          <div className="rounded-2xl border border-white/10 bg-[#111] p-8 mb-6">
            <p className="text-[#555] text-xs uppercase tracking-widest mb-4 font-medium">
              A1 · Chapter 4 · Accusative Case
            </p>

            <div className="mb-6">
              <p className="text-2xl font-bold mb-1">
                <span className="text-blue-400">Ich</span>{' '}
                <span className="text-white">habe</span>{' '}
                <span className="text-orange-400">einen Bruder</span>{' '}
                <span className="text-white">und</span>{' '}
                <span className="text-pink-400">eine Schwester</span>.
              </p>
              <p className="text-[#888] text-sm italic">I have a brother and a sister.</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-8">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-1">Nominative · Subject</p>
                <p className="text-white font-mono text-sm">Ich</p>
                <p className="text-[#555] text-xs">The one doing the action</p>
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide mb-1">Accusative · Direct Object</p>
                <p className="text-white font-mono text-sm">einen Bruder</p>
                <p className="text-[#555] text-xs">Masculine → ein becomes einen</p>
              </div>
              <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-3">
                <p className="text-pink-400 text-xs font-semibold uppercase tracking-wide mb-1">Accusative · Direct Object</p>
                <p className="text-white font-mono text-sm">eine Schwester</p>
                <p className="text-[#555] text-xs">Feminine → eine stays eine</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#d4a843]/20 bg-[#d4a843]/5 p-5">
              <p className="text-[#d4a843] text-xs font-semibold uppercase tracking-wide mb-2">
                💡 Why &quot;einen&quot; and not &quot;ein&quot;?
              </p>
              <p className="text-[#ccc] text-sm leading-relaxed">
                &quot;Bruder&quot; is masculine (<span className="text-blue-400 font-mono">der Bruder</span>).
                In Accusative, <strong>only masculine articles change</strong>:{' '}
                <span className="text-white font-mono">ein → einen</span>.
                Feminine (<span className="text-pink-400 font-mono">die</span>) and neuter
                (<span className="text-green-400 font-mono">das</span>) stay exactly the same.
                This is the only transformation you need to master for Accusative.
              </p>
            </div>
          </div>

          {/* Article table */}
          <div className="rounded-2xl border border-white/10 bg-[#111] p-8">
            <p className="text-[#555] text-xs uppercase tracking-widest mb-6 font-medium">
              Quick Reference · Nominative vs Accusative
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#555] text-xs uppercase tracking-wider">
                    <th className="text-left pb-3 font-medium">Gender</th>
                    <th className="text-left pb-3 font-medium">Definite NOM</th>
                    <th className="text-left pb-3 font-medium">Indefinite NOM</th>
                    <th className="text-left pb-3 font-medium">Definite ACC</th>
                    <th className="text-left pb-3 font-medium">Indefinite ACC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-3 text-blue-400 font-semibold">Masculine</td>
                    <td className="py-3 font-mono text-blue-400">der</td>
                    <td className="py-3 font-mono text-blue-400">ein</td>
                    <td className="py-3 font-mono text-orange-400">den ←</td>
                    <td className="py-3 font-mono text-orange-400">einen ←</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-pink-400 font-semibold">Feminine</td>
                    <td className="py-3 font-mono text-pink-400">die</td>
                    <td className="py-3 font-mono text-pink-400">eine</td>
                    <td className="py-3 font-mono text-pink-400">die</td>
                    <td className="py-3 font-mono text-pink-400">eine</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-green-400 font-semibold">Neuter</td>
                    <td className="py-3 font-mono text-green-400">das</td>
                    <td className="py-3 font-mono text-green-400">ein</td>
                    <td className="py-3 font-mono text-green-400">das</td>
                    <td className="py-3 font-mono text-green-400">ein</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[#555] text-xs mt-4">← Only masculine changes in Accusative. Everything else stays the same.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-[#111]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Built different. Actually.</h2>
          <p className="text-[#888] text-center mb-16 max-w-xl mx-auto">
            Every feature exists because a real learner needed it.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-white/5 bg-[#0a0a0a] hover:border-white/10 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How we compare</h2>
          <p className="text-[#888] text-center mb-12">The features that actually matter for real German fluency.</p>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 font-medium text-[#555]">Feature</th>
                  <th className="p-4 text-center font-bold text-[#d4a843]">Sprich</th>
                  <th className="p-4 text-center font-medium text-[#555]">Duolingo</th>
                  <th className="p-4 text-center font-medium text-[#555]">Babbel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-[#ccc]">{row.feature}</td>
                    <td className="p-4 text-center text-lg">{row.sprich ? <span className="text-green-400">✓</span> : <span className="text-[#333]">✗</span>}</td>
                    <td className="p-4 text-center text-lg">{row.duolingo ? <span className="text-green-400">✓</span> : <span className="text-[#333]">✗</span>}</td>
                    <td className="p-4 text-center text-lg">{row.babbel ? <span className="text-green-400">✓</span> : <span className="text-[#333]">✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Sprich.<br />
            <span className="text-[#555]">German for people who mean it.</span>
          </h2>
          <p className="text-[#888] mb-10">Free to start. No credit card. No guilt streaks. Just real German learning.</p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 rounded-xl gold-gradient text-black font-bold text-lg hover:opacity-90"
          >
            Begin your German journey →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold gold-text">Sprich</span>
          <p className="text-[#555] text-sm">© {new Date().getFullYear()} Sprich. Built for every Pakistani going to Germany.</p>
          <div className="flex gap-4 text-sm text-[#555]">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>

    </main>
  )
}
