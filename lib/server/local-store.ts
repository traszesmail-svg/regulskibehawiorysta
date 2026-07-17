import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'path'
import {
  getBookableServiceAvailabilityWindow,
  getBookingServicePrice,
  getServiceAvailabilityWindow,
  normalizeBookingServiceType,
  resolveBookingServiceType,
} from '@/lib/booking-services'
import { isUnpaidBookingExpired } from '@/lib/booking-expiry'
import { getBookingAnalyticsContextParams } from '@/lib/analytics-schema'
import { compareDateAndTime, formatDateLabel, isFutureAvailabilitySlot } from '@/lib/data'
import { normalizePolishPhone } from '@/lib/phone'
import { createActiveConsultationPrice, DEFAULT_PRICE_PLN, parseConsultationPriceInput } from '@/lib/pricing'
import { buildSeedAvailabilitySlots } from '@/lib/server/availability-seed'
import { createCustomerAccessToken, hasValidCustomerAccessToken } from '@/lib/server/customer-access'
import { getReservationWindowMinutes } from '@/lib/server/env'
import { createMeetingUrl, normalizeMeetingUrl } from '@/lib/server/jitsi'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import { getManualPaymentConfig } from '@/lib/server/payment-options'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import {
  createUrgentNowRequest as createUrgentNowRequestRecord,
  listUrgentNowRequests as listUrgentNowRequestRecords,
  respondUrgentNowRequest as respondUrgentNowRequestRecord,
} from '@/lib/server/urgent-now-store'
import { createFunnelEventRecord, normalizeFunnelEventProperties } from '@/lib/server/funnel-events'
import {
  sendBookingConfirmationEmail,
  sendBookingPaymentConfirmedOwnerEmail,
  sendBookingReservationCreatedEmail,
  sendBookingManualPaymentPendingEmail,
  sendBookingStatusOutcomeEmail,
  shouldSendBookingConfirmationAfterPayment,
} from '@/lib/server/notifications'
import { sendPaymentConfirmationSms } from '@/lib/server/sms'
import {
  AvailabilitySlot,
  BookingCreateResult,
  BookingFormData,
  BookingPreparationPatch,
  BookingRecord,
  FunnelEventInput,
  FunnelEventRecord,
  GroupedAvailability,
  UserRecord,
} from '@/lib/types'
import type { UrgentNowRequestRecord } from '@/lib/urgent-now'

interface LocalStoreData {
  availability: AvailabilitySlot[]
  bookings: BookingRecord[]
  funnelEvents: FunnelEventRecord[]
  pricingSettings: {
    amount: number
    updatedAt: string | null
  }
  users: UserRecord[]
}

let queue = Promise.resolve()

function withLock<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work)
  queue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function getStorePaths() {
  const dataDir = getLocalStoreDataDir()

  return {
    dataDir,
    availabilityFile: path.join(dataDir, 'availability.json'),
    bookingsFile: path.join(dataDir, 'bookings.json'),
    funnelEventsFile: path.join(dataDir, 'funnel-events.json'),
    pricingSettingsFile: path.join(dataDir, 'pricing-settings.json'),
    usersFile: path.join(dataDir, 'users.json'),
  }
}

function getBookingFunnelEventProperties(booking: BookingRecord) {
  return getBookingAnalyticsContextParams({
    serviceType: resolveBookingServiceType(booking.serviceType, booking.amount),
    quickConsultationPrice: booking.amount,
    animalType: booking.animalType,
    problemType: booking.problemType,
    bookingStatus: booking.bookingStatus,
    paymentMode: booking.paymentMethod,
  })
}

function createSeedAvailability(nowIso: string): AvailabilitySlot[] {
  return buildSeedAvailabilitySlots(new Date(nowIso), nowIso)
}

async function ensureFile(filePath: string, fallbackValue: unknown) {
  try {
    const raw = await readFile(filePath, 'utf8')

    if (!raw.trim()) {
      await writeJson(filePath, fallbackValue)
      return
    }

    JSON.parse(raw)
  } catch {
    await writeJson(filePath, fallbackValue)
  }
}

async function ensureStoreFiles() {
  const nowIso = new Date().toISOString()
  const { dataDir, availabilityFile, bookingsFile, funnelEventsFile, pricingSettingsFile, usersFile } = getStorePaths()
  await mkdir(dataDir, { recursive: true })
  await ensureFile(availabilityFile, createSeedAvailability(nowIso))
  await ensureFile(bookingsFile, [])
  await ensureFile(funnelEventsFile, [])
  await ensureFile(pricingSettingsFile, { amount: DEFAULT_PRICE_PLN, updatedAt: null })
  await ensureFile(usersFile, [])
}

function isTransientLocalStoreReadError(error: unknown) {
  if (error instanceof SyntaxError) {
    return true
  }

  return Boolean(typeof error === 'object' && error && 'code' in error && error.code === 'ENOENT')
}

