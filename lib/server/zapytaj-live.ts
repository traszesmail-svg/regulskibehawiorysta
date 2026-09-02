import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  createEmptyZapytajLiveState,
  createZapytajLiveStatusDto,
  getWarsawBoundaryAfterMinutes,
  isFutureIso,
  isZapytajLiveEnabled,
  isZapytajLiveSlot,
  normalizeZapytajLiveState,
  type ZapytajLiveState,
  type ZapytajLiveStatusDto,
  ZAPYTAJ_LIVE_BUFFER_MINUTES,
  ZAPYTAJ_LIVE_INITIAL_LEAD_MINUTES,
  ZAPYTAJ_LIVE_QUEUE_LEAD_MINUTES,
  ZAPYTAJ_LIVE_SLOT_PREFIX,
} from '@/lib/zapytaj-flow'
import { getAvailabilitySlot, createAvailabilitySlot, listBookings } from '@/lib/server/db'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getDataModeStatus, getSupabaseServerConfig, resolveDataMode } from '@/lib/server/env'
import { createClient } from '@supabase/supabase-js'
import type { AvailabilitySlot, BookingRecord } from '@/lib/types'

const LIVE_STATE_ID = 'main'
let liveQueue = Promise.resolve()

function withLiveLock<T>(work: () => Promise<T>): Promise<T> {
  const next = liveQueue.then(work, work)
  liveQueue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function getLocalStatePath() {
  return path.join(getLocalStoreDataDir(), 'zapytaj-live.json')
}

async function readLocalState(): Promise<ZapytajLiveState> {
  const filePath = getLocalStatePath()

  try {
    const raw = await readFile(filePath, 'utf8')
    return normalizeZapytajLiveState(JSON.parse(raw))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }

    return createEmptyZapytajLiveState()
  }
}

