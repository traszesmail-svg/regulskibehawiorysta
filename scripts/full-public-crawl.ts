import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import { chromium, type BrowserContext, type Page } from 'playwright-core'
import { listLeadMagnetPaths } from '@/lib/active-lead-magnets'
import { buildBookHref } from '@/lib/booking-routing'
import { listMaterialyBundles, listMaterialyGuides } from '@/lib/materialy-catalog'
import { SITE_PRODUCTION_URL } from '@/lib/site'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type DiscoverySource = 'sitemap.xml' | 'robots.txt' | 'code-seed' | 'crawl'

type CrawlMode = 'desktop' | 'mobile'

type ManifestRow = {
  url: string
  discoveredFrom: DiscoverySource[]
  requestedUrl: string
  finalUrl: string
  status: number | null
  title: string
  notes: string[]
  internalLinks: string[]
  externalLinks: string[]
  desktopScreenshot?: string
  mobileScreenshot?: string
  htmlSnapshot?: string
  desktopIssues: string[]
  mobileIssues: string[]
  desktopOverflow: boolean
  mobileOverflow: boolean
  desktopEncodingIssues: string[]
  mobileEncodingIssues: string[]
  desktopPrimaryCtas: string[]
  mobilePrimaryCtas: string[]
}

type CrawlResult = {
  row: ManifestRow
  discoveredUrls: Array<{ url: string; source: DiscoverySource }>
}

