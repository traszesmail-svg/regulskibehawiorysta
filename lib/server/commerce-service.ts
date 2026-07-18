import { getBookingForViewer, markBookingPaid } from '@/lib/server/db'
import { getBaseUrl, isProductionDeployment } from '@/lib/server/env'
import {
  PRICE_AMOUNT_PLN,
  getMaterialyBundleBySlug,
  getMaterialyGuideBySlug,
} from '@/lib/materialy-catalog'
import {
  getBookingServiceTitle,
  resolveBookingServiceType,
} from '@/lib/booking-services'
import {
  type CommerceOrder,
  type CommercePaymentMethod,
  isValidCommerceEmail,
} from '@/lib/commerce'
import {
  createCommerceOrder,
  ensureCommerceOrderViewerToken,
  findCommerceOrderByProduct,
  fulfillCommerceOrder,
  getCommerceOrder,
} from '@/lib/server/commerce-store'
import { sendCommerceAccessCodeCustomerEmail } from '@/lib/server/notifications'

type EbookOrderInput = {
  productKind: 'guide' | 'bundle'
  productSlug: string
  name: string
  email: string
  notes?: string | null
}

function trim(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function paymentMethodForBooking(method: CommercePaymentMethod) {
  if (method === 'blik_phone') return 'manual' as const
  if (method === 'mock') return 'mock' as const
  return 'stripe' as const
}

export function isCommerceTestModeAllowed() {
  if (isProductionDeployment()) {
    return false
  }

  return process.env.COMMERCE_TEST_MODE?.trim() !== '0'
}

export function buildCommerceManualReviewUrl(order: CommerceOrder, action: 'approve' | 'reject') {
  const url = new URL(`/api/admin/confirm-payment/${order.adminConfirmationToken}`, getBaseUrl())
  url.searchParams.set('action', action)
  return url.toString()
}

export async function createOrReuseConsultationCommerceOrder(
  bookingId: string,
  accessToken?: string | null,
  authorizationHeader?: string | null,
) {
  const booking = await getBookingForViewer(bookingId, accessToken ?? null, authorizationHeader ?? null)

  if (!booking) {
    throw new Error('Nie znaleziono rezerwacji albo link wygasł.')
  }

  const productId = `booking:${booking.id}`
  const existing = await findCommerceOrderByProduct('consultation', productId)

  if (existing) {
    return ensureCommerceOrderViewerToken(existing)
  }

  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
  const serviceName = getBookingServiceTitle(serviceType)

  return createCommerceOrder({
    customerEmail: booking.email,
    customerName: booking.ownerName,
    customerPhone: null,
    productType: 'consultation',
    productId,
    productName: serviceName,
    amount: booking.amount,
    meta: {
      bookingId: booking.id,
      bookingAccessToken: accessToken ?? null,
      serviceType,
      animalType: booking.animalType,
      problemType: booking.problemType,
    },
  })
}

export async function createEbookCommerceOrder(input: EbookOrderInput) {
  const name = trim(input.name, 120)
  const email = trim(input.email, 160).toLowerCase()
  const productSlug = trim(input.productSlug, 120)
  const notes = trim(input.notes, 1200)

  if (!name || !email || !isValidCommerceEmail(email)) {
    throw new Error('Podaj imię i poprawny adres e-mail.')
  }

  const guide = input.productKind === 'guide' ? getMaterialyGuideBySlug(productSlug) : null
  const bundle = input.productKind === 'bundle' ? getMaterialyBundleBySlug(productSlug) : null
  const item = guide ?? bundle

  if (!item) {
    throw new Error('Ten materiał nie jest już dostępny.')
  }

  const priceAmount = PRICE_AMOUNT_PLN[item.priceCode]
  const productId = `ebook:${input.productKind}:${productSlug}:${email}:${Date.now()}`

  return createCommerceOrder({
    customerEmail: email,
    customerName: name,
    customerPhone: null,
    productType: 'ebook',
    productId,
    productName: item.title,
    amount: priceAmount,
    manualAmount: priceAmount,
    meta: {
      productKind: input.productKind,
      productSlug,
      downloadSlug: productSlug,
      pdfFile: guide?.pdfFile,
      bundleGuideSlugs: bundle?.guideSlugs,
      animalType: guide?.category === 'cat' || bundle?.category === 'cat' ? 'Kot' : 'Pies',
      notes,
    },
  })
}

export async function fulfillCommerceOrderAndNotify(
  orderNumber: string,
  method: CommercePaymentMethod,
  options?: {
    providerPaymentId?: string | null
    adminTokenUsedAt?: string | null
    adminIp?: string | null
    adminUserAgent?: string | null
  },
) {
  const orderBefore = await getCommerceOrder(orderNumber)
  if (!orderBefore) {
    throw new Error('Nie znaleziono zamówienia.')
  }

  const alreadySent =
    orderBefore.productType === 'ebook' &&
    orderBefore.status === 'access_sent' &&
    Boolean(orderBefore.accessCode)

  if (orderBefore.productType === 'consultation' && orderBefore.meta.bookingId) {
    await markBookingPaid(orderBefore.meta.bookingId, {
      paymentMethod: paymentMethodForBooking(method),
      paymentReference: orderBefore.orderNumber,
      paymentIntentId: options?.providerPaymentId ?? undefined,
      triggerPaymentConfirmationSms: false,
    })
  }

  const order = await fulfillCommerceOrder(orderNumber, method, options)

  if (!order) {
    throw new Error('Nie znaleziono zamówienia.')
  }

  if (!alreadySent && order.productType === 'ebook') {
    await sendCommerceAccessCodeCustomerEmail(order)
  }

  return order
}

export function getCommerceOrderPublicAmount(order: CommerceOrder, method: 'online' | 'blik_phone') {
  return method === 'blik_phone' ? order.manualAmount : order.onlineAmount
}

export function getCommerceOrderPriceLabel(order: CommerceOrder, method: 'online' | 'blik_phone') {
  const amount = getCommerceOrderPublicAmount(order, method)
  return `${amount.toFixed(Number.isInteger(amount) ? 0 : 2)} zł`
}
