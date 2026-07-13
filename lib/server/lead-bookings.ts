import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { getLocalStoreDataDir } from './local-store-path'

export type LeadBookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'

export type LeadBookingService =
  | 'kwadrans-na-juz'
  | 'szybka-konsultacja-15-min'
  | 'konsultacja-30-min'
  | 'konsultacja-behawioralna-online'

export type LeadBookingRecord = {
  id: string
  accessToken: string
  createdAt: string
  updatedAt: string
  status: LeadBookingStatus
  service: LeadBookingService
  serviceLabel: string
  servicePrice: string
  name: string
  email: string
  species: 'pies' | 'kot'
  description: string
  preferredSlots: string
  confirmedDate: string | null
  confirmedTime: string | null
  paymentLink: string | null
  paymentMethod: string | null
  paidAt: string | null
  callRoomUrl: string | null
  calendarUrl: string | null
  adminNotes: string | null
  callId: string | null
  callStatus: string | null
  startedAt: string | null
  questionsRemaining: number | null
}

export type CreateLeadBookingInput = {
  service: LeadBookingService
  serviceLabel: string
  servicePrice: string
  name: string
  email: string
  species: 'pies' | 'kot'
  description: string
  preferredSlots: string
  phone?: string | null
}

export type UpdateLeadBookingInput = {
  id: string
  status?: LeadBookingStatus
  confirmedDate?: string | null
  confirmedTime?: string | null
  paymentLink?: string | null
  paymentMethod?: string | null
  paidAt?: string | null
  callRoomUrl?: string | null
  calendarUrl?: string | null
  adminNotes?: string | null
  callId?: string | null
  callStatus?: string | null
  startedAt?: string | null
  questionsRemaining?: number | null
}

// ─── Supabase row shape ────────────────────────────────────────────────────

type SupabaseRow = {
  id: string
  access_token: string
  created_at: string
  updated_at: string
  status: string
  service: string
  service_label: string
  service_price: string
  name: string
  email: string
  species: string
  description: string
  preferred_slots: string
  confirmed_date: string | null
  confirmed_time: string | null
  payment_link: string | null
  payment_method: string | null
  paid_at: string | null
  call_room_url: string | null
  calendar_url: string | null
  admin_notes: string | null
  phone: string | null
  call_id: string | null
  call_status: string | null
  started_at: string | null
  questions_remaining: number | null
}

function rowToRecord(row: SupabaseRow): LeadBookingRecord {
  return {
    id: row.id,
    accessToken: row.access_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status as LeadBookingStatus,
    service: row.service as LeadBookingService,
    serviceLabel: row.service_label,
    servicePrice: row.service_price,
    name: row.name,
    email: row.email,
    species: row.species as 'pies' | 'kot',
    description: row.description,
    preferredSlots: row.preferred_slots,
    confirmedDate: row.confirmed_date,
    confirmedTime: row.confirmed_time,
    paymentLink: row.payment_link,
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
    callRoomUrl: row.call_room_url,
    calendarUrl: row.calendar_url,
    adminNotes: row.admin_notes,
    phone: row.phone ?? null,
    callId: row.call_id ?? null,
    callStatus: row.call_status ?? null,
    startedAt: row.started_at ?? null,
    questionsRemaining: row.questions_remaining ?? null,
  }
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function shouldUseSupabase() {
  const mode = process.env.APP_DATA_MODE?.trim()
  return mode === 'supabase' && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// ─── File storage (local dev) ──────────────────────────────────────────────

type StoreShape = { bookings: LeadBookingRecord[] }

function getStorePath() {
  return path.join(getLocalStoreDataDir(), 'lead-bookings.json')
}

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await readFile(getStorePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoreShape>
    return { bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [] }
  } catch {
    return { bookings: [] }
  }
}

async function writeStore(store: StoreShape) {
  const filePath = getStorePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf8')
}

function createAccessToken() {
  return randomBytes(24).toString('hex')
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function createLeadBooking(input: CreateLeadBookingInput): Promise<LeadBookingRecord> {
  const now = new Date().toISOString()
  const id = randomUUID()
  const accessToken = createAccessToken()

  let initialQuestions = null
  if (input.service === 'kwadrans-na-juz' || input.service === 'szybka-konsultacja-15-min') {
    initialQuestions = 1
  } else if (input.service === 'konsultacja-30-min') {
    initialQuestions = 2
  } else if (input.service === 'konsultacja-behawioralna-online') {
    initialQuestions = 0
  }

  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('lead_bookings')
      .insert({
        id,
        access_token: accessToken,
        created_at: now,
        updated_at: now,
        status: 'pending',
        service: input.service,
        service_label: input.serviceLabel,
        service_price: input.servicePrice,
        name: input.name,
        email: input.email,
        species: input.species,
        description: input.description,
        preferred_slots: input.preferredSlots,
        phone: input.phone ?? null,
        call_id: null,
        call_status: 'idle',
        started_at: null,
        questions_remaining: initialQuestions,
      })
      .select()
      .single()

    if (error) throw new Error(`Supabase insert error: ${error.message}`)
    return rowToRecord(data as SupabaseRow)
  }

  const record: LeadBookingRecord = {
    id, accessToken, createdAt: now, updatedAt: now, status: 'pending',
    service: input.service, serviceLabel: input.serviceLabel, servicePrice: input.servicePrice,
    name: input.name, email: input.email, species: input.species,
    description: input.description, preferredSlots: input.preferredSlots,
    confirmedDate: null, confirmedTime: null, paymentLink: null,
    paymentMethod: null, paidAt: null, callRoomUrl: null, calendarUrl: null, adminNotes: null,
    phone: input.phone ?? null,
    callId: null,
    callStatus: 'idle',
    startedAt: null,
    questionsRemaining: initialQuestions,
  }
  const store = await readStore()
  store.bookings.unshift(record)
  await writeStore(store)
  return record
}

export async function listLeadBookings(): Promise<LeadBookingRecord[]> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('lead_bookings')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Supabase select error: ${error.message}`)
    return (data as SupabaseRow[]).map(rowToRecord)
  }

  const store = await readStore()
  return [...store.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getLeadBookingById(id: string): Promise<LeadBookingRecord | null> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('lead_bookings')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Supabase select error: ${error.message}`)
    return data ? rowToRecord(data as SupabaseRow) : null
  }

  const store = await readStore()
  return store.bookings.find((b) => b.id === id) ?? null
}

