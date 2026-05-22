import type { MetadataRoute } from 'next'
import { getCanonicalBaseUrl, shouldBlockSearchIndexing } from '@/lib/server/env'

const publicRules: MetadataRoute.Robots['rules'] = [
  {
    userAgent: '*',
    allow: '/',
    disallow: [
      '/admin/',
      '/__internal/',
      '/call/',
      '/room/',
      '/pokoj',
      '/konto',
      '/login',
      '/dostep',
      '/problem',
      '/materialy/pobranie',
      '/bezplatne-materialy/dziekuje',
      '/przybornik',
    ],
  },
]

const blockedRules: MetadataRoute.Robots['rules'] = [
  {
    userAgent: '*',
    disallow: ['/'],
  },
]

export default function robots(): MetadataRoute.Robots {
  if (shouldBlockSearchIndexing()) {
    return {
      rules: blockedRules,
    }
  }

  const baseUrl = getCanonicalBaseUrl()

  return {
    rules: publicRules,
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
