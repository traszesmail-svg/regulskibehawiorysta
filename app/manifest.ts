// handoff-6/app/manifest.ts
// PWA manifest — Next.js auto-generuje /manifest.webmanifest
// Lokalizacja: app/manifest.ts

import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo.config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Regulski Pokój Opiekuna',
    short_name: 'Regulski',
    description: SITE.author.bio,
    start_url: '/pokoj',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: '#4a8d7a',
    orientation: 'portrait',
    lang: SITE.language,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
