import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  evaluateReleaseSmokeRedirect,
  evaluateReleaseSmokePage,
  getDefaultReleaseSmokeRules,
  type ReleaseSmokeResult,
} from '@/lib/release-smoke'
import { SITE_PRODUCTION_URL } from '@/lib/site'

type CheckResult = {
  name: string
  status: 'PASS' | 'FAIL'
  detail: string
}

const rootDir = process.cwd()
const reportDir = path.join(rootDir, 'qa-reports')
const latestReportPath = path.join(reportDir, 'latest-release-checklist.md')

const REQUIRED_PACKAGE_SCRIPTS: Record<string, string> = {
  lint: 'eslint . --no-cache',
  test: 'node --import tsx --test tests/runtime-config.test.ts tests/customer-emails.test.ts tests/google-calendar.test.ts tests/reschedule-route.test.ts tests/account-room-access.test.ts tests/account-auth-errors.test.ts tests/growth-marketing-opt-in.test.ts tests/funnel-metrics.test.ts tests/booking-api-errors.test.ts tests/scheduling-rules.test.ts tests/promo-codes.test.ts tests/voip-chat-limits.test.ts tests/zapytaj-call-flow.test.ts tests/consultation-access.test.ts tests/quiz-first-step.test.ts tests/quiz-booking-handoff.test.ts tests/case-map.test.ts tests/case-map-questions.test.ts tests/case-map-icons.test.ts tests/case-map-handoff.test.ts tests/case-map-analytics.test.ts tests/commerce-payment-security.test.ts tests/blog-cover-sources.test.ts tests/public-menu-parity.test.ts',
  build: 'npm run lint && next build --no-lint',
  'schema-audit': 'node scripts/schema-audit.js',
  'live-smoke': 'node --import tsx scripts/live-smoke.ts',
  'live-readiness': 'node --import tsx scripts/live-readiness.ts',
  'live-clickthrough-report': 'node --import tsx scripts/live-clickthrough-report.ts',
  'funnel-metrics': 'node --import tsx scripts/funnel-metrics.ts',
  'stage9-performance-audit': 'node --import tsx scripts/stage9-performance-audit.ts',
  'js-off-smoke': 'node --import tsx scripts/js-off-smoke.ts',
  'lighthouse:report': 'node --import tsx scripts/lighthouse-report.ts',
  'full-public-crawl': 'node --import tsx scripts/full-public-crawl.ts',
}

const RELEASE_COMMANDS = [
  'npm run lint',
  'npm test',
  'npm run build',
  'npm run schema-audit',
  'npm run funnel-metrics',
  'npm run live-smoke',
  'npm run stage9-performance-audit',
  'npm run js-off-smoke',
  'npm run lighthouse:report',
  'npm run full-public-crawl',
]

function readArg(name: string) {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  return (readArg('--base-url') ?? process.env.RELEASE_BASE_URL ?? SITE_PRODUCTION_URL).replace(/\/+$/, '')
}

async function fetchText(url: string, redirect: RequestRedirect = 'follow') {
  const response = await fetch(url, {
    redirect,
    headers: {
      'user-agent': 'regulski-release-checklist/1.0',
    },
  })
  const text = await response.text()

  return {
    ok: response.ok,
    status: response.status,
    text,
    location: response.headers.get('location'),
  }
}

function pass(name: string, detail: string): CheckResult {
  return { name, status: 'PASS', detail }
}

function fail(name: string, detail: string): CheckResult {
  return { name, status: 'FAIL', detail }
}

async function checkPackageScripts() {
  const raw = await readFile(path.join(rootDir, 'package.json'), 'utf8')
  const packageJson = JSON.parse(raw) as { scripts?: Record<string, string> }
  const checks: CheckResult[] = []

  for (const [name, expected] of Object.entries(REQUIRED_PACKAGE_SCRIPTS)) {
    const actual = packageJson.scripts?.[name]
    checks.push(
      actual === expected
        ? pass(`package script: ${name}`, actual)
        : fail(`package script: ${name}`, `expected "${expected}", got "${actual ?? 'missing'}"`),
    )
  }

  return checks
}

