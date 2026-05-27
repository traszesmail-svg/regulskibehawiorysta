// handoff-6/lib/metadata-helpers.ts
// Builder Next.js Metadata API
// Użycie: export const metadata = buildPageMetadata('/psy');

import type { Metadata } from 'next';
import { SITE, pageSeo } from './seo.config';

interface BuildOptions {
  path: string;
  ogImage?: string;
  noindex?: boolean;
  alternateUrls?: Record<string, string>;
}

export function buildPageMetadata(pathOrOptions: string | BuildOptions): Metadata {
  const opts = typeof pathOrOptions === 'string' ? { path: pathOrOptions } : pathOrOptions;
  const seo = pageSeo[opts.path];

  if (!seo) {
    console.warn(`[SEO] No config for path: ${opts.path}`);
    return defaultMetadata(opts.path);
  }

  const url = `${SITE.url}${opts.path === '/' ? '' : opts.path}`;
  const ogImage = opts.ogImage ?? seo.ogImage ?? `${SITE.url}/api/og?title=${encodeURIComponent(seo.title)}`;

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    authors: [{ name: SITE.author.name, url: SITE.url }],
    creator: SITE.author.name,
    publisher: SITE.name,

    metadataBase: new URL(SITE.url),

    alternates: {
      canonical: url,
      languages: opts.alternateUrls,
    },

    robots: opts.noindex || seo.noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },

    openGraph: {
      type: opts.path === '/' ? 'website' : 'article',
      locale: SITE.locale,
      url,
      title: seo.title,
      description: seo.description,
      siteName: SITE.name,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: seo.title,
      }],
    },

    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [ogImage],
      ...(SITE.twitterHandle ? { creator: SITE.twitterHandle } : {}),
    },

    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },

    manifest: '/manifest.webmanifest',

    verification: {
      // dodaj kody werifikacji właściciela jeśli masz:
      // google: 'xxxxxxxxxxxxxxx',
      // yandex: 'xxxxxxxxxxxxxxx',
    },
  };
}

function defaultMetadata(path: string): Metadata {
  return {
    metadataBase: new URL(SITE.url),
    title: SITE.fullName,
    description: SITE.author.bio,
    alternates: { canonical: `${SITE.url}${path}` },
  };
}

/* UŻYCIE w stronach:

// app/page.tsx
import { buildPageMetadata } from '@/lib/metadata-helpers';
export const metadata = buildPageMetadata('/');

// app/psy/page.tsx
export const metadata = buildPageMetadata('/psy');

// app/psy/[slug]/page.tsx — dynamicznie:
export async function generateMetadata({ params }) {
  return buildPageMetadata(`/psy/${params.slug}`);
}
*/
