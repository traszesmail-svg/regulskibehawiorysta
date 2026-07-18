import { getBaseUrl, getDataModeStatus } from '@/lib/server/env'
import { getCustomerEmailDeliveryStatus } from '@/lib/server/notifications'
import { getPayuOptionStatus } from '@/lib/server/payment-options'
import { getSupabaseSchemaAudit } from '@/scripts/lib/schema-audit'

const EXTERNAL_CUSTOMER_SMOKE_EMAIL = 'customer@example.com'

export type GoLiveCheckTone = 'ready' | 'attention'

export type GoLiveCheckState = 'ready' | 'disabled' | 'blocked'

export type GoLiveCheck = {
  id: 'data-runtime' | 'schema-sync' | 'app-url' | 'customer-email' | 'payu-online'
  label: string
  statusLabel: string
  state: GoLiveCheckState
  tone: GoLiveCheckTone
  summary: string
  nextStep: string
}

type PublicUrlProbeResult = {
  ok: boolean
  status: number | null
  details: string
}

type DataRuntimeProbeResult = {
  ok: boolean
  status: number | null
  details: string
}

function getDataRuntimeGoLiveCheck(): GoLiveCheck {
  const data = getDataModeStatus()

  if (data.isValid && data.active === 'supabase' && !data.usesFallback) {
    return {
      id: 'data-runtime',
      label: 'Warstwa danych',
      statusLabel: 'Gotowe',
      state: 'ready',
      tone: 'ready',
      summary: 'Warstwa danych jest gotowa do ruchu live i korzysta z Supabase zamiast lokalnego fallbacku JSON.',
      nextStep: 'Brak blokera po stronie runtime danych.',
    }
  }

  return {
    id: 'data-runtime',
    label: 'Warstwa danych',
    statusLabel: 'Zablokowane',
    state: 'blocked',
    tone: 'attention',
    summary: `Warstwa danych nie jest gotowa do ruchu live: ${data.summary}`,
    nextStep: 'Ustaw prawidłowy runtime Supabase dla środowiska live i potwierdź zapis bookingów oraz admina poza local fallback.',
  }
}

function getSchemaSyncGoLiveCheck(): GoLiveCheck {
  const audit = getSupabaseSchemaAudit()

  if (audit.ok) {
    return {
      id: 'schema-sync',
      label: 'Schema Supabase',
      statusLabel: 'Gotowe',
      state: 'ready',
      tone: 'ready',
      summary: 'Canonical Supabase schema i rollout migrations są zsynchronizowane z aktualnym code path.',
      nextStep: 'Brak blokera po stronie booking/payment/QA schema.',
    }
  }

  return {
    id: 'schema-sync',
    label: 'Schema Supabase',
    statusLabel: 'Zablokowane',
    state: 'blocked',
    tone: 'attention',
    summary: audit.summary,
    nextStep: 'Uruchom npm run schema-audit i doprowadz supabase/schema.sql oraz rollout migracje do zgodnosci.',
  }
}

function getAppUrlGoLiveCheck(): GoLiveCheck {
  const baseUrl = getBaseUrl()
  let parsedUrl: URL | null = null

  try {
    parsedUrl = new URL(baseUrl)
  } catch {}

  const isHttps = parsedUrl?.protocol === 'https:'
  const isLocalHost = parsedUrl ? /^(localhost|127\.0\.0\.1)$/i.test(parsedUrl.hostname) : true

  if (parsedUrl && isHttps && !isLocalHost) {
    return {
      id: 'app-url',
      label: 'Publiczny URL',
      statusLabel: 'Gotowe',
      state: 'ready',
      tone: 'ready',
      summary: `Publiczny URL aplikacji jest gotowy do linkow zwrotnych i maili: ${baseUrl}.`,
      nextStep: 'Brak blokera po stronie publicznego URL.',
    }
  }

  return {
    id: 'app-url',
    label: 'Publiczny URL',
    statusLabel: 'Zablokowane',
    state: 'blocked',
    tone: 'attention',
    summary: `Publiczny URL nie wygląda na produkcyjny HTTPS endpoint: ${baseUrl}.`,
    nextStep: 'Ustaw NEXT_PUBLIC_APP_URL na docelowy adres HTTPS używany w linkach mailowych i powrotach z płatności.',
  }
}

