export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import {
  canUseCommerceAccess,
  getCommerceOrderByAccessCode,
} from '@/lib/server/commerce-store'
import { PRIVATE_NO_STORE_HEADERS, consumeRequestRateLimit } from '@/lib/server/request-protection'

const ACCESS_VERIFY_RATE_LIMIT = { key: 'access-verify', limit: 10, windowMs: 15 * 60 * 1000 } as const

export async function POST(request: Request) {
  const rateLimit = consumeRequestRateLimit(request, ACCESS_VERIFY_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Za dużo prób weryfikacji kodu. Spróbuj ponownie później.' },
      { status: 429, headers: { ...PRIVATE_NO_STORE_HEADERS, 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    )
  }

  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Niepoprawny format zapytania.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!code || !email) {
    return NextResponse.json({ error: 'Wpisz e-mail i kod dostępu.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
  }

  const order = await getCommerceOrderByAccessCode(code, email)

  if (!order || !canUseCommerceAccess(order)) {
    return NextResponse.json({ error: 'Kod jest nieprawidłowy albo wygasł.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS })
  }

  return NextResponse.json(
    {
      ok: true,
      orderNumber: order.orderNumber,
      productType: order.productType,
      productName: order.productName,
      redirectTo: `/pokoj?code=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}`,
    },
    { headers: PRIVATE_NO_STORE_HEADERS },
  )
}
