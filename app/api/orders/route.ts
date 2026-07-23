export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import {
  createClinicPhoneUpgradeCommerceOrder,
  createEbookCommerceOrder,
  createOrReuseConsultationCommerceOrder,
  fulfillCommerceOrderAndNotify,
} from '@/lib/server/commerce-service'
import { buildCommerceCheckoutHref } from '@/lib/commerce'
import { buildNaffyCheckoutUrl, getOnlinePaymentRuntime } from '@/lib/server/online-payments'

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  try {
    if (body.kind === 'consultation') {
      const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
      const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : null

      if (!bookingId) {
        return NextResponse.json({ error: 'Brak bookingId.' }, { status: 400 })
      }

      const order = await createOrReuseConsultationCommerceOrder(
        bookingId,
        accessToken,
        request.headers.get('authorization'),
      )
      const onlinePayment = getOnlinePaymentRuntime(order)
      const onlineCheckoutUrl =
        onlinePayment.provider === 'naffy' && onlinePayment.naffyUrl
          ? buildNaffyCheckoutUrl(onlinePayment.naffyUrl, order)
          : null

      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        viewerToken: order.viewerToken,
        onlineCheckoutUrl,
        redirectTo: buildCommerceCheckoutHref(order.orderNumber, order.viewerToken),
      })
    }

    if (body.kind === 'clinic-phone-upgrade') {
      const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
      const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : null
      const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

      if (!bookingId || !phone) {
        return NextResponse.json({ error: 'Podaj rezerwację i numer telefonu.' }, { status: 400 })
      }

      const order = await createClinicPhoneUpgradeCommerceOrder(
        bookingId,
        accessToken,
        phone,
        request.headers.get('authorization'),
      )
      const onlinePayment = getOnlinePaymentRuntime(order)
      const onlineCheckoutUrl =
        onlinePayment.provider === 'naffy' && onlinePayment.naffyUrl
          ? buildNaffyCheckoutUrl(onlinePayment.naffyUrl, order)
          : null

      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        viewerToken: order.viewerToken,
        onlineCheckoutUrl,
        redirectTo: buildCommerceCheckoutHref(order.orderNumber, order.viewerToken),
      })
    }
    if (body.kind === 'ebook') {
      if (body.consentProcessing !== true || body.consentPolicy !== true) {
        return NextResponse.json({ error: 'Zaznacz wymagane zgody.' }, { status: 400 })
      }

      const productKind = body.productKind === 'bundle' ? 'bundle' : 'guide'
      const order = await createEbookCommerceOrder({
        productKind,
        productSlug: typeof body.productSlug === 'string' ? body.productSlug : '',
        name: typeof body.name === 'string' ? body.name : '',
        email: typeof body.email === 'string' ? body.email : '',
        notes: typeof body.notes === 'string' ? body.notes : null,
      })

      if (order.amount === 0) {
        const fulfilled = await fulfillCommerceOrderAndNotify(order.orderNumber, 'mock')
        const downloadUrl =
          fulfilled.accessCode && fulfilled.customerEmail
            ? `/api/access/download?code=${encodeURIComponent(fulfilled.accessCode)}&email=${encodeURIComponent(fulfilled.customerEmail)}`
            : null

        return NextResponse.json({
          ok: true,
          orderNumber: fulfilled.orderNumber,
          viewerToken: fulfilled.viewerToken,
          free: true,
          accessCode: fulfilled.accessCode,
          downloadUrl,
          redirectTo: `/dostep?email=${encodeURIComponent(fulfilled.customerEmail)}`,
        })
      }

      return NextResponse.json({
        ok: true,
        orderNumber: order.orderNumber,
        viewerToken: order.viewerToken,
        redirectTo: buildCommerceCheckoutHref(order.orderNumber, order.viewerToken),
      })
    }

    return NextResponse.json({ error: 'Nieznany typ zamówienia.' }, { status: 400 })
  } catch (error) {
    console.error('[commerce][orders] create failed', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się utworzyć zamówienia.' },
      { status: 500 },
    )
  }
}
