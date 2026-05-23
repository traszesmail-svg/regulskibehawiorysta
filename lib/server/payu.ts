import { createHash } from 'node:crypto'
import { getBookingServiceTitle, resolveBookingServiceType } from '@/lib/booking-services'
import { getProblemLabel } from '@/lib/data'
import { toStripeUnitAmount } from '@/lib/pricing'
import {
  attachPayuOrder,
  getBookingById,
  getBookingForViewer,
  markBookingPaid,
  markBookingPaymentFailed,
} from '@/lib/server/db'
import { getBaseUrl } from '@/lib/server/env'
import { getPayuOptionStatus } from '@/lib/server/payment-options'
import { BookingRecord } from '@/lib/types'

type PayuTokenCache = {
  value: string
  expiresAtMs: number
  cacheKey: string
}

type PayuCreateOrderResponse = {
  orderId?: string
  redirectUri?: string
  status?: {
    statusCode?: string
    code?: string
    statusDesc?: string
  }
}

type PayuRetrieveOrderResponse = {
  orders?: Array<{
    orderId: string
    extOrderId?: string
    status?: string
  }>
}

type PayuNotificationPayload = {
  order?: {
    orderId?: string
    extOrderId?: string
    status?: string
  }
}

let tokenCache: PayuTokenCache | null = null

function assertPayuConfigured() {
  const config = getPayuOptionStatus()

  if (!config.isAvailable || !config.posId || !config.clientId || !config.clientSecret || !config.secondKey) {
    throw new Error(config.summary)
  }

  return config
}

function buildCacheKey(config: ReturnType<typeof assertPayuConfigured>) {
  return `${config.environment}:${config.clientId}:${config.posId}`
}

function parseJson<T>(input: string): T {
  return JSON.parse(input) as T
}

function buildPayuBuyer(ownerName: string, email: string, phone?: string | null) {
  const normalizedName = ownerName.trim()
  const [firstName, ...rest] = normalizedName.split(/\s+/)

  return {
    email,
    ...(phone?.trim() ? { phone: phone.trim() } : {}),
    firstName: firstName || 'Opiekun',
    lastName: rest.join(' ') || 'Zwierzaka',
    language: 'pl',
  }
}

async function getPayuAccessToken() {
  const config = assertPayuConfigured()
  const cacheKey = buildCacheKey(config)

  if (tokenCache && tokenCache.cacheKey === cacheKey && tokenCache.expiresAtMs > Date.now() + 30_000) {
    return tokenCache.value
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
  })

  const response = await fetch(config.oauthUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(`PayU OAuth error ${response.status}: ${raw}`)
  }

  const payload = parseJson<{ access_token?: string; expires_in?: number }>(raw)

  if (!payload.access_token) {
    throw new Error('PayU OAuth did not return access_token.')
  }

  tokenCache = {
    value: payload.access_token,
    expiresAtMs: Date.now() + (payload.expires_in ?? 3600) * 1000,
    cacheKey,
  }

  return payload.access_token
}

function buildPayuHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function getOrderDescription(booking: Pick<BookingRecord, 'problemType' | 'bookingDate' | 'bookingTime' | 'amount' | 'serviceType'>) {
  const serviceTitle = getBookingServiceTitle(resolveBookingServiceType(booking.serviceType, booking.amount))
  return `Regulski - ${serviceTitle} - ${getProblemLabel(booking.problemType)} - ${booking.bookingDate} ${booking.bookingTime} - ${booking.amount.toFixed(2)} PLN`
}

