import { NextRequest, NextResponse } from 'next/server'
import { getAdminAccessSecret, hasValidAdminAuthorization } from '@/lib/admin-auth'
import { hasValidAdminPushToken } from '@/lib/server/admin-push-token'
import { getBookingForViewer } from '@/lib/server/db'
import { getPushConfigStatus, upsertPushSubscription, type PushSubscriptionRole } from '@/lib/server/push-notifications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SubscribeRequestBody = {
  role?: unknown
  bookingId?: unknown
  accessToken?: unknown
  ownerToken?: unknown
  targetUrl?: unknown
  subscription?: {
    endpoint?: unknown
    keys?: {
      p256dh?: unknown
      auth?: unknown
    }
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readRole(value: unknown): PushSubscriptionRole | null {
  return value === 'owner' || value === 'customer' ? value : null
}

function resolveSameOriginTarget(rawTargetUrl: string | null, requestUrl: string): string | null {
  if (!rawTargetUrl) {
    return null
  }

  try {
    const requestOrigin = new URL(requestUrl).origin
    const target = new URL(rawTargetUrl, requestOrigin)

    if (target.origin !== requestOrigin) {
      return null
    }

    return target.href
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  let body: SubscribeRequestBody

  try {
    body = (await request.json()) as SubscribeRequestBody
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowy zapis powiadomień.' }, { status: 400 })
  }

  const role = readRole(body.role)
  const endpoint = readString(body.subscription?.endpoint)
  const p256dh = readString(body.subscription?.keys?.p256dh)
  const auth = readString(body.subscription?.keys?.auth)
  const targetUrl = resolveSameOriginTarget(readString(body.targetUrl), request.url)

  if (!role || !endpoint || !p256dh || !auth || !targetUrl) {
    return NextResponse.json({ error: 'Brakuje danych subskrypcji powiadomień.' }, { status: 400 })
  }

  const pushStatus = getPushConfigStatus()

  if (!pushStatus.publicKey) {
    return NextResponse.json({ error: 'Powiadomienia push nie mają jeszcze klucza publicznego.' }, { status: 503 })
  }

  if (role === 'owner') {
    const adminSecret = getAdminAccessSecret()
    const isAuthorizedByBasicAuth = adminSecret
      ? hasValidAdminAuthorization(request.headers.get('authorization'), adminSecret)
      : false
    const isAuthorizedByToken = hasValidAdminPushToken(readString(body.ownerToken))

    if (!isAuthorizedByBasicAuth && !isAuthorizedByToken) {
      return NextResponse.json({ error: 'Brak autoryzacji do powiadomień admina.' }, { status: 401 })
    }

    const result = await upsertPushSubscription({
      role,
      endpoint,
      p256dh,
      auth,
      targetUrl,
      userAgent: request.headers.get('user-agent'),
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? 'Nie udało się zapisać powiadomień.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  const bookingId = readString(body.bookingId)
  const accessToken = readString(body.accessToken)

  if (!bookingId || !accessToken) {
    return NextResponse.json({ error: 'Brakuje rezerwacji do przypomnienia.' }, { status: 400 })
  }

  const booking = await getBookingForViewer(bookingId, accessToken, request.headers.get('authorization'))

  if (!booking) {
    return NextResponse.json({ error: 'Nie znaleziono rezerwacji dla tego linku.' }, { status: 403 })
  }

  const targetPath = new URL(targetUrl).pathname

  if (targetPath !== `/call/${booking.id}`) {
    return NextResponse.json({ error: 'Powiadomienie może otwierać tylko pokój tej rezerwacji.' }, { status: 400 })
  }

  const result = await upsertPushSubscription({
    role,
    endpoint,
    p256dh,
    auth,
    bookingId: booking.id,
    customerEmail: booking.email,
    targetUrl,
    userAgent: request.headers.get('user-agent'),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? 'Nie udało się zapisać powiadomień.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
