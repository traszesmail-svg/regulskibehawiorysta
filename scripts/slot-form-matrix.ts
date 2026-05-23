import assert from 'node:assert/strict'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync, spawn } from 'node:child_process'
import { loadEnvConfig } from '@next/env'
import { chromium } from 'playwright-core'
import { problemOptions } from '../lib/data'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const require = createRequire(import.meta.url)
const rootDir = process.cwd()
const port = 3410 + Math.floor(Math.random() * 200)
const appUrl = `http://localhost:${port}`
const nextBinPath = require.resolve('next/dist/bin/next')

function getWarsawTimestamp() {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const values: Record<string, string> = {}

  for (const part of formatter.formatToParts(new Date())) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    isoLike: `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} Europe/Warsaw`,
    compact: `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`,
  }
}

function getWarsawSlotInMinutes(offsetMinutes: number) {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000)
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const values: Record<string, string> = {}

  for (const part of formatter.formatToParts(target)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  }
}

async function cleanLocalData(dataDir: string) {
  await rm(path.join(dataDir, 'availability.json'), { force: true })
  await rm(path.join(dataDir, 'pricing-settings.json'), { force: true })
  await rm(path.join(dataDir, 'bookings.json'), { force: true })
  await rm(path.join(dataDir, 'users.json'), { force: true })
  await rm(path.join(dataDir, 'funnel-events.json'), { force: true })
}

async function waitForServer(server: ReturnType<typeof spawn>, startupLogs: string[]) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (server.exitCode !== null) {
      break
    }
    try {
      const response = await fetch(appUrl, { cache: 'no-store' })
      if (response.status > 0) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const serverLogs = startupLogs.length > 0 ? `\nServer logs:\n${startupLogs.join('\n')}` : ''
  throw new Error(`Local server did not become ready in time.${serverLogs}`)
}

async function resolveBrowserExecutablePathLegacy() {
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

  throw new Error('Nie znaleziono lokalnej przegladarki Chromium (Chrome lub Edge) do slot-form-matrix.')
}

async function resolveServerCommand() {
  try {
    await access(path.join(rootDir, '.next', 'BUILD_ID'))
    return {
      mode: 'start' as const,
      args: ['start', '--hostname', '127.0.0.1', '--port', String(port)],
    }
  } catch {
    return {
      mode: 'dev' as const,
      args: ['dev', '--hostname', '127.0.0.1', '--port', String(port)],
    }
  }
}

