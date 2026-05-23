import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type BrowserContext, type Page } from 'playwright-core'
import { SITE_PRODUCTION_URL } from '@/lib/site'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type ViewportCase = {
  name: 'desktop' | 'mobile'
  width: number
  height: number
  isMobile?: boolean
  deviceScaleFactor?: number
}

type PageMetrics = {
  title: string
  bodyTextLength: number
  horizontalOverflow: number
  lcp: { name: string; startTime: number; size: number } | null
  images: Array<{
    src: string
    loading: string
    fetchPriority: string
    width: number
    height: number
    naturalWidth: number
    naturalHeight: number
    aboveFold: boolean
    complete: boolean
  }>
  controlOverflows: Array<{
    tag: string
    text: string
    className: string
    width: number
    scrollWidth: number
    height: number
    scrollHeight: number
  }>
  heavyResources: Array<{
    name: string
    type: string
    transferSize: number
    encodedBodySize: number
    duration: number
  }>
}

type AuditResult = {
  route: string
  url: string
  viewport: ViewportCase['name']
  status: number | null
  screenshotPath: string
  consoleErrors: string[]
  pageErrors: string[]
  metrics: PageMetrics
  failures: string[]
  warnings: string[]
}

const rootDir = process.cwd()
const reportRoot = path.join(rootDir, 'qa-reports', 'stage9-performance-audit')
const screenshotsDir = path.join(reportRoot, 'screenshots')

const DEFAULT_ROUTES = ['/', '/cennik', '/opinie', '/book', '/termin?problem=szczeniak']
const VIEWPORTS: ViewportCase[] = [
  { name: 'desktop', width: 1365, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
]

function readArg(name: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function safeSlug(value: string) {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'home'
}

function buildRoutes() {
  const rawRoutes = readArg('--routes') ?? process.env.STAGE9_ROUTES ?? ''
  const routes = rawRoutes
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)

  return routes.length > 0 ? routes : DEFAULT_ROUTES
}

function resolveBaseUrl() {
  return (readArg('--base-url') ?? process.env.STAGE9_BASE_URL ?? SITE_PRODUCTION_URL).replace(/\/+$/, '')
}

function buildUrl(baseUrl: string, route: string) {
  return new URL(route, `${baseUrl}/`).toString()
}

async function collectMetrics(page: Page): Promise<PageMetrics> {
  return page.evaluate(() => {
    const viewportHeight = window.innerHeight
    const documentElement = document.documentElement
    const body = document.body
    const lcpEntry = performance.getEntriesByType('largest-contentful-paint').at(-1) as
      | (PerformanceEntry & { size?: number })
      | undefined

    const images = Array.from(document.images).map((image) => {
      const rect = image.getBoundingClientRect()
      const imageWithPriority = image as HTMLImageElement & { fetchPriority?: string }

      return {
        src: image.currentSrc || image.src,
        loading: image.loading || 'auto',
        fetchPriority: imageWithPriority.fetchPriority ?? '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        aboveFold: rect.top < viewportHeight && rect.bottom > 0,
        complete: image.complete,
      }
    })

    const controlOverflows = Array.from(
      document.querySelectorAll<HTMLElement>('a, button, [role="button"], input, textarea, select'),
    )
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        const text = (element.textContent ?? element.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim()

        return {
          tag: element.tagName.toLowerCase(),
          text,
          className: element.className.toString(),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          height: Math.round(rect.height),
          scrollHeight: element.scrollHeight,
          visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
        }
      })
      .filter((item) => item.visible && (item.scrollWidth > item.width + 2 || item.scrollHeight > item.height + 4))
      .map(({ visible: _visible, ...item }) => item)

    const heavyResources = performance
      .getEntriesByType('resource')
      .filter((entry) => {
        const resource = entry as PerformanceResourceTiming
        return resource.initiatorType === 'img' || resource.initiatorType === 'script'
      })
      .map((entry) => {
        const resource = entry as PerformanceResourceTiming
        return {
          name: resource.name,
          type: resource.initiatorType,
          transferSize: resource.transferSize ?? 0,
          encodedBodySize: resource.encodedBodySize ?? 0,
          duration: Math.round(resource.duration),
        }
      })
      .sort((left, right) => right.transferSize - left.transferSize)
      .slice(0, 8)

    return {
      title: document.title,
      bodyTextLength: (body.innerText ?? '').trim().length,
      horizontalOverflow: Math.max(0, documentElement.scrollWidth - documentElement.clientWidth),
      lcp: lcpEntry
        ? {
            name: lcpEntry.name,
            startTime: Math.round(lcpEntry.startTime),
            size: Math.round(lcpEntry.size ?? 0),
          }
        : null,
      images,
      controlOverflows,
      heavyResources,
    }
  })
}