async function readJson<T>(filePath: string): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const raw = await readFile(filePath, 'utf8')
      return JSON.parse(raw) as T
    } catch (error) {
      if (!isTransientLocalStoreReadError(error) || attempt === 4) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
    }
  }

  throw new Error(`Unable to read local store file: ${filePath}`)
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const tempFilePath = `${filePath}.${process.pid}.${randomUUID()}.tmp`

  await writeFile(tempFilePath, JSON.stringify(value, null, 2), 'utf8')

  try {
    await rename(tempFilePath, filePath)
  } finally {
    await rm(tempFilePath, { force: true })
  }
}

function releaseSlot(slot: AvailabilitySlot, nowIso: string) {
  slot.isBooked = false
  slot.lockedByBookingId = null
  slot.lockedUntil = null
  slot.updatedAt = nowIso
}

function normalizeBookingRecord(booking: BookingRecord): BookingRecord {
  return {
    ...booking,
    serviceType: resolveBookingServiceType(booking.serviceType, booking.amount),
    customerAccessTokenHash: booking.customerAccessTokenHash ?? '',
    paymentMethod: booking.paymentMethod ?? null,
    paymentReference: booking.paymentReference ?? null,
    meetingUrl: normalizeMeetingUrl(booking.id, booking.meetingUrl),
    qaBooking: booking.qaBooking ?? false,
    paymentReportedAt: booking.paymentReportedAt ?? null,
    paymentRejectedAt: booking.paymentRejectedAt ?? null,
    paymentRejectedReason: booking.paymentRejectedReason ?? null,
    payuOrderId: booking.payuOrderId ?? null,
    payuOrderStatus: booking.payuOrderStatus ?? null,
    customerPhoneNormalized: booking.customerPhoneNormalized ?? normalizePolishPhone(booking.phone)?.e164 ?? null,
    smsConfirmationStatus: booking.smsConfirmationStatus ?? null,
    smsConfirmationSentAt: booking.smsConfirmationSentAt ?? null,
    smsProviderMessageId: booking.smsProviderMessageId ?? null,
    smsErrorCode: booking.smsErrorCode ?? null,
    smsErrorMessage: booking.smsErrorMessage ?? null,
    reminderSent: booking.reminderSent ?? false,
    prepVideoPath: booking.prepVideoPath ?? null,
    prepVideoFilename: booking.prepVideoFilename ?? null,
    prepVideoSizeBytes: booking.prepVideoSizeBytes ?? null,
    prepLinkUrl: booking.prepLinkUrl ?? null,
    prepNotes: booking.prepNotes ?? null,
    prepUploadedAt: booking.prepUploadedAt ?? null,
  }
}

function normalizeExpiredReservations(store: LocalStoreData): LocalStoreData {
  const now = Date.now()
  let changed = false

  const bookings = store.bookings.map(normalizeBookingRecord)
  const funnelEvents = store.funnelEvents.map((event) => ({
    ...event,
    properties: { ...event.properties },
  }))
  const availability = store.availability.map((slot) => ({ ...slot }))
  const pricingSettings = {
    amount: Number.isFinite(store.pricingSettings.amount) ? store.pricingSettings.amount : DEFAULT_PRICE_PLN,
    updatedAt: store.pricingSettings.updatedAt ?? null,
  }
  const users = store.users.map((user) => ({ ...user }))

  for (const slot of availability) {
    if (slot.isBooked || !slot.lockedUntil || Date.parse(slot.lockedUntil) > now) {
      continue
    }

    const bookingId = slot.lockedByBookingId
    const nowIso = new Date().toISOString()
    releaseSlot(slot, nowIso)
    changed = true

    if (!bookingId) {
      continue
    }

    const booking = bookings.find((item) => item.id === bookingId)

    if (!booking) {
      continue
    }

    booking.bookingStatus = 'expired'
    booking.paymentStatus = booking.paymentStatus === 'pending_manual_review' ? 'rejected' : 'unpaid'
    booking.expiredAt = nowIso
    booking.paymentRejectedAt = booking.paymentStatus === 'rejected' ? nowIso : booking.paymentRejectedAt ?? null
    booking.paymentRejectedReason =
      booking.paymentStatus === 'rejected'
        ? booking.paymentRejectedReason ?? 'Upłynął czas na potwierdzenie wpłaty.'
        : booking.paymentRejectedReason ?? null
    booking.updatedAt = nowIso
  }

  for (const booking of bookings) {
    if (!isUnpaidBookingExpired(booking, new Date(now))) {
      continue
    }

    const nowIso = new Date().toISOString()
    const slots = resolveBookingSlots(availability, booking)

    if (slots.length > 0) {
      releaseBookingSlots(slots, nowIso)
    }

    booking.bookingStatus = 'expired'
    booking.paymentStatus = booking.paymentStatus === 'pending_manual_review' ? 'rejected' : 'unpaid'
    booking.expiredAt = nowIso
    booking.paymentRejectedAt = booking.paymentStatus === 'rejected' ? nowIso : booking.paymentRejectedAt ?? null
    booking.paymentRejectedReason =
      booking.paymentStatus === 'rejected'
        ? booking.paymentRejectedReason ?? 'Upłynęły 24 godziny na potwierdzenie wpłaty.'
        : booking.paymentRejectedReason ?? null
    booking.updatedAt = nowIso
    changed = true
  }

  return changed ? { availability, bookings, funnelEvents, pricingSettings, users } : { ...store, pricingSettings, funnelEvents }
}

