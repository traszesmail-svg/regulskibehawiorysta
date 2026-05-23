import { rm } from 'fs/promises'
import path from 'path'
import { execFileSync, spawn } from 'child_process'
import { loadEnvConfig } from '@next/env'
import { createLocalDataSandbox } from './lib/local-data-sandbox'

const rootDir = process.cwd()
const trackedFiles = ['availability.json', 'bookings.json', 'users.json', 'pricing-settings.json', 'funnel-events.json']
const localPort = 3230 + Math.floor(Math.random() * 100)
const localAppUrl = `http://localhost:${localPort}`

const PUBLIC_PAYU_SANDBOX = {
  environment: 'sandbox',
  posId: '300746',
  clientId: '300746',
  clientSecret: '2ee86a66e5d97e3fadc400c9f19b065d',
  secondKey: 'b6ca15b0d1020e8094d9b5f8d163db54',
} as const

type PayuSmokeEnvironment = 'sandbox' | 'production'
type PayuSmokeTarget = 'local' | 'remote'

type BookingStatusPayload = {
  bookingId?: string
  bookingStatus?: string
  paymentStatus?: string
  paymentMethod?: string | null
  paymentReference?: string | null
  payuOrderId?: string | null
  payuOrderStatus?: string | null
  smsConfirmationStatus?: string | null
  updatedAt?: string
  error?: string
}

const ALLOWED_PAYU_SANDBOX_HOSTS = new Set(['secure.snd.payu.com', 'merch-prod.snd.payu.com'])

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)

  if (index === -1) {
    return null
  }

  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) {
    return null
  }

  return value.trim()
}

function normalizeTargetUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim())
  return parsed.toString().replace(/\/$/, '')
}

function resolvePayuSmokeTargetUrl(): string | null {
  const rawTarget = readArg('--url') ?? process.env.PAYU_SMOKE_URL?.trim() ?? process.env.LIVE_SMOKE_URL?.trim() ?? null

  if (!rawTarget) {
    return null
  }

  return normalizeTargetUrl(rawTarget)
}

function buildAdminAuthHeader(secret: string | null): string | null {
  if (!secret) {
    return null
  }

  return `Basic ${Buffer.from(`admin:${secret}`).toString('base64')}`
}

function getPayuSmokeEnvironment(): PayuSmokeEnvironment {
  if (process.argv.includes('--production') || process.env.PAYU_SMOKE_ENVIRONMENT?.trim().toLowerCase() === 'production') {
    return 'production'
  }

  return process.env.PAYU_ENVIRONMENT?.trim().toLowerCase() === 'production' ? 'production' : 'sandbox'
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
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

async function waitForServer(baseUrl: string) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetchWithTimeout(baseUrl, { cache: 'no-store' }, 5_000)
      if (response.status > 0) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Local server did not become ready in time.')
}

function appendLog(buffer: string, chunk: Buffer | string) {
  const next = `${buffer}${chunk.toString()}`
  return next.slice(-4000)
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 60_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function killProcessTree(server: ReturnType<typeof spawn> | null) {
  if (!server?.pid) {
    return
  }

  try {
    execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } catch {}
}

async function requestJson<T>(url: string, init: RequestInit, timeoutMs = 60_000): Promise<T> {
  const response = await fetchWithTimeout(url, init, timeoutMs)
  const rawBody = await response.text()

  if (!response.ok) {
    let message = rawBody || `HTTP ${response.status}`

    try {
      const parsed = JSON.parse(rawBody) as { error?: string }
      message = parsed.error ?? message
    } catch {}

    throw new Error(message)
  }

  if (!rawBody) {
    return {} as T
  }

  return JSON.parse(rawBody) as T
}

async function createAvailabilitySlot(baseUrl: string, bookingDate: string, bookingTime: string): Promise<{ id: string }> {
  const adminAuthHeader = buildAdminAuthHeader(process.env.ADMIN_ACCESS_SECRET?.trim() ?? null)

  const payload = await requestJson<{ slot?: { id?: string } }>(`${baseUrl}/api/availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(adminAuthHeader ? { authorization: adminAuthHeader } : {}),
    },
    body: JSON.stringify({
      bookingDate,
      bookingTime,
    }),
  })

  if (!payload.slot?.id) {
    throw new Error('Nie udało się utworzyć slotu do testu PayU.')
  }

  return {
    id: payload.slot.id,
  }
}

async function createBooking(baseUrl: string, slotId: string) {
  const payload = await requestJson<{
    bookingId?: string
    accessToken?: string
  }>(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ownerName: 'PayU Smoke',
      problemType: 'szczeniak',
      animalType: 'Pies',
      petAge: '3 lata',
      durationNotes: 'Od wczoraj',
      description: 'Test server-side checkoutu PayU dla predeploy smoke.',
      phone: '500700800',
      email: 'payu-smoke@example.com',
      slotId,
    }),
  })

  if (!payload.bookingId || !payload.accessToken) {
    throw new Error('Nie udało się utworzyć testowego bookingu PayU.')
  }

  return {
    bookingId: payload.bookingId,
    accessToken: payload.accessToken,
  }
}

async function startPayuCheckout(baseUrl: string, bookingId: string, accessToken: string) {
  const payload = await requestJson<{ url?: string }>(`${baseUrl}/api/payments/payu/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookingId,
      accessToken,
    }),
  })

  if (!payload.url) {
    throw new Error('Nie udało się uruchomić checkoutu PayU.')
  }

  return {
    url: payload.url,
  }
}

