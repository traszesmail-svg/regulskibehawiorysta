import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { listLocalSeoPaths } from '../lib/growth-layer'

type SourceMap = Map<string, string[]>

type SitemapEntry = {
  loc: string
  lastmod: string
  changefreq: 'weekly' | 'monthly'
  priority: number
}

type ValidationOutcome =
  | {
      keep: true
      path: string
      status: number
      canonical: string
      source: string[]
    }
  | {
      keep: false
      path: string
      reason: string
      status: number | null
      source: string[]
    }

type ExcludedValidationOutcome = Extract<ValidationOutcome, { keep: false }>

const ROOT_DIR = process.cwd()
const APP_DIR = path.join(ROOT_DIR, 'app')
const PAGES_DIR = path.join(ROOT_DIR, 'pages')
const BASELINE_SITEMAP_MANIFEST_PATH = path.join(ROOT_DIR, 'qa-reports', 'full-crawl', 'manifests', 'manifest.csv')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')
const REPORT_DIR = path.join(ROOT_DIR, 'qa-reports')
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'sitemap.xml')
const REPORT_PATH = path.join(REPORT_DIR, 'sitemap-regeneration.md')
const CANONICAL_BASE_URL = 'https://regulskibehawiorysta.pl'

const PAGE_FILE_RE = /^page\.(?:ts|tsx|js|jsx)$/i
const SPECIAL_PAGES_RE = /^(?:_document|_error|404|500)\.(?:ts|tsx|js|jsx)$/i
const ROUTE_GROUP_RE = /^\(.+\)$/
const DYNAMIC_SEGMENT_RE = /^\[.+\]$/

const EXCLUDED_ROUTE_EXACT = new Set([
  '/booking',
  '/slot',
  '/form',
  '/payment',
  '/termin',
  '/confirmation',
  '/confirm',
  '/problem',
  '/przybornik',
  '/pokoj',
  '/admin',
  '/__internal/opinie',
  '/%5F%5Finternal/qa-report',
  '/produkt',
  '/urgent',
  '/od-czego-zaczac',
  '/oferta',
  '/jak-sie-przygotowac',
  '/historie',
  '/materialy/pobranie',
  '/bezplatne-materialy/dziekuje',
  '/oferta/konsultacja-behawioralna-online',
  '/oferta/poradniki-pdf',
  '/behawiorysta-psow',
  '/behawiorysta-kotow',
  '/behawiorysta-online-polska',
  '/konsultacja-behawioralna-online',
  '/psy',
  '/koty',
  '/metodyka',
])

const EXCLUDED_ROUTE_PREFIXES = [
  '/admin/',
  '/api/',
  '/__internal/',
  '/%5F%5Finternal/',
  '/booking/',
  '/call/',
  '/room/',
  '/book/',
  '/slot/',
  '/form/',
  '/payment/',
  '/termin/',
  '/confirmation/',
  '/confirm/',
  '/problem/',
  '/przybornik/',
  '/pokoj/',
  '/oferta/',
  '/jak-sie-przygotowac/',
  '/historie/',
  '/bezplatne-materialy/',
  '/rezerwacja/',
  '/psy/',
  '/koty/',
]

const MAIN_SERVICE_PAGES = new Set([
  '/',
  '/cennik',
  '/cennik/pelny',
  '/kontakt',
])

const LEGAL_PAGES = new Set([
  '/regulamin',
  '/polityka-prywatnosci',
])

const PDF_ROUTE_PREFIXES = ['/bezplatne-materialy/'] as const
const TOPICAL_ROUTE_PREFIXES = ['/psy/', '/koty/'] as const

