export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getAdminAccessSecret, getAdminAuthChallengeHeaders, hasValidAdminAuthorization } from '@/lib/admin-auth'
import { buildCommerceCheckoutHref } from '@/lib/commerce'
import { ensureCommerceOrderViewerToken, getCommerceOrder } from '@/lib/server/commerce-store'

/**
 * Controlled migration for legacy orders created before viewer capabilities.
 * It is deliberately admin-authenticated: a visible order number or customer
 * email must never be enough to mint a new buyer token.
 */
export async function POST(request: Request, props: { params: Promise<{ orderNumber: string }> }) {
  const secret = getAdminAccessSecret()
  if (!hasValidAdminAuthorization(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'Brak autoryzacji.' }, { status: 401, headers: getAdminAuthChallengeHeaders() })
  }

  const params = await props.params
  const order = await getCommerceOrder(params.orderNumber)

  if (!order) {
    return NextResponse.json({ ok: false, error: 'Nie znaleziono zamówienia.' }, { status: 404 })
  }

  const securedOrder = await ensureCommerceOrderViewerToken(order)

  return NextResponse.json({
    ok: true,
    orderNumber: securedOrder.orderNumber,
    checkoutUrl: buildCommerceCheckoutHref(securedOrder.orderNumber, securedOrder.viewerToken),
  })
}