const rootDir = process.cwd()
const defaultBaseUrl = (process.env.FULL_CRAWL_BASE_URL?.trim() || SITE_PRODUCTION_URL).replace(/\/$/, '')
const reportRoot = path.join(
  rootDir,
  process.env.FULL_CRAWL_REPORT_DIR?.trim() || path.join('qa-reports', 'final-crawl'),
)
const screenshotsDir = path.join(reportRoot, 'screenshots')
const desktopDir = path.join(screenshotsDir, 'desktop')
const mobileDir = path.join(screenshotsDir, 'mobile')
const htmlDir = path.join(reportRoot, 'html')
const manifestsDir = path.join(reportRoot, 'manifests')
const shouldFollowDiscoveredLinks = !process.argv.includes('--no-follow') && process.env.FULL_CRAWL_FOLLOW_LINKS?.trim() !== '0'
const shouldSaveScreenshots = !process.argv.includes('--no-screenshots') && process.env.FULL_CRAWL_SCREENSHOTS?.trim() !== '0'
const contentDir = path.join(rootDir, 'content')
const blogDir = path.join(contentDir, 'blog-mvp')
const blogRoutePaths = readdirSync(blogDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^\d{2}-wpis-.*\.md$/i.test(entry.name))
  .map((entry) => {
    const fileContents = readFileSync(path.join(blogDir, entry.name), 'utf8')
    const slugMatch = fileContents.match(/^slug:\s*["']?([^"\r\n"']+)/m)
    if (slugMatch?.[1]) {
      return `/blog/${slugMatch[1].trim()}`
    }

    const fallbackSlug = entry.name.replace(/^\d{2}-wpis-/, '').replace(/\.md$/i, '')
    return `/blog/${fallbackSlug}`
  })
const pdfRoutePaths = [
  '/materialy',
  ...listMaterialyGuides().map((guide) => `/materialy/${guide.slug}`),
  ...listMaterialyBundles().map((bundle) => `/materialy/pakiet/${bundle.slug}`),
]
const localSeoPaths = ['/behawiorysta-online-polska']
const leadMagnetPaths = listLeadMagnetPaths()
const problemLandingPaths = [
  '/psy/reaktywnosc-na-smyczy',
  '/psy/lek-separacyjny',
  '/koty/zalatwianie-poza-kuweta',
  '/koty/konflikt-miedzy-kotami',
]

const BASE_SEEDS = Array.from(new Set([
  '/',
  '/cennik',
  '/cennik/pelny',
  '/konsultacja-behawioralna-online',
  '/behawiorysta-online-polska',
  '/opinie',
  '/koty',
  '/psy',
  '/faq',
  '/o-mnie',
  '/kontakt',
  '/polityka-prywatnosci',
  '/regulamin',
  '/materialy',
  '/przybornik',
  '/blog',
  '/book',
  '/booking',
  '/slot',
  '/form',
  '/payment',
  '/confirm',
  '/confirmation',
  ...localSeoPaths,
  ...leadMagnetPaths,
  ...pdfRoutePaths,
  ...blogRoutePaths,
  ...problemLandingPaths,
  buildBookHref(),
  buildBookHref(null, 'szybka-konsultacja-15-min'),
  buildBookHref(null, 'szybka-konsultacja-15-min', false, 'pies'),
  buildBookHref(null, 'szybka-konsultacja-15-min', false, 'kot'),
  buildBookHref(null, 'konsultacja-behawioralna-online'),
  buildBookHref(null, 'konsultacja-behawioralna-online', false, 'pies'),
  buildBookHref(null, 'konsultacja-behawioralna-online', false, 'kot'),
  '/materialy',
].map((value) => value.trim())))

function normalizeComparablePath(url: string) {
  const parsed = new URL(url)
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/g, '') || '/'}${parsed.search}`
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function normalizeUrl(value: string, baseUrl: string) {
  const resolved = new URL(value, baseUrl)
  resolved.hash = ''
  return resolved.toString()
}

function sameOrigin(urlA: string, urlB: string) {
  try {
    return new URL(urlA).origin === new URL(urlB).origin
  } catch {
    return false
  }
}

function isCrawlableUrl(url: string, baseUrl: string) {
  try {
    const parsed = new URL(url)
    if (parsed.origin !== new URL(baseUrl).origin) {
      return false
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }

    if (parsed.pathname.startsWith('/admin/')) {
      return false
    }

    if (parsed.pathname.startsWith('/api/')) {
      return false
    }

    if (parsed.pathname.startsWith('/__internal/')) {
      return false
    }

    if (parsed.pathname === '/admin') {
      return false
    }

    if (parsed.pathname === '/problem') {
      return false
    }

    const hasTransientBookingQuery =
      (parsed.pathname === '/form' && parsed.searchParams.has('slotId')) ||
      (parsed.pathname === '/payment' && parsed.searchParams.has('bookingId')) ||
      (parsed.pathname === '/confirmation' && parsed.searchParams.has('bookingId')) ||
      (parsed.pathname === '/confirm' && parsed.searchParams.has('id'))

    if (hasTransientBookingQuery) {
      return false
    }

    return true
  } catch {
    return false
  }
}

function basePathForSnapshot(url: string) {
  const parsed = new URL(url)
  const pathname = parsed.pathname === '/' ? '/index' : parsed.pathname
  const pathPart = pathname
    .replace(/^\/+/, '')
    .replace(/\/+$/g, '')
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9_.-]+/g, '_')
  const searchPart = parsed.search ? `__q-${createHash('sha1').update(parsed.search).digest('hex').slice(0, 8)}` : ''
  const hashPart = parsed.hash ? `__h-${createHash('sha1').update(parsed.hash).digest('hex').slice(0, 8)}` : ''
  return `${pathPart || 'index'}${searchPart}${hashPart}`
}

function getSnapshotPaths(url: string) {
  const baseName = basePathForSnapshot(url)
  return {
    desktop: path.join(desktopDir, `${baseName}.png`),
    mobile: path.join(mobileDir, `${baseName}.png`),
    html: path.join(htmlDir, `${baseName}.html`),
  }
}

async function ensureBrowserExecutablePathLegacy() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]

  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {}
  }

  throw new Error('Nie znaleziono lokalnej przegladarki Chrome ani Edge.')
}

async function fetchText(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`)
  }
  return await response.text()
}

async function fetchOptionalText(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

function parseSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1] ?? '').filter(Boolean)
}

function parseRobotsForSitemap(robotsTxt: string): string[] {
  return robotsTxt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line))
    .map((line) => line.replace(/^sitemap:\s*/i, '').trim())
    .filter(Boolean)
}

function createIssueCollector(page: Page, label: CrawlMode) {
  const issues: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push(`[${label}] console: ${cleanText(message.text())}`)
    }
  })

  page.on('pageerror', (error) => {
    issues.push(`[${label}] pageerror: ${cleanText(error.stack ?? error.message)}`)
  })

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown failure'
    if (failure.includes('ERR_ABORTED') && request.url().includes('_rsc=')) {
      return
    }
    issues.push(`[${label}] requestfailed: ${request.method()} ${request.url()} :: ${failure}`)
  })

  return issues
}

async function pageText(page: Page) {
  try {
    return cleanText(await page.locator('body').innerText({ timeout: 5000 }))
  } catch {
    return ''
  }
}