async function readBookingStatus(baseUrl: string, bookingId: string, accessToken: string) {
  return requestJson<BookingStatusPayload>(
    `${baseUrl}/api/bookings/${bookingId}/status?access=${encodeURIComponent(accessToken)}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  )
}

async function main() {
  loadEnvConfig(rootDir)
  const smokeEnvironment = getPayuSmokeEnvironment()
  const targetUrl = resolvePayuSmokeTargetUrl()
  const targetMode: PayuSmokeTarget = targetUrl ? 'remote' : 'local'

  if (smokeEnvironment === 'production' && !targetUrl) {
    throw new Error('Tryb production wymaga publicznego URL przez --url albo PAYU_SMOKE_URL.')
  }

  const baseUrl = targetUrl ?? localAppUrl
  let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null
  let server: ReturnType<typeof spawn> | null = null
  let serverStdout = ''
  let serverStderr = ''

  if (targetMode === 'local') {
    process.env.APP_DATA_MODE = 'local'
    process.env.APP_PAYMENT_MODE = 'auto'
    process.env.NEXT_PUBLIC_APP_URL = baseUrl
    process.env.RESEND_API_KEY = ''
    process.env.SMS_PROVIDER = 'disabled'
    process.env.ADMIN_ACCESS_SECRET = process.env.ADMIN_ACCESS_SECRET?.trim() || 'payu-smoke-admin'
    process.env.MANUAL_PAYMENT_BANK_ACCOUNT = '11112222333344445555666677'
    process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Krzysztof Regulski'
    process.env.PAYU_ENVIRONMENT = PUBLIC_PAYU_SANDBOX.environment
    process.env.PAYU_CLIENT_ID = process.env.PAYU_CLIENT_ID?.trim() || PUBLIC_PAYU_SANDBOX.clientId
    process.env.PAYU_CLIENT_SECRET = process.env.PAYU_CLIENT_SECRET?.trim() || PUBLIC_PAYU_SANDBOX.clientSecret
    process.env.PAYU_POS_ID = process.env.PAYU_POS_ID?.trim() || PUBLIC_PAYU_SANDBOX.posId
    process.env.PAYU_SECOND_KEY = process.env.PAYU_SECOND_KEY?.trim() || PUBLIC_PAYU_SANDBOX.secondKey

    sandbox = await createLocalDataSandbox('payu-smoke', rootDir)
    const { dataDir } = sandbox

    await Promise.all(trackedFiles.map((fileName) => rm(path.join(dataDir, fileName), { force: true })))

    server = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(localPort)], {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    server.stdout?.on('data', (chunk) => {
      serverStdout = appendLog(serverStdout, chunk)
    })
    server.stderr?.on('data', (chunk) => {
      serverStderr = appendLog(serverStderr, chunk)
    })

    try {
      await waitForServer(baseUrl)
    } catch (error) {
      throw new Error(
        [
          error instanceof Error ? error.message : 'Local server did not become ready in time.',
          serverStdout ? `stdout:\n${serverStdout}` : null,
          serverStderr ? `stderr:\n${serverStderr}` : null,
        ]
          .filter(Boolean)
          .join('\n\n'),
      )
    }
  }

  try {
    const slotTime = getWarsawSlotInMinutes(45)
    const slot = await createAvailabilitySlot(baseUrl, slotTime.date, slotTime.time)
    assert(slot, 'Nie udało się utworzyć slotu do testu PayU.')

    const booking = await createBooking(baseUrl, slot.id)
    const checkout = await startPayuCheckout(baseUrl, booking.bookingId, booking.accessToken)
    const redirectUrl = new URL(checkout.url)
    const bookingStatus = await readBookingStatus(baseUrl, booking.bookingId, booking.accessToken)
    const isProductionRedirectHost = /^(?!.*\.snd\.)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.payu\.com$/i.test(redirectUrl.hostname)

    if (smokeEnvironment === 'production') {
      assert(isProductionRedirectHost, `Nieoczekiwany host PayU redirect dla production: ${redirectUrl.hostname}`)
    } else {
      assert(ALLOWED_PAYU_SANDBOX_HOSTS.has(redirectUrl.hostname), `Nieoczekiwany host PayU redirect: ${redirectUrl.hostname}`)
    }

    assert(bookingStatus.bookingStatus === 'pending', 'Booking po starcie checkoutu PayU nie powinien zmieniać bookingStatus.')
    assert(bookingStatus.paymentStatus === 'unpaid', 'Booking po starcie checkoutu PayU nie powinien mieć statusu paid.')
    assert(bookingStatus.paymentMethod === 'payu', 'Booking nie zapisał paymentMethod=payu.')
    assert(Boolean(bookingStatus.payuOrderId), 'Booking nie zapisał payuOrderId.')
    assert(Boolean(bookingStatus.payuOrderStatus), 'Booking nie zapisał payuOrderStatus.')

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: targetMode,
          smokeEnvironment,
          targetUrl: baseUrl,
          usedPublicSandboxDefaults:
            targetMode === 'local' &&
            smokeEnvironment === 'sandbox' &&
            process.env.PAYU_CLIENT_ID === PUBLIC_PAYU_SANDBOX.clientId &&
            process.env.PAYU_POS_ID === PUBLIC_PAYU_SANDBOX.posId,
          bookingId: bookingStatus.bookingId ?? booking.bookingId,
          bookingStatus: bookingStatus.bookingStatus,
          paymentStatus: bookingStatus.paymentStatus,
          paymentMethod: bookingStatus.paymentMethod,
          payuOrderId: bookingStatus.payuOrderId,
          payuOrderStatus: bookingStatus.payuOrderStatus,
          redirectHost: redirectUrl.hostname,
          redirectPath: redirectUrl.pathname,
        },
        null,
        2,
      ),
    )
  } finally {
    killProcessTree(server)
    server?.stdout?.destroy()
    server?.stderr?.destroy()

    await sandbox?.cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
