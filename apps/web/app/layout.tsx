import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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

// One blocking inline script, run before the framework bundle:
//  1. Polyfill `Object.hasOwn` + `Array/String/TypedArray.prototype.at` — used
//     inside Next/React chunks but only native in Safari 15.4+, so iOS 15.0–15.3
//     would otherwise throw a TypeError before hydration. Guarded → inert where
//     the natives exist. (Syntax gaps like class `static {}` blocks are handled
//     by `browserslist` in package.json, not here.)
//  2. Force the dark theme (light theme + toggle stay in the tree for later).
const headScript = `(function(){
if(!Object.hasOwn){Object.defineProperty(Object,'hasOwn',{value:function(o,k){return Object.prototype.hasOwnProperty.call(Object(o),k)},configurable:true,writable:true})}
var at=function(n){n=Math.trunc(n)||0;if(n<0)n+=this.length;return n<0||n>=this.length?undefined:this[n]};
if(!Array.prototype.at){Object.defineProperty(Array.prototype,'at',{value:at,configurable:true,writable:true})}
if(!String.prototype.at){Object.defineProperty(String.prototype,'at',{value:at,configurable:true,writable:true})}
try{[Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array].forEach(function(T){if(T&&T.prototype&&!T.prototype.at){Object.defineProperty(T.prototype,'at',{value:at,configurable:true,writable:true})}})}catch(e){}
document.documentElement.classList.add('dark');
})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body className="min-h-full bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
