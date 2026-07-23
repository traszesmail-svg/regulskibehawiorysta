export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  buildCommerceCheckoutHref,
  buildCommerceWaitingHref,
  readCommerceViewerToken,
} from '@/lib/commerce'
import { getBaseUrl } from '@/lib/server/env'
import { attachCommerceStripeSession, getCommerceOrderForViewer } from '@/lib/server/commerce-store'
import {
  fulfillCommerceOrderAndNotify,
  isCommerceTestModeAllowed,
} from '@/lib/server/commerce-service'
import { buildNaffyCheckoutUrl, getOnlinePaymentRuntime } from '@/lib/server/online-payments'

function toStripeAmount(amount: number) {
  return Math.round(amount * 100)
}

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  const orderNumber = typeof body.orderNumber === 'string' ? body.orderNumber.trim().toUpperCase() : ''
  const viewerToken = readCommerceViewerToken(body.viewerToken as string | string[] | undefined)
  const mock = body.mock === true

  if (!orderNumber) {
    return NextResponse.json({ error: 'Brak numeru zamówienia.' }, { status: 400 })
  }

  const order = await getCommerceOrderForViewer(orderNumber, viewerToken)

  if (!order) {
    return NextResponse.json({ error: 'Nie znaleziono zamówienia.' }, { status: 404 })
  }

  if (order.meta.clinicPhoneUpgrade) {
    return NextResponse.json({ error: 'Dopłata telefoniczna jest dostępna wyłącznie jako BLIK na telefon.' }, { status: 400 })
  }

  if (mock) {
    if (!isCommerceTestModeAllowed()) {
      return NextResponse.json({ error: 'Testowa płatność online jest wyłączona.' }, { status: 403 })
    }

    const fulfilled = await fulfillCommerceOrderAndNotify(order.orderNumber, 'mock', {
      providerPaymentId: `mock-${Date.now()}`,
    })

    return NextResponse.json({
      ok: true,
      mock: true,
      redirectTo: `${buildCommerceWaitingHref(fulfilled.orderNumber, viewerToken)}&online=mock`,
    })
  }

  const onlinePayment = getOnlinePaymentRuntime(order)

  if (onlinePayment.provider === 'naffy' && onlinePayment.naffyUrl) {
    return NextResponse.json({
      ok: true,
      provider: 'naffy',
      url: buildNaffyCheckoutUrl(onlinePayment.naffyUrl, order),
    })
  }

  if (onlinePayment.provider === 'none') {
    return NextResponse.json(
      { error: onlinePayment.unavailableMessage },
      { status: 503 },
    )
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (!secretKey) {
    return NextResponse.json(
      { error: onlinePayment.unavailableMessage },
      { status: 503 },
    )
  }

  const stripe = new Stripe(secretKey)
  const baseUrl = getBaseUrl()
  const successUrl = new URL(buildCommerceWaitingHref(order.orderNumber, viewerToken), baseUrl)
  successUrl.searchParams.set('online', '1')
  successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}')
  const cancelUrl = new URL(buildCommerceCheckoutHref(order.orderNumber, viewerToken), baseUrl)
  cancelUrl.searchParams.set('cancelled', '1')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: order.customerEmail,
    client_reference_id: order.orderNumber,
    metadata: {
      orderNumber: order.orderNumber,
      productType: order.productType,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'pln',
          unit_amount: toStripeAmount(order.onlineAmount),
          product_data: {
            name: order.productName,
          },
        },
      },
    ],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
  })

  if (!session.url || !session.id) {
    return NextResponse.json({ error: 'Stripe nie zwróćil adresu checkoutu.' }, { status: 500 })
  }

  await attachCommerceStripeSession(order.orderNumber, session.id)

  return NextResponse.json({ ok: true, url: session.url })
}
