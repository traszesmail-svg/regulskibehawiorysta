import type { MetadataRoute } from 'next'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import { getBlogPostBySlug, listBlogRoutePaths } from '@/lib/blog'
import { listProblemPagePaths } from '@/lib/problem-pages'

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/zapytaj', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/konsultacja', priority: 0.82, changeFrequency: 'monthly' },
  { path: '/terapia', priority: 0.68, changeFrequency: 'monthly' },
  { path: '/materialy', priority: 0.76, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.76, changeFrequency: 'weekly' },
  { path: '/o-mnie', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/kontakt', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/problemy', priority: 0.82, changeFrequency: 'weekly' },
  { path: '/mapa-sprawy', priority: 0.74, changeFrequency: 'monthly' },
  { path: '/instagram', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/regulamin', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/regulamin-pelna-konsultacja', priority: 0.35, changeFrequency: 'yearly' },
  { path: '/polityka-prywatnosci', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/opinie', priority: 0.6, changeFrequency: 'monthly' },
]

function buildAbsoluteUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString()
}

const SITEMAP_FALLBACK_LAST_MODIFIED = new Date('2026-07-13T00:00:00.000Z')

function getStableLastModified(path: string): Date {
  if (path.startsWith('/blog/')) {
    const post = getBlogPostBySlug(path.slice('/blog/'.length))
    if (post?.publishedAt) {
      const publishedAt = new Date(`${post.publishedAt}T00:00:00.000Z`)
      if (!Number.isNaN(publishedAt.getTime())) {
        return publishedAt
      }
    }
  }

  return SITEMAP_FALLBACK_LAST_MODIFIED
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getCanonicalBaseUrl()
  const routeMap = new Map<string, MetadataRoute.Sitemap[number]>()

  for (const route of STATIC_ROUTES) {
    routeMap.set(route.path, {
      url: buildAbsoluteUrl(baseUrl, route.path),
      lastModified: getStableLastModified(route.path),
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
          lastModified: getStableLastModified(path),
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
        lastModified: getStableLastModified(path),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  } catch (err) {
    console.error('[sitemap] Failed to add detailed problem page paths', err)
  }
  return [...routeMap.values()]
}
