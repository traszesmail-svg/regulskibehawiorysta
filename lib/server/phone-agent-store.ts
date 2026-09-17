import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { disableZapytajLive } from '@/lib/server/zapytaj-live'
import { sendPhoneAgentOutagePushToOwner } from '@/lib/server/push-notifications'
import { sendPhoneAgentOutageAlertEmail } from '@/lib/server/notifications'
import { listBookings } from '@/lib/server/db'
import { isZapytajPhoneBooking } from '@/lib/server/zapytaj-call'
import { parseWarsawDateTime } from '@/lib/server/google-calendar'
import { getBaseUrl } from '@/lib/server/env'
import { normalizePolishPhone } from '@/lib/phone'
import { createClient } from '@supabase/supabase-js'
import { getDataModeStatus, getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'

export const PHONE_AGENT_HEARTBEAT_TIMEOUT_MS = 180_000 // 3 minutes without heartbeat = offline
export const WATCHDOG_ALERT_THROTTLE_MS = 30 * 60 * 1000 // Send alert at most once per 30 minutes during continuous outage

export type PhoneAgentHeartbeatInput = {
  batteryLevel?: number | null
  isCharging?: boolean | null
  network?: string | null
  isDefaultDialer?: boolean | null
  appVersion?: string | null
  timestamp?: string | null
}

export type PhoneAgentDeviceState = {
  lastHeartbeatAt: string | null
  batteryLevel: number | null
  isCharging: boolean | null
  network: string | null
  isDefaultDialer: boolean | null
  appVersion: string | null
  status: 'online' | 'offline' | 'never_connected'
  isOnline: boolean
  lastSeenSeconds: number | null
  lastOutageAlertSentAt: string | null
  updatedAt: string
}

export type SmsQueueType = 'reminder_60m' | 'reminder_15m' | 'payment_confirmed' | 'custom'
export type SmsQueueStatus = 'pending' | 'claimed' | 'sent' | 'failed'

export type SmsQueueItem = {
  id: string
  bookingId: string | null
  phone: string
  message: string
  type: SmsQueueType
  status: SmsQueueStatus
  scheduledFor: string
  createdAt: string
  sentAt: string | null
  error: string | null
  idempotencyKey: string
}

export type EnqueueSmsInput = {
  bookingId?: string | null
  phone: string
  message: string
  type: SmsQueueType
  scheduledFor?: string | null
  idempotencyKey: string
}

let storeQueue = Promise.resolve()
function withStoreLock<T>(work: () => Promise<T>): Promise<T> {
  if (getDataModeStatus().active === 'supabase') {
    return work()
  }
  const next = storeQueue.then(work, work)
  storeQueue = next.then(() => undefined, () => undefined)
  return next
}

function getDeviceStatePath() {
  return path.join(getLocalStoreDataDir(), 'phone-agent-state.json')
}

function getSmsQueuePath() {
  return path.join(getLocalStoreDataDir(), 'phone-agent-sms-queue.json')
}

type StoredDeviceState = {
  lastHeartbeatAt: string | null
  batteryLevel: number | null
  isCharging: boolean | null
  network: string | null
  isDefaultDialer: boolean | null
  appVersion: string | null
  lastOutageAlertSentAt: string | null
  updatedAt: string
}

type PhoneAgentStateRow = {
  last_heartbeat_at: string | null
  battery_level: number | null
  is_charging: boolean | null
  network: string | null
  is_default_dialer: boolean | null
  app_version: string | null
  last_outage_alert_sent_at: string | null
  updated_at: string
}

type PhoneAgentSmsRow = {
  id: string
  booking_id: string | null
  phone: string
  message: string
  type: SmsQueueType
  status: SmsQueueStatus
  scheduled_for: string
  created_at: string
  sent_at: string | null
  error: string | null
  idempotency_key: string
}

function getPhoneAgentSupabase() {
  const config = getSupabaseServerConfig('trwały stan telefonu i kolejka SMS')
  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function toStoredDeviceState(row: PhoneAgentStateRow): StoredDeviceState {
  return {
    lastHeartbeatAt: row.last_heartbeat_at,
    batteryLevel: row.battery_level,
    isCharging: row.is_charging,
    network: row.network,
    isDefaultDialer: row.is_default_dialer,
    appVersion: row.app_version,
    lastOutageAlertSentAt: row.last_outage_alert_sent_at,
    updatedAt: row.updated_at,
  }
}

function toPhoneAgentSmsItem(row: PhoneAgentSmsRow): SmsQueueItem {
  return {
    id: row.id,
    bookingId: row.booking_id,
    phone: row.phone,
    message: row.message,
    type: row.type,
    status: row.status,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    error: row.error,
    idempotencyKey: row.idempotency_key,
  }
}

let memoryDeviceState: StoredDeviceState | null = null

async function readStoredDeviceState(): Promise<StoredDeviceState> {
  if (resolveDataMode('odczyt stanu telefonu') === 'supabase') {
    try {
      const queryPromise = getPhoneAgentSupabase()
        .from('phone_agent_state')
        .select('last_heartbeat_at, battery_level, is_charging, network, is_default_dialer, app_version, last_outage_alert_sent_at, updated_at')
        .eq('id', 'main')
        .maybeSingle<PhoneAgentStateRow>()

      const { data, error } = await Promise.race([
        queryPromise,
        new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase read timeout (5s)')), 5000),
        ),
      ])

      if (error) throw error
      if (data) {
        const state = toStoredDeviceState(data)
        memoryDeviceState = state
        return state
      }
      return memoryDeviceState || emptyStoredDeviceState()
    } catch (err) {
      console.warn('[phone-agent-store] Supabase state read failed, using fallback:', err)
      if (memoryDeviceState) return memoryDeviceState
      return emptyStoredDeviceState()
    }
  }
  try {
    const raw = await readFile(getDeviceStatePath(), 'utf8')
    const state = JSON.parse(raw) as StoredDeviceState
    memoryDeviceState = state
    return state
  } catch {
    return memoryDeviceState || emptyStoredDeviceState()
  }
}

function emptyStoredDeviceState(): StoredDeviceState {
  return {
    lastHeartbeatAt: null,
    batteryLevel: null,
    isCharging: null,
    network: null,
    isDefaultDialer: null,
    appVersion: null,
    lastOutageAlertSentAt: null,
    updatedAt: new Date().toISOString(),
  }
}

async function writeStoredDeviceState(state: StoredDeviceState): Promise<void> {
  memoryDeviceState = state
  if (resolveDataMode('zapis stanu telefonu') === 'supabase') {
    try {
      const upsertPromise = getPhoneAgentSupabase().from('phone_agent_state').upsert({
        id: 'main',
        last_heartbeat_at: state.lastHeartbeatAt,
        battery_level: state.batteryLevel,
        is_charging: state.isCharging,
        network: state.network,
        is_default_dialer: state.isDefaultDialer,
        app_version: state.appVersion,
        last_outage_alert_sent_at: state.lastOutageAlertSentAt,
        updated_at: state.updatedAt,
      })

      const { error } = await Promise.race([
        upsertPromise,
        new Promise<{ error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Supabase upsert timeout (5s)')), 5000),
        ),
      ])

      if (error) throw error
    } catch (err) {
      console.warn('[phone-agent-store] Supabase state write failed or timed out:', err)
    }
    return
  }
  const filePath = getDeviceStatePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8')
  const { rename } = await import('fs/promises')
  await rename(tempPath, filePath)
}

export async function recordPhoneAgentHeartbeat(input: PhoneAgentHeartbeatInput): Promise<PhoneAgentDeviceState> {
  return withStoreLock(async () => {
    const prev = await readStoredDeviceState()
    const now = new Date().toISOString()
    const updated: StoredDeviceState = {
      lastHeartbeatAt: now,
      batteryLevel: typeof input.batteryLevel === 'number' ? input.batteryLevel : prev.batteryLevel,
      isCharging: typeof input.isCharging === 'boolean' ? input.isCharging : prev.isCharging,
      network: typeof input.network === 'string' ? input.network : prev.network,
      isDefaultDialer: typeof input.isDefaultDialer === 'boolean' ? input.isDefaultDialer : prev.isDefaultDialer,
      appVersion: typeof input.appVersion === 'string' ? input.appVersion : prev.appVersion,
      lastOutageAlertSentAt: null,
      updatedAt: now,
    }
    await writeStoredDeviceState(updated)
    return formatDeviceState(updated)
  })
}

export async function getPhoneAgentDeviceState(): Promise<PhoneAgentDeviceState> {
  return withStoreLock(async () => {
    const stored = await readStoredDeviceState()
    return formatDeviceState(stored)
  })
}

function formatDeviceState(stored: StoredDeviceState): PhoneAgentDeviceState {
  if (!stored.lastHeartbeatAt) {
    return {
      ...stored,
      status: 'never_connected',
      isOnline: false,
      lastSeenSeconds: null,
    }
  }

  const diffMs = Date.now() - new Date(stored.lastHeartbeatAt).getTime()
  const isOnline = diffMs >= 0 && diffMs < PHONE_AGENT_HEARTBEAT_TIMEOUT_MS
  const lastSeenSeconds = Math.max(0, Math.floor(diffMs / 1000))

  return {
    ...stored,
    status: isOnline ? 'online' : 'offline',
    isOnline,
    lastSeenSeconds,
  }
}

export async function runPhoneAgentWatchdogCheck(): Promise<{
  isOnline: boolean
  watchdogTriggered: boolean
  liveDisabled: boolean
  alertsSent: boolean
  lastSeenMinutes: number
}> {
  const { isOnline, shouldSendAlert, lastSeenMinutes, stored } = await withStoreLock(async () => {
    const stored = await readStoredDeviceState()
    const now = Date.now()

    if (!stored.lastHeartbeatAt) {
      return { isOnline: false, shouldSendAlert: false, lastSeenMinutes: 0, stored }
    }

    const diffMs = now - new Date(stored.lastHeartbeatAt).getTime()
    const isOnline = diffMs >= 0 && diffMs < PHONE_AGENT_HEARTBEAT_TIMEOUT_MS
    const lastSeenMinutes = Math.max(1, Math.round(diffMs / 60000))

    if (isOnline) {
      return { isOnline: true, shouldSendAlert: false, lastSeenMinutes: 0, stored }
    }

    // Phone is OFFLINE!
    const lastAlertMs = stored.lastOutageAlertSentAt ? now - new Date(stored.lastOutageAlertSentAt).getTime() : Infinity
    const shouldSendAlert = lastAlertMs > WATCHDOG_ALERT_THROTTLE_MS

    if (shouldSendAlert) {
      stored.lastOutageAlertSentAt = new Date().toISOString()
      await writeStoredDeviceState(stored)
    }

    return { isOnline: false, shouldSendAlert, lastSeenMinutes, stored }
  })

  if (isOnline || !stored.lastHeartbeatAt) {
    return { isOnline, watchdogTriggered: false, liveDisabled: false, alertsSent: false, lastSeenMinutes: 0 }
  }

  // 1. Disable live availability on site immediately (outside store lock to prevent deadlocks)
  try {
    await disableZapytajLive()
  } catch (e) {
    console.warn('[phone-agent-watchdog] failed to disable live:', e)
  }

  let alertsSent = false
  if (shouldSendAlert) {
    // 2. Send push notification to owner
    try {
      await sendPhoneAgentOutagePushToOwner({ lastSeenMinutes })
    } catch (e) {
      console.warn('[phone-agent-watchdog] push notification failed:', e)
    }

    // 3. Send outage alert email to owner
    try {
      await sendPhoneAgentOutageAlertEmail({
        lastSeenMinutes,
        lastHeartbeatAt: stored.lastHeartbeatAt,
      })
      alertsSent = true
    } catch (e) {
      console.warn('[phone-agent-watchdog] email alert failed:', e)
    }
  }

  return {
    isOnline: false,
    watchdogTriggered: true,
    liveDisabled: true,
    alertsSent,
    lastSeenMinutes,
  }
}

// ---------------------------------------------------------------------------
// SMS Queue Storage & Processing
// ---------------------------------------------------------------------------

async function readStoredSmsQueue(): Promise<SmsQueueItem[]> {
  if (resolveDataMode('odczyt kolejki SMS') === 'supabase') {
    const { data, error } = await getPhoneAgentSupabase()
      .from('phone_agent_sms_queue')
      .select('id, booking_id, phone, message, type, status, scheduled_for, created_at, sent_at, error, idempotency_key')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as PhoneAgentSmsRow[] ?? []).map(toPhoneAgentSmsItem)
  }
  try {
    const raw = await readFile(getSmsQueuePath(), 'utf8')
    return JSON.parse(raw) as SmsQueueItem[]
  } catch {
    return []
  }
}

