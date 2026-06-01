import { listBookings, markBookingReminderSent } from '@/lib/server/db'
import { ConfigurationError } from '@/lib/server/env'
import { sendBookingReminderEmail, sendOwnerBookingReminderEmail } from '@/lib/server/notifications'
import { sendBookingPushReminders } from '@/lib/server/push-notifications'
import { LocalTimeWindow, getWarsawDateTime, shouldSendReminderForBooking } from '@/lib/server/reminders'
import { BookingRecord } from '@/lib/types'

export const REMINDER_RUN_PATH = '/api/reminders/run'
export const SUPABASE_REMINDER_JOB_NAME = 'regulski-booking-reminders'
export const SUPABASE_REMINDER_SCHEDULE = '*/5 * * * *'
export const SUPABASE_REMINDER_APP_URL_SECRET = 'regulski_app_url'
export const SUPABASE_REMINDER_CRON_SECRET = 'regulski_cron_secret'
export const REMINDER_LEAD_TIME_MINUTES = 15

type ReminderDeliveryResult = Awaited<ReturnType<typeof sendBookingReminderEmail>>
type PushReminderResult = Awaited<ReturnType<typeof sendBookingPushReminders>>

type ReminderRunnerDeps = {
  listBookings: () => Promise<BookingRecord[]>
  sendBookingReminderEmail: (booking: BookingRecord) => Promise<ReminderDeliveryResult>
  sendOwnerBookingReminderEmail: (booking: BookingRecord) => Promise<ReminderDeliveryResult>
  sendBookingPushReminders: (booking: BookingRecord) => Promise<PushReminderResult>
  markBookingReminderSent: (bookingId: string) => Promise<BookingRecord | null>
  now: () => Date
}

export type ReminderRunResult = {
  checked: number
  candidates: number
  sent: number
  skipped: number
  failed: number
  windowStart: LocalTimeWindow
  windowEnd: LocalTimeWindow
  pushSent: number
}

const defaultDeps: ReminderRunnerDeps = {
  listBookings,
  sendBookingReminderEmail,
  sendOwnerBookingReminderEmail,
  sendBookingPushReminders,
  markBookingReminderSent,
  now: () => new Date(),
}

export function getReminderRunSecret(): string {
  const secret = process.env.CRON_SECRET?.trim()

  if (!secret) {
    throw new ConfigurationError('Brak konfiguracji CRON_SECRET.')
  }

  return secret
}

export function getReminderAuthorizationError(authorization: string | null): string | null {
  const secret = getReminderRunSecret()

  if (authorization !== `Bearer ${secret}`) {
    return 'Brak poprawnej autoryzacji remindera.'
  }

  return null
}

export async function runBookingReminderSweep(overrides: Partial<ReminderRunnerDeps> = {}): Promise<ReminderRunResult> {
  const deps = { ...defaultDeps, ...overrides }
  const now = deps.now()
  const windowStart = getWarsawDateTime(now)
  const windowEnd = getWarsawDateTime(new Date(now.getTime() + REMINDER_LEAD_TIME_MINUTES * 60 * 1000))
  const bookings = await deps.listBookings()
  const candidates = bookings.filter((booking) => shouldSendReminderForBooking(booking, windowStart, windowEnd))

  let sent = 0
  let skipped = 0
  let failed = 0
  let pushSent = 0

  for (const booking of candidates) {
    const [customerEmail, ownerEmail, pushDelivery] = await Promise.all([
      deps.sendBookingReminderEmail(booking),
      deps.sendOwnerBookingReminderEmail(booking),
      deps.sendBookingPushReminders(booking),
    ])
    const anyChannelSent = customerEmail.status === 'sent' || ownerEmail.status === 'sent' || pushDelivery.sent > 0
    const anyChannelFailed = customerEmail.status === 'failed' || ownerEmail.status === 'failed' || pushDelivery.failed > 0

    pushSent += pushDelivery.sent

    if (anyChannelSent) {
      await deps.markBookingReminderSent(booking.id)
      sent += 1
      continue
    }

    if (!anyChannelFailed) {
      skipped += 1
      continue
    }

    failed += 1
  }

  return {
    checked: bookings.length,
    candidates: candidates.length,
    sent,
    skipped,
    failed,
    windowStart,
    windowEnd,
    pushSent,
  }
}
