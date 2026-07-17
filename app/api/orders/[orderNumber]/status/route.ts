export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { isCommerceTestModeAllowed } from '@/lib/server/commerce-service'
import { canUseCommerceAccess, getCommerceOrder } from '@/lib/server/commerce-store'

function buildRequestReviewUrl(request: Request, token: string, action: 'approve' | 'reject') {
  const url = new URL(`/api/admin/confirm-payment/${encodeURIComponent(token)}`, request.url)
  url.searchParams.set('action', action)
  return url.toString()
}

export async function GET(request: Request, props: { params: Promise<{ orderNumber: string }> }) {
  const params = await props.params;
  const order = await getCommerceOrder(params.orderNumber)

  if (!order) {
    return NextResponse.json({ error: 'Nie znaleziono zamówienia.' }, { status: 404 })
  }

  const accessReady = canUseCommerceAccess(order)
  const consultationReady = order.productType === 'consultation' && order.status === 'paid' && Boolean(order.meta.bookingId)
  const consultationUrl =
    consultationReady && order.meta.bookingId
      ? `/call/${order.meta.bookingId}${order.meta.bookingAccessToken ? `?access=${encodeURIComponent(order.meta.bookingAccessToken)}` : ''}`
      : null
  const ebookAccessUrl =
    accessReady && order.accessCode
      ? `/pokoj?code=${encodeURIComponent(order.accessCode)}&email=${encodeURIComponent(order.customerEmail)}`
      : null
  const readyUrl = consultationUrl ?? ebookAccessUrl

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    productType: order.productType,
    productName: order.productName,
    customerEmail: order.customerEmail,
    accessReady,
    consultationReady,
    ready: accessReady || consultationReady,
    accessCode: accessReady ? order.accessCode : null,
    accessUrl: ebookAccessUrl,
    readyUrl,
    readyLabel: consultationReady ? 'Wejdź do pokoju rozmowy' : 'Przejdź do dostępu',
    readyText: consultationReady
      ? 'Konsultacja jest potwierdzona. Możesz przejść do pokoju rozmowy.'
      : 'Dostęp do materiału jest aktywny.',
    testAdminConfirmUrl:
      isCommerceTestModeAllowed() &&
      order.status === 'payment_reported' &&
      order.adminConfirmationToken &&
      !order.adminConfirmationTokenUsedAt
        ? buildRequestReviewUrl(request, order.adminConfirmationToken, 'approve')
        : null,
    testAdminRejectUrl:
      isCommerceTestModeAllowed() &&
      order.status === 'payment_reported' &&
      order.adminConfirmationToken &&
      !order.adminConfirmationTokenUsedAt
        ? buildRequestReviewUrl(request, order.adminConfirmationToken, 'reject')
        : null,
  })
}