async function writeStoredSmsQueue(items: SmsQueueItem[]): Promise<void> {
  if (resolveDataMode('zapis kolejki SMS') === 'supabase') {
    throw new Error('Nie można nadpisywać kolejki SMS jako całej tabeli w trybie Supabase.')
  }
  const filePath = getSmsQueuePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(tempPath, JSON.stringify(items, null, 2), 'utf8')
  const { rename } = await import('fs/promises')
  await rename(tempPath, filePath)
}

function isUuid(id: string | null | undefined): boolean {
  if (!id) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export async function enqueueSms(input: EnqueueSmsInput): Promise<SmsQueueItem> {
  return withStoreLock(async () => {
    if (resolveDataMode('dodanie SMS do kolejki') === 'supabase') {
      const normalized = normalizePolishPhone(input.phone)
      const phone = normalized ? normalized.e164 : input.phone.trim()
      const now = new Date().toISOString()
      const supabase = getPhoneAgentSupabase()
      const { data, error } = await supabase
        .from('phone_agent_sms_queue')
        .insert({
          booking_id: isUuid(input.bookingId) ? input.bookingId : null,
          phone,
          message: input.message.trim(),
          type: input.type,
          scheduled_for: input.scheduledFor ?? now,
          idempotency_key: input.idempotencyKey,
        })
        .select('id, booking_id, phone, message, type, status, scheduled_for, created_at, sent_at, error, idempotency_key')
        .single<PhoneAgentSmsRow>()
      if (data) return toPhoneAgentSmsItem(data)
      if (error?.code !== '23505') throw error
      const { data: existing, error: existingError } = await supabase
        .from('phone_agent_sms_queue')
        .select('id, booking_id, phone, message, type, status, scheduled_for, created_at, sent_at, error, idempotency_key')
        .eq('idempotency_key', input.idempotencyKey)
        .single<PhoneAgentSmsRow>()
      if (existingError || !existing) throw existingError ?? new Error('Brak istniejącego SMS-a po wykryciu duplikatu.')
      return toPhoneAgentSmsItem(existing)
    }
    const items = await readStoredSmsQueue()
    const existing = items.find((item) => item.idempotencyKey === input.idempotencyKey)
    if (existing) {
      return existing
    }

    const normalized = normalizePolishPhone(input.phone)
    const targetPhone = normalized ? normalized.e164 : input.phone.trim()
    const now = new Date().toISOString()

    const newItem: SmsQueueItem = {
      id: randomUUID(),
      bookingId: input.bookingId ?? null,
      phone: targetPhone,
      message: input.message.trim(),
      type: input.type,
      status: 'pending',
      scheduledFor: input.scheduledFor ?? now,
      createdAt: now,
      sentAt: null,
      error: null,
      idempotencyKey: input.idempotencyKey,
    }

    items.push(newItem)
    await writeStoredSmsQueue(items)
    return newItem
  })
}

export async function cancelPendingBookingSms(bookingId: string, reason = 'booking_cancelled'): Promise<number> {
  return withStoreLock(async () => {
    if (resolveDataMode('anulowanie zaplanowanych SMS dla rezerwacji') === 'supabase') {
      if (!isUuid(bookingId)) return 0
      const supabase = getPhoneAgentSupabase()
      const { data, error } = await supabase
        .from('phone_agent_sms_queue')
        .update({
          status: 'failed',
          error: reason.slice(0, 300),
        })
        .eq('booking_id', bookingId)
        .eq('status', 'pending')
        .select('id')
      if (error) throw error
      return data?.length ?? 0
    }
    const items = await readStoredSmsQueue()
    let cancelledCount = 0
    for (const item of items) {
      if (item.bookingId === bookingId && item.status === 'pending') {
        item.status = 'failed'
        item.error = reason.slice(0, 300)
        cancelledCount++
      }
    }
    if (cancelledCount > 0) {
      await writeStoredSmsQueue(items)
    }
    return cancelledCount
  })
}

export async function cancelPendingLiveAvailabilitySms(reason = 'live_availability_expired'): Promise<number> {
  return withStoreLock(async () => {
    if (resolveDataMode('anulowanie powiadomień live w kolejce SMS') === 'supabase') {
      const supabase = getPhoneAgentSupabase()
      const { data, error } = await supabase
        .from('phone_agent_sms_queue')
        .update({
          status: 'failed',
          error: reason.slice(0, 300),
        })
        .like('idempotency_key', 'zapytaj-live-availability-%')
        .eq('status', 'pending')
        .select('id')
      if (error) throw error
      return data?.length ?? 0
    }
    const items = await readStoredSmsQueue()
    let cancelledCount = 0
    for (const item of items) {
      if (item.idempotencyKey.startsWith('zapytaj-live-availability-') && item.status === 'pending') {
        item.status = 'failed'
        item.error = reason.slice(0, 300)
        cancelledCount++
      }
    }
    if (cancelledCount > 0) {
      await writeStoredSmsQueue(items)
    }
    return cancelledCount
  })
}

export async function claimNextPendingSms(): Promise<SmsQueueItem | null> {
  return withStoreLock(async () => {
    if (resolveDataMode('atomowe pobranie SMS do wysyłki') === 'supabase') {
      try {
        const queryPromise = getPhoneAgentSupabase().rpc('claim_next_phone_agent_sms')
        const { data, error } = await Promise.race([
          queryPromise,
          new Promise<{ data: null; error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase claim SMS timeout (5s)')), 5000),
          ),
        ])
        if (error) {
          console.warn('[phone-agent-store] Supabase claim SMS error:', error.message)
          return null
        }
        const row = data as PhoneAgentSmsRow | null
        return row && row.id ? toPhoneAgentSmsItem(row) : null
      } catch (err) {
        console.warn('[phone-agent-store] claimNextPendingSms timeout or failed:', err)
        return null
      }
    }
    const items = await readStoredSmsQueue()
    const now = Date.now()

    const candidate = items.find((item) => item.status === 'pending' && new Date(item.scheduledFor).getTime() <= now)
    if (!candidate) {
      return null
    }

    candidate.status = 'claimed'
    await writeStoredSmsQueue(items)
    return candidate
  })
}

export async function reportSmsResult(id: string, status: 'sent' | 'failed', error?: string): Promise<boolean> {
  return withStoreLock(async () => {
    if (resolveDataMode('zapis wyniku SMS') === 'supabase') {
      try {
        const updatePromise = getPhoneAgentSupabase()
          .from('phone_agent_sms_queue')
          .update({ status, sent_at: status === 'sent' ? new Date().toISOString() : null, error: error ? error.slice(0, 300) : null })
          .eq('id', id)
          .select('id')
          .maybeSingle()

        const { data, error: updateError } = await Promise.race([
          updatePromise,
          new Promise<{ data: null; error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase report SMS timeout (5s)')), 5000),
          ),
        ])
        if (updateError) throw new Error(updateError.message)
        return Boolean(data)
      } catch (err) {
        console.warn('[phone-agent-store] reportSmsResult error or timeout:', err)
        return false
      }
    }
    const items = await readStoredSmsQueue()
    const item = items.find((it) => it.id === id)
    if (!item) return false

    item.status = status
    item.sentAt = status === 'sent' ? new Date().toISOString() : null
    item.error = error ? error.slice(0, 300) : null
    await writeStoredSmsQueue(items)
    return true
  })
}

export async function listSmsQueue(limit = 50): Promise<SmsQueueItem[]> {
  return withStoreLock(async () => {
    if (resolveDataMode('lista kolejki SMS') === 'supabase') {
      try {
        const queryPromise = getPhoneAgentSupabase()
          .from('phone_agent_sms_queue')
          .select('id, booking_id, phone, message, type, status, scheduled_for, created_at, sent_at, error, idempotency_key')
          .order('created_at', { ascending: false })
          .limit(limit)

        const { data, error } = await Promise.race([
          queryPromise,
          new Promise<{ data: null; error: Error }>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase list SMS timeout (5s)')), 5000),
          ),
        ])
        if (error) throw error
        return (data as PhoneAgentSmsRow[] ?? []).map(toPhoneAgentSmsItem)
      } catch (err) {
        console.warn('[phone-agent-store] listSmsQueue error or timeout:', err)
        return []
      }
    }
    const items = await readStoredSmsQueue()
    return items.slice(-limit).reverse()
  })
}