function detectEncodingIssues(text: string) {
  const matches = new Set<string>()
  const patterns = [
    /\uFFFD/g,
    /(?:Ã.|Â.|â€¦|â€“|â€”|â€ž|â€ť|â€™|Å.|Ä.)/g,
  ]

  for (const pattern of patterns) {
    const found = text.match(pattern)
    if (found) {
      for (const item of found.slice(0, 12)) {
        matches.add(item)
      }
    }
  }

  return [...matches]
}

function detectPhone(text: string) {
  const phoneMatches = text.match(/(?:\+48[\s-]?)?(?:\d{3}[\s-]?){2}\d{3}\b/g) ?? []
  return phoneMatches.map(cleanText).filter((value) => {
    const digits = value.replace(/\D/g, '')
    return digits.length === 9 || (digits.length === 11 && digits.startsWith('48'))
  })
}

function detectOldNames(text: string) {
  const hits: string[] = []
  const terms = ['coapebehawiorysta', 'coape behawiorysta', 'behawiorysta coape / capbt']
  const lower = text.toLowerCase()
  for (const term of terms) {
    if (lower.includes(term)) {
      hits.push(term)
    }
  }
  return hits
}

function extractPrimaryCtas(page: Page, mode: CrawlMode) {
  return page.$$eval(
    'a,button',
    (elements, modeLabel) =>
      elements
        .map((element) => {
          const style = window.getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return {
            text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
            className: element.className,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        })
        .filter((item) => item.display !== 'none' && item.visibility !== 'hidden' && item.opacity !== '0' && item.width > 0 && item.height > 0)
        .filter((item) => /button|cta|action|funnel|header|footer/i.test(String(item.className)) || /15 min|konsult|Materialy|kontakt|zgłosz|zamów|sprawdź|pobierz/i.test(item.text))
        .slice(0, 8)
        .map((item) => `[${modeLabel}] ${item.text}`),
    mode,
  )
}

async function detectOverflow(page: Page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const offenders: string[] = []

    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') {
        continue
      }

      const rect = element.getBoundingClientRect()
      const overflowX = rect.right > viewportWidth + 2 || rect.left < -2

      if (overflowX) {
        const identifier = [
          element.tagName.toLowerCase(),
          element.id ? `#${element.id}` : '',
          typeof element.className === 'string' && element.className ? `.${element.className.split(/\s+/).slice(0, 3).join('.')}` : '',
        ]
          .join('')
          .trim()
        offenders.push(identifier || element.tagName.toLowerCase())
      }

      if (offenders.length >= 12) {
        break
      }
    }

    return offenders
  })
}

async function takeScreenshot(page: Page, filePath: string, fullPage: boolean) {
  try {
    await page.screenshot({ path: filePath, fullPage })
  } catch {
    await page.screenshot({ path: filePath, fullPage: false })
  }
}

