import { SITE_PRODUCTION_URL } from '@/lib/site'

const DEFAULT_APP_URL = 'http://localhost:3000'
const DEFAULT_JITSI_BASE_URL = 'https://meet.jit.si'
const DEFAULT_RESERVATION_WINDOW_MINUTES = 15

const DATA_MODE_VALUES = ['auto', 'supabase', 'local'] as const
const PAYMENT_MODE_VALUES = ['auto', 'manual', 'mock'] as const

const reportedRuntimeMessages = new Set<string>()

export type DataMode = (typeof DATA_MODE_VALUES)[number]
export type PaymentMode = (typeof PAYMENT_MODE_VALUES)[number]

type ActiveDataMode = 'supabase' | 'local'
type ActivePaymentMode = 'manual' | 'mock'

type RuntimeModeStatus<TConfigured extends string, TActive extends string> = {
  configured: TConfigured
  active: TActive | null
  isValid: boolean
  usesFallback: boolean
  missing: string[]
  summary: string
}


export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function formatEnvList(names: string[]): string {
  return names.join(', ')
}

function hasAnyEnv(...names: string[]): boolean {
  return names.some((name) => Boolean(readEnv(name)))
}

function buildMissingConfigMessage(
  modeLabel: string,
  missing: string[],
  blockedFeature: string,
  fallbackMessage?: string,
): string {
  const base = `${modeLabel} wymaga ${formatEnvList(missing)}. Bez tego nie można uruchomić ${blockedFeature}.`
  return fallbackMessage ? `${base} ${fallbackMessage}` : base
}

export function getPublicFeatureUnavailableMessage(feature: 'booking' | 'payment' | 'materials' | 'admin'): string {
  switch (feature) {
    case 'booking':
      return 'Rezerwacja chwilowo jest niedostępna. Odśwież stronę za moment i spróbuj ponownie.'
    case 'payment':
      return 'Płatność chwilowo jest niedostępna. Spróbuj ponownie za kilka minut.'
    case 'materials':
      return 'Materiały do rozmowy chwilowo są niedostępne. Spróbuj ponownie za moment.'
    case 'admin':
      return 'Panel specjalisty wymaga dokończenia konfiguracji przed pierwszym logowaniem.'
    default:
      return 'Ta funkcja chwilowo jest niedostępna. Spróbuj ponownie za moment.'
  }
}

function parseMode<T extends readonly string[]>(envName: string, allowed: T, fallback: T[number]): T[number] {
  const raw = readEnv(envName)

  if (!raw) {
    return fallback
  }

  if ((allowed as readonly string[]).includes(raw)) {
    return raw as T[number]
  }

  throw new ConfigurationError(`${envName} ma nieprawidłową wartość "${raw}". Dozwolone: ${allowed.join(', ')}.`)
}

function getMissingSupabaseVars(): string[] {
  return ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !readEnv(name))
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
    return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')
  } catch {
    return null
  }
}

