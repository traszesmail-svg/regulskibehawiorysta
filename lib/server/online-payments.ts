import {
  isBookingServiceType,
  resolveBookingServiceType,
  type BookingServiceType,
} from '@/lib/booking-services'
import type { CommerceOrder } from '@/lib/commerce'
import { FUNNEL_SERVICE_CONFIG } from '@/lib/funnel'

export type OnlinePaymentProvider = 'naffy' | 'stripe' | 'none'

export type OnlinePaymentRuntime = {
  provider: OnlinePaymentProvider
  available: boolean
  label: string
  buttonLabel: string
  description: string
  unavailableMessage: string
  naffyUrl: string | null
}

const GLOBAL_NAFFY_ENV_NAMES = ['NAFFY_PAYMENT_URL', 'NAFFY_CHECKOUT_URL'] as const

export const CONSULTATION_NAFFY_ENV_BY_SERVICE: Record<BookingServiceType, readonly string[]> = {
  'szybka-konsultacja-15-min': [
    'NAFFY_CONSULTATION_QUICK_URL',
    'NAFFY_SZYBKA_KONSULTACJA_15_MIN_URL',
  ],
  'kwadrans-na-juz': [
    'NAFFY_CONSULTATION_URGENT_URL',
    'NAFFY_KWADRANS_NA_JUZ_URL',
  ],
  'konsultacja-30-min': [
    'NAFFY_CONSULTATION_30_URL',
    'NAFFY_KONSULTACJA_30_MIN_URL',
  ],
  'konsultacja-behawioralna-online': [
    'NAFFY_CONSULTATION_FULL_URL',
    'NAFFY_KONSULTACJA_BEHAWIORALNA_ONLINE_URL',
  ],
}

export function getConsultationNaffyPaymentUrl(serviceType: BookingServiceType): string | null {
  return readFirstValidHttpsEnv(CONSULTATION_NAFFY_ENV_BY_SERVICE[serviceType])
}

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function normalizeHttpsUrl(raw: string | null): string | null {
  if (!raw) {
    return null
  }

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

function readFirstValidHttpsEnv(names: readonly string[]): string | null {
  for (const name of names) {
    const url = normalizeHttpsUrl(readTrimmedEnv(name))

    if (url) {
      return url
    }
  }

  return null
}

function readGlobalNaffyPaymentUrl(): string | null {
  return readFirstValidHttpsEnv(GLOBAL_NAFFY_ENV_NAMES)
}

function resolveConsultationServiceType(order: CommerceOrder): BookingServiceType {
  const metaServiceType = order.meta.serviceType

  if (isBookingServiceType(metaServiceType)) {
    return metaServiceType
  }

  for (const serviceType of Object.keys(CONSULTATION_NAFFY_ENV_BY_SERVICE) as BookingServiceType[]) {
    if (order.productName.includes(serviceType) || order.productId.includes(serviceType)) {
      return serviceType
    }
  }

  const normalizedAmount = Math.round(order.amount * 100) / 100

  if (normalizedAmount === FUNNEL_SERVICE_CONFIG['kwadrans-na-juz'].priceAmount) {
    return 'kwadrans-na-juz'
  }

  return resolveBookingServiceType(null, order.amount)
}

function readNaffyPaymentUrl(order?: CommerceOrder | null): string | null {
  if (order?.meta.clinicPhoneUpgrade) {
    return readFirstValidHttpsEnv(['NAFFY_CLINIC_PHONE_UPGRADE_URL'])
  }
  if (order?.productType === 'consultation') {
    const serviceType = resolveConsultationServiceType(order)
    const serviceUrl = getConsultationNaffyPaymentUrl(serviceType)

    if (serviceUrl) {
      return serviceUrl
    }
  }

  return readGlobalNaffyPaymentUrl()
}

function buildAvailableRuntime(naffyUrl: string): OnlinePaymentRuntime {
  return {
    provider: 'naffy',
    available: true,
    label: 'Karta / Apple Pay / Google Pay',
    buttonLabel: 'Zapłać online',
    description: 'Karta oraz portfele Apple Pay i Google Pay, gdy urządzenie i przeglądarka je udostępniają.',
    unavailableMessage: '',
    naffyUrl,
  }
}

export function getOnlinePaymentRuntimeForClinicPhoneUpgrade(): OnlinePaymentRuntime {
  const naffyUrl = readFirstValidHttpsEnv(['NAFFY_CLINIC_PHONE_UPGRADE_URL'])
  if (naffyUrl) return buildAvailableRuntime(naffyUrl)

  if (readTrimmedEnv('STRIPE_SECRET_KEY')) {
    return {
      provider: 'stripe',
      available: true,
      label: 'Karta / Apple Pay / Google Pay',
      buttonLabel: 'Zapłać online',
      description: 'Karta oraz portfele Apple Pay i Google Pay, gdy urządzenie je udostępnia.',
      unavailableMessage: '',
      naffyUrl: null,
    }
  }

  return {
    provider: 'none',
    available: false,
    label: 'Płatność online',
    buttonLabel: 'Zapłać online',
    description: 'Płatność online dla dopłaty telefonicznej jest chwilowo niedostępna.',
    unavailableMessage: 'Wybierz BLIK po instrukcji e-mail.',
    naffyUrl: null,
  }
}
export function getOnlinePaymentRuntimeForConsultation(serviceType: BookingServiceType): OnlinePaymentRuntime {
  const naffyUrl = getConsultationNaffyPaymentUrl(serviceType) ?? readGlobalNaffyPaymentUrl()

  if (naffyUrl) {
    return buildAvailableRuntime(naffyUrl)
  }

  return getOnlinePaymentRuntime(null)
}

export function getOnlinePaymentRuntime(order?: CommerceOrder | null): OnlinePaymentRuntime {
  const naffyUrl = readNaffyPaymentUrl(order)

  if (naffyUrl) {
    return buildAvailableRuntime(naffyUrl)
  }

  if (readTrimmedEnv('STRIPE_SECRET_KEY')) {
    return {
      provider: 'stripe',
      available: true,
      label: 'Karta / Apple Pay / Google Pay',
      buttonLabel: 'Zapłać online',
      description: 'Karta oraz portfele Apple Pay i Google Pay, gdy urządzenie i przeglądarka je udostępniają.',
      unavailableMessage: '',
      naffyUrl: null,
    }
  }

  return {
    provider: 'none',
    available: false,
    label: 'Płatność online',
    buttonLabel: 'Zapłać online',
    description: 'Płatność online będzie dostępna po dodaniu linku checkoutu.',
    unavailableMessage:
      'Płatność kartą, Apple Pay i Google Pay jest chwilowo niedostępna. Użyj BLIK po instrukcji e-mail.',
    naffyUrl: null,
  }
}

export function buildNaffyCheckoutUrl(baseUrl: string, order: CommerceOrder): string {
  const url = new URL(baseUrl)

  if (!url.searchParams.has('order')) {
    url.searchParams.set('order', order.orderNumber)
  }

  if (!url.searchParams.has('utm_source')) {
    url.searchParams.set('utm_source', 'regulskibehawiorysta')
  }

  return url.toString()
}
