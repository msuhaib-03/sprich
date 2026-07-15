import type { MetadataRoute } from 'next'

// Served at /manifest.webmanifest and auto-linked by Next.js. This is what
// makes Sprich installable from the browser (Android: "Install app" /
// "Add to Home Screen"; iOS: Share → Add to Home Screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sprich — Learn German Properly',
    short_name: 'Sprich',
    description:
      'Learn German from A1 to C2 with real grammar reasoning, AI conversation practice, and native-speaker audio.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0b0b0e',
    theme_color: '#0b0b0e',
    orientation: 'portrait',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
