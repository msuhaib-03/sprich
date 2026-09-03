import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'doLang — Learn German Properly',
  description:
    'The only German learning app that teaches you WHY, not just what. From A1 to C2 — with real grammar reasoning, AI conversation, and public speaking confidence.',
  keywords: ['learn german', 'german language', 'deutsch lernen', 'A1 B1 B2 C1 german'],
  applicationName: 'doLang',
  // iOS "Add to Home Screen" standalone-app behavior + home-screen icon.
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'doLang' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  openGraph: {
    title: 'doLang — Learn German Properly',
    description: 'Not just what — but WHY. Master German from the ground up.',
    siteName: 'doLang',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0e',
}

// Dark-only for now — the light theme + toggle (components/ui/theme-toggle.tsx)
// stay in the codebase for a later release, but until then force dark
// regardless of any 'dolang-theme' value left in localStorage from before.
const themeScript = `document.documentElement.classList.add('dark');`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
