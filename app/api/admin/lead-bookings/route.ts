export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getAdminAccessSecret, isAdminRequestAuthorized } from '@/lib/admin-auth'
import { listLeadBookings } from '@/lib/server/lead-bookings'

export async function GET(request: Request) {
  const secret = getAdminAccessSecret()
  if (!secret) {
    return NextResponse.json({ error: 'Admin secret not configured.' }, { status: 503 })
  }

  if (!await isAdminRequestAuthorized(request.headers, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin"' },
    })
  }

  const bookings = await listLeadBookings()
  return NextResponse.json({ bookings })
}
