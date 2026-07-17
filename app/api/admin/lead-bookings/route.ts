export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAdminAccessSecret, hasValidAdminAuthorization } from '@/lib/admin-auth'
import { listLeadBookings } from '@/lib/server/lead-bookings'

export async function GET() {
  const secret = getAdminAccessSecret()
  if (!secret) {
    return NextResponse.json({ error: 'Admin secret not configured.' }, { status: 503 })
  }

  const authHeader = (await headers()).get('authorization')
  if (!hasValidAdminAuthorization(authHeader, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin"' },
    })
  }

  const bookings = await listLeadBookings()
  return NextResponse.json({ bookings })
}
