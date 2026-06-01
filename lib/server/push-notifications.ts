import { createClient } from '@supabase/supabase-js'
import webpush, { WebPushError } from 'web-push'
import { formatDateTimeLabel, getProblemLabel } from '@/lib/data'
import { getBaseUrl, getDataModeStatus, getSupabaseServerConfig } from '@/lib/server/env'
import type { BookingRecord } from '@/lib/types'

export type PushSubscriptionRole = 'owner' | 'customer'

type StoredPushSubscriptionRow = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  user_role: PushSubscriptionRole
  booking_id: string | null
  customer_email: string | null
  target_url: string
}

export type PushSubscriptionInput = {
  endpoint: string
  p256dh: string
  auth: string
  role: PushSubscriptionRole
  bookingId?: string | null
  customerEmail?: string | null
  targetUrl: string
  userAgent?: string | null
}

type PushPayload = {
  title: string
  body: string
  url: string
  tag: string
}

export type PushSendSummary = {
  configured: boolean
  attempted: number
  sent: number
  skipped: number
  failed: number
  expired: number
  ownerSent: number
  customerSent: number
}

let configuredVapidSignature: string | null = null

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('powiadomienia push')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function getPublicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null
}

function getPrivateVapidKey(): string | null {
  return process.env.VAPID_PRIVATE_KEY?.trim() || null
}

function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT?.trim() || 'mailto:kontakt@regulskibehawiorysta.pl'
}

export function getPushConfigStatus() {
  const publicKey = getPublicVapidKey()
  const privateKey = getPrivateVapidKey()

  return {
    publicKey,
    isConfigured: Boolean(publicKey && privateKey),
    missing: [
      publicKey ? null : 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
      privateKey ? null : 'VAPID_PRIVATE_KEY',
    ].filter((name): name is string => Boolean(name)),
  }
}

function ensureWebPushConfigured(): boolean {
  const status = getPushConfigStatus()

  if (!status.publicKey || !status.isConfigured) {
    return false
  }

  const privateKey = getPrivateVapidKey()
  const signature = `${status.publicKey}:${privateKey}:${getVapidSubject()}`

  if (configuredVapidSignature !== signature) {
    webpush.setVapidDetails(getVapidSubject(), status.publicKey, privateKey!)
    configuredVapidSignature = signature
  }

  return true
}

export function isPushPersistenceAvailable(): boolean {
  const data = getDataModeStatus()

  return data.isValid && data.active === 'supabase'
}

export async function upsertPushSubscription(input: PushSubscriptionInput): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushPersistenceAvailable()) {
    return { ok: false, reason: 'push persistence requires Supabase data mode' }
  }

  const now = new Date().toISOString()
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_role: input.role,
        booking_id: input.bookingId ?? null,
        customer_email: input.customerEmail ?? null,
        target_url: input.targetUrl,
        user_agent: input.userAgent ?? null,
        unsubscribed_at: null,
        updated_at: now,
      },
      { onConflict: 'endpoint' },
    )

  if (error) {
    return { ok: false, reason: error.message }
  }

  return { ok: true }
}

async function listActivePushSubscriptions(role: PushSubscriptionRole, bookingId?: string): Promise<StoredPushSubscriptionRow[]> {
  if (!isPushPersistenceAvailable()) {
    return []
  }

  let query = getSupabaseAdmin()
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_role, booking_id, customer_email, target_url')
    .eq('user_role', role)
    .is('unsubscribed_at', null)

  if (bookingId) {
    query = query.eq('booking_id', bookingId)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[regulski-behawiorysta][push] subscription lookup failed', error)
    return []
  }

  return (data ?? []) as StoredPushSubscriptionRow[]
}

async function markPushSubscriptionExpired(endpoint: string): Promise<void> {
  if (!isPushPersistenceAvailable()) {
    return
  }

  const { error } = await getSupabaseAdmin()
    .from('push_subscriptions')
    .update({
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('endpoint', endpoint)

  if (error) {
    console.warn('[regulski-behawiorysta][push] failed to mark expired subscription', error)
  }
}

function isExpiredPushError(error: unknown): boolean {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)
}

async function sendPush(
  subscription: StoredPushSubscriptionRow,
  payload: PushPayload,
): Promise<'sent' | 'failed' | 'expired'> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    )

    return 'sent'
  } catch (error) {
    if (isExpiredPushError(error)) {
      await markPushSubscriptionExpired(subscription.endpoint)
      return 'expired'
    }

    console.warn('[regulski-behawiorysta][push] send failed', error)
    return 'failed'
  }
}

function buildCustomerReminderPayload(booking: BookingRecord, targetUrl: string): PushPayload {
  return {
    title: 'Rozmowa za 15 minut',
    body: 'Dotknij, żeby otworzyć pokój rozmowy.',
    url: targetUrl,
    tag: `booking-reminder-customer-${booking.id}`,
  }
}

function buildOwnerReminderPayload(booking: BookingRecord): PushPayload {
  return {
    title: `Za 15 minut: ${getProblemLabel(booking.problemType)}`,
    body: `${formatDateTimeLabel(booking.bookingDate, booking.bookingTime)} - ${booking.ownerName}. Dotknij, żeby otworzyć pokój.`,
    url: booking.meetingUrl || `${getBaseUrl()}/admin`,
    tag: `booking-reminder-owner-${booking.id}`,
  }
}

export async function sendBookingPushReminders(booking: BookingRecord): Promise<PushSendSummary> {
  const configured = ensureWebPushConfigured()
  const summary: PushSendSummary = {
    configured,
    attempted: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    expired: 0,
    ownerSent: 0,
    customerSent: 0,
  }

  if (!configured || !isPushPersistenceAvailable()) {
    summary.skipped += 1
    return summary
  }

  const [ownerSubscriptions, customerSubscriptions] = await Promise.all([
    listActivePushSubscriptions('owner'),
    listActivePushSubscriptions('customer', booking.id),
  ])

  const ownerPayload = buildOwnerReminderPayload(booking)
  const customerPayloads = customerSubscriptions.map((subscription) => ({
    subscription,
    payload: buildCustomerReminderPayload(booking, subscription.target_url),
    audience: 'customer' as const,
  }))
  const deliveries = [
    ...ownerSubscriptions.map((subscription) => ({
      subscription,
      payload: ownerPayload,
      audience: 'owner' as const,
    })),
    ...customerPayloads,
  ]

  if (!deliveries.length) {
    summary.skipped += 1
    return summary
  }

  for (const delivery of deliveries) {
    summary.attempted += 1
    const result = await sendPush(delivery.subscription, delivery.payload)

    if (result === 'sent') {
      summary.sent += 1

      if (delivery.audience === 'owner') {
        summary.ownerSent += 1
      } else {
        summary.customerSent += 1
      }
    } else if (result === 'expired') {
      summary.expired += 1
    } else {
      summary.failed += 1
    }
  }

  return summary
}