async function probePublicAppUrl(baseUrl: string): Promise<PublicUrlProbeResult> {
  try {
    const probeUrl = new URL(baseUrl)
    probeUrl.searchParams.set('__live_readiness', Date.now().toString())

    const response = await fetch(probeUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'user-agent': 'regulski-behawiorysta-live-readiness/1.0',
      },
    })

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        details: `HTTP ${response.status}`,
      }
    }

    return {
      ok: false,
      status: response.status,
      details: `HTTP ${response.status}`,
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : 'unknown fetch failure'

    return {
      ok: false,
      status: null,
      details,
    }
  }
}

async function probeProductionDataRuntime(baseUrl: string): Promise<DataRuntimeProbeResult> {
  try {
    const probeUrl = new URL('/api/account/me', baseUrl)
    probeUrl.searchParams.set('__live_readiness', Date.now().toString())

    const response = await fetch(probeUrl, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        authorization: 'Bearer deliberately-invalid-live-readiness-token',
        'user-agent': 'regulski-behawiorysta-live-readiness/1.0',
      },
    })
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null
    const message = typeof payload?.error === 'string' ? payload.error : ''
    const invalidSession = /sesja konta opiekuna.*(wygas|niepoprawna)/i.test(message)

    if (response.status === 401 && invalidSession) {
      return {
        ok: true,
        status: response.status,
        details: `HTTP ${response.status}, kontrolowana nieprawidłowa sesja została odrzucona przez Supabase Auth`,
      }
    }

    return {
      ok: false,
      status: response.status,
      details: message ? `HTTP ${response.status}: ${message}` : `HTTP ${response.status}`,
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : 'unknown fetch failure'

    return {
      ok: false,
      status: null,
      details,
    }
  }
}

function needsProductionDataRuntimeProbe(check: GoLiveCheck) {
  return (
    check.id === 'data-runtime' &&
    check.state === 'blocked' &&
    /APP_DATA_MODE=supabase/i.test(check.summary) &&
    /SUPABASE_SERVICE_ROLE_KEY/i.test(check.summary)
  )
}

export async function getVerifiedDeployReadinessChecks(): Promise<GoLiveCheck[]> {
  const checks = getDeployReadinessChecks()
  const dataCheckIndex = checks.findIndex((check) => check.id === 'data-runtime')
  const urlCheckIndex = checks.findIndex((check) => check.id === 'app-url')

  if (urlCheckIndex === -1) {
    return checks
  }

  const currentUrlCheck = checks[urlCheckIndex]
  const baseUrl = getBaseUrl()

  if (currentUrlCheck.tone !== 'attention') {
    const probe = await probePublicAppUrl(baseUrl)

    if (probe.ok) {
      checks[urlCheckIndex] = {
        ...currentUrlCheck,
        summary: `Publiczny URL aplikacji jest gotowy do linków zwrotnych i maili: ${baseUrl} (${probe.details}).`,
        nextStep: 'Brak blokera po stronie publicznego URL i jego dostępności HTTP.',
      }
    } else {
      checks[urlCheckIndex] = {
        id: 'app-url',
        label: 'Publiczny URL',
        statusLabel: 'Bloker',
        state: 'blocked',
        tone: 'attention',
        summary: `Publiczny URL nie odpowiada poprawnie dla ruchu zewnętrznego: ${baseUrl} (${probe.details}).`,
        nextStep: 'Ustaw NEXT_PUBLIC_APP_URL na faktycznie publiczny adres HTTPS bez ochrony 401/SSO i potwierdź go przez npm run live-smoke.',
      }
    }
  }

  const currentDataCheck = dataCheckIndex === -1 ? null : checks[dataCheckIndex]
  if (currentDataCheck && needsProductionDataRuntimeProbe(currentDataCheck)) {
    const probe = await probeProductionDataRuntime(baseUrl)

    if (probe.ok) {
      checks[dataCheckIndex] = {
        id: 'data-runtime',
        label: 'Warstwa danych',
        statusLabel: 'Gotowe',
        state: 'ready',
        tone: 'ready',
        summary:
          `Lokalny snapshot Vercel nie ujawnia sekretu sensitive, ale runtime produkcyjny potwierdza Supabase Auth (${probe.details}).`,
        nextStep: 'Brak blokera po stronie produkcyjnego runtime danych.',
      }
    } else {
      checks[dataCheckIndex] = {
        ...currentDataCheck,
        summary: `${currentDataCheck.summary} Produkcyjny probe runtime nie potwierdził konfiguracji: ${probe.details}.`,
      }
    }
  }

  return checks
}

