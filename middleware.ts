import { NextResponse, type NextRequest } from 'next/server'
import {
  getAdminAccessSecret,
  getAdminAuthChallengeHeaders,
  hasValidAdminAuthorization,
} from '@/lib/admin-auth'
import { getPublicFeatureUnavailableMessage } from '@/lib/server/env'

function createUnauthorizedResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: getAdminAuthChallengeHeaders(),
  })
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/form') {
    const hasBookingContext = request.nextUrl.searchParams.has('problem') && request.nextUrl.searchParams.has('slotId')

    if (!hasBookingContext) {
      const destination = new URL('/book', request.url)

      for (const key of ['service', 'qa', 'species']) {
        const value = request.nextUrl.searchParams.get(key)
        if (value) {
          destination.searchParams.set(key, value)
        }
      }

      return NextResponse.redirect(destination, 307)
    }

    return NextResponse.next()
  }

  if (request.nextUrl.pathname.startsWith('/api/admin/confirm-payment/')) {
    return NextResponse.next()
  }

  const secret = getAdminAccessSecret()

  if (!secret) {
    return createUnauthorizedResponse(getPublicFeatureUnavailableMessage('admin'), 503)
  }

  if (hasValidAdminAuthorization(request.headers.get('authorization'), secret)) {
    return NextResponse.next()
  }

  return createUnauthorizedResponse('Dostęp do panelu specjalisty wymaga autoryzacji.', 401)
}

export const config = {
  matcher: ['/form', '/admin/:path*', '/__internal/:path*', '/api/admin/:path*', '/api/availability/:path*'],
}
