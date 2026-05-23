export const ANALYTICS_CONSENT_STORAGE_KEY = 'regulski-behawiorysta.analytics.consent'
export const ANALYTICS_CONSENT_COOKIE = 'regulski_behawiorysta_analytics_consent'
export const BOOKING_PROGRESS_STORAGE_KEY = 'regulski-behawiorysta.booking-progress'

import { pushDebugAnalyticsEvent } from '@/lib/analytics-debug'

export type AnalyticsConsentState = 'granted' | 'denied' | 'unset'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function readConsentCookie(): AnalyticsConsentState {
  if (typeof document === 'undefined') {
    return 'unset'
  }

  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`))

  if (!cookie) {
    return 'unset'
  }

  const value = cookie.split('=')[1]
  return value === 'granted' || value === 'denied' ? value : 'unset'
}

export function readAnalyticsConsent(): AnalyticsConsentState {
  if (typeof window === 'undefined') {
    return 'unset'
  }

  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
    if (stored === 'granted' || stored === 'denied') {
      return stored
    }
  } catch {}

  return readConsentCookie()
}

export function persistAnalyticsConsent(consent: Exclude<AnalyticsConsentState, 'unset'>) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent)
  } catch {}

  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${consent}; Max-Age=31536000; Path=/; SameSite=Lax`
}

const PUBLIC_EVENT_NAME_ALIASES: Record<string, string> = {
  funnel_entry_15_min: 'hero_cta_click',
  booking_service_selected: 'service_select',
  booking_slot_selected: 'slot_select',
  slot_selected: 'slot_select',
  booking_form_started: 'form_start',
  form_started: 'form_start',
  booking_form_submitted: 'form_submit',
  payment_started: 'payment_start',
  payment_marked_pending: 'payment_reported',
  manual_pending: 'payment_reported',
  payment_completed: 'payment_confirmed',
  booking_confirmed: 'payment_confirmed',
}

const BOOKING_PROGRESS_EVENT_NAMES = new Set([
  'hero_cta_click',
  'service_select',
  'slot_select',
  'form_start',
  'form_submit',
])

const BOOKING_TERMINAL_EVENT_NAMES = new Set(['payment_start', 'payment_reported', 'payment_confirmed'])
const BOOKING_PROGRESS_TTL_MS = 3 * 60 * 60 * 1000

type AnalyticsPayload = Record<string, string | number | boolean | null>

type StoredBookingProgress = {
  eventName: string
  pagePath: string | null
  qaBooking: boolean
  properties: AnalyticsPayload
  createdAt: number
}

let bookingDropListenersInstalled = false

export function getPublicAnalyticsEventName(name: string) {
  return PUBLIC_EVENT_NAME_ALIASES[name] ?? name
}

function getPagePath() {
  if (typeof window === 'undefined') {
    return null
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function isQaBookingPage() {
  if (typeof document === 'undefined') {
    return false
  }

  return Boolean(document.querySelector('[data-qa-booking="true"]'))
}

function isAnalyticsDisabledPage() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/_internal')) {
    return true
  }

  return Boolean(document.querySelector('[data-analytics-disabled="true"]'))
}

function postInternalAnalyticsEvent(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return
  }

  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const ok = navigator.sendBeacon(
        '/api/analytics/events',
        new Blob([body], {
          type: 'application/json',
        }),
      )

      if (ok) {
        return
      }
    } catch {}
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {})
}

function readStoredBookingProgress(): StoredBookingProgress | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(BOOKING_PROGRESS_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredBookingProgress>
    if (!parsed.eventName || typeof parsed.createdAt !== 'number') {
      return null
    }

    return {
      eventName: parsed.eventName,
      pagePath: parsed.pagePath ?? null,
      qaBooking: Boolean(parsed.qaBooking),
      properties: parsed.properties ?? {},
      createdAt: parsed.createdAt,
    }
  } catch {
    return null
  }
}

function clearStoredBookingProgress() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(BOOKING_PROGRESS_STORAGE_KEY)
  } catch {}
}

function flushStoredBookingDrop(reason: string) {
  if (typeof window === 'undefined') {
    return
  }

  if (readAnalyticsConsent() !== 'granted' || isAnalyticsDisabledPage()) {
    return
  }

  const progress = readStoredBookingProgress()
  if (!progress) {
    return
  }

  const ageMs = Date.now() - progress.createdAt
  if (ageMs < 0 || ageMs > BOOKING_PROGRESS_TTL_MS || BOOKING_TERMINAL_EVENT_NAMES.has(progress.eventName)) {
    clearStoredBookingProgress()
    return
  }

  const payload: AnalyticsPayload = {
    ...progress.properties,
    last_step: progress.eventName,
    drop_reason: reason,
    age_ms: ageMs,
  }

  postInternalAnalyticsEvent({
    eventType: 'booking_drop',
    qaBooking: progress.qaBooking,
    pagePath: progress.pagePath,
    properties: payload,
    consent: 'granted',
  })

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'booking_drop', payload)
  }

  pushDebugAnalyticsEvent({
    eventType: 'booking_drop',
    pagePath: progress.pagePath,
    properties: payload,
    createdAt: new Date().toISOString(),
  })

  clearStoredBookingProgress()
}

function installBookingDropListeners() {
  if (bookingDropListenersInstalled || typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  bookingDropListenersInstalled = true
  window.addEventListener('pagehide', () => flushStoredBookingDrop('pagehide'))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushStoredBookingDrop('visibility_hidden')
    }
  })
}

function rememberBookingProgress(eventName: string, properties: AnalyticsPayload) {
  if (typeof window === 'undefined') {
    return
  }

  if (BOOKING_TERMINAL_EVENT_NAMES.has(eventName)) {
    clearStoredBookingProgress()
    return
  }

  if (!BOOKING_PROGRESS_EVENT_NAMES.has(eventName)) {
    return
  }

  try {
    const progress: StoredBookingProgress = {
      eventName,
      pagePath: getPagePath(),
      qaBooking: isQaBookingPage(),
      properties,
      createdAt: Date.now(),
    }
    window.localStorage.setItem(BOOKING_PROGRESS_STORAGE_KEY, JSON.stringify(progress))
    installBookingDropListeners()
  } catch {}
}

export function trackAnalyticsEvent(
  name: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (typeof window === 'undefined') {
    return
  }

  if (readAnalyticsConsent() !== 'granted') {
    return
  }

  if (isAnalyticsDisabledPage()) {
    return
  }

  const payload = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as AnalyticsPayload
  const publicEventName = getPublicAnalyticsEventName(name)

  postInternalAnalyticsEvent({
    eventType: publicEventName,
    qaBooking: isQaBookingPage(),
    pagePath: getPagePath(),
    properties: payload,
    consent: 'granted',
  })

  if (typeof window.gtag === 'function') {
    window.gtag('event', publicEventName, payload)
  }

  pushDebugAnalyticsEvent({
    eventType: publicEventName,
    pagePath: getPagePath(),
    properties: payload,
    createdAt: new Date().toISOString(),
  })

  rememberBookingProgress(publicEventName, payload)
}