function ensureFutureLocalAvailability(store: LocalStoreData): LocalStoreData {
  const nowIso = new Date().toISOString()
  const seeded = buildSeedAvailabilitySlots(new Date(nowIso), nowIso)
  const existingIds = new Set(store.availability.map((slot) => slot.id))
  const nextSlots = seeded.filter((slot) => !existingIds.has(slot.id))

  if (nextSlots.length === 0) {
    return store
  }

  return {
    ...store,
    availability: [...store.availability, ...nextSlots].sort(sortAvailability),
  }
}

async function readStore(): Promise<LocalStoreData> {
  const { availabilityFile, bookingsFile, funnelEventsFile, pricingSettingsFile, usersFile } = getStorePaths()
  await ensureStoreFiles()

  const [availability, bookings, funnelEvents, pricingSettings, users] = await Promise.all([
    readJson<AvailabilitySlot[]>(availabilityFile),
    readJson<BookingRecord[]>(bookingsFile),
    readJson<FunnelEventRecord[]>(funnelEventsFile),
    readJson<{ amount: number; updatedAt: string | null }>(pricingSettingsFile),
    readJson<UserRecord[]>(usersFile),
  ])

  const source = { availability, bookings, funnelEvents, pricingSettings, users }
  const normalized = ensureFutureLocalAvailability(normalizeExpiredReservations(source))

  if (JSON.stringify(normalized) !== JSON.stringify(source)) {
    await persistStore(normalized)
  }

  return normalized
}

async function persistStore(store: LocalStoreData) {
  const { availabilityFile, bookingsFile, funnelEventsFile, pricingSettingsFile, usersFile } = getStorePaths()
  await Promise.all([
    writeJson(availabilityFile, store.availability),
    writeJson(bookingsFile, store.bookings),
    writeJson(funnelEventsFile, store.funnelEvents),
    writeJson(pricingSettingsFile, store.pricingSettings),
    writeJson(usersFile, store.users),
  ])
}

function appendFunnelEvent(store: LocalStoreData, input: FunnelEventInput) {
  const record = createFunnelEventRecord({
    ...input,
    properties: normalizeFunnelEventProperties(input.properties ?? null),
  })

  store.funnelEvents.unshift(record)
  return record
}

function sortAvailability(left: AvailabilitySlot, right: AvailabilitySlot): number {
  return compareDateAndTime(left.bookingDate, left.bookingTime, right.bookingDate, right.bookingTime)
}

function groupAvailability(slots: AvailabilitySlot[]): GroupedAvailability[] {
  const grouped = new Map<string, AvailabilitySlot[]>()

  for (const slot of slots) {
    if (slot.isBooked || slot.lockedByBookingId || !isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime)) {
      continue
    }

    const current = grouped.get(slot.bookingDate) ?? []
    current.push(slot)
    grouped.set(slot.bookingDate, current)
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dateSlots]) => ({
      date,
      label: formatDateLabel(date),
      slots: dateSlots.sort(sortAvailability),
    }))
}

function resolveBookingSlots(availability: AvailabilitySlot[], booking: Pick<BookingRecord, 'slotId' | 'serviceType' | 'amount'>) {
  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
  const window = getServiceAvailabilityWindow(availability, booking.slotId, serviceType)

  if (window?.length) {
    return window
  }

  const slot = availability.find((item) => item.id === booking.slotId)
  return slot ? [slot] : []
}

function holdSlots(slots: AvailabilitySlot[], bookingId: string, lockUntil: string, nowIso: string) {
  for (const slot of slots) {
    slot.isBooked = false
    slot.lockedByBookingId = bookingId
    slot.lockedUntil = lockUntil
    slot.updatedAt = nowIso
  }
}

function bookSlots(slots: AvailabilitySlot[], bookingId: string, nowIso: string) {
  for (const slot of slots) {
    slot.isBooked = true
    slot.lockedByBookingId = bookingId
    slot.lockedUntil = null
    slot.updatedAt = nowIso
  }
}

function releaseBookingSlots(slots: AvailabilitySlot[], nowIso: string) {
  for (const slot of slots) {
    releaseSlot(slot, nowIso)
  }
}

