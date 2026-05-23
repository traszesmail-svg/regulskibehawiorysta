import type { MetadataRoute } from 'next'
import { getCanonicalBaseUrl } from '@/lib/server/env'

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/o-mnie', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/cennik', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/cennik/pelny', priority: 0.72, changeFrequency: 'weekly' },
  { path: '/book', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/kontakt', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/regulamin', priority: 0.4, changeFrequency: 'yearly' },
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

  return [...routeMap.values()]
}