function buildReportMarkdown({
  timestamp,
  serverMode,
  results,
}: {
  timestamp: string
  serverMode: 'start' | 'dev'
  results: Array<{
    topic: string
    label: string
    slots: Array<{
      slotId: string
      slotLabel: string
      url: string
    }>
  }>
}) {
  const lines = [
    '# Raport QA Booking Matrix',
    '',
    `- Data: ${timestamp}`,
    `- Tryb lokalnego serwera: next ${serverMode}`,
    `- URL: ${appUrl}`,
    `- Topics z kodu: ${results.length}`,
    '- Wynik: PASS',
    '',
    '## Zakres',
    '- Każdy topic z lib/data.ts został sprawdzony przez ścieżkę /slot -> /form.',
    '- Dla każdego topicu potwierdzono 2 przyszłe sloty.',
    '- W każdej kombinacji formularz załadował się bez błędów RSC i bez pageerrorów.',
    '',
    '## Wyniki',
  ]

  for (const topic of results) {
    lines.push(`### PASS - ${topic.topic}`)
    lines.push(`- Label: ${topic.label}`)
    lines.push(...topic.slots.map((slot, index) => `- Slot ${index + 1}: ${slot.slotLabel} | ${slot.url}`))
    lines.push('')
  }

  return lines.join('\n')
}
async function main() {
  loadEnvConfig(rootDir)
  process.env.APP_DATA_MODE = 'local'
  process.env.APP_PAYMENT_MODE = 'auto'
  process.env.NEXT_PUBLIC_APP_URL = appUrl
  process.env.RESEND_API_KEY = ''
  process.env.MANUAL_PAYMENT_BANK_ACCOUNT = '11112222333344445555666677'
  process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Krzysztof Regulski'
  process.env.SMS_PROVIDER = 'disabled'

  const sandbox = await createLocalDataSandbox('slot-form-matrix', rootDir)
  const { dataDir } = sandbox
  const localStore = await import('../lib/server/local-store')
  let server: ReturnType<typeof spawn> | null = null
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    await cleanLocalData(dataDir)

    const seededSlots = await Promise.all(
      [120, 140].map(async (offsetMinutes) => {
        const slot = getWarsawSlotInMinutes(offsetMinutes)
        return localStore.createAvailabilitySlot(slot.date, slot.time)
      }),
    )

    const startupLogs: string[] = []
    const serverCommand = await resolveServerCommand()

    server = spawn(process.execPath, [nextBinPath, ...serverCommand.args], {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    const captureServerLog = (chunk: string | Buffer) => {
      const text = chunk.toString().trim()
      if (text.length === 0) {
        return
      }

      startupLogs.push(text)
    }

    server.stdout?.on('data', captureServerLog)
    server.stderr?.on('data', captureServerLog)

    await waitForServer(server, startupLogs)

    browser = await chromium.launch({
      headless: true,
      executablePath: await resolveBrowserExecutablePath(),
    })

    const context = await browser.newContext({
      locale: 'pl-PL',
      viewport: { width: 1440, height: 1100 },
    })

    const results: Array<{
      topic: string
      label: string
      slots: Array<{
        slotId: string
        slotLabel: string
        url: string
      }>
    }> = []

    for (const topic of problemOptions) {
      const page = await context.newPage()
      const capturedConsole: string[] = []
      const capturedPageErrors: string[] = []

      page.on('console', (message) => {
        const text = message.text()

        if (/Cache miss/i.test(text) || /Failed to fetch RSC payload/i.test(text)) {
          capturedConsole.push(`${message.type()}: ${text}`)
        }
      })

      page.on('pageerror', (error) => {
        capturedPageErrors.push(error.message)
      })

      await page.goto(`${appUrl}/slot?problem=${encodeURIComponent(topic.id)}`, { waitUntil: 'domcontentloaded' })
      await page.locator('a.slot-link').first().waitFor()

      const slotResults: Array<{ slotId: string; slotLabel: string; url: string }> = []

      for (const slot of seededSlots) {
        const slotLink = page.locator(`a.slot-link[data-slot-id="${slot.id}"]`)

        await slotLink.waitFor()
        await slotLink.click()
        await page.waitForURL(new RegExp(`/form\\?problem=${topic.id}&slotId=`), { timeout: 10000 })
        await page.locator('form').waitFor({ timeout: 10000 })
        await page.locator('form input[placeholder="np. Anna"]').waitFor({ timeout: 10000 })
        await page.locator('form button[type="submit"]').waitFor({ timeout: 10000 })

        assert.equal(capturedConsole.length, 0, `Unexpected slot->form console errors for ${topic.id}: ${capturedConsole.join(' | ')}`)
        assert.equal(capturedPageErrors.length, 0, `Unexpected slot->form page errors for ${topic.id}: ${capturedPageErrors.join(' | ')}`)

        slotResults.push({
          slotId: slot.id,
          slotLabel: slot.bookingTime,
          url: page.url(),
        })

        await page.goto(`${appUrl}/slot?problem=${encodeURIComponent(topic.id)}`, { waitUntil: 'domcontentloaded' })
        await page.locator('a.slot-link').first().waitFor()
      }

      results.push({
        topic: topic.id,
        label: topic.title,
        slots: slotResults,
      })

      await page.close()
    }

    const timestamp = getWarsawTimestamp()
    const reportDir = path.join(rootDir, 'qa-reports')
    const archivePath = path.join(reportDir, `booking-matrix-${timestamp.compact}.md`)
    const latestPath = path.join(reportDir, 'latest-booking-matrix.md')
    const report = buildReportMarkdown({
      timestamp: timestamp.isoLike,
      serverMode: serverCommand.mode,
      results,
    })

    await mkdir(reportDir, { recursive: true })
    await writeFile(archivePath, report, 'utf8')
    await writeFile(latestPath, report, 'utf8')
    console.log(
      JSON.stringify(
        {
          appUrl,
          serverMode: serverCommand.mode,
          topicCount: results.length,
          archivePath,
          latestPath,
          topics: results,
        },
        null,
        2,
      ),
    )

    await context.close()
  } finally {
    if (browser) {
      await browser.close()
    }

    if (server?.pid) {
      try {
        execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
      } catch {}
    }

    await sandbox.cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