function findOrCreateUser(store: LocalStoreData, email: string, nowIso: string): UserRecord {
  const existing = store.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  if (existing) {
    existing.updatedAt = nowIso
    return existing
  }

  const user: UserRecord = {
    id: crypto.randomUUID(),
    email,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  store.users.unshift(user)
  return user
}

export async function listAvailability(): Promise<GroupedAvailability[]> {
  return withLock(async () => {
    const store = await readStore()
    return groupAvailability(store.availability)
  })
}

export async function getActiveConsultationPrice() {
  return withLock(async () => {
    const store = await readStore()
    return createActiveConsultationPrice(store.pricingSettings.amount, store.pricingSettings.updatedAt)
  })
}

export async function updateActiveConsultationPrice(amount: number) {
  return withLock(async () => {
    const store = await readStore()
    const nowIso = new Date().toISOString()
    store.pricingSettings = {
      amount: parseConsultationPriceInput(amount),
      updatedAt: nowIso,
    }
    await persistStore(store)
    return createActiveConsultationPrice(store.pricingSettings.amount, store.pricingSettings.updatedAt)
  })
}

export async function listAvailabilityAdmin(): Promise<AvailabilitySlot[]> {
  return withLock(async () => {
    const store = await readStore()
    return [...store.availability].sort(sortAvailability)
  })
}

export async function getAvailabilitySlot(slotId: string): Promise<AvailabilitySlot | null> {
  return withLock(async () => {
    const store = await readStore()
    const slot = store.availability.find((item) => item.id === slotId) ?? null

    if (!slot) {
      return null
    }

    return !slot.isBooked && !slot.lockedByBookingId && !isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime)
      ? null
      : slot
  })
}

export async function createAvailabilitySlot(bookingDate: string, bookingTime: string): Promise<AvailabilitySlot> {
  return withLock(async () => {
    if (!isFutureAvailabilitySlot(bookingDate, bookingTime)) {
      throw new Error('Możesz dodać tylko przyszły termin.')
    }

    const store = await readStore()
    const existing = store.availability.find(
      (slot) => slot.bookingDate === bookingDate && slot.bookingTime === bookingTime,
    )

    if (existing) {
      throw new Error('Ten slot już istnieje.')
    }

    const nowIso = new Date().toISOString()
    const slot: AvailabilitySlot = {
      id: `${bookingDate}-${bookingTime}`,
      bookingDate,
      bookingTime,
      isBooked: false,
      lockedByBookingId: null,
      lockedUntil: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    store.availability.push(slot)
    store.availability.sort(sortAvailability)
    await persistStore(store)
    return slot
  })
}

export async function deleteAvailabilitySlot(slotId: string): Promise<void> {
  return withLock(async () => {
    const store = await readStore()
    const slot = store.availability.find((item) => item.id === slotId)

    if (!slot) {
      throw new Error('Nie znaleziono slotu.')
    }

    if (slot.isBooked || slot.lockedByBookingId) {
      throw new Error('Nie można usunąć slotu, który jest zarezerwowany lub opłacony.')
    }

    store.availability = store.availability.filter((item) => item.id !== slotId)
    await persistStore(store)
  })
}

export async function createPendingBooking(form: BookingFormData): Promise<BookingCreateResult> {
  return withLock(async () => {
    const store = await readStore()
    const pricing = createActiveConsultationPrice(store.pricingSettings.amount, store.pricingSettings.updatedAt)
    const serviceType = normalizeBookingServiceType(form.serviceType)
    const slotWindow = getBookableServiceAvailabilityWindow(store.availability, form.slotId, serviceType)
    const slot = slotWindow?.[0] ?? null

    if (!slotWindow || !slot || slot.isBooked || slot.lockedByBookingId) {
      throw new Error('Wybrany termin nie jest już dostępny.')
    }

    if (!isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime)) {
      throw new Error('Wybrany termin jest już przeszły. Wybierz nową godzinę rozmowy.')
    }

    if (!isAvailabilitySlotBookableForService(slot, serviceType)) {
      throw new Error('Wybrany termin nie jest dostępny dla tej usługi.')
    }

    const nowIso = new Date().toISOString()
    const user = findOrCreateUser(store, form.email, nowIso)
    const bookingId = crypto.randomUUID()
    const accessToken = createCustomerAccessToken()
    const reservationExpiresAt = new Date(Date.now() + getReservationWindowMinutes() * 60 * 1000).toISOString()
    const customerPhone = form.phone?.trim() ?? ''
    console.info('[regulski-behawiorysta][pricing] booking-created', {
      bookingId,
      amount: getBookingServicePrice(serviceType, pricing.amount),
      summary: `${pricing.summary} Service: ${serviceType}`,
    })

    const booking: BookingRecord = {
      id: bookingId,
      userId: user.id,
      customerAccessTokenHash: accessToken.tokenHash,
      ownerName: form.ownerName,
      serviceType,
      problemType: form.problemType,
      animalType: form.animalType,
      petAge: form.petAge,
      durationNotes: form.durationNotes,
      description: form.description,
      phone: customerPhone,
      qaBooking: form.qaBooking ?? false,
      customerPhoneNormalized: normalizePolishPhone(customerPhone)?.e164 ?? null,
      email: form.email,
      bookingDate: slot.bookingDate,
      bookingTime: slot.bookingTime,
      slotId: slot.id,
      amount: getBookingServicePrice(serviceType, pricing.amount),
      bookingStatus: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: null,
      paymentReference: null,
      meetingUrl: createMeetingUrl(bookingId),
      createdAt: nowIso,
      updatedAt: nowIso,
      checkoutSessionId: null,
      paymentIntentId: null,
      payuOrderId: null,
      payuOrderStatus: null,
      smsConfirmationStatus: null,
      smsConfirmationSentAt: null,
      smsProviderMessageId: null,
      smsErrorCode: null,
      smsErrorMessage: null,
      paidAt: null,
      paymentReportedAt: null,
      paymentRejectedAt: null,
      paymentRejectedReason: null,
      cancelledAt: null,
      expiredAt: null,
      refundedAt: null,
      recommendedNextStep: null,
      reminderSent: false,
      prepVideoPath: null,
      prepVideoFilename: null,
      prepVideoSizeBytes: null,
      prepLinkUrl: null,
      prepNotes: null,
      prepUploadedAt: null,
    }

    holdSlots(slotWindow, booking.id, reservationExpiresAt, nowIso)

    store.bookings.unshift(booking)
    await persistStore(store)
    await sendBookingReservationCreatedEmail(booking, accessToken.rawToken)

    return { booking, slot: { ...slot }, accessToken: accessToken.rawToken }
  })
}