export async function createPayuCheckout(
  bookingId: string,
  accessToken?: string | null,
  authorizationHeader?: string | null,
  customerIp?: string | null,
) {
  const booking = await getBookingForViewer(bookingId, accessToken, authorizationHeader)

  if (!booking) {
    throw new Error('Nie znaleziono rezerwacji do płatności online.')
  }

  if (!(booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid')) {
    throw new Error('Checkout PayU można uruchomić tylko dla nieopłaconej rezerwacji.')
  }

  const config = assertPayuConfigured()
  const token = await getPayuAccessToken()
  const baseUrl = getBaseUrl()
  const accessQuery = accessToken ? `&access=${encodeURIComponent(accessToken)}` : ''
  const continueUrl = `${baseUrl}/confirmation?bookingId=${booking.id}${accessQuery}&payu=1`
  const notifyUrl = `${baseUrl}/api/payu/notify`
  const serviceTitle = getBookingServiceTitle(resolveBookingServiceType(booking.serviceType, booking.amount))
  const payload = {
    notifyUrl,
    continueUrl,
    customerIp: customerIp || '127.0.0.1',
    merchantPosId: config.posId,
    description: getOrderDescription(booking),
    visibleDescription: serviceTitle,
    extOrderId: booking.id,
    currencyCode: 'PLN',
    totalAmount: String(toStripeUnitAmount(booking.amount)),
    buyer: buildPayuBuyer(booking.ownerName, booking.email, booking.phone),
    products: [
      {
        name: `Regulski - ${serviceTitle}`,
        unitPrice: String(toStripeUnitAmount(booking.amount)),
        quantity: '1',
      },
    ],
  }

  const response = await fetch(`${config.apiBaseUrl}/api/v2_1/orders`, {
    method: 'POST',
    headers: buildPayuHeaders(token),
    body: JSON.stringify(payload),
    redirect: 'manual',
  })

  const raw = await response.text()
  const parsed = raw ? parseJson<PayuCreateOrderResponse>(raw) : {}
  const redirectUri = parsed.redirectUri || response.headers.get('location') || null

  if (!response.ok && response.status !== 302 && response.status !== 201) {
    throw new Error(parsed.status?.statusDesc || `PayU order error ${response.status}`)
  }

  if (!parsed.orderId) {
    throw new Error('PayU nie zwróciło orderId.')
  }

  await attachPayuOrder(booking.id, {
    payuOrderId: parsed.orderId,
    payuOrderStatus: parsed.status?.statusCode ?? 'NEW',
  })

  if (!redirectUri) {
    throw new Error('PayU nie zwróciło adresu przekierowania.')
  }

  return {
    url: redirectUri,
    orderId: parsed.orderId,
  }
}

export async function fetchPayuOrder(orderId: string) {
  const config = assertPayuConfigured()
  const token = await getPayuAccessToken()
  const response = await fetch(`${config.apiBaseUrl}/api/v2_1/orders/${orderId}`, {
    method: 'GET',
    headers: buildPayuHeaders(token),
  })
  const raw = await response.text()

  if (!response.ok) {
    throw new Error(`PayU retrieve order error ${response.status}: ${raw}`)
  }

  return parseJson<PayuRetrieveOrderResponse>(raw)
}

async function syncPayuStateForBooking(
  booking: BookingRecord,
  orderId: string,
  orderStatus: string,
  options?: {
    triggerPaymentConfirmationSms?: boolean
  },
) {
  if (orderStatus === 'COMPLETED') {
    return markBookingPaid(booking.id, {
      paymentMethod: 'payu',
      payuOrderId: orderId,
      payuOrderStatus: orderStatus,
      triggerPaymentConfirmationSms: options?.triggerPaymentConfirmationSms ?? false,
    })
  }

  await attachPayuOrder(booking.id, {
    payuOrderId: orderId,
    payuOrderStatus: orderStatus,
  })

  if (orderStatus === 'CANCELED' && booking.paymentStatus !== 'paid') {
    return markBookingPaymentFailed(booking.id)
  }

  return getBookingById(booking.id)
}

export async function syncPayuBookingByBookingId(bookingId: string) {
  const booking = await getBookingById(bookingId)

  if (!booking?.payuOrderId) {
    return booking
  }

  const response = await fetchPayuOrder(booking.payuOrderId)
  const order = response.orders?.[0]

  if (!order?.orderId || !order.status) {
    return booking
  }

  return syncPayuStateForBooking(booking, order.orderId, order.status, {
    triggerPaymentConfirmationSms: false,
  })
}

function extractPayuSignature(headerValue: string | null): string | null {
  if (!headerValue) {
    return null
  }

  const parts = headerValue.split(';').map((part) => part.trim())
  const signatureEntry = parts.find((part) => part.startsWith('signature='))
  return signatureEntry?.slice('signature='.length) ?? null
}

export function verifyPayuNotificationSignature(rawBody: string, headerValue: string | null): boolean {
  const config = assertPayuConfigured()
  const incomingSignature = extractPayuSignature(headerValue)

  if (!incomingSignature || !config.secondKey) {
    return false
  }

  const expectedSignature = createHash('md5').update(`${rawBody}${config.secondKey}`).digest('hex')
  return incomingSignature === expectedSignature
}

export async function handlePayuNotification(payload: PayuNotificationPayload) {
  const orderId = payload.order?.orderId
  const extOrderId = payload.order?.extOrderId
  const orderStatus = payload.order?.status

  if (!orderId || !extOrderId || !orderStatus) {
    return null
  }

  const booking = await getBookingById(extOrderId)

  if (!booking) {
    return null
  }

  return syncPayuStateForBooking(booking, orderId, orderStatus, {
    triggerPaymentConfirmationSms: false,
  })
}

export async function refundPayuBooking(booking: Pick<BookingRecord, 'id' | 'payuOrderId'>) {
  if (!booking.payuOrderId) {
    throw new Error('Brak PayU orderId do zwrotu.')
  }

  const config = assertPayuConfigured()
  const token = await getPayuAccessToken()
  const response = await fetch(`${config.apiBaseUrl}/api/v2_1/orders/${booking.payuOrderId}/refunds`, {
    method: 'POST',
    headers: buildPayuHeaders(token),
    body: JSON.stringify({
      refund: {
        description: `Zwrot dla rezerwacji ${booking.id}`,
      },
    }),
  })
  const raw = await response.text()

  if (!response.ok) {
    throw new Error(`PayU refund error ${response.status}: ${raw}`)
  }

  return raw ? parseJson<Record<string, unknown>>(raw) : null
}
