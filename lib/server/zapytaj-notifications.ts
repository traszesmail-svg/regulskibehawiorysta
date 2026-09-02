import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { normalizePolishPhone } from '@/lib/phone'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { sendZapytajLiveAvailabilityEmail } from '@/lib/server/notifications'
import { sendZapytajLiveAvailabilitySms } from '@/lib/server/sms'

export type ZapytajLiveNotificationChannel = 'sms' | 'email'
export type ZapytajLiveNotificationStatus = 'subscribed' | 'notified' | 'unsubscribed'

export type ZapytajLiveNotificationRecord = {
  id: string
  notificationKey: string
  phone: string | null
  email: string | null
  channel: ZapytajLiveNotificationChannel
  sourcePage: string | null
  status: ZapytajLiveNotificationStatus
  createdAt: string
  updatedAt: string
  notifiedAt: string | null
}

export type ZapytajLiveNotificationInput = {
  phone?: string | null
  email?: string | null
  channel: ZapytajLiveNotificationChannel
  sourcePage?: string | null
}

export type ZapytajLiveNotificationDispatchSummary = {
  waiting: number
  attempted: number
  sent: number
  fallbackSent: number
  failed: number
  skipped: number
}

let localQueue = Promise.resolve()

function withLocalLock<T>(work: () => Promise<T>): Promise<T> {
  const next = localQueue.then(work, work)
  localQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function getLocalStorePath() {
  return path.join(getLocalStoreDataDir(), 'zapytaj-live-notifications.json')
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('powiadomienia o dostępności usługi Zapytaj')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function mapRow(row: Record<string, unknown>): ZapytajLiveNotificationRecord {
  return {
    id: String(row.id),
    notificationKey: String(row.notification_key),
    phone: typeof row.phone === 'string' ? row.phone : null,
    email: typeof row.email === 'string' ? row.email : null,
    channel: row.channel === 'email' ? 'email' : 'sms',
    sourcePage: typeof row.source_page === 'string' ? row.source_page : null,
    status: row.status === 'notified' || row.status === 'unsubscribed' ? row.status : 'subscribed',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    notifiedAt: typeof row.notified_at === 'string' ? row.notified_at : null,
  }
}

async function readLocalRecords(): Promise<ZapytajLiveNotificationRecord[]> {
  try {
    const raw = await readFile(getLocalStorePath(), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ZapytajLiveNotificationRecord[]) : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }

    return []
  }
}

async function writeLocalRecords(records: ZapytajLiveNotificationRecord[]) {
  const filePath = getLocalStorePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`

  await writeFile(tempPath, JSON.stringify(records, null, 2), 'utf8')

  try {
    await rename(tempPath, filePath)
  } finally {
    await rm(tempPath, { force: true })
  }
}

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? ''
  return email || null
}

function normalizeInput(input: ZapytajLiveNotificationInput) {
  const normalizedPhone = input.phone?.trim() ? normalizePolishPhone(input.phone)?.e164 ?? null : null
  const email = normalizeEmail(input.email)
  const contact = input.channel === 'sms' ? normalizedPhone : email

  if (!contact) {
    throw new Error(input.channel === 'sms' ? 'Podaj poprawny numer telefonu.' : 'Podaj poprawny adres e-mail.')
  }

  return {
    phone: normalizedPhone,
    email,
    channel: input.channel,
    sourcePage: input.sourcePage?.trim().slice(0, 160) || '/zapytaj',
    notificationKey: `zapytaj-live:${input.channel}:${contact}`,
  }
}

export async function upsertZapytajLiveNotification(
  input: ZapytajLiveNotificationInput,
): Promise<ZapytajLiveNotificationRecord> {
  const normalized = normalizeInput(input)
  const nowIso = new Date().toISOString()
  const mode = resolveDataMode('zapis powiadomienia o dostępności usługi Zapytaj')

  if (mode === 'local') {
    return withLocalLock(async () => {
      const records = await readLocalRecords()
      const existingIndex = records.findIndex((record) => record.notificationKey === normalized.notificationKey)
      const existing = existingIndex >= 0 ? records[existingIndex] : null
      const record: ZapytajLiveNotificationRecord = {
        id: existing?.id ?? randomUUID(),
        notificationKey: normalized.notificationKey,
        phone: normalized.phone,
        email: normalized.email,
        channel: normalized.channel,
        sourcePage: normalized.sourcePage,
        status: 'subscribed',
        createdAt: existing?.createdAt ?? nowIso,
        updatedAt: nowIso,
        notifiedAt: null,
      }

      if (existingIndex >= 0) {
        records[existingIndex] = record
      } else {
        records.unshift(record)
      }

      await writeLocalRecords(records)
      return record
    })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('zapytaj_live_notifications')
    .upsert(
      {
        notification_key: normalized.notificationKey,
        phone: normalized.phone,
        email: normalized.email,
        channel: normalized.channel,
        source_page: normalized.sourcePage,
        status: 'subscribed',
        updated_at: nowIso,
        notified_at: null,
      },
      { onConflict: 'notification_key' },
    )
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapRow(data as Record<string, unknown>)
}

export async function listSubscribedZapytajLiveNotifications(): Promise<ZapytajLiveNotificationRecord[]> {
  const mode = resolveDataMode('odczyt powiadomień o dostępności usługi Zapytaj')

  if (mode === 'local') {
    return withLocalLock(async () => (await readLocalRecords()).filter((record) => record.status === 'subscribed'))
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('zapytaj_live_notifications')
    .select('*')
    .eq('status', 'subscribed')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data as Record<string, unknown>[] | null) ?? []).map(mapRow)
}

async function markNotificationNotified(id: string, notifiedAt: string) {
  const mode = resolveDataMode('oznaczenie wysłanego powiadomienia o dostępności')

  if (mode === 'local') {
    return withLocalLock(async () => {
      const records = await readLocalRecords()
      const index = records.findIndex((record) => record.id === id && record.status === 'subscribed')

      if (index < 0) {
        return false
      }

      records[index] = {
        ...records[index],
        status: 'notified',
        updatedAt: notifiedAt,
        notifiedAt,
      }
      await writeLocalRecords(records)
      return true
    })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('zapytaj_live_notifications')
    .update({ status: 'notified', updated_at: notifiedAt, notified_at: notifiedAt })
    .eq('id', id)
    .eq('status', 'subscribed')
    .select('id')

  if (error) {
    throw error
  }

  return Boolean(data?.length)
}

export async function dispatchZapytajLiveNotifications(): Promise<ZapytajLiveNotificationDispatchSummary> {
  const records = await listSubscribedZapytajLiveNotifications()
  const summary: ZapytajLiveNotificationDispatchSummary = {
    waiting: records.length,
    attempted: 0,
    sent: 0,
    fallbackSent: 0,
    failed: 0,
    skipped: 0,
  }

  for (const record of records) {
    summary.attempted += 1
    let deliveryStatus: 'sent' | 'failed' | 'skipped' = 'skipped'
    let usedFallback = false

    if (record.channel === 'sms' && record.phone) {
      const smsResult = await sendZapytajLiveAvailabilitySms(record.id, record.phone)
      deliveryStatus = smsResult.status === 'sent' ? 'sent' : smsResult.status.startsWith('skipped') ? 'skipped' : 'failed'

      if (deliveryStatus !== 'sent' && record.email) {
        const emailResult = await sendZapytajLiveAvailabilityEmail(record.email)
        deliveryStatus = emailResult.status === 'sent' ? 'sent' : emailResult.status === 'skipped' ? 'skipped' : 'failed'
        usedFallback = emailResult.status === 'sent'
      }
    } else if (record.channel === 'email' && record.email) {
      const emailResult = await sendZapytajLiveAvailabilityEmail(record.email)
      deliveryStatus = emailResult.status === 'sent' ? 'sent' : emailResult.status === 'skipped' ? 'skipped' : 'failed'
    }

    if (deliveryStatus === 'sent') {
      await markNotificationNotified(record.id, new Date().toISOString())
      summary.sent += 1
      if (usedFallback) summary.fallbackSent += 1
    } else if (deliveryStatus === 'skipped') {
      summary.skipped += 1
    } else {
      summary.failed += 1
    }
  }

  return summary
}
