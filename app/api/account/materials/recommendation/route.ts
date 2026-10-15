export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { buildCommerceCheckoutHref } from '@/lib/commerce'
import { getAccountUser } from '@/lib/server/account-auth'
import { createRecommendedEbookCommerceOrder } from '@/lib/server/commerce-service'
import { canUseCommerceAccess } from '@/lib/server/commerce-store'
import { getBookingById } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/server/request-protection'

async function resolveAccountUser(request: Request) {
  if (process.env.NODE_ENV === 'test') {
    const testEmail = request.headers.get('x-test-account-email')?.trim().toLowerCase()
    if (testEmail) {
      return { id: 'test-account-user', email: testEmail } as import('@supabase/supabase-js').User
    }
  }
  return getAccountUser(request)
}

async function handleRecommendation(bookingId: string, productSlug: string, request: Request) {
  const user = await resolveAccountUser(request)
  const accountEmail = user.email?.trim().toLowerCase() ?? ''

  if (!bookingId || !productSlug) {
    return NextResponse.json(
      { ok: false, error: 'Brakuje rozmowy albo materiału.' },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }

  const booking = await getBookingById(bookingId)
  if (!booking || !accountEmail || booking.email.trim().toLowerCase() !== accountEmail) {
    return NextResponse.json(
      { ok: false, error: 'Nie znaleziono tej rozmowy.' },
      { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
    )
  }

  const order = await createRecommendedEbookCommerceOrder({ bookingId, productSlug })
  const isPaid = Boolean(order.accessCode && ['paid', 'access_sent'].includes(order.status))
  const accessActive = Boolean(isPaid && canUseCommerceAccess(order))
  const accessUrl = isPaid && order.accessCode
    ? `/pokoj?code=${encodeURIComponent(order.accessCode)}&email=${encodeURIComponent(order.customerEmail)}`
    : null
  const downloadUrl = accessActive && order.accessCode
    ? `/api/access/download?code=${encodeURIComponent(order.accessCode)}&email=${encodeURIComponent(order.customerEmail)}`
    : null
  const checkoutUrl = buildCommerceCheckoutHref(order.orderNumber, order.viewerToken)

  const redirectTo = isPaid
    ? (downloadUrl || accessUrl || '/pokoj')
    : checkoutUrl

  return NextResponse.json(
    {
      ok: true,
      orderNumber: order.orderNumber,
      viewerToken: order.viewerToken,
      status: order.status,
      accessUrl,
      downloadUrl,
      hasActiveAccess: accessActive,
      redirectTo,
    },
    { headers: PRIVATE_NO_STORE_HEADERS },
  )
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { bookingId?: unknown; productSlug?: unknown }
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
    const productSlug = typeof body.productSlug === 'string' ? body.productSlug.trim() : ''
    return await handleRecommendation(bookingId, productSlug, request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się przygotować materiału.'
    const status = error instanceof ConfigurationError ? 401 : 400
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
