import type { MetadataRoute } from 'next'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import { listBlogRoutePaths } from '@/lib/blog'
import { listProblemPagePaths } from '@/lib/problem-pages'
import { listProblemLandingPaths } from '@/lib/problem-landings'

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/o-mnie', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/cennik', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/cennik/pelny', priority: 0.72, changeFrequency: 'weekly' },
  { path: '/book', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/kontakt', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/problemy', priority: 0.82, changeFrequency: 'weekly' },
  { path: '/kwadrans-na-juz', priority: 0.82, changeFrequency: 'weekly' },
  { path: '/quiz', priority: 0.76, changeFrequency: 'monthly' },
  { path: '/instagram', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/regulamin', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/regulamin-pelna-konsultacja', priority: 0.35, changeFrequency: 'yearly' },
  { path: '/polityka-prywatnosci', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/newsletter', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/wybor', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/materialy', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/opinie', priority: 0.6, changeFrequency: 'monthly' },
]

function buildAbsoluteUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString()
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getCanonicalBaseUrl()
  const lastModified = new Date()
  const routeMap = new Map<string, MetadataRoute.Sitemap[number]>()

  for (const route of STATIC_ROUTES) {
    routeMap.set(route.path, {
      url: buildAbsoluteUrl(baseUrl, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })
  }

  try {
    const blogPaths = listBlogRoutePaths()
    for (const path of blogPaths) {
      if (path && path !== '/blog') {
        routeMap.set(path, {
          url: buildAbsoluteUrl(baseUrl, path),
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.75,
        })
      }
    }
  } catch (err) {
    console.error('[sitemap] Failed to add blog paths', err)
  }

  try {
    const problemPagePaths = listProblemPagePaths()
    for (const path of problemPagePaths) {
      routeMap.set(path, {
        url: buildAbsoluteUrl(baseUrl, path),
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (err) {
    console.error('[sitemap] Failed to add detailed problem page paths', err)
  }
  try {
    const problemPaths = listProblemLandingPaths()
    for (const path of problemPaths) {
      routeMap.set(path, {
        url: buildAbsoluteUrl(baseUrl, path),
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.78,
      })
    }
  } catch (err) {
    console.error('[sitemap] Failed to add problem landing paths', err)
  }

  return [...routeMap.values()]
}