export async function getLeadBookingByToken(id: string, accessToken: string): Promise<LeadBookingRecord | null> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('lead_bookings')
      .select('*')
      .eq('id', id)
      .eq('access_token', accessToken)
      .maybeSingle()
    if (error) throw new Error(`Supabase select error: ${error.message}`)
    return data ? rowToRecord(data as SupabaseRow) : null
  }

  const store = await readStore()
  return store.bookings.find((b) => b.id === id && b.accessToken === accessToken) ?? null
}

export async function updateLeadBooking(input: UpdateLeadBookingInput): Promise<LeadBookingRecord | null> {
  const now = new Date().toISOString()

  if (shouldUseSupabase()) {
    const supabase = getSupabaseClient()!
    const patch: Record<string, unknown> = { updated_at: now }
    if (input.status !== undefined) patch.status = input.status
    if (input.confirmedDate !== undefined) patch.confirmed_date = input.confirmedDate
    if (input.confirmedTime !== undefined) patch.confirmed_time = input.confirmedTime
    if (input.paymentLink !== undefined) patch.payment_link = input.paymentLink
    if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod
    if (input.paidAt !== undefined) patch.paid_at = input.paidAt
    if (input.callRoomUrl !== undefined) patch.call_room_url = input.callRoomUrl
    if (input.calendarUrl !== undefined) patch.calendar_url = input.calendarUrl
    if (input.adminNotes !== undefined) patch.admin_notes = input.adminNotes
    if (input.callId !== undefined) patch.call_id = input.callId
    if (input.callStatus !== undefined) patch.call_status = input.callStatus
    if (input.startedAt !== undefined) patch.started_at = input.startedAt
    if (input.questionsRemaining !== undefined) patch.questions_remaining = input.questionsRemaining

    const { data, error } = await supabase
      .from('lead_bookings')
      .update(patch)
      .eq('id', input.id)
      .select()
      .maybeSingle()
    if (error) throw new Error(`Supabase update error: ${error.message}`)
    return data ? rowToRecord(data as SupabaseRow) : null
  }

  const store = await readStore()
  const booking = store.bookings.find((b) => b.id === input.id)
  if (!booking) return null

  if (input.status !== undefined) booking.status = input.status
  if (input.confirmedDate !== undefined) booking.confirmedDate = input.confirmedDate
  if (input.confirmedTime !== undefined) booking.confirmedTime = input.confirmedTime
  if (input.paymentLink !== undefined) booking.paymentLink = input.paymentLink
  if (input.paymentMethod !== undefined) booking.paymentMethod = input.paymentMethod
  if (input.paidAt !== undefined) booking.paidAt = input.paidAt
  if (input.callRoomUrl !== undefined) booking.callRoomUrl = input.callRoomUrl
  if (input.calendarUrl !== undefined) booking.calendarUrl = input.calendarUrl
  if (input.adminNotes !== undefined) booking.adminNotes = input.adminNotes
  if (input.callId !== undefined) booking.callId = input.callId
  if (input.callStatus !== undefined) booking.callStatus = input.callStatus
  if (input.startedAt !== undefined) booking.startedAt = input.startedAt
  if (input.questionsRemaining !== undefined) booking.questionsRemaining = input.questionsRemaining
  booking.updatedAt = now

  await writeStore(store)
  return booking
}