export async function getBookingById(id: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    return store.bookings.find((booking) => booking.id === id) ?? null
  })
}

export async function getBookingByCustomerAccess(id: string, accessToken: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === id)

    if (!booking) {
      return null
    }

    if (!booking.customerAccessTokenHash) {
      return booking
    }

    return hasValidCustomerAccessToken(accessToken, booking.customerAccessTokenHash) ? booking : null
  })
}

export async function listBookings(): Promise<BookingRecord[]> {
  return withLock(async () => {
    const store = await readStore()
    return [...store.bookings].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  })
}

export async function listFunnelEvents(): Promise<FunnelEventRecord[]> {
  return withLock(async () => {
    const store = await readStore()
    return [...store.funnelEvents].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  })
}

export async function listUrgentNowRequests(): Promise<UrgentNowRequestRecord[]> {
  return listUrgentNowRequestRecords()
}

export async function createUrgentNowRequest(input: {
  name: string
  email: string
  phone?: string | null
  species: 'pies' | 'kot'
  topicId: import('@/lib/types').ProblemType
  topicLabel: string
  message: string
  requestedDate: string
  requestedTime: string
}) {
  return createUrgentNowRequestRecord(input)
}

export async function respondUrgentNowRequest(input: {
  id: string
  proposedDate: string
  proposedTime: string
  responseNote?: string | null
  availabilitySlotId?: string | null
  bookingHref?: string | null
}) {
  return respondUrgentNowRequestRecord(input)
}

export async function recordFunnelEvent(input: FunnelEventInput): Promise<FunnelEventRecord> {
  return withLock(async () => {
    const store = await readStore()
    const event = appendFunnelEvent(store, input)
    await persistStore(store)
    return event
  })
}

export async function updateBookingPreparation(
  bookingId: string,
  patch: BookingPreparationPatch,
): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'prepVideoPath')) {
      booking.prepVideoPath = patch.prepVideoPath ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'prepVideoFilename')) {
      booking.prepVideoFilename = patch.prepVideoFilename ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'prepVideoSizeBytes')) {
      booking.prepVideoSizeBytes = patch.prepVideoSizeBytes ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'prepLinkUrl')) {
      booking.prepLinkUrl = patch.prepLinkUrl ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'prepNotes')) {
      booking.prepNotes = patch.prepNotes ?? null
    }

    if (Object.prototype.hasOwnProperty.call(patch, 'prepUploadedAt')) {
      booking.prepUploadedAt = patch.prepUploadedAt ?? null
    }

    booking.updatedAt = new Date().toISOString()
    await persistStore(store)
    return booking
  })
}

export async function attachCheckoutSession(bookingId: string, checkoutSessionId: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    booking.checkoutSessionId = checkoutSessionId
    booking.updatedAt = new Date().toISOString()
    await persistStore(store)
    return booking
  })
}

export async function attachPayuOrder(
  bookingId: string,
  paymentData: { payuOrderId: string; payuOrderStatus?: string | null },
): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    booking.paymentMethod = 'payu'
    booking.payuOrderId = paymentData.payuOrderId
    booking.payuOrderStatus = paymentData.payuOrderStatus ?? booking.payuOrderStatus ?? null
    booking.updatedAt = new Date().toISOString()
    await persistStore(store)
    return booking
  })
}