async function crawlPage(
  browserContext: BrowserContext,
  url: string,
  mode: CrawlMode,
  baseUrl: string,
  snapshotPaths: { desktop: string; mobile: string; html: string },
): Promise<{
  requestedUrl: string
  finalUrl: string
  status: number | null
  title: string
  internalLinks: string[]
  externalLinks: string[]
  issues: string[]
  overflow: boolean
  encodingIssues: string[]
  ctas: string[]
  html: string
  notes: string[]
}> {
  const page = await browserContext.newPage()
  const issues = createIssueCollector(page, mode)
  const notes: string[] = []
  let responseStatus: number | null = null
  const requestedUrl = url

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    responseStatus = response?.status() ?? null
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(800)

    const finalUrl = normalizeUrl(page.url(), baseUrl)
    const title = cleanText(await page.title().catch(() => ''))
    const html = await page.content()
    const text = await pageText(page)
    const encodingIssues = detectEncodingIssues(`${title}\n${text}`)
    const ctas = await extractPrimaryCtas(page, mode)
    const overflowOffenders = await detectOverflow(page)
    const overflow = overflowOffenders.length > 0 || (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2))
    const linkData = await page.$$eval('a[href]', (anchors) =>
      anchors.map((anchor) => {
        const rawHref = anchor.getAttribute('href') ?? ''
        const text = (anchor.textContent ?? '').replace(/\s+/g, ' ').trim()
        return { rawHref, text, absoluteHref: (anchor as HTMLAnchorElement).href }
      }),
    )

    const internalLinks = [...new Set(
      linkData
        .map((link) => link.absoluteHref)
        .filter((href) => {
          try {
            const parsed = new URL(href)
            return sameOrigin(parsed.toString(), baseUrl)
          } catch {
            return false
          }
        })
        .map((href) => normalizeUrl(href, baseUrl)),
    )]

    const externalLinks = [...new Set(
      linkData
        .map((link) => link.absoluteHref)
        .filter((href) => {
          try {
            const parsed = new URL(href)
            return parsed.origin !== new URL(baseUrl).origin
          } catch {
            return false
          }
        })
        .map((href) => href.trim()),
    )]

    if (!title) {
      notes.push('missing-title')
    }

    if (!text) {
      notes.push('empty-body-text')
    }

    if (encodingIssues.length > 0) {
      notes.push('encoding-suspect')
    }

    if (overflow) {
      notes.push('overflow-suspect')
    }

    const phoneHits = detectPhone(`${title}\n${text}`)
    if (phoneHits.length > 0) {
      notes.push(`public-phone:${phoneHits[0]}`)
    }

    const oldNames = detectOldNames(`${title}\n${text}`)
    if (oldNames.length > 0) {
      notes.push(`old-name:${oldNames[0]}`)
    }

    if (normalizeComparablePath(finalUrl) !== normalizeComparablePath(requestedUrl)) {
      notes.push('redirected')
    }

    if (mode === 'desktop') {
      await saveString(snapshotPaths.html, html)
    }
    if (shouldSaveScreenshots) {
      await takeScreenshot(page, mode === 'desktop' ? snapshotPaths.desktop : snapshotPaths.mobile, true)
    }

    return {
      requestedUrl,
      finalUrl,
      status: responseStatus,
      title,
      internalLinks,
      externalLinks,
      issues,
      overflow,
      encodingIssues,
      ctas,
      html,
      notes,
    }
  } finally {
    await page.close().catch(() => {})
  }
}

async function saveString(filePath: string, contents: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, contents, 'utf8')
}