function getCustomerEmailGoLiveCheck(): GoLiveCheck {
  const status = getCustomerEmailDeliveryStatus(EXTERNAL_CUSTOMER_SMOKE_EMAIL)

  if (status.state === 'ready') {
    return {
      id: 'customer-email',
      label: 'Maile klienta',
      statusLabel: 'Gotowe',
      state: 'ready',
      tone: 'ready',
      summary: status.summary,
      nextStep: status.nextStep,
    }
  }

  if (status.state === 'disabled') {
    return {
      id: 'customer-email',
      label: 'Maile klienta',
      statusLabel: 'Wyłączone',
      state: 'disabled',
      tone: 'attention',
      summary: 'Maile klienta są świadomie wyłączone. Klient będzie zależał tylko od strony potwierdzenia.',
      nextStep: 'Włącz CUSTOMER_EMAIL_MODE=auto i ustaw zweryfikowany RESEND_FROM_EMAIL, żeby klient dostawał maile poza confirmation page.',
    }
  }

  const issue = status.issue ?? status.summary

  if (issue.includes('testing mode')) {
    return {
      id: 'customer-email',
      label: 'Maile klienta',
      statusLabel: 'Zablokowane',
      state: 'blocked',
      tone: 'attention',
      summary: 'Wysyłka maili do klientów zewnętrznych jest zablokowana, bo RESEND_FROM_EMAIL nadal korzysta z resend.dev testing mode.',
      nextStep: 'Zweryfikuj domenę nadawcy w Resend i ustaw RESEND_FROM_EMAIL na adres z tej domeny.',
    }
  }

  return {
    id: 'customer-email',
    label: 'Maile klienta',
    statusLabel: 'Zablokowane',
    state: 'blocked',
    tone: 'attention',
    summary: `Wysyłka maili do klientów zewnętrznych jest zablokowana: ${issue}.`,
    nextStep: 'Uzupełnij konfigurację Resend i powtórz próbę wysyłki na zewnętrzny adres testowy.',
  }
}

function getPayuGoLiveCheck(): GoLiveCheck {
  const payu = getPayuOptionStatus()

  if (payu.mode === 'disabled') {
    return {
      id: 'payu-online',
      label: 'PayU online',
      statusLabel: 'Gotowe',
      state: 'ready',
      tone: 'ready',
      summary: 'PayU online jest świadomie wyłączone. Checkout działa przez wpłatę ręczną i potwierdzenie na stronie.',
      nextStep: 'Możesz wystartować na płatności ręcznej. Po aktywacji produkcyjnego PayU ustaw PAYU_MODE=auto.',
    }
  }

  if (!payu.isAvailable) {
    return {
      id: 'payu-online',
      label: 'PayU online',
      statusLabel: 'Zablokowane',
      state: 'blocked',
      tone: 'attention',
      summary: `Płatność online PayU jest zablokowana: ${payu.summary}`,
      nextStep: 'Uzupełnij brakujące zmienne PayU i uruchom npm run payu-smoke.',
    }
  }

  if (payu.environment === 'sandbox') {
    return {
      id: 'payu-online',
      label: 'PayU online',
      statusLabel: 'Zablokowane',
      state: 'blocked',
      tone: 'attention',
      summary: 'Płatność online PayU nadal działa w trybie testowym, bo PAYU_ENVIRONMENT=sandbox.',
      nextStep: 'Przełącz PayU na produkcyjne klucze i potwierdź live checkout przez npm run payu-smoke:production przed ruchem live.',
    }
  }

  return {
    id: 'payu-online',
    label: 'PayU online',
    statusLabel: 'Gotowe',
    state: 'ready',
    tone: 'ready',
    summary: 'Płatność online PayU jest skonfigurowana dla środowiska production.',
    nextStep: 'Brak blokera po stronie konfiguracji PayU.',
  }
}

export function getGoLiveChecks(): GoLiveCheck[] {
  return [getSchemaSyncGoLiveCheck(), getCustomerEmailGoLiveCheck(), getPayuGoLiveCheck()]
}

export function getDeployReadinessChecks(): GoLiveCheck[] {
  return [getDataRuntimeGoLiveCheck(), getAppUrlGoLiveCheck(), ...getGoLiveChecks()]
}

export function hasBlockingGoLiveChecks(checks: GoLiveCheck[]): boolean {
  return checks.some((check) => check.state !== 'ready')
}