export async function markBookingManualPaymentPending(
  bookingId: string,
  paymentData?: { paymentReference?: string | null; customerAccessToken?: string | null; suppressAdminEmail?: boolean },
): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (
      !(
        (booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid') ||
        (booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review')
      )
    ) {
      throw new Error('Tę rezerwację można zgłosić do potwierdzenia wpłaty tylko przed opłaceniem.')
    }

    const nowIso = new Date().toISOString()
    const holdUntil = new Date(Date.now() + getManualPaymentConfig().holdMinutes * 60 * 1000).toISOString()
    const paymentReportedAt = booking.paymentReportedAt ?? nowIso
    const slots = resolveBookingSlots(store.availability, booking)
    const shouldSendManualReviewEmail =
      !paymentData?.suppressAdminEmail &&
      (booking.bookingStatus !== 'pending_manual_payment' || booking.paymentStatus !== 'pending_manual_review')

    booking.bookingStatus = 'pending_manual_payment'
    booking.paymentStatus = 'pending_manual_review'
    booking.paymentMethod = 'manual'
    booking.paymentReference = paymentData?.paymentReference ?? booking.paymentReference ?? null
    booking.paymentReportedAt = paymentReportedAt
    booking.paymentRejectedAt = null
    booking.paymentRejectedReason = null
    booking.cancelledAt = null
    booking.expiredAt = null
    booking.updatedAt = nowIso

    if (slots.length > 0) {
      holdSlots(slots, booking.id, holdUntil, nowIso)
    }

    if (shouldSendManualReviewEmail) {
      appendFunnelEvent(store, {
        eventType: 'payment_marked_pending',
        bookingId: booking.id,
        qaBooking: Boolean(booking.qaBooking),
        source: 'server',
        properties: {
          ...getBookingFunnelEventProperties(booking),
          payment_reference: booking.paymentReference ?? null,
          payment_status: booking.paymentStatus,
          booking_status: booking.bookingStatus,
          hold_until: holdUntil,
        },
      })
    }

    await persistStore(store)

    if (shouldSendManualReviewEmail) {
      await sendBookingManualPaymentPendingEmail(booking, paymentData?.customerAccessToken ?? null)
    }

    return booking
  })
}

export async function markBookingPaid(
  bookingId: string,
  paymentData?: {
    checkoutSessionId?: string | null
    paymentIntentId?: string | null
    paymentMethod?: BookingRecord['paymentMethod']
    paymentReference?: string | null
    payuOrderId?: string | null
    payuOrderStatus?: string | null
    triggerPaymentConfirmationSms?: boolean
  },
): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (
      !(
        (booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid') ||
        (booking.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review') ||
        (booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'paid') ||
        (booking.bookingStatus === 'done' && booking.paymentStatus === 'paid')
      )
    ) {
      throw new Error('Ten booking nie może już zostać opłacony.')
    }

    const nowIso = new Date().toISOString()
    const shouldRecordPaidEvent = booking.paymentStatus !== 'paid'
    const shouldRecordConfirmedEvent = booking.bookingStatus !== 'confirmed' && booking.bookingStatus !== 'done'
    const shouldSendConfirmation = shouldSendBookingConfirmationAfterPayment(booking)
    const shouldAttemptSms = Boolean(paymentData?.triggerPaymentConfirmationSms) && !booking.smsConfirmationStatus
    const slots = resolveBookingSlots(store.availability, booking)
    const normalizedMeetingUrl = normalizeMeetingUrl(booking.id, booking.meetingUrl)

    booking.bookingStatus = booking.bookingStatus === 'done' ? 'done' : 'confirmed'
    booking.paymentStatus = 'paid'
    booking.paidAt = nowIso
    booking.meetingUrl = normalizedMeetingUrl
    booking.cancelledAt = null
    booking.expiredAt = null
    booking.paymentMethod = paymentData?.paymentMethod ?? booking.paymentMethod ?? null
    booking.paymentReference = paymentData?.paymentReference ?? booking.paymentReference ?? null
    booking.paymentReportedAt = booking.paymentReportedAt ?? null
    booking.paymentRejectedAt = null
    booking.paymentRejectedReason = null
    booking.checkoutSessionId = paymentData?.checkoutSessionId ?? booking.checkoutSessionId ?? null
    booking.paymentIntentId = paymentData?.paymentIntentId ?? booking.paymentIntentId ?? null
    booking.payuOrderId = paymentData?.payuOrderId ?? booking.payuOrderId ?? null
    booking.payuOrderStatus = paymentData?.payuOrderStatus ?? booking.payuOrderStatus ?? null
    booking.customerPhoneNormalized = booking.customerPhoneNormalized ?? normalizePolishPhone(booking.phone)?.e164 ?? null
    booking.updatedAt = nowIso

    if (shouldAttemptSms) {
      booking.smsConfirmationStatus = 'processing'
      booking.smsConfirmationSentAt = null
      booking.smsProviderMessageId = null
      booking.smsErrorCode = null
      booking.smsErrorMessage = null
    }

    if (slots.length > 0) {
      bookSlots(slots, booking.id, nowIso)
    }

    if (shouldRecordPaidEvent) {
      appendFunnelEvent(store, {
        eventType: 'payment_completed',
        bookingId: booking.id,
        qaBooking: Boolean(booking.qaBooking),
        source: 'server',
        properties: {
          ...getBookingFunnelEventProperties(booking),
          payment_method: booking.paymentMethod ?? null,
          payment_reference: booking.paymentReference ?? null,
          payu_order_id: booking.payuOrderId ?? null,
          payu_order_status: booking.payuOrderStatus ?? null,
          payment_status: booking.paymentStatus,
        },
      })
    }

    if (shouldRecordConfirmedEvent) {
      appendFunnelEvent(store, {
        eventType: 'booking_confirmed',
        bookingId: booking.id,
        qaBooking: Boolean(booking.qaBooking),
        source: 'server',
        properties: {
          ...getBookingFunnelEventProperties(booking),
          payment_method: booking.paymentMethod ?? null,
          payment_status: booking.paymentStatus,
          booking_status: booking.bookingStatus,
        },
      })
    }

    await persistStore(store)

    if (shouldSendConfirmation) {
      await sendBookingConfirmationEmail(booking)
      await sendBookingPaymentConfirmedOwnerEmail(booking)
    }

    if (shouldAttemptSms) {
      const smsResult = await sendPaymentConfirmationSms(booking)
      booking.smsConfirmationStatus = smsResult.status
      booking.customerPhoneNormalized = smsResult.normalizedPhone ?? booking.customerPhoneNormalized ?? null
      booking.smsConfirmationSentAt = smsResult.status === 'sent' ? new Date().toISOString() : null
      booking.smsProviderMessageId = smsResult.providerMessageId ?? null
      booking.smsErrorCode = smsResult.errorCode ?? null
      booking.smsErrorMessage = smsResult.errorMessage ?? null
      booking.updatedAt = new Date().toISOString()
      await persistStore(store)
    }

    return booking
  })
}

