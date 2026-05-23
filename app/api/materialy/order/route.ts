// POST /api/materiały/order — accepts a customer order for a guide or bundle.
// Free items: code is generated immediately and emailed to the customer.
// Paid items: order is queued as 'pending'; owner gets a notification, customer
// receives payment instructions. After manual payment confirmation the owner triggers
// /api/materiały/confirm to release the unlock code.

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import {
  PRICE_AMOUNT_PLN,
  PRICE_LABEL,
  getMaterialyBundleBySlug,
  getMaterialyGuideBySlug,
  type MaterialyBundle,
  type MaterialyGuide,
} from '@/lib/materialy-catalog'
import { createOrder } from '@/lib/server/materialy-storage'
import {
  sendMaterialyCodeCustomerEmail,
  sendMaterialyOrderOwnerEmail,
  sendMaterialyOrderPendingCustomerEmail,
  type MaterialyOrderEmailPayload,
} from '@/lib/server/notifications'

function trimString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().replace(/\s+/g, ' ')
  return v.length > 0 ? v.slice(0, max) : null
}

function trimMultiline(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const v = value.replace(/\r\n/g, '\n').trim()
  return v.length > 0 ? v.slice(0, max) : null
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400 })
  }

  // Honeypot — bots fill this; humans don't.
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true, orderId: 'M-IGNORED-BOT' })
  }

  const productKindRaw = trimString(body.productKind, 16)
  const productSlug = trimString(body.productSlug, 120)
  const name = trimString(body.name, 120)
  const email = trimString(body.email, 160)
  const phone = trimString(body.phone, 40)
  const notes = trimMultiline(body.notes, 1200)
  const consentProcessing = body.consentProcessing === true
  const consentPolicy = body.consentPolicy === true

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Podaj imię i poprawny adres e-mail.' }, { status: 400 })
  }
  if (!consentProcessing || !consentPolicy) {
    return NextResponse.json({ error: 'Zaznacz wymagane zgody.' }, { status: 400 })
  }
  if (productKindRaw !== 'guide' && productKindRaw !== 'bundle') {
    return NextResponse.json({ error: 'Nieznany typ produktu.' }, { status: 400 })
  }
  if (!productSlug) {
    return NextResponse.json({ error: 'Brakuje identyfikatora produktu.' }, { status: 400 })
  }

  const guide = productKindRaw === 'guide' ? getMaterialyGuideBySlug(productSlug) : null
  const bundle = productKindRaw === 'bundle' ? getMaterialyBundleBySlug(productSlug) : null
  const item: MaterialyGuide | MaterialyBundle | null = guide ?? bundle
  if (!item) {
    return NextResponse.json({ error: 'Ten produkt nie jest już dostępny.' }, { status: 400 })
  }

  const order = await createOrder({
    productKind: productKindRaw,
    productSlug,
    priceLabel: PRICE_LABEL[item.priceCode],
    priceAmount: PRICE_AMOUNT_PLN[item.priceCode],
    customerName: name,
    customerEmail: email,
    customerPhone: phone,
    notes,
    consents: { processing: consentProcessing, policy: consentPolicy },
  })

  const emailPayload: MaterialyOrderEmailPayload = {
    orderId: order.id,
    productKind: order.productKind,
    productSlug: order.productSlug,
    productTitle: item.title,
    priceLabel: order.priceLabel,
    priceAmount: order.priceAmount,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    notes: order.notes,
  }

  // Always notify the owner; failures here shouldn't block the customer flow.
  void sendMaterialyOrderOwnerEmail(emailPayload).catch((err) => {
    console.error('[materiały/order] owner email failed', err)
  })

  if (order.status === 'paid' && order.code && order.expiresAt) {
    // Free lead-magnet: send the code straight to the customer.
    void sendMaterialyCodeCustomerEmail(emailPayload, order.code, order.expiresAt).catch((err) => {
      console.error('[materiały/order] free code email failed', err)
    })
    return NextResponse.json({ ok: true, orderId: order.id, free: true })
  }

  // Paid order: send payment instructions to the customer without exposing a public phone number.
  void sendMaterialyOrderPendingCustomerEmail(emailPayload).catch((err) => {
    console.error('[materiały/order] pending email failed', err)
  })

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    priceLabel: order.priceLabel,
  })
}