function formatWarsawDate(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getValidationBaseUrl(): string {
  return (
    process.env.SITEMAP_VALIDATION_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    CANONICAL_BASE_URL
  ).replace(/\/$/, '')
}

function buildCanonicalUrl(routePath: string): string {
  return routePath === '/' ? CANONICAL_BASE_URL : new URL(routePath, CANONICAL_BASE_URL).toString()
}

function normalizeUrlForComparison(url: string): string {
  return url.endsWith('/') ? url.replace(/\/+$/g, '') : url
}

function getValidationRequestHeaders(): Record<string, string> {
  const canonicalHost = new URL(CANONICAL_BASE_URL).host

  return {
    host: canonicalHost,
    'user-agent': 'Codex sitemap generator',
    'x-forwarded-host': canonicalHost,
    'x-forwarded-proto': 'https',
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeRoutePath(routePath: string): string {
  const trimmed = routePath.trim().replace(/\/+/g, '/')

  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`
  }

  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    return trimmed.replace(/\/+$/g, '')
  }

  return trimmed
}

function isRouteGroup(segment: string): boolean {
  return ROUTE_GROUP_RE.test(segment)
}

function isDynamicSegment(segment: string): boolean {
  return DYNAMIC_SEGMENT_RE.test(segment)
}

function isExcludedRoutePath(routePath: string): boolean {
  const normalized = normalizeRoutePath(routePath)

  if (EXCLUDED_ROUTE_EXACT.has(normalized)) {
    return true
  }

  return EXCLUDED_ROUTE_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))
}

function looksNoindex(source: string): boolean {
  return (
    source.includes('buildTechnicalMetadata') ||
    source.includes('noindex') ||
    source.includes('index: false')
  )
}

function hasValidStaticRoute(routePath: string, source: string): boolean {
  return !isExcludedRoutePath(routePath) && !looksNoindex(source)
}

function discoverBlogRoutes(): SourceMap {
  return new Map()
}

function discoverPdfRoutes(): SourceMap {
  return new Map()
}

function discoverLeadMagnetRoutes(): SourceMap {
  return new Map()
}

function walkAppRoutes(currentDir: string, segments: string[] = []): SourceMap {
  const discovered: SourceMap = new Map()
  const entries = readdirSync(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      const child = walkAppRoutes(entryPath, [...segments, entry.name])
      for (const [routePath, sources] of child) {
        discovered.set(routePath, [...(discovered.get(routePath) ?? []), ...sources])
      }
      continue
    }

    if (!PAGE_FILE_RE.test(entry.name)) {
      continue
    }

    const routeSegments = segments.filter((segment) => !isRouteGroup(segment))

    if (routeSegments.some((segment) => isDynamicSegment(segment))) {
      continue
    }

    const routePath = normalizeRoutePath(`/${routeSegments.join('/')}`.replace(/\/+/g, '/'))
    const source = readFileSync(entryPath, 'utf8')

    if (!hasValidStaticRoute(routePath, source)) {
      continue
    }

    const existingSources = discovered.get(routePath) ?? []
    discovered.set(routePath, [...existingSources, `app:${path.relative(ROOT_DIR, entryPath).replace(/\\/g, '/')}`])
  }

  return discovered
}

function walkPagesRoutes(currentDir: string, segments: string[] = []): SourceMap {
  const discovered: SourceMap = new Map()
  const entries = readdirSync(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      const child = walkPagesRoutes(entryPath, [...segments, entry.name])
      for (const [routePath, sources] of child) {
        discovered.set(routePath, [...(discovered.get(routePath) ?? []), ...sources])
      }
      continue
    }

    if (!/\.(?:ts|tsx|js|jsx)$/i.test(entry.name) || SPECIAL_PAGES_RE.test(entry.name)) {
      continue
    }

    const baseName = entry.name.replace(/\.(?:ts|tsx|js|jsx)$/i, '')
    if (baseName === '_document' || baseName === '_error' || baseName === '404' || baseName === '500') {
      continue
    }

    const pageSegments = [...segments, baseName === 'index' ? '' : baseName].filter(Boolean)
    if (pageSegments.some((segment) => segment.startsWith('_') || isDynamicSegment(segment))) {
      continue
    }

    const routePath = normalizeRoutePath(`/${pageSegments.join('/')}`.replace(/\/+/g, '/'))
    const source = readFileSync(entryPath, 'utf8')

    if (!hasValidStaticRoute(routePath, source)) {
      continue
    }

    const existingSources = discovered.get(routePath) ?? []
    discovered.set(routePath, [...existingSources, `pages:${path.relative(ROOT_DIR, entryPath).replace(/\\/g, '/')}`])
  }

  return discovered
}

function collectCandidateMap(): SourceMap {
  const candidates: SourceMap = new Map()

  const mergeRoutes = (routePaths: string[], source: string) => {
    for (const routePath of routePaths) {
      const normalized = normalizeRoutePath(routePath)
      if (isExcludedRoutePath(normalized)) {
        continue
      }

      const sources = candidates.get(normalized) ?? []

      if (!sources.includes(source)) {
        candidates.set(normalized, [...sources, source])
      }
    }
  }

  const merge = (routePath: string, source: string) => {
    const normalized = normalizeRoutePath(routePath)
    const sources = candidates.get(normalized) ?? []

    if (!sources.includes(source)) {
      candidates.set(normalized, [...sources, source])
    }
  }

  mergeRoutes(listLocalSeoPaths(), 'local-seo-route')

  for (const [routePath, sources] of walkAppRoutes(APP_DIR)) {
    for (const source of sources) {
      merge(routePath, source)
    }
  }

  if (readdirSync(PAGES_DIR, { withFileTypes: true }).length > 0) {
    for (const [routePath, sources] of walkPagesRoutes(PAGES_DIR)) {
      for (const source of sources) {
        merge(routePath, source)
      }
    }
  }

  for (const [routePath, sources] of discoverBlogRoutes()) {
    for (const source of sources) {
      merge(routePath, source)
    }
  }

  for (const [routePath, sources] of discoverPdfRoutes()) {
    for (const source of sources) {
      merge(routePath, source)
    }
  }

  for (const [routePath, sources] of discoverLeadMagnetRoutes()) {
    for (const source of sources) {
      merge(routePath, source)
    }
  }

  return candidates
}

function getChangeFrequency(routePath: string): SitemapEntry['changefreq'] {
  return routePath === '/' || routePath === '/cennik' || routePath === '/cennik/pelny'
    ? 'weekly'
    : 'monthly'
}

function getPriority(routePath: string): number {
  if (routePath === '/') {
    return 1.0
  }

  if (MAIN_SERVICE_PAGES.has(routePath)) {
    return 0.9
  }

  if (TOPICAL_ROUTE_PREFIXES.some((prefix) => routePath.startsWith(prefix))) {
    return 0.8
  }

  if (PDF_ROUTE_PREFIXES.some((prefix) => routePath.startsWith(prefix))) {
    return 0.7
  }

  if (routePath.startsWith('/blog/')) {
    return 0.6
  }

  if (LEGAL_PAGES.has(routePath)) {
    return 0.5
  }

  return 0.7
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)]
}

function extractLocsFromXml(xml: string): string[] {
  return dedupeStrings(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => match[1]?.trim() ?? '')
      .filter((value): value is string => Boolean(value)),
  )
}

function loadBaselineUrls(): string[] {
  if (existsSync(OUTPUT_PATH)) {
    const currentXml = readFileSync(OUTPUT_PATH, 'utf8')
    const currentUrls = extractLocsFromXml(currentXml)
    if (currentUrls.length > 0) {
      return currentUrls.sort((a, b) => a.localeCompare(b))
    }
  }

  if (!existsSync(BASELINE_SITEMAP_MANIFEST_PATH)) {
    return []
  }

  const manifestLines = readFileSync(BASELINE_SITEMAP_MANIFEST_PATH, 'utf8').split(/\r?\n/)
  const urls: string[] = []

  for (const line of manifestLines.slice(1)) {
    if (!line) {
      continue
    }

    const match = line.match(/^"([^"]+)","([^"]*)",/)
    if (!match) {
      continue
    }

    const url = match[1]
    const discoveredFrom = match[2]

    if (!discoveredFrom.includes('sitemap.xml')) {
      continue
    }

    urls.push(url)
  }

  return dedupeStrings(urls).sort((a, b) => a.localeCompare(b))
}

function buildSitemapEntries(paths: string[], lastmod: string): SitemapEntry[] {
  const entriesByLoc = new Map<
    string,
    {
      loc: string
      lastmod: string
      changefreq: SitemapEntry['changefreq']
      priority: number
      path: string
    }
  >()

  for (const routePath of [...new Set(paths.map(normalizeRoutePath))]) {
    const loc = buildCanonicalUrl(routePath)
    if (!entriesByLoc.has(loc)) {
      entriesByLoc.set(loc, {
        loc,
        lastmod,
        changefreq: getChangeFrequency(routePath),
        priority: getPriority(routePath),
        path: routePath,
      })
    }
  }

  return [...entriesByLoc.values()]
    .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path))
    .map(({ path: _path, ...entry }) => entry)
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const entry of entries) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`)
    lines.push(`    <lastmod>${entry.lastmod}</lastmod>`)
    lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`)
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

function extractCanonicalHref(html: string): string | null {
  const patterns = [
    /<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

function extractRobotsContent(html: string): string | null {
  const patterns = [
    /<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

async function validatePath(routePath: string, source: string[], validationBaseUrl: string): Promise<ValidationOutcome> {
  const requestUrl = new URL(routePath, validationBaseUrl).toString()
  const expectedCanonical = buildCanonicalUrl(routePath)
  const response = await fetch(requestUrl, {
    redirect: 'manual',
    headers: getValidationRequestHeaders(),
  })

  if (response.status >= 300 && response.status < 400) {
    return {
      keep: false,
      path: routePath,
      reason: `redirect-${response.status}`,
      status: response.status,
      source,
    }
  }

  if (response.status !== 200) {
    return {
      keep: false,
      path: routePath,
      reason: `http-${response.status}`,
      status: response.status,
      source,
    }
  }

  const robotsHeader = response.headers.get('x-robots-tag') ?? ''
  if (/\bnoindex\b/i.test(robotsHeader)) {
    return {
      keep: false,
      path: routePath,
      reason: 'x-robots-tag-noindex',
      status: response.status,
      source,
    }
  }

  const html = await response.text()
  const robotsMeta = extractRobotsContent(html)
  if (robotsMeta && /\bnoindex\b/i.test(robotsMeta)) {
    return {
      keep: false,
      path: routePath,
      reason: 'meta-noindex',
      status: response.status,
      source,
    }
  }

  const canonicalHref = extractCanonicalHref(html)
  if (!canonicalHref) {
    return {
      keep: false,
      path: routePath,
      reason: 'missing-canonical',
      status: response.status,
      source,
    }
  }

  const canonicalUrl = new URL(canonicalHref, requestUrl).toString()
  if (normalizeUrlForComparison(canonicalUrl) !== normalizeUrlForComparison(expectedCanonical)) {
    return {
      keep: false,
      path: routePath,
      reason: `canonical-mismatch:${canonicalUrl}`,
      status: response.status,
      source,
    }
  }

  return {
    keep: true,
    path: routePath,
    status: response.status,
    canonical: canonicalUrl,
    source,
  }
}

function buildReport({
  candidateCount,
  previousUrls,
  validatedEntries,
  excluded,
  validationBaseUrl,
  deployDate,
}: {
  candidateCount: number
  previousUrls: string[]
  validatedEntries: SitemapEntry[]
  excluded: ExcludedValidationOutcome[]
  validationBaseUrl: string
  deployDate: string
}): string {
  const excludedByReason = new Map<string, number>()
  const currentUrls = validatedEntries.map((entry) => entry.loc)
  const previousUrlSet = new Set(previousUrls)
  const currentUrlSet = new Set(currentUrls)
  const addedUrls = currentUrls.filter((url) => !previousUrlSet.has(url)).sort((a, b) => a.localeCompare(b))
  const removedUrls = previousUrls.filter((url) => !currentUrlSet.has(url)).sort((a, b) => a.localeCompare(b))

  for (const item of excluded) {
    excludedByReason.set(item.reason, (excludedByReason.get(item.reason) ?? 0) + 1)
  }

  const lines = [
    '# Sitemap Regeneration Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Deploy day: ${deployDate}`,
    `Canonical base: ${CANONICAL_BASE_URL}`,
    `Validation base: ${validationBaseUrl}`,
    '',
    '## Counts',
    `- Before sitemap URLs: ${previousUrls.length}`,
    `- After sitemap URLs: ${validatedEntries.length}`,
    `- Net change: ${validatedEntries.length - previousUrls.length >= 0 ? '+' : ''}${validatedEntries.length - previousUrls.length}`,
    `- Candidates discovered: ${candidateCount}`,
    `- Final sitemap URLs: ${validatedEntries.length}`,
    `- Excluded during validation: ${excluded.length}`,
    `- HTTP 200 and self-canonical: ${validatedEntries.length}/${validatedEntries.length}`,
    '',
    '## Diff',
    '### Added URLs',
    ...(addedUrls.length > 0 ? addedUrls.map((url) => `- ${url}`) : ['- none']),
    '',
    '### Removed URLs',
    ...(removedUrls.length > 0 ? removedUrls.map((url) => `- ${url}`) : ['- none']),
    '',
    '## Exclusions',
    ...(excludedByReason.size > 0
      ? [...excludedByReason.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([reason, count]) => `- ${reason}: ${count}`)
      : ['- none']),
    '',
    '## Final URLs',
    ...validatedEntries.map((entry) => `- ${entry.loc}`),
  ]

  return `${lines.join('\n')}\n`
}

async function main() {
  const validationBaseUrl = getValidationBaseUrl()

  const candidateMap = collectCandidateMap()
  const candidatePaths = [...candidateMap.keys()].map(normalizeRoutePath)
  const uniqueCandidatePaths = [...new Set(candidatePaths)]

  assert.equal(
    uniqueCandidatePaths.some((routePath) =>
      ['_v2', '/oferta', '/behawiorysta-psow', '/behawiorysta-kotow'].some((needle) =>
        routePath.includes(needle),
      ),
    ),
    false,
    'Sitemap candidate list still contains retired legacy slugs.',
  )

  const deployDate = formatWarsawDate()
  const previousUrls = loadBaselineUrls()
  const previousUrlSet = new Set(previousUrls)
  const validated: SitemapEntry[] = []
  const excluded: ExcludedValidationOutcome[] = []

  for (const routePath of uniqueCandidatePaths) {
    const outcome = await validatePath(routePath, candidateMap.get(routePath) ?? [], validationBaseUrl)
    if (outcome.keep) {
      validated.push({
        loc: outcome.canonical,
        lastmod: deployDate,
        changefreq: getChangeFrequency(routePath),
        priority: getPriority(routePath),
      })
      continue
    }

    excluded.push(outcome)
  }

  assert.equal(
    new Set(validated.map((entry) => entry.loc)).size,
    validated.length,
    'Generated sitemap contains duplicate loc values.',
  )

  const xml = buildSitemapXml(validated)

  mkdirSync(PUBLIC_DIR, { recursive: true })
  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(OUTPUT_PATH, xml, 'utf8')
  writeFileSync(
    REPORT_PATH,
    buildReport({
      candidateCount: uniqueCandidatePaths.length,
      previousUrls,
      validatedEntries: validated,
      excluded,
      validationBaseUrl,
      deployDate,
    }),
    'utf8',
  )

  if (validated.length === 0) {
    console.warn('Generated sitemap is empty.')
  }

  console.log(
    JSON.stringify(
      {
        output: path.relative(ROOT_DIR, OUTPUT_PATH).replace(/\\/g, '/'),
        report: path.relative(ROOT_DIR, REPORT_PATH).replace(/\\/g, '/'),
        validationBaseUrl,
        canonicalBaseUrl: CANONICAL_BASE_URL,
        beforeCount: previousUrls.length,
        candidateCount: uniqueCandidatePaths.length,
        finalCount: validated.length,
        excludedCount: excluded.length,
        addedCount: validated.filter((entry) => !previousUrlSet.has(entry.loc)).length,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