export async function markBookingPaymentFailed(bookingId: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (booking.paymentStatus === 'paid' || booking.bookingStatus === 'done') {
      throw new Error('Nie można oznaczyć opłaconego bookingu jako nieudany.')
    }

    const nowIso = new Date().toISOString()
    const slots = resolveBookingSlots(store.availability, booking)
    const shouldSendOutcomeEmail = booking.bookingStatus !== 'cancelled' || booking.paymentStatus !== 'failed'
    const shouldRecordRejectCancelEvent = booking.bookingStatus !== 'cancelled' || booking.paymentStatus !== 'failed'

    booking.bookingStatus = 'cancelled'
    booking.paymentStatus = 'failed'
    booking.cancelledAt = nowIso
    booking.payuOrderStatus = booking.payuOrderStatus ?? null
    booking.updatedAt = nowIso

    if (slots.length > 0) {
      releaseBookingSlots(slots, nowIso)
    }

    if (shouldRecordRejectCancelEvent) {
      appendFunnelEvent(store, {
        eventType: 'reject_cancel',
        bookingId: booking.id,
        qaBooking: Boolean(booking.qaBooking),
        source: 'server',
        properties: {
          reason: 'payment_failed',
          payment_status: booking.paymentStatus,
          booking_status: booking.bookingStatus,
        },
      })
    }

    await persistStore(store)

    if (shouldSendOutcomeEmail) {
      await sendBookingStatusOutcomeEmail(booking)
    }

    return booking
  })
}

export async function markBookingManualPaymentRejected(
  bookingId: string,
  reason?: string,
): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (booking.paymentStatus === 'paid' || booking.bookingStatus === 'done') {
      throw new Error('Nie można odrzucić wpłaty dla opłaconej konsultacji.')
    }

    const nowIso = new Date().toISOString()
    const slots = resolveBookingSlots(store.availability, booking)
    const shouldSendOutcomeEmail = booking.bookingStatus !== 'cancelled' || booking.paymentStatus !== 'rejected'
    const shouldRecordRejectCancelEvent = booking.bookingStatus !== 'cancelled' || booking.paymentStatus !== 'rejected'

    booking.bookingStatus = 'cancelled'
    booking.paymentStatus = 'rejected'
    booking.paymentMethod = booking.paymentMethod ?? 'manual'
    booking.paymentRejectedAt = nowIso
    booking.paymentRejectedReason = reason ?? 'Nie znaleziono wpłaty.'
    booking.cancelledAt = nowIso
    booking.updatedAt = nowIso

    if (slots.length > 0) {
      releaseBookingSlots(slots, nowIso)
    }

    if (shouldRecordRejectCancelEvent) {
      appendFunnelEvent(store, {
        eventType: 'reject_cancel',
        bookingId: booking.id,
        qaBooking: Boolean(booking.qaBooking),
        source: 'server',
        properties: {
          reason: booking.paymentRejectedReason,
          payment_status: booking.paymentStatus,
          booking_status: booking.bookingStatus,
        },
      })
    }

    await persistStore(store)

    if (shouldSendOutcomeEmail) {
      await sendBookingStatusOutcomeEmail(booking)
    }

    return booking
  })
}