async function checkPublicIndexes(baseUrl: string) {
  const checks: CheckResult[] = []
  const [robots, sitemap] = await Promise.all([
    fetchText(`${baseUrl}/robots.txt`),
    fetchText(`${baseUrl}/sitemap.xml`),
  ])

  checks.push(robots.ok ? pass('robots.txt', `HTTP ${robots.status}`) : fail('robots.txt', `HTTP ${robots.status}`))
  checks.push(sitemap.ok ? pass('sitemap.xml', `HTTP ${sitemap.status}`) : fail('sitemap.xml', `HTTP ${sitemap.status}`))

  if (robots.ok) {
    checks.push(
      robots.text.includes('Sitemap:')
        ? pass('robots sitemap pointer', 'Sitemap directive present')
        : fail('robots sitemap pointer', 'Sitemap directive missing'),
    )
    checks.push(
      /href=["']?tel:/i.test(robots.text)
        ? fail('robots forbidden phone link', 'tel: link found')
        : pass('robots forbidden phone link', 'none'),
    )
  }

  if (sitemap.ok) {
    checks.push(
      sitemap.text.includes('<loc>')
        ? pass('sitemap loc entries', `${(sitemap.text.match(/<loc>/g) ?? []).length} loc entries`)
        : fail('sitemap loc entries', 'no loc entries'),
    )
    checks.push(
      sitemap.text.includes('<loc>/')
        ? fail('sitemap absolute URLs', 'relative loc entry found')
        : pass('sitemap absolute URLs', 'absolute loc entries'),
    )
  }

  return checks
}

async function checkReleaseSmokeRules(baseUrl: string) {
  const results: ReleaseSmokeResult[] = []

  for (const rule of getDefaultReleaseSmokeRules()) {
    const url = new URL(rule.path, `${baseUrl}/`).toString()
    const response = await fetchText(url, rule.expectedRedirectTo ? 'manual' : 'follow')

    if (rule.expectedRedirectTo) {
      const redirectResult = evaluateReleaseSmokeRedirect(url, rule, response.status, response.location)

      results.push({
        rule,
        url,
        ok: redirectResult.ok,
        visibleText: '',
        buildMarker: null,
        missing: redirectResult.issues,
        forbiddenFound: [],
        forbiddenRawFound: [],
        orderFailures: [],
      })
      continue
    }

    if (!response.ok) {
      results.push({
        rule,
        url,
        ok: false,
        visibleText: '',
        buildMarker: null,
        missing: [`HTTP ${response.status}`],
        forbiddenFound: [],
        forbiddenRawFound: [],
        orderFailures: [],
      })
      continue
    }

    results.push(evaluateReleaseSmokePage(response.text, baseUrl, rule))
  }

  return results
}

function renderReport(baseUrl: string, checks: CheckResult[], smokeResults: ReleaseSmokeResult[]) {
  const failedChecks = checks.filter((check) => check.status === 'FAIL')
  const failedSmoke = smokeResults.filter((result) => !result.ok)
  const status = failedChecks.length === 0 && failedSmoke.length === 0 ? 'PASS' : 'FAIL'
  const lines = [
    '# Release Checklist',
    '',
    `Base URL: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    `Status: ${status}`,
    '',
    '## Required Commands',
    ...RELEASE_COMMANDS.map((command) => `- ${command}`),
    '',
    '## Static Checks',
    ...checks.map((check) => `- ${check.status} ${check.name}: ${check.detail}`),
    '',
    '## Live Smoke',
    ...smokeResults.map((result) => {
      const issues = [
        ...result.missing.map((item) => `missing=${item}`),
        ...result.forbiddenFound.map((item) => `forbidden=${item}`),
        ...result.forbiddenRawFound.map((item) => `forbiddenRaw=${item}`),
        ...result.orderFailures,
      ]

      const redirectSummary = result.rule.expectedRedirectTo
        ? `redirect ${result.rule.expectedRedirectStatus ?? 301} -> ${result.rule.expectedRedirectTo}`
        : 'ok'

      return `- ${result.ok ? 'PASS' : 'FAIL'} ${result.rule.path}: ${issues.join(' | ') || redirectSummary}`
    }),
    '',
    '## Browser And Crawl Gate',
    '- Browser console errors are covered by `npm run stage9-performance-audit` for priority routes.',
    '- JS-off contact and booking fallbacks are covered by `npm run js-off-smoke`.',
    '- Lighthouse mobile and desktop reports are generated by `npm run lighthouse:report`.',
    '- Full live HTML crawl and forbidden phrase checks are covered by `npm run full-public-crawl`.',
  ]

  return `${lines.join('\n')}\n`
}

async function main() {
  const baseUrl = resolveBaseUrl()
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '')
  const archiveReportPath = path.join(reportDir, `release-checklist-${timestamp}.md`)
  const [scriptChecks, indexChecks, smokeResults] = await Promise.all([
    checkPackageScripts(),
    checkPublicIndexes(baseUrl),
    checkReleaseSmokeRules(baseUrl),
  ])
  const checks = [...scriptChecks, ...indexChecks]
  const report = renderReport(baseUrl, checks, smokeResults)
  const failedChecks = checks.filter((check) => check.status === 'FAIL').length
  const failedSmoke = smokeResults.filter((result) => !result.ok).length

  await mkdir(reportDir, { recursive: true })
  await writeFile(latestReportPath, report, 'utf8')
  await writeFile(archiveReportPath, report, 'utf8')

  console.log(
    JSON.stringify(
      {
        baseUrl,
        checks: checks.length,
        failedChecks,
        smokeRules: smokeResults.length,
        failedSmoke,
        report: path.relative(rootDir, latestReportPath).replace(/\\/g, '/'),
      },
      null,
      2,
    ),
  )

  if (failedChecks > 0 || failedSmoke > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
