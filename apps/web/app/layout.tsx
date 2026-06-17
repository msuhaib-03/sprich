import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Sprich — Learn German Properly',
  description:
    'The only German learning app that teaches you WHY, not just what. From A1 to C2 — with real grammar reasoning, AI conversation, and public speaking confidence.',
  keywords: ['learn german', 'german language', 'deutsch lernen', 'A1 B1 B2 C1 german'],
  openGraph: {
    title: 'Sprich — Learn German Properly',
    description: 'Not just what — but WHY. Master German from the ground up.',
    siteName: 'Sprich',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#0a0a0a] text-[#fafafa] antialiased">{children}</body>
    </html>
  )
}