export async function markBookingRefunded(bookingId: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (booking.paymentStatus !== 'paid' || booking.bookingStatus !== 'confirmed') {
      throw new Error('Tylko świeżo opłacona, potwierdzona rezerwacja może zostać anulowana z automatycznym zwrotem.')
    }

    const nowIso = new Date().toISOString()
    const slots = resolveBookingSlots(store.availability, booking)
    const shouldSendOutcomeEmail = true

    booking.bookingStatus = 'cancelled'
    booking.paymentStatus = 'refunded'
    booking.cancelledAt = nowIso
    booking.refundedAt = nowIso
    booking.updatedAt = nowIso

    if (slots.length > 0) {
      releaseBookingSlots(slots, nowIso)
    }

    appendFunnelEvent(store, {
      eventType: 'reject_cancel',
      bookingId: booking.id,
      qaBooking: Boolean(booking.qaBooking),
      source: 'server',
      properties: {
        reason: 'refunded',
        payment_status: booking.paymentStatus,
        booking_status: booking.bookingStatus,
      },
    })

    await persistStore(store)

    if (shouldSendOutcomeEmail) {
      await sendBookingStatusOutcomeEmail(booking)
    }

    return booking
  })
}

export async function markBookingExpired(bookingId: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    const nowIso = new Date().toISOString()
    const slots = resolveBookingSlots(store.availability, booking)
    const shouldSendOutcomeEmail = booking.bookingStatus !== 'expired'
    const shouldRecordRejectCancelEvent = booking.bookingStatus !== 'expired'

    booking.bookingStatus = 'expired'
    booking.paymentStatus = booking.paymentStatus === 'pending_manual_review' ? 'rejected' : 'unpaid'
    booking.expiredAt = nowIso
    booking.paymentRejectedAt = booking.paymentStatus === 'rejected' ? nowIso : booking.paymentRejectedAt ?? null
    booking.paymentRejectedReason =
      booking.paymentStatus === 'rejected'
        ? booking.paymentRejectedReason ?? 'Upłynął czas na potwierdzenie wpłaty.'
        : booking.paymentRejectedReason ?? null
    booking.updatedAt = nowIso

    if (slots.length > 0) {
      releaseBookingSlots(slots, nowIso)
    }

    if (shouldRecordRejectCancelEvent) {
      appendFunnelEvent(store, {
        eventType: 'reject_cancel',
        bookingId: booking.id,
        qaBooking: Boolean(booking.qaBooking),
        source: 'server',
        properties: {
          reason: booking.paymentStatus === 'rejected' ? booking.paymentRejectedReason : 'expired',
          payment_status: booking.paymentStatus,
          booking_status: booking.bookingStatus,
        },
      })
    }

    await persistStore(store)

    if (shouldSendOutcomeEmail) {
      await sendBookingStatusOutcomeEmail(booking)
    }

    return booking
  })
}

export async function markBookingDone(bookingId: string, recommendedNextStep?: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (booking.paymentStatus !== 'paid') {
      throw new Error('Nie można oznaczyć jako done nieopłaconej konsultacji.')
    }

    booking.bookingStatus = 'done'
    booking.paymentStatus = booking.paymentStatus === 'paid' ? 'paid' : booking.paymentStatus
    booking.recommendedNextStep = recommendedNextStep ?? booking.recommendedNextStep ?? null
    booking.updatedAt = new Date().toISOString()
    await persistStore(store)
    return booking
  })
}

export async function markBookingReminderSent(bookingId: string): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    booking.reminderSent = true
    booking.updatedAt = new Date().toISOString()
    await persistStore(store)
    return booking
  })
}

export async function updateBookingQuiz(
  bookingId: string,
  patch: { petAge?: string; durationNotes?: string; description?: string; questionsRemaining?: number | null },
): Promise<BookingRecord | null> {
  return withLock(async () => {
    const store = await readStore()
    const booking = store.bookings.find((item) => item.id === bookingId)

    if (!booking) {
      return null
    }

    if (patch.petAge !== undefined) booking.petAge = patch.petAge
    if (patch.durationNotes !== undefined) booking.durationNotes = patch.durationNotes
    if (patch.description !== undefined) booking.description = patch.description
    if (patch.questionsRemaining !== undefined) booking.questionsRemaining = patch.questionsRemaining

    booking.updatedAt = new Date().toISOString()
    await persistStore(store)
    return booking
  })
}