function analyzeResult(result: Omit<AuditResult, 'failures' | 'warnings'>): Pick<AuditResult, 'failures' | 'warnings'> {
  const failures: string[] = []
  const warnings: string[] = []
  const brokenImages = result.metrics.images.filter(
    (image) => image.complete && image.width > 0 && image.height > 0 && (image.naturalWidth === 0 || image.naturalHeight === 0),
  )
  const incompletePriorityImages = result.metrics.images.filter(
    (image) => image.aboveFold && !image.complete && image.loading !== 'lazy',
  )
  const eagerBelowFold = result.metrics.images.filter((image) => !image.aboveFold && image.loading === 'eager')

  if (!result.status || result.status >= 400) {
    failures.push(`HTTP status ${result.status ?? 'none'}`)
  }

  if (result.consoleErrors.length > 0) {
    failures.push(`console errors: ${result.consoleErrors.slice(0, 3).join(' | ')}`)
  }

  if (result.pageErrors.length > 0) {
    failures.push(`page errors: ${result.pageErrors.slice(0, 3).join(' | ')}`)
  }

  if (result.metrics.bodyTextLength < 80) {
    failures.push('rendered body is unexpectedly small')
  }

  if (result.metrics.horizontalOverflow > 2) {
    failures.push(`horizontal overflow ${result.metrics.horizontalOverflow}px`)
  }

  if (brokenImages.length > 0) {
    failures.push(`broken rendered images: ${brokenImages.length}`)
  }

  if (incompletePriorityImages.length > 0) {
    failures.push(`incomplete above-fold non-lazy images: ${incompletePriorityImages.length}`)
  }

  if (result.metrics.controlOverflows.length > 0) {
    warnings.push(`text/control overflow candidates: ${result.metrics.controlOverflows.length}`)
  }

  if (eagerBelowFold.length > 0) {
    warnings.push(`below-fold eager images: ${eagerBelowFold.length}`)
  }

  return { failures, warnings }
}

async function auditRoute(context: BrowserContext, baseUrl: string, route: string, viewport: ViewportCase) {
  const url = buildUrl(baseUrl, route)
  const page = await context.newPage()
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const screenshotPath = path.join(screenshotsDir, `${viewport.name}-${safeSlug(route)}.png`)

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {})
    await page.screenshot({ path: screenshotPath, fullPage: true })
    const metrics = await collectMetrics(page)
    const partial = {
      route,
      url,
      viewport: viewport.name,
      status: response?.status() ?? null,
      screenshotPath: path.relative(rootDir, screenshotPath).replace(/\\/g, '/'),
      consoleErrors,
      pageErrors,
      metrics,
    }
    const analyzed = analyzeResult(partial)
    return { ...partial, ...analyzed } satisfies AuditResult
  } finally {
    await page.close().catch(() => {})
  }
}

function renderReport(baseUrl: string, results: AuditResult[]) {
  const failures = results.flatMap((result) => result.failures.map((failure) => ({ result, failure })))
  const warnings = results.flatMap((result) => result.warnings.map((warning) => ({ result, warning })))
  const lines = [
    '# Stage 9 Performance Audit',
    '',
    `Base URL: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    `Status: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '## Summary',
    `- Checks: ${results.length}`,
    `- Failures: ${failures.length}`,
    `- Warnings: ${warnings.length}`,
    '',
    '## Failures',
    ...(failures.length > 0
      ? failures.map(({ result, failure }) => `- ${result.viewport} ${result.route}: ${failure}`)
      : ['- None']),
    '',
    '## Warnings',
    ...(warnings.length > 0
      ? warnings.map(({ result, warning }) => `- ${result.viewport} ${result.route}: ${warning}`)
      : ['- None']),
    '',
    '## Routes',
  ]

  for (const result of results) {
    const largestImage = [...result.metrics.images].sort((left, right) => right.width * right.height - left.width * left.height)[0]
    const heaviest = result.metrics.heavyResources[0]

    lines.push(`### ${result.viewport} ${result.route}`)
    lines.push(`- URL: ${result.url}`)
    lines.push(`- HTTP: ${result.status ?? 'none'}`)
    lines.push(`- Screenshot: ${result.screenshotPath}`)
    lines.push(`- Horizontal overflow: ${result.metrics.horizontalOverflow}px`)
    lines.push(`- Images: ${result.metrics.images.length}`)
    lines.push(`- Largest rendered image: ${largestImage ? `${largestImage.width}x${largestImage.height} ${largestImage.loading}` : 'none'}`)
    lines.push(`- LCP entry: ${result.metrics.lcp ? `${result.metrics.lcp.startTime}ms ${result.metrics.lcp.size}` : 'not exposed'}`)
    lines.push(`- Heaviest resource: ${heaviest ? `${Math.round(heaviest.transferSize / 1024)}KB ${heaviest.type}` : 'not exposed'}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

async function main() {
  const baseUrl = resolveBaseUrl()
  const routes = buildRoutes()
  const executablePath = await resolveBrowserExecutablePath()

  await mkdir(screenshotsDir, { recursive: true })

  const browser = await chromium.launch({ executablePath, headless: true })
  const results: AuditResult[] = []

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: Boolean(viewport.isMobile),
        hasTouch: Boolean(viewport.isMobile),
        deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
        ignoreHTTPSErrors: true,
      })

      try {
        for (const route of routes) {
          results.push(await auditRoute(context, baseUrl, route, viewport))
        }
      } finally {
        await context.close().catch(() => {})
      }
    }
  } finally {
    await browser.close().catch(() => {})
  }

  const report = renderReport(baseUrl, results)
  const reportPath = path.join(reportRoot, 'report.md')
  const jsonPath = path.join(reportRoot, 'manifest.json')

  await mkdir(reportRoot, { recursive: true })
  await writeFile(reportPath, report, 'utf8')
  await writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8')

  const failureCount = results.reduce((total, result) => total + result.failures.length, 0)
  console.log(
    JSON.stringify(
      {
        baseUrl,
        routes: routes.length,
        checks: results.length,
        failures: failureCount,
        report: path.relative(rootDir, reportPath).replace(/\\/g, '/'),
        manifest: path.relative(rootDir, jsonPath).replace(/\\/g, '/'),
      },
      null,
      2,
    ),
  )

  if (failureCount > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