export async function generateUpcomingBookingSmsReminders(): Promise<{
  reminders60mCreated: number
  reminders15mCreated: number
}> {
  let bookings: Awaited<ReturnType<typeof listBookings>> = []
  try {
    bookings = await listBookings()
  } catch {
    return { reminders60mCreated: 0, reminders15mCreated: 0 }
  }
  const now = Date.now()
  let reminders60mCreated = 0
  let reminders15mCreated = 0

  for (const booking of bookings) {
    if (booking.paymentStatus !== 'paid' || !isZapytajPhoneBooking(booking) || !booking.phone) {
      continue
    }

    if (booking.bookingStatus === 'done' || booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'expired') {
      continue
    }

    let startsAt: Date
    try {
      startsAt = parseWarsawDateTime(booking.bookingDate, booking.bookingTime)
    } catch {
      continue
    }

    const diffMinutes = (startsAt.getTime() - now) / (60 * 1000)

    // Window 1: 45 to 75 minutes before consultation (60m reminder with reschedule option)
    if (diffMinutes >= 45 && diffMinutes <= 75) {
      const idempotencyKey = `reminder_60m:${booking.id}:${booking.bookingDate}_${booking.bookingTime}`
      const rescheduleUrl = `${getBaseUrl()}/confirmation?bookingId=${booking.id}`
      const message = `Regulski Behawiorysta: Przypomnienie o rozmowie o ${booking.bookingTime}. Przelozenie terminu mozliwe do 30 min przed na: ${rescheduleUrl}. Do uslyszenia!`

      const item = await enqueueSms({
        bookingId: booking.id,
        phone: booking.phone,
        message,
        type: 'reminder_60m',
        idempotencyKey,
      })
      if (item.createdAt === new Date().toISOString()) reminders60mCreated++
    }

    // Window 2: 10 to 25 minutes before consultation (15m reminder)
    if (diffMinutes >= 10 && diffMinutes <= 25) {
      const idempotencyKey = `reminder_15m:${booking.id}:${booking.bookingDate}_${booking.bookingTime}`
      const message = `Regulski Behawiorysta: Za 15 minut Krzysztof Regulski zadzwoni do Ciebie na ten numer. Prosimy o przygotowanie i trzymanie telefonu.`

      const item = await enqueueSms({
        bookingId: booking.id,
        phone: booking.phone,
        message,
        type: 'reminder_15m',
        idempotencyKey,
      })
      if (item.createdAt === new Date().toISOString()) reminders15mCreated++
    }
  }

  return { reminders60mCreated, reminders15mCreated }
}