async function writeLocalState(state: ZapytajLiveState) {
  const filePath = getLocalStatePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`

  await writeFile(tempPath, JSON.stringify(state, null, 2), 'utf8')

  try {
    await rename(tempPath, filePath)
  } finally {
    await rm(tempPath, { force: true })
  }
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('status dostępności live usługi Zapytaj')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function readState(): Promise<ZapytajLiveState> {
  const mode = resolveDataMode('status dostępności live usługi Zapytaj')

  if (mode === 'local') {
    return readLocalState()
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('zapytaj_live_status')
    .select('state')
    .eq('id', LIVE_STATE_ID)
    .maybeSingle()

  if (error) {
    throw error
  }

  return normalizeZapytajLiveState(data?.state)
}

async function writeState(state: ZapytajLiveState) {
  const mode = resolveDataMode('zapis statusu dostępności live usługi Zapytaj')

  if (mode === 'local') {
    await writeLocalState(state)
    return
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('zapytaj_live_status').upsert(
    {
      id: LIVE_STATE_ID,
      state,
      updated_at: state.updatedAt,
    },
    { onConflict: 'id' },
  )

  if (error) {
    throw error
  }
}

function isPaidLiveBooking(booking: BookingRecord): boolean {
  return (
    Boolean(booking.liveMode || isZapytajLiveSlot(booking.slotId)) &&
    booking.paymentStatus === 'paid' &&
    booking.bookingStatus !== 'done' &&
    booking.bookingStatus !== 'cancelled' &&
    booking.bookingStatus !== 'expired' &&
    booking.callStatus !== 'completed'
  )
}

function isPendingLiveBooking(booking: BookingRecord): boolean {
  return (
    Boolean(booking.liveMode || isZapytajLiveSlot(booking.slotId)) &&
    ((booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid') ||
      (booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review'))
  )
}

function isFutureSlot(slot: AvailabilitySlot | null): boolean {
  if (!slot) {
    return false
  }

  const boundary = getWarsawBoundaryAfterMinutes(0)
  return `${slot.bookingDate}T${slot.bookingTime}` >= `${boundary.date}T${boundary.time}`
}

async function createLiveSlot(leadMinutes: number): Promise<AvailabilitySlot> {
  let lastError: unknown = null

  for (let offset = 0; offset < 12; offset += 1) {
    const start = getWarsawBoundaryAfterMinutes(leadMinutes + offset)
    const id = `${ZAPYTAJ_LIVE_SLOT_PREFIX}${randomUUID()}`

    try {
      return await createAvailabilitySlot(start.date, start.time, id)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Nie udało się przygotować okna live.')
}

async function getStateSlot(slotId: string | null): Promise<AvailabilitySlot | null> {
  if (!slotId) {
    return null
  }

  return getAvailabilitySlot(slotId)
}

async function ensureNextSlot(state: ZapytajLiveState, leadMinutes: number): Promise<ZapytajLiveState> {
  if (state.nextSlotId) {
    const existing = await getStateSlot(state.nextSlotId)

    if (existing && isFutureSlot(existing)) {
      return state
    }

    state.nextSlotId = null
  }

  const next = await createLiveSlot(leadMinutes)
  state.nextSlotId = next.id
  return state
}

async function reconcileState(initialState: ZapytajLiveState, bookings: BookingRecord[]): Promise<ZapytajLiveState> {
  const state = normalizeZapytajLiveState(initialState)
  const now = Date.now()
  const liveBookings = bookings.filter((booking) => Boolean(booking.liveMode || isZapytajLiveSlot(booking.slotId)))
  const bookingBySlot = new Map(liveBookings.map((booking) => [booking.slotId, booking]))
  const bookingById = new Map(liveBookings.map((booking) => [booking.id, booking]))

  let currentBooking = state.currentBookingId ? bookingById.get(state.currentBookingId) ?? null : null

  if (!currentBooking && state.currentSlotId) {
    currentBooking = bookingBySlot.get(state.currentSlotId) ?? null
  }

  if (!currentBooking || !isPaidLiveBooking(currentBooking)) {
    state.currentBookingId = null
    state.currentSlotId = null
    currentBooking = null
  } else {
    state.currentBookingId = currentBooking.id
    state.currentSlotId = currentBooking.slotId
  }

  if (!currentBooking && state.nextSlotId) {
    const nextBooking = bookingBySlot.get(state.nextSlotId) ?? null

    if (nextBooking && isPaidLiveBooking(nextBooking)) {
      currentBooking = nextBooking
      state.currentBookingId = nextBooking.id
      state.currentSlotId = nextBooking.slotId
      state.nextSlotId = null
    }
  }

  const enabled = isZapytajLiveEnabled(state, now)

  if (state.nextSlotId) {
    const nextBooking = bookingBySlot.get(state.nextSlotId) ?? null

    if (nextBooking && !isPendingLiveBooking(nextBooking) && !isPaidLiveBooking(nextBooking)) {
      state.nextSlotId = null
    }
  }

  if (state.nextSlotId) {
    const nextSlot = await getStateSlot(state.nextSlotId)
    const nextBooking = bookingBySlot.get(state.nextSlotId) ?? null

    if (
      !nextSlot ||
      !isFutureSlot(nextSlot) ||
      nextSlot.isBooked ||
      (nextSlot.lockedByBookingId && nextSlot.lockedByBookingId !== nextBooking?.id)
    ) {
      state.nextSlotId = null
    }
  }

  if (currentBooking && enabled && !state.nextSlotId) {
    state.nextSlotId = (await createLiveSlot(ZAPYTAJ_LIVE_QUEUE_LEAD_MINUTES)).id
  }

  if (!currentBooking && enabled) {
    await ensureNextSlot(state, ZAPYTAJ_LIVE_INITIAL_LEAD_MINUTES)
  }

  if (state.nextSlotId) {
    const nextSlot = await getStateSlot(state.nextSlotId)
    if (!nextSlot && enabled) {
      state.nextSlotId = null
      await ensureNextSlot(state, currentBooking ? ZAPYTAJ_LIVE_QUEUE_LEAD_MINUTES : ZAPYTAJ_LIVE_INITIAL_LEAD_MINUTES)
    }
  }

  state.updatedAt = new Date().toISOString()
  return state
}

async function getReconciledState(): Promise<ZapytajLiveState> {
  const state = await readState()
  const bookings = await listBookings()
  const reconciled = await reconcileState(state, bookings)
  await writeState(reconciled)
  return reconciled
}

function getNextSlotBooking(state: ZapytajLiveState, bookings: BookingRecord[]) {
  return state.nextSlotId ? bookings.find((booking) => booking.slotId === state.nextSlotId) ?? null : null
}

function getStatusForState(state: ZapytajLiveState, bookings: BookingRecord[]): ZapytajLiveStatusDto {
  const currentBooking = state.currentBookingId
    ? bookings.find((booking) => booking.id === state.currentBookingId) ?? null
    : null
  const nextBooking = getNextSlotBooking(state, bookings)
  const nextSlot = state.nextSlotId ? null : null
  const enabled = isZapytajLiveEnabled(state)
  const nextSlotId = state.nextSlotId

  if (currentBooking && isPaidLiveBooking(currentBooking)) {
    return createZapytajLiveStatusDto('in_call', {
      liveSlotId: nextBooking || nextSlot ? null : nextSlotId,
      enabledUntil: state.enabledUntil,
      storageAvailable: true,
    })
  }

  if (nextBooking && isPendingLiveBooking(nextBooking)) {
    return createZapytajLiveStatusDto('payment_pending', {
      liveSlotId: null,
      enabledUntil: state.enabledUntil,
      storageAvailable: true,
    })
  }

  if (nextSlotId && nextBooking?.paymentStatus === 'paid') {
    return createZapytajLiveStatusDto('in_call', {
      liveSlotId: null,
      enabledUntil: state.enabledUntil,
      storageAvailable: true,
    })
  }

  if (enabled && nextSlotId && !nextBooking) {
    return createZapytajLiveStatusDto('available_now', {
      liveSlotId: nextSlotId,
      enabledUntil: state.enabledUntil,
      storageAvailable: true,
    })
  }

  if (!enabled && isFutureIso(state.bufferUntil)) {
    return createZapytajLiveStatusDto('buffer', {
      liveSlotId: null,
      enabledUntil: state.enabledUntil,
      storageAvailable: true,
    })
  }

  return createZapytajLiveStatusDto('offline', {
    liveSlotId: null,
    enabledUntil: state.enabledUntil,
    storageAvailable: true,
  })
}

export async function getZapytajLiveStatus(): Promise<ZapytajLiveStatusDto> {
  return withLiveLock(async () => {
    const state = await getReconciledState()
    const bookings = await listBookings()
    const status = getStatusForState(state, bookings)

    if (status.status === 'in_call' && status.liveSlotId) {
      const slot = await getStateSlot(status.liveSlotId)
      if (!slot || slot.isBooked || slot.lockedByBookingId || !isFutureSlot(slot)) {
        const refreshed = await getReconciledState()
        return getStatusForState(refreshed, await listBookings())
      }
    }

    return status
  })
}

export async function enableZapytajLive(): Promise<ZapytajLiveStatusDto> {
  return withLiveLock(async () => {
    const state = await readState()
    const now = Date.now()
    const requestedUntil = new Date(now + 60 * 60 * 1000).toISOString()
    state.enabledUntil =
      isFutureIso(state.enabledUntil, now) && Date.parse(state.enabledUntil!) > Date.parse(requestedUntil)
        ? state.enabledUntil
        : requestedUntil
    state.bufferUntil = null
    const reconciled = await reconcileState(state, await listBookings())
    await writeState(reconciled)
    return getStatusForState(reconciled, await listBookings())
  })
}

export async function disableZapytajLive(): Promise<ZapytajLiveStatusDto> {
  return withLiveLock(async () => {
    const state = await readState()
    const bookings = await listBookings()
    const nextBooking = getNextSlotBooking(state, bookings)
    const hasProtectedWindow = Boolean(
      state.currentBookingId ||
        state.currentSlotId ||
        (nextBooking && (isPendingLiveBooking(nextBooking) || isPaidLiveBooking(nextBooking))),
    )

    state.enabledUntil = null
    state.bufferUntil = hasProtectedWindow
      ? new Date(Date.now() + ZAPYTAJ_LIVE_BUFFER_MINUTES * 60 * 1000).toISOString()
      : null
    const reconciled = await reconcileState(state, bookings)
    await writeState(reconciled)
    return getStatusForState(reconciled, await listBookings())
  })
}

export function getZapytajLiveStorageStatus() {
  return getDataModeStatus()
}