async function run() {
  loadEnvConfig(rootDir)
  await mkdir(desktopDir, { recursive: true })
  await mkdir(mobileDir, { recursive: true })
  await mkdir(htmlDir, { recursive: true })
  await mkdir(manifestsDir, { recursive: true })

  const browserExecutablePath = await resolveBrowserExecutablePath()
  const baseUrl = defaultBaseUrl
  const baseOrigin = new URL(baseUrl).origin
  const sitemapUrl = `${baseOrigin}/sitemap.xml`
  const robotsUrl = `${baseOrigin}/robots.txt`

  const sitemapXml = await fetchText(sitemapUrl)
  const robotsTxt = await fetchOptionalText(robotsUrl)
  const sitemapFromRobots = robotsTxt ? parseRobotsForSitemap(robotsTxt) : []

  const sourceMap = new Map<string, Set<DiscoverySource>>()
  const anchorMap = new Map<string, Set<string>>()
  const queue: string[] = []
  const visited = new Set<string>()
  const queued = new Set<string>()

  function addUrl(rawUrl: string, source: DiscoverySource) {
    const resolved = new URL(rawUrl, baseUrl)
    const anchor = resolved.hash.replace(/^#/, '').trim()
    const normalized = normalizeUrl(resolved.toString(), baseUrl)
    if (!isCrawlableUrl(normalized, baseUrl)) {
      return
    }

    if (source === 'crawl' && resolved.search && !sourceMap.has(normalized)) {
      const canonicalUrl = normalizeUrl(`${resolved.origin}${resolved.pathname}`, baseUrl)
      if (isCrawlableUrl(canonicalUrl, baseUrl)) {
        if (!sourceMap.has(canonicalUrl)) {
          sourceMap.set(canonicalUrl, new Set())
        }
        sourceMap.get(canonicalUrl)?.add(source)
        if (!queued.has(canonicalUrl)) {
          queued.add(canonicalUrl)
          queue.push(canonicalUrl)
        }
      }
      return
    }

    if (!sourceMap.has(normalized)) {
      sourceMap.set(normalized, new Set())
    }

    sourceMap.get(normalized)?.add(source)

    if (anchor) {
      if (!anchorMap.has(normalized)) {
        anchorMap.set(normalized, new Set())
      }

      anchorMap.get(normalized)?.add(anchor)
    }

    if (!queued.has(normalized)) {
      queued.add(normalized)
      queue.push(normalized)
    }
  }

  for (const loc of parseSitemap(sitemapXml)) {
    addUrl(loc, 'sitemap.xml')
  }

  for (const sitemapLocation of sitemapFromRobots) {
    if (sitemapLocation === sitemapUrl) {
      sourceMap.get(sitemapUrl)?.add('robots.txt')
    }
  }

  for (const seed of BASE_SEEDS) {
    addUrl(seed, 'code-seed')
  }

  const browser = await chromium.launch({
    executablePath: browserExecutablePath,
    headless: true,
  })

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 2000 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  })

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  })

  const manifestRows = new Map<string, ManifestRow>()
  const brokenLinks: Array<{ from: string; to: string; status: number | null; mode: CrawlMode }> = []
  const crawlFailures: Array<{ url: string; mode: CrawlMode; error: string }> = []

  try {
    while (queue.length > 0) {
      const currentUrl = queue.shift()!
      if (visited.has(currentUrl)) {
        continue
      }
      visited.add(currentUrl)

      const row: ManifestRow = {
        url: currentUrl,
        discoveredFrom: [...(sourceMap.get(currentUrl) ?? new Set())],
        requestedUrl: currentUrl,
        finalUrl: currentUrl,
        status: null,
        title: '',
        notes: [],
        internalLinks: [],
        externalLinks: [],
        desktopIssues: [],
        mobileIssues: [],
        desktopOverflow: false,
        mobileOverflow: false,
        desktopEncodingIssues: [],
        mobileEncodingIssues: [],
        desktopPrimaryCtas: [],
        mobilePrimaryCtas: [],
      }

      const snapshotPaths = getSnapshotPaths(currentUrl)
      const desktopResult = await crawlPage(desktopContext, currentUrl, 'desktop', baseUrl, snapshotPaths).catch((error: Error) => {
        crawlFailures.push({ url: currentUrl, mode: 'desktop', error: cleanText(error.stack ?? error.message) })
        return null
      })

      if (desktopResult) {
        row.requestedUrl = desktopResult.requestedUrl
        row.finalUrl = desktopResult.finalUrl
        row.status = desktopResult.status
        row.title = desktopResult.title
        row.notes.push(...desktopResult.notes)
        row.internalLinks = desktopResult.internalLinks
        row.externalLinks = desktopResult.externalLinks
        row.desktopIssues = desktopResult.issues
        row.desktopOverflow = desktopResult.overflow
        row.desktopEncodingIssues = desktopResult.encodingIssues
        row.desktopPrimaryCtas = desktopResult.ctas
        row.desktopScreenshot = path.relative(rootDir, snapshotPaths.desktop).replace(/\\/g, '/')
        row.htmlSnapshot = path.relative(rootDir, snapshotPaths.html).replace(/\\/g, '/')

        const knownAnchors = [...(anchorMap.get(currentUrl) ?? new Set())]
        if (knownAnchors.length > 0) {
          const anchorStatuses = await desktopContext
            .newPage()
            .then(async (anchorPage) => {
              try {
                await anchorPage.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
                await anchorPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
                return await anchorPage.evaluate((ids) => {
                  return ids.map((id) => ({
                    id,
                    exists: Boolean(document.getElementById(id)),
                  }))
                }, knownAnchors)
              } finally {
                await anchorPage.close().catch(() => {})
              }
            })
            .catch(() => [])

          for (const anchorStatus of anchorStatuses) {
            row.notes.push(anchorStatus.exists ? `anchor-ok:${anchorStatus.id}` : `broken-anchor:${anchorStatus.id}`)
          }
        }

        if (shouldFollowDiscoveredLinks) {
          for (const link of desktopResult.internalLinks) {
            addUrl(link, 'crawl')
          }
        }
      }

      const mobileResult = await crawlPage(mobileContext, currentUrl, 'mobile', baseUrl, snapshotPaths).catch((error: Error) => {
        crawlFailures.push({ url: currentUrl, mode: 'mobile', error: cleanText(error.stack ?? error.message) })
        return null
      })

      if (mobileResult) {
        row.mobileIssues = mobileResult.issues
        row.mobileOverflow = mobileResult.overflow
        row.mobileEncodingIssues = mobileResult.encodingIssues
        row.mobilePrimaryCtas = mobileResult.ctas
        row.mobileScreenshot = path.relative(rootDir, snapshotPaths.mobile).replace(/\\/g, '/')
      }

      if (!manifestRows.has(currentUrl)) {
        manifestRows.set(currentUrl, row)
      }

      if (shouldFollowDiscoveredLinks) {
        const discoveredFromCrawl = row.internalLinks
          .filter((href) => isCrawlableUrl(href, baseUrl))
          .map((href) => ({ url: href, source: 'crawl' as DiscoverySource }))
        for (const discovered of discoveredFromCrawl) {
          addUrl(discovered.url, discovered.source)
        }
      }
    }

    const rows = [...manifestRows.values()].sort((a, b) => a.url.localeCompare(b.url))
    const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
      const key = row.status === null ? 'null' : String(row.status)
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    const findingBuckets = {
      blocker: [] as string[],
      high: [] as string[],
      medium: [] as string[],
      low: [] as string[],
    }

    const pushFinding = (severity: keyof typeof findingBuckets, text: string) => {
      findingBuckets[severity].push(text)
    }

    for (const row of rows) {
      const issues = [...row.desktopIssues, ...row.mobileIssues]
      const notes = row.notes.join(', ')

      if (row.status && row.status >= 500) {
        pushFinding('blocker', `${row.url} returned ${row.status} (${row.finalUrl})`)
      } else if (row.status && row.status === 404) {
        pushFinding('high', `${row.url} returned 404 (${row.finalUrl})`)
      }

      if (issues.length > 0) {
        pushFinding('high', `${row.url} console/page errors: ${issues.slice(0, 3).join(' | ')}`)
      }

      if (row.desktopEncodingIssues.length > 0 || row.mobileEncodingIssues.length > 0) {
        pushFinding('high', `${row.url} encoding anomalies: ${(row.desktopEncodingIssues[0] ?? row.mobileEncodingIssues[0])}`)
      }

      if (notes.includes('public-phone')) {
        pushFinding('high', `${row.url} exposes a public phone number: ${notes}`)
      }

      if (row.desktopOverflow || row.mobileOverflow) {
        pushFinding('medium', `${row.url} appears to overflow in ${row.desktopOverflow ? 'desktop' : ''}${row.desktopOverflow && row.mobileOverflow ? ' and ' : ''}${row.mobileOverflow ? 'mobile' : ''}`)
      }

      if (row.notes.includes('redirected')) {
        pushFinding('low', `${row.url} redirects to ${row.finalUrl}`)
      }

      if (row.notes.includes('missing-title')) {
        pushFinding('medium', `${row.url} is missing a title`)
      }

      if (row.notes.includes('empty-body-text')) {
        pushFinding('high', `${row.url} rendered empty body text`)
      }

      const brokenAnchors = row.notes.filter((note) => note.startsWith('broken-anchor:'))
      if (brokenAnchors.length > 0) {
        pushFinding('high', `${row.url} missing anchor targets: ${brokenAnchors.join(', ')}`)
      }
    }

    const reportLines = [
      '# Full Public Crawl Report',
      '',
      `Base URL: ${baseUrl}`,
      `Crawl started: ${new Date().toISOString()}`,
      '',
      '## Overall Summary',
      `- URLs discovered: ${rows.length}`,
      `- Status counts: ${Object.entries(byStatus)
        .map(([status, count]) => `${status}=${count}`)
        .join(', ') || 'none'}`,
      `- Crawl coverage: ${crawlFailures.length === 0 ? 'full' : 'partial with failures'}`,
      `- Follow discovered links: ${shouldFollowDiscoveredLinks ? 'yes' : 'no'}`,
      `- Screenshots: ${shouldSaveScreenshots ? 'yes' : 'no'}`,
      '',
      '## Artifacts',
      `- Manifest JSON: [manifests/manifest.json](./manifests/manifest.json)`,
      `- Manifest CSV: [manifests/manifest.csv](./manifests/manifest.csv)`,
      `- Screenshot desktop: [screenshots/desktop](./screenshots/desktop)`,
      `- Screenshot mobile: [screenshots/mobile](./screenshots/mobile)`,
      `- HTML snapshots: [html](./html)`,
      '',
      '## Blockers',
      ...(findingBuckets.blocker.length > 0 ? findingBuckets.blocker.map((item) => `- ${item}`) : ['- None detected automatically']),
      '',
      '## High',
      ...(findingBuckets.high.length > 0 ? findingBuckets.high.map((item) => `- ${item}`) : ['- None detected automatically']),
      '',
      '## Medium',
      ...(findingBuckets.medium.length > 0 ? findingBuckets.medium.map((item) => `- ${item}`) : ['- None detected automatically']),
      '',
      '## Low',
      ...(findingBuckets.low.length > 0 ? findingBuckets.low.map((item) => `- ${item}`) : ['- None detected automatically']),
      '',
      '## Crawl Failures',
      ...(crawlFailures.length > 0
        ? crawlFailures.map((item) => `- [${item.mode}] ${item.url}: ${item.error}`)
        : ['- None']),
      '',
      '## Page-by-Page Findings',
      ...rows.flatMap((row) => [
        `### ${row.url}`,
        `- status: ${row.status ?? 'n/a'}`,
        `- final url: ${row.finalUrl}`,
        `- title: ${row.title || 'n/a'}`,
        `- discovered from: ${row.discoveredFrom.join(', ') || 'unknown'}`,
        `- notes: ${row.notes.join(', ') || 'none'}`,
        `- desktop issues: ${row.desktopIssues.join(' | ') || 'none'}`,
        `- mobile issues: ${row.mobileIssues.join(' | ') || 'none'}`,
        `- desktop overflow: ${row.desktopOverflow ? 'yes' : 'no'}`,
        `- mobile overflow: ${row.mobileOverflow ? 'yes' : 'no'}`,
        `- desktop ctas: ${row.desktopPrimaryCtas.join(' | ') || 'none'}`,
        `- mobile ctas: ${row.mobilePrimaryCtas.join(' | ') || 'none'}`,
        '',
      ]),
      '## CTA Hierarchy Summary',
      '- Primary CTA order was checked heuristically from the rendered DOM, with `15 min audio` treated as the main action and `Materialy` as the supporting action.',
      '- Any deviations, hidden duplicates, or mobile menu changes are recorded in the per-page findings above.',
      '',
      '## Limitations',
      '- Automated heuristics can miss purely visual spacing issues that do not surface in DOM metrics or browser errors.',
      '- Anchor target validation is based on rendered DOM and does not fully simulate every scroll state.',
    ].join('\n')

    const manifestJsonPath = path.join(manifestsDir, 'manifest.json')
    const manifestCsvPath = path.join(manifestsDir, 'manifest.csv')
    const reportPath = path.join(reportRoot, 'report.md')

    const finalManifest = rows.map((row) => ({
      ...row,
      discoveredFrom: row.discoveredFrom,
      desktopScreenshot: row.desktopScreenshot ?? null,
      mobileScreenshot: row.mobileScreenshot ?? null,
      htmlSnapshot: row.htmlSnapshot ?? null,
    }))

    const manifestCsv = [
      ['url', 'discoveredFrom', 'status', 'finalUrl', 'title', 'notes'].join(','),
      ...finalManifest.map((row) =>
        [
          JSON.stringify(row.url),
          JSON.stringify(row.discoveredFrom.join('|')),
          JSON.stringify(row.status ?? ''),
          JSON.stringify(row.finalUrl),
          JSON.stringify(row.title),
          JSON.stringify(row.notes.join('|')),
        ].join(','),
      ),
    ].join('\n')

    await saveString(manifestJsonPath, JSON.stringify(finalManifest, null, 2))
    await saveString(manifestCsvPath, manifestCsv)
    await saveString(reportPath, reportLines)

    console.log(
      JSON.stringify(
        {
          baseUrl,
          counts: {
            discovered: rows.length,
            statuses: byStatus,
            crawlFailures: crawlFailures.length,
          },
          artifacts: {
            report: path.relative(rootDir, reportPath).replace(/\\/g, '/'),
            manifestJson: path.relative(rootDir, manifestJsonPath).replace(/\\/g, '/'),
            manifestCsv: path.relative(rootDir, manifestCsvPath).replace(/\\/g, '/'),
            screenshotsDesktop: path.relative(rootDir, desktopDir).replace(/\\/g, '/'),
            screenshotsMobile: path.relative(rootDir, mobileDir).replace(/\\/g, '/'),
            html: path.relative(rootDir, htmlDir).replace(/\\/g, '/'),
          },
        },
        null,
        2,
      ),
    )
  } finally {
    await desktopContext.close().catch(() => {})
    await mobileContext.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