function readJwtRole(token: string): string | null {
  const parts = token.split('.')

  if (parts.length !== 3) {
    return null
  }

  const payload = decodeBase64Url(parts[1] ?? '')

  if (!payload) {
    return null
  }

  try {
    const parsed = JSON.parse(payload) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

export function getSupabaseServiceRoleKeyIssue(serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY')): string | null {
  if (!serviceRoleKey) {
    return null
  }

  if (serviceRoleKey.startsWith('sb_secret_')) {
    return null
  }

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    return 'SUPABASE_SERVICE_ROLE_KEY wskazuje na klucz publishable. Użyj klucza service role / sb_secret_, bo zapis ceny i bookingów wymaga uprawnień admina.'
  }

  const role = readJwtRole(serviceRoleKey)

  if (role === 'service_role') {
    return null
  }

  if (role) {
    return `SUPABASE_SERVICE_ROLE_KEY ma rolę "${role}" zamiast "service_role". Użyj prawdziwego klucza service role.`
  }

  return 'SUPABASE_SERVICE_ROLE_KEY nie wygląda jak prawidłowy klucz service role. Użyj klucza service role / sb_secret_ z panelu Supabase.'
}

function getSupabaseRuntimeProblem() {
  const missing = getMissingSupabaseVars()
  const keyIssue = missing.includes('SUPABASE_SERVICE_ROLE_KEY') ? null : getSupabaseServiceRoleKeyIssue()

  return {
    missing,
    keyIssue,
    hasExplicitConfig: hasAnyEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'),
  }
}

function buildSupabaseConfigMessage(
  modeLabel: string,
  missing: string[],
  blockedFeature: string,
  keyIssue?: string | null,
  fallbackMessage?: string,
): string {
  const problems: string[] = []

  if (missing.length > 0) {
    problems.push(
      `${modeLabel} wymaga ${formatEnvList(missing)}. Bez tego nie można uruchomić ${blockedFeature}.`,
    )
  }

  if (keyIssue) {
    problems.push(keyIssue)
  }

  const base = problems.join(' ')
  return fallbackMessage ? `${base} ${fallbackMessage}` : base
}

function hasManualPaymentConfig(): boolean {
  return Boolean(readEnv('MANUAL_PAYMENT_BLIK_PHONE'))
}

function logRuntimeMessage(key: string, summary: string, level: 'info' | 'warn') {
  if (reportedRuntimeMessages.has(key)) {
    return
  }

  reportedRuntimeMessages.add(key)
  const message = `[regulski-behawiorysta] ${summary}`

  if (level === 'warn') {
    console.warn(message)
    return
  }

  console.info(message)
}

export function getBaseUrl(): string {
  if (process.env.VERCEL_ENV === 'production') {
    return SITE_PRODUCTION_URL
  }

  if (readEnv('NEXT_PUBLIC_APP_URL')) {
    return readEnv('NEXT_PUBLIC_APP_URL')!
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return DEFAULT_APP_URL
}

export function isProductionDeployment(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production'
  }

  return process.env.NODE_ENV === 'production'
}

export function shouldBlockSearchIndexing(): boolean {
  return !isProductionDeployment()
}

export function getCanonicalBaseUrl(): string {
  if (process.env.VERCEL_ENV === 'production') {
    return SITE_PRODUCTION_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return getBaseUrl()
}

export function getJitsiBaseUrl(): string {
  return readEnv('JITSI_BASE_URL') ?? DEFAULT_JITSI_BASE_URL
}

export function getReservationWindowMinutes(): number {
  const raw = Number(readEnv('RESERVATION_WINDOW_MINUTES'))
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RESERVATION_WINDOW_MINUTES
}

export function getDataModeStatus(): RuntimeModeStatus<DataMode, ActiveDataMode> {
  const configured = parseMode('APP_DATA_MODE', DATA_MODE_VALUES, 'auto')
  const { missing, keyIssue, hasExplicitConfig } = getSupabaseRuntimeProblem()

  if (configured === 'local') {
    return {
      configured,
      active: 'local',
      isValid: true,
      usesFallback: true,
      missing: [],
      summary: 'APP_DATA_MODE=local -> aktywny jest local JSON fallback (development only).',
    }
  }

  if (configured === 'supabase') {
    if (missing.length > 0 || keyIssue) {
      return {
        configured,
        active: null,
        isValid: false,
        usesFallback: false,
        missing,
        summary: buildSupabaseConfigMessage(
          'APP_DATA_MODE=supabase',
          missing,
          'live bookings, availability i admin na Supabase',
          keyIssue,
        ),
      }
    }

    return {
      configured,
      active: 'supabase',
      isValid: true,
      usesFallback: false,
      missing: [],
      summary: 'APP_DATA_MODE=supabase -> aktywny jest Supabase live mode.',
    }
  }

  if (!hasExplicitConfig) {
    return {
      configured,
      active: 'local',
      isValid: true,
      usesFallback: true,
      missing: [],
        summary: `APP_DATA_MODE=auto -> aktywny jest local JSON fallback (development only), bo brakuje ${formatEnvList(
          ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        )}.`,
    }
  }

  if (missing.length > 0 || keyIssue) {
    if (process.env.NODE_ENV !== 'production') {
      return {
        configured,
        active: 'local',
        isValid: true,
        usesFallback: true,
        missing: [],
        summary: `APP_DATA_MODE=auto -> fallback to local (dev only), missing ${formatEnvList(missing)}.`,
      }
    }
    return {
      configured,
      active: null,
      isValid: false,
      usesFallback: false,
      missing,
      summary: buildSupabaseConfigMessage(
        'APP_DATA_MODE=auto',
        missing,
        'live bookings, availability i admin na Supabase',
        keyIssue,
      ),
    }
  }

  return {
    configured,
    active: 'supabase',
    isValid: true,
    usesFallback: false,
    missing: [],
    summary: 'APP_DATA_MODE=auto -> aktywny jest Supabase live mode.',
  }
}

export function getPaymentModeStatus(): RuntimeModeStatus<PaymentMode, ActivePaymentMode> {
  const configured = parseMode('APP_PAYMENT_MODE', PAYMENT_MODE_VALUES, 'auto')
  const manualPaymentAvailable = hasManualPaymentConfig()

  if (configured === 'mock') {
    return {
      configured,
      active: 'mock',
      isValid: true,
      usesFallback: true,
      missing: [],
      summary: 'APP_PAYMENT_MODE=mock -> aktywny jest testowy bypass płatności (QA flow).',
    }
  }

  if (configured === 'manual') {
    if (!manualPaymentAvailable) {
      return {
        configured,
        active: null,
        isValid: false,
        usesFallback: false,
        missing: ['MANUAL_PAYMENT_BLIK_PHONE'],
        summary: 'APP_PAYMENT_MODE=manual wymaga aktywnej konfiguracji wpłaty ręcznej przez BLIK.',
      }
    }

    return {
      configured,
      active: 'manual',
      isValid: true,
      usesFallback: false,
      missing: [],
      summary: 'APP_PAYMENT_MODE=manual -> aktywna jest wpłata ręczna z ręcznym potwierdzeniem.',
    }
  }

  // auto — fallback do manual jeśli skonfigurowane, inaczej mock (dev/QA)
  if (manualPaymentAvailable) {
    return {
      configured,
      active: 'manual',
      isValid: true,
      usesFallback: true,
      missing: [],
      summary: 'APP_PAYMENT_MODE=auto -> aktywna jest wpłata ręczna (BLIK skonfigurowane).',
    }
  }

  return {
    configured,
    active: 'mock',
    isValid: true,
    usesFallback: true,
    missing: [],
    summary: 'APP_PAYMENT_MODE=auto -> aktywny jest testowy bypass płatności, bo brak konfiguracji płatności ręcznej.',
  }
}

export function getRuntimeModeSnapshot() {
  return {
    data: getDataModeStatus(),
    payment: getPaymentModeStatus(),
  }
}

export function resolveDataMode(blockedFeature: string): ActiveDataMode {
  const status = getDataModeStatus()

  if (!status.isValid || !status.active) {
    throw new ConfigurationError(
      `${status.summary} Blokowany feature: ${blockedFeature}.`,
    )
  }

  return status.active
}

export function getSupabaseServerConfig(blockedFeature: string) {
  const status = getDataModeStatus()

  if (!status.isValid || status.active !== 'supabase') {
    throw new ConfigurationError(
      `${status.summary} Blokowany feature: ${blockedFeature}.`,
    )
  }

  return {
    url: readEnv('NEXT_PUBLIC_SUPABASE_URL')!,
    serviceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY')!,
  }
}

export function assertMockPaymentAllowed() {
  const status = getPaymentModeStatus()

  if (!status.isValid) {
    throw new ConfigurationError(status.summary)
  }

  if (status.active !== 'mock') {
    throw new ConfigurationError(
      `Mock payment endpoint jest wyłączony, bo aktywny tryb płatności to ${status.active}.`,
    )
  }
}

export function reportRuntimeModeUsage() {
  const data = getDataModeStatus()
  const payment = getPaymentModeStatus()

  logRuntimeMessage('data-mode', `Data mode: ${data.summary}`, data.usesFallback || !data.isValid ? 'warn' : 'info')
  logRuntimeMessage(
    'payment-mode',
    `Payment mode: ${payment.summary}`,
    payment.usesFallback || !payment.isValid ? 'warn' : 'info',
  )
}
