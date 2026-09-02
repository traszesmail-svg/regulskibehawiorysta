export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { buildCommerceCheckoutHref } from '@/lib/commerce'
import { getAccountUser } from '@/lib/server/account-auth'
import { createRecommendedEbookCommerceOrder } from '@/lib/server/commerce-service'
import { getBookingById } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/server/request-protection'

export async function POST(request: Request) {
  try {
    const user = await getAccountUser(request)
    const body = (await request.json()) as { bookingId?: unknown; productSlug?: unknown }
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
    const productSlug = typeof body.productSlug === 'string' ? body.productSlug.trim() : ''
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
    const redirectTo = order.accessCode && ['paid', 'access_sent'].includes(order.status)
      ? '/pokoj'
      : buildCommerceCheckoutHref(order.orderNumber, order.viewerToken)

    return NextResponse.json(
      {
        ok: true,
        orderNumber: order.orderNumber,
        viewerToken: order.viewerToken,
        redirectTo,
      },
      { headers: PRIVATE_NO_STORE_HEADERS },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie udało się przygotować materiału.'
    const status = error instanceof ConfigurationError ? 401 : 400
    return NextResponse.json({ ok: false, error: message }, { status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
