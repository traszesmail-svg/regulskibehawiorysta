import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, JetBrains_Mono, Manrope } from 'next/font/google'
import { AnalyticsConsent } from '@/components/AnalyticsConsent'
import { ClickSound } from '@/components/ClickSound'
import { Schema } from '@/components/schema'
import { ScrollProgress } from '@/components/ScrollProgress'
import { ThemeProvider } from '@/components/ThemeProvider'
import { APP_THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '@/lib/theme'
import { getRootSchemaGraphJsonLd } from '@/lib/schema'
import { generateReviewsSchema } from '@/lib/reviewsSchema'
import { reviews, aggregateRating } from '@/lib/reviews.config'
import { getCanonicalBaseUrl, shouldBlockSearchIndexing } from '@/lib/server/env'
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_SHORT_NAME, SITE_TAGLINE } from '@/lib/site'
import './globals.css'
import './notatnik-a.css'

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-ui',
})

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
})

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
})

const metadataBase = new URL(getCanonicalBaseUrl())
const blockSearchIndexing = shouldBlockSearchIndexing()
const RELEASE_ID = '2026-04-23-live-verification-v1'

export const metadata: Metadata = {
  metadataBase,
  referrer: 'no-referrer',
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_SHORT_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  robots: blockSearchIndexing
    ? {
        index: false,
        follow: false,
        noarchive: true,
      }
    : {
        index: true,
        follow: true,
      },
  openGraph: {
    title: SITE_NAME,
    description: `${SITE_TAGLINE}. ${SITE_DESCRIPTION}`,
    type: 'website',
    locale: 'pl_PL',
    siteName: SITE_NAME,
    url: '/',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
  appleWebApp: {
    capable: true,
    title: 'Regulski',
    statusBarStyle: 'default',
  },
  other: {
    'release-id': RELEASE_ID,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
}

const themeBootstrapScript = `
(() => {
  const fallbackTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  try {
    const storedTheme = window.localStorage.getItem('${THEME_STORAGE_KEY}');
    const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : fallbackTheme;
    document.documentElement.setAttribute('${APP_THEME_ATTRIBUTE}', theme);
  } catch {
    document.documentElement.setAttribute('${APP_THEME_ATTRIBUTE}', fallbackTheme);
  }
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const rootJsonLd = getRootSchemaGraphJsonLd()
  const reviewsJsonLd = generateReviewsSchema(reviews, aggregateRating)

  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${manrope.variable} ${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`} data-release-id={RELEASE_ID}>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <Schema data={rootJsonLd} />
        <Schema data={reviewsJsonLd} />
        <ThemeProvider>
          <ScrollProgress />
          <ClickSound />
          {children}
          <Suspense fallback={null}>
            <AnalyticsConsent
              measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null}
              cookiebotDomainGroupId={null}
            />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
