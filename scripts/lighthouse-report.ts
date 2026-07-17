import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SITE_PRODUCTION_URL } from '@/lib/site'
import { resolveBrowserExecutablePath } from './lib/browser-path'

type RunResult = {
  route: string
  mode: 'mobile' | 'desktop'
  status: 'PASS' | 'FAIL'
  outputBase: string
  failure?: string
}

type LighthouseReport = {
  runtimeError?: { code?: string; message?: string } | null
  categories?: Record<string, { score?: number | null } | undefined>
}

const rootDir = process.cwd()
const reportRoot = path.join(rootDir, 'qa-reports', 'lighthouse')
const latestDir = path.join(reportRoot, 'latest')
const tempRoot = path.join(rootDir, '.tmp-lighthouse')
const DEFAULT_ROUTES = ['/', '/cennik', '/kontakt', '/book']

function readArg(name: string) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : process.argv[index + 1] ?? null
}

function resolveBaseUrl() {
  return (readArg('--base-url') ?? process.env.LIGHTHOUSE_BASE_URL ?? SITE_PRODUCTION_URL).replace(/\/+$/, '')
}

function resolveRoutes() {
  const raw = readArg('--routes') ?? process.env.LIGHTHOUSE_ROUTES ?? ''
  const routes = raw
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean)

  return routes.length > 0 ? routes : DEFAULT_ROUTES
}

function safeSlug(value: string) {
  return value
    .replace(/^\/$/, 'home')
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'home'
}

function getLighthouseCli() {
  return path.join(rootDir, 'node_modules', 'lighthouse', 'cli', 'index.js')
}

function buildUrl(baseUrl: string, route: string) {
  return new URL(route, `${baseUrl}/`).toString()
}

async function getReportFailure(outputBase: string): Promise<string | null> {
  try {
    const report = JSON.parse(await readFile(`${outputBase}.report.json`, 'utf8')) as LighthouseReport

    if (report.runtimeError) {
      return `runtime error ${report.runtimeError.code ?? 'unknown'}: ${report.runtimeError.message ?? 'no message'}`
    }

    const missingCategories = ['performance', 'accessibility', 'best-practices', 'seo'].filter(
      (category) => typeof report.categories?.[category]?.score !== 'number',
    )

    return missingCategories.length > 0 ? `missing Lighthouse categories: ${missingCategories.join(', ')}` : null
  } catch (error) {
    return `cannot validate Lighthouse JSON: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function runLighthouse(baseUrl: string, route: string, mode: RunResult['mode'], chromePath: string): Promise<RunResult> {
  const slug = `${mode}-${safeSlug(route)}`
  const outputBase = path.join(latestDir, slug)
  const args = [
    buildUrl(baseUrl, route),
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=json',
    '--output=html',
    `--output-path=${outputBase}`,
  ]

  if (mode === 'desktop') {
    args.push('--preset=desktop')
  }

  const result = spawnSync(process.execPath, [getLighthouseCli(), ...args], {
    cwd: rootDir,
    env: {
      ...process.env,
      CHROME_PATH: chromePath,
      TEMP: tempRoot,
      TMP: tempRoot,
      TMPDIR: tempRoot,
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  const hasReports = existsSync(`${outputBase}.report.html`) && existsSync(`${outputBase}.report.json`)
  const cleanupOnlyError =
    process.platform === 'win32' &&
    result.status !== 0 &&
    hasReports &&
    typeof result.stderr === 'string' &&
    result.stderr.includes('chrome-launcher') &&
    (result.stderr.includes('Runtime error encountered: EPERM') || result.stderr.includes('Error: EPERM, Permission denied'))

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  if (result.stderr && !cleanupOnlyError) {
    process.stderr.write(result.stderr)
  }

  if (result.error) {
    console.error(result.error.message)
  } else if (cleanupOnlyError) {
    console.warn(`Lighthouse generated reports for ${mode} ${route}; ignored Windows Chrome cleanup EPERM.`)
  }

  const reportFailure = hasReports ? await getReportFailure(outputBase) : 'Lighthouse reports were not generated'
  const passed = !result.error && (result.status === 0 || cleanupOnlyError) && !reportFailure

  if (reportFailure) {
    console.error(`Lighthouse ${mode} ${route} is not valid: ${reportFailure}`)
  }

  return {
    route,
    mode,
    status: passed ? 'PASS' : 'FAIL',
    outputBase: path.relative(rootDir, outputBase).replace(/\\/g, '/'),
    ...(reportFailure ? { failure: reportFailure } : {}),
  }
}

function renderReport(baseUrl: string, results: RunResult[]) {
  const failures = results.filter((result) => result.status === 'FAIL')
  const lines = [
    '# Lighthouse Report',
    '',
    `Base URL: ${baseUrl}`,
    `Generated: ${new Date().toISOString()}`,
    `Status: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '## Routes',
    ...results.map((result) => `- ${result.status} ${result.mode} ${result.route}: ${result.outputBase}.report.html / ${result.outputBase}.report.json${result.failure ? ` — ${result.failure}` : ''}`),
  ]

  return `${lines.join('\n')}\n`
}

async function main() {
  const baseUrl = resolveBaseUrl()
  const routes = resolveRoutes()
  const chromePath = await resolveBrowserExecutablePath()
  const results: RunResult[] = []

  await mkdir(latestDir, { recursive: true })
  await mkdir(tempRoot, { recursive: true })

  for (const route of routes) {
    results.push(await runLighthouse(baseUrl, route, 'mobile', chromePath))
    results.push(await runLighthouse(baseUrl, route, 'desktop', chromePath))
  }

  const report = renderReport(baseUrl, results)
  const reportPath = path.join(latestDir, 'report.md')
  const failures = results.filter((result) => result.status === 'FAIL').length

  await writeFile(reportPath, report, 'utf8')
  console.log(
    JSON.stringify(
      {
        baseUrl,
        routes: routes.length,
        checks: results.length,
        failures,
        report: path.relative(rootDir, reportPath).replace(/\\/g, '/'),
      },
      null,
      2,
    ),
  )

  if (failures > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
