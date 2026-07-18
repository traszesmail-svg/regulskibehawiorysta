import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import {
  type AccountAttachment,
  type AccountBookingSummary,
  type AccountConversation,
  type AccountHomePayload,
  type AccountMaterialSummary,
  type AccountMessage,
  type AccountPet,
  type AccountPetSpecies,
  type AccountProfile,
  type AccountTimelineEvent,
  getBookingStatusLabel,
  getCommerceStatusLabel,
  getPaymentStatusLabel,
} from '@/lib/account'
import { normalizeCommerceEmail } from '@/lib/commerce'
import { listBookings, updateBookingQuiz } from '@/lib/server/db'
import { listLeadBookings, updateLeadBooking, type LeadBookingRecord } from '@/lib/server/lead-bookings'
import { listCommerceOrdersByEmail } from '@/lib/server/commerce-store'
import { getSupabaseServerConfig } from '@/lib/server/env'
import { sendAccountRoomReplyEmail } from '@/lib/server/notifications'
import type { BookingRecord } from '@/lib/types'

const CUSTOMER_FILES_BUCKET = 'customer-room-files'
const SIGNED_URL_SECONDS = 60 * 60
const MAX_ACCOUNT_UPLOAD_BYTES = 25 * 1024 * 1024
const ACCOUNT_STATE_FILE = 'account-state.json'
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
])

type StoredAttachment = {
  id: string
  fileName: string
  fileType: string
  fileSizeBytes: number
  storagePath: string
  createdAt: string
}

type StoredMessage = {
  id: string
  sender: 'customer' | 'specialist' | 'system'
  body: string
  attachments: StoredAttachment[]
  createdAt: string
}

type StoredConversation = {
  id: string
  subject: string
  status: 'open' | 'closed'
  petId: string | null
  bookingId: string | null
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

type StoredPet = {
  id: string
  name: string
  species: AccountPetSpecies
  age: string
  behaviorNotes: string
  photoPath: string | null
  createdAt: string
  updatedAt: string
}

type StoredAccountState = {
  profile: AccountProfile | null
  pets: StoredPet[]
  conversations: StoredConversation[]
}

export type UpsertAccountPetInput = {
  id?: string | null
  name: string
  species: AccountPetSpecies
  age?: string | null
  behaviorNotes?: string | null
}

export type CreateAccountMessageInput = {
  body: string
  conversationId?: string | null
  petId?: string | null
  file?: File | null
}

export type AccountAdminRoom = AccountHomePayload & {
  userId: string
  email: string
  updatedAt: string
  messageCount: number
  lastMessageAt: string | null
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('konto opiekuna')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function normalizeEmail(value: string) {
  return normalizeCommerceEmail(value)
}

function userEmail(user: User) {
  const email = user.email?.trim()

  if (!email) {
    throw new Error('Konto nie ma potwierdzonego adresu email.')
  }

  return normalizeEmail(email)
}

type AccountRoomBooking = Pick<BookingRecord, 'bookingStatus' | 'paymentStatus'>
type AccountRoomLeadBooking = Pick<LeadBookingRecord, 'status'> & { service: string }

export function hasEligibleAccountRoomBooking(
  bookings: AccountRoomBooking[],
  leadBookings: AccountRoomLeadBooking[],
) {
  const hasPaidBooking = bookings.some(
    (booking) =>
      booking.paymentStatus === 'paid' &&
      (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done'),
  )

  const hasPaidLeadBooking = leadBookings.some(
    (booking) =>
      !booking.service.startsWith('commerce:') &&
      (booking.status === 'paid' || booking.status === 'confirmed'),
  )

  return hasPaidBooking || hasPaidLeadBooking
}

async function getEligibleAccountRoomBookings(email: string) {
  const [allBookings, allLeadBookings] = await Promise.all([listBookings(), listLeadBookings()])
  const bookings = allBookings.filter(
    (booking) =>
      booking.email?.trim().toLowerCase() === email &&
      booking.paymentStatus === 'paid' &&
      (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done'),
  )
  const leadBookings = allLeadBookings.filter(
    (booking) =>
      booking.email?.trim().toLowerCase() === email &&
      !booking.service.startsWith('commerce:') &&
      (booking.status === 'paid' || booking.status === 'confirmed'),
  )

  if (!hasEligibleAccountRoomBooking(bookings, leadBookings)) {
    throw new Error('Pokój rozmowy i pliki są dostępne po potwierdzonej, opłaconej konsultacji.')
  }

  return { bookings, leadBookings }
}

function emptyState(): StoredAccountState {
  return {
    profile: null,
    pets: [],
    conversations: [],
  }
}

function statePath(userId: string) {
  return `${userId}/${ACCOUNT_STATE_FILE}`
}

async function ensureCustomerBucket() {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.getBucket(CUSTOMER_FILES_BUCKET)

  if (!error) return

  const { error: createError } = await supabase.storage.createBucket(CUSTOMER_FILES_BUCKET, {
    public: false,
  })

  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(createError.message)
  }
}

function normalizeState(value: unknown): StoredAccountState {
  const state = value && typeof value === 'object' ? value as Partial<StoredAccountState> : {}

  return {
    profile: state.profile && typeof state.profile === 'object' ? state.profile : null,
    pets: Array.isArray(state.pets) ? state.pets : [],
    conversations: Array.isArray(state.conversations) ? state.conversations : [],
  }
}

async function readAccountState(user: User): Promise<StoredAccountState> {
  return readStoredAccountState(user.id)
}

async function readStoredAccountState(userId: string): Promise<StoredAccountState> {
  await ensureCustomerBucket()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.storage
    .from(CUSTOMER_FILES_BUCKET)
    .download(statePath(userId))

  if (error || !data) {
    return emptyState()
  }

  try {
    return normalizeState(JSON.parse(await data.text()))
  } catch {
    return emptyState()
  }
}

async function saveAccountState(user: User, state: StoredAccountState) {
  return saveStoredAccountState(user.id, state)
}

async function saveStoredAccountState(userId: string, state: StoredAccountState) {
  await ensureCustomerBucket()

  const supabase = getSupabaseAdmin()
  const payload = Buffer.from(JSON.stringify(state, null, 2), 'utf8')
  const { error } = await supabase.storage
    .from(CUSTOMER_FILES_BUCKET)
    .upload(statePath(userId), payload, {
      contentType: 'application/json; charset=utf-8',
      upsert: true,
    })

  if (error) {
    throw new Error(error.message)
  }
}

async function ensureProfile(user: User, state: StoredAccountState) {
  const email = userEmail(user)
  const now = new Date().toISOString()

  if (!state.profile) {
    state.profile = {
      userId: user.id,
      email,
      displayName: '',
      createdAt: now,
      updatedAt: now,
    }
    return true
  }

  if (state.profile.email !== email) {
    state.profile = {
      ...state.profile,
      email,
      updatedAt: now,
    }
    return true
  }

  return false
}

async function signStoragePath(storagePath: string | null) {
  if (!storagePath) return null

  try {
    await ensureCustomerBucket()
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.storage
      .from(CUSTOMER_FILES_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_SECONDS)

    if (error) return null
    return data.signedUrl
  } catch {
    return null
  }
}

async function petFromStored(pet: StoredPet): Promise<AccountPet> {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species === 'kot' ? 'kot' : 'pies',
    age: pet.age ?? '',
    behaviorNotes: pet.behaviorNotes ?? '',
    photoPath: pet.photoPath,
    photoUrl: await signStoragePath(pet.photoPath),
    createdAt: pet.createdAt,
    updatedAt: pet.updatedAt,
  }
}

async function attachmentFromStored(attachment: StoredAttachment): Promise<AccountAttachment> {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    fileSizeBytes: attachment.fileSizeBytes,
    storagePath: attachment.storagePath,
    signedUrl: await signStoragePath(attachment.storagePath),
    createdAt: attachment.createdAt,
  }
}

async function conversationFromStored(conversation: StoredConversation): Promise<AccountConversation> {
  const messages: AccountMessage[] = await Promise.all(
    conversation.messages.map(async (message) => ({
      id: message.id,
      sender: message.sender,
      body: message.body,
      attachments: await Promise.all(message.attachments.map(attachmentFromStored)),
      createdAt: message.createdAt,
    })),
  )

  return {
    id: conversation.id,
    subject: conversation.subject,
    status: conversation.status,
    petId: conversation.petId,
    bookingId: conversation.bookingId,
    messages,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }
}

function formatDateLabel(date: string | null | undefined, time?: string | null) {
  if (!date) return 'bez terminu'

  try {
    const parsed = new Date(`${date}T${time || '12:00'}:00`)
    const dateLabel = new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed)
    return time ? `${dateLabel}, ${time}` : dateLabel
  } catch {
    return time ? `${date}, ${time}` : date
  }
}

function bookingToSummary(booking: BookingRecord): AccountBookingSummary {
  return {
    id: booking.id,
    source: 'booking',
    title: 'Konsultacja behawioralna',
    species: booking.animalType,
    description: booking.description,
    dateLabel: formatDateLabel(booking.bookingDate, booking.bookingTime),
    statusLabel: getBookingStatusLabel(booking.bookingStatus),
    paymentLabel: getPaymentStatusLabel(booking.paymentStatus),
    meetingUrl: booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done'
      ? booking.meetingUrl
      : null,
    paymentUrl: null,
    createdAt: booking.createdAt,
    callId: booking.callId ?? null,
    callStatus: booking.callStatus ?? null,
    startedAt: booking.startedAt ?? null,
    questionsRemaining: booking.questionsRemaining ?? null,
    serviceType: booking.serviceType ?? null,
    supportEndsAt: booking.serviceType === 'konsultacja-behawioralna-online'
      ? new Date(new Date(`${booking.bookingDate}T${booking.bookingTime}:00`).getTime() + 14 * 86400000).toISOString()
      : null,
  }
}

function leadBookingToSummary(booking: LeadBookingRecord): AccountBookingSummary {
  const isAudio = booking.service === 'szybka-konsultacja-15-min' || booking.service === 'kwadrans-na-juz' || booking.service === 'konsultacja-30-min';
  const meetingUrl = isAudio
    ? `/call/${booking.id}?access=${booking.accessToken}`
    : booking.callRoomUrl;

  return {
    id: booking.id,
    source: 'lead_booking',
    title: booking.serviceLabel,
    species: booking.species === 'kot' ? 'Kot' : 'Pies',
    description: booking.description,
    dateLabel: booking.confirmedDate
      ? formatDateLabel(booking.confirmedDate, booking.confirmedTime)
      : booking.preferredSlots || 'termin do potwierdzenia',
    statusLabel: booking.status === 'paid'
      ? 'potwierdzona'
      : booking.status === 'cancelled'
        ? 'anulowana'
        : 'w toku',
    paymentLabel: booking.paymentMethod ? `platnosc: ${booking.paymentMethod}` : 'platnosc do potwierdzenia',
    meetingUrl: meetingUrl,
    paymentUrl: booking.paymentLink,
    createdAt: booking.createdAt,
    callId: booking.callId ?? null,
    callStatus: booking.callStatus ?? null,
    startedAt: booking.startedAt ?? null,
    questionsRemaining: booking.questionsRemaining ?? null,
    serviceType: booking.service,
    supportEndsAt: booking.service === 'konsultacja-behawioralna-online' && booking.confirmedDate
      ? new Date(new Date(`${booking.confirmedDate}T${booking.confirmedTime ?? '12:00'}:00`).getTime() + 14 * 86400000).toISOString()
      : null,
  }
}

function isCommerceLeadBooking(booking: LeadBookingRecord) {
  return booking.service.startsWith('commerce:')
}

function materialToSummary(order: Awaited<ReturnType<typeof listCommerceOrdersByEmail>>[number]): AccountMaterialSummary {
  const accessUrl = order.productType === 'ebook' && order.accessCode
    ? `/pokoj?code=${encodeURIComponent(order.accessCode)}&email=${encodeURIComponent(order.customerEmail)}`
    : null

  return {
    orderNumber: order.orderNumber,
    productName: order.productName,
    productType: order.productType,
    status: order.status,
    statusLabel: getCommerceStatusLabel(order.status),
    accessUrl,
    createdAt: order.createdAt,
  }
}

function buildTimeline(
  pets: AccountPet[],
  bookings: AccountBookingSummary[],
  materials: AccountMaterialSummary[],
  conversations: AccountConversation[],
): AccountTimelineEvent[] {
  const events: AccountTimelineEvent[] = []

  for (const pet of pets) {
    events.push({
      id: `pet:${pet.id}`,
      type: 'pet',
      title: `Profil pupila: ${pet.name}`,
      description: pet.species === 'kot' ? 'Kot dodany do pokoju opiekuna.' : 'Pies dodany do pokoju opiekuna.',
      href: null,
      createdAt: pet.createdAt,
    })
  }

  for (const booking of bookings) {
    events.push({
      id: `${booking.source}:${booking.id}`,
      type: booking.source,
      title: booking.title,
      description: `${booking.dateLabel} - ${booking.statusLabel}`,
      href: booking.meetingUrl,
      createdAt: booking.createdAt,
    })
  }

  for (const material of materials) {
    events.push({
      id: `material:${material.orderNumber}`,
      type: 'material',
      title: material.productName,
      description: material.statusLabel,
      href: material.accessUrl,
      createdAt: material.createdAt,
    })
  }

  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      events.push({
        id: `message:${message.id}`,
        type: 'message',
        title: message.sender === 'customer' ? 'Wiadomosc od opiekuna' : 'Wiadomosc w rozmowie',
        description: message.body || 'Dodano zalacznik.',
        href: null,
        createdAt: message.createdAt,
      })
    }
  }

  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function fallbackProfileForAdmin(user: User): AccountProfile | null {
  const email = user.email?.trim().toLowerCase()
  if (!email) return null

  const createdAt = user.created_at ?? new Date().toISOString()

  return {
    userId: user.id,
    email,
    displayName: '',
    createdAt,
    updatedAt: createdAt,
  }
}

function roomUpdatedAt(payload: AccountHomePayload) {
  const candidates = [
    payload.profile.updatedAt,
    ...payload.pets.map((pet) => pet.updatedAt),
    ...payload.conversations.map((conversation) => conversation.updatedAt),
    ...payload.bookings.map((booking) => booking.createdAt),
    ...payload.materials.map((material) => material.createdAt),
  ].filter(Boolean)

  return candidates.sort().at(-1) ?? payload.profile.updatedAt
}

async function buildAccountRoomFromState(user: User, state: StoredAccountState): Promise<AccountAdminRoom | null> {
  const profile = state.profile ?? fallbackProfileForAdmin(user)
  if (!profile) return null

  const [pets, conversations, bookings, materials] = await Promise.all([
    Promise.all(state.pets.map(petFromStored)),
    Promise.all(state.conversations.map(conversationFromStored)),
    safeBookingSummaries(profile.email),
    safeMaterialSummaries(profile.email),
  ])

  const payload: AccountHomePayload = {
    profile,
    pets,
    bookings,
    materials,
    conversations,
    timeline: buildTimeline(pets, bookings, materials, conversations),
  }
  const allMessages = conversations.flatMap((conversation) => conversation.messages)

  return {
    ...payload,
    userId: profile.userId,
    email: profile.email,
    updatedAt: roomUpdatedAt(payload),
    messageCount: allMessages.length,
    lastMessageAt: allMessages.map((message) => message.createdAt).sort().at(-1) ?? null,
  }
}

async function safeBookingSummaries(email: string) {
  const [bookingsResult, leadBookingsResult] = await Promise.allSettled([
    listBookings(),
    listLeadBookings(),
  ])

  const bookings = bookingsResult.status === 'fulfilled'
    ? bookingsResult.value
        .filter((booking) => normalizeEmail(booking.email) === email)
        .map(bookingToSummary)
    : []

  const leadBookings = leadBookingsResult.status === 'fulfilled'
    ? leadBookingsResult.value
        .filter((booking) => normalizeEmail(booking.email) === email && !isCommerceLeadBooking(booking))
        .map(leadBookingToSummary)
    : []

  return [...bookings, ...leadBookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function safeMaterialSummaries(email: string) {
  try {
    return (await listCommerceOrdersByEmail(email)).map(materialToSummary)
  } catch {
    return []
  }
}

export async function ensureAccountProfile(user: User): Promise<AccountProfile> {
  const state = await readAccountState(user)
  const changed = await ensureProfile(user, state)
  if (changed) await saveAccountState(user, state)

  if (!state.profile) {
    throw new Error('Nie udalo sie przygotowac profilu konta.')
  }

  return state.profile
}

export async function getAccountHome(user: User): Promise<AccountHomePayload> {
  const state = await readAccountState(user)
  const changed = await ensureProfile(user, state)
  if (changed) await saveAccountState(user, state)

  if (!state.profile) {
    throw new Error('Nie udalo sie przygotowac profilu konta.')
  }

  const email = state.profile.email
  const [pets, conversations, bookings, materials] = await Promise.all([
    Promise.all(state.pets.map(petFromStored)),
    Promise.all(state.conversations.map(conversationFromStored)),
    safeBookingSummaries(email),
    safeMaterialSummaries(email),
  ])

  return {
    profile: state.profile,
    pets,
    bookings,
    materials,
    conversations,
    timeline: buildTimeline(pets, bookings, materials, conversations),
  }
}

export async function listAccountRoomsForAdmin(): Promise<AccountAdminRoom[]> {
  await ensureCustomerBucket()

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) {
    throw new Error(error.message)
  }

  const rooms = await Promise.all(
    data.users.map(async (user) => {
      const state = await readStoredAccountState(user.id)
      return buildAccountRoomFromState(user, state)
    }),
  )

  return rooms
    .filter((room): room is AccountAdminRoom => Boolean(room))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getAccountRoomForAdmin(userId: string): Promise<AccountAdminRoom | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.getUserById(userId)

  if (error || !data.user) {
    return null
  }

  return buildAccountRoomFromState(data.user, await readStoredAccountState(userId))
}

export async function upsertAccountPet(user: User, input: UpsertAccountPetInput): Promise<AccountPet> {
  const state = await readAccountState(user)
  const changed = await ensureProfile(user, state)
  const now = new Date().toISOString()
  const name = input.name.trim()

  if (!name) {
    throw new Error('Podaj imie pupila.')
  }

  const existing = input.id ? state.pets.find((pet) => pet.id === input.id) : null
  const nextPet: StoredPet = {
    id: existing?.id ?? randomUUID(),
    name,
    species: input.species === 'kot' ? 'kot' : 'pies',
    age: input.age?.trim() ?? '',
    behaviorNotes: input.behaviorNotes?.trim() ?? '',
    photoPath: existing?.photoPath ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  if (existing) {
    state.pets = state.pets.map((pet) => pet.id === existing.id ? nextPet : pet)
  } else {
    state.pets.push(nextPet)
  }

  if (!changed) {
    state.profile = state.profile ? { ...state.profile, updatedAt: now } : state.profile
  }

  await saveAccountState(user, state)
  return petFromStored(nextPet)
}

function sanitizeFileName(fileName: string) {
  const safe = fileName
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)

  return safe || 'plik'
}

function assertUploadAllowed(file: File) {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error('Dozwolone sa pliki JPG, PNG, WebP, PDF, MP4 i MOV.')
  }

  if (file.size > MAX_ACCOUNT_UPLOAD_BYTES) {
    throw new Error('Plik jest za duzy. Maksymalny rozmiar to 25 MB.')
  }
}

async function uploadCustomerFile(user: User, file: File, folder: string) {
  assertUploadAllowed(file)
  await ensureCustomerBucket()

  const supabase = getSupabaseAdmin()
  const safeName = sanitizeFileName(file.name)
  const storagePath = `${user.id}/${folder}/${Date.now()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from(CUSTOMER_FILES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  return storagePath
}

export async function uploadPetPhoto(user: User, petId: string, file: File): Promise<AccountPet> {
  await getEligibleAccountRoomBookings(userEmail(user))
  const state = await readAccountState(user)
  const pet = state.pets.find((item) => item.id === petId)

  if (!pet) {
    throw new Error('Nie znaleziono pupila.')
  }

  const storagePath = await uploadCustomerFile(user, file, `pets/${petId}`)
  const updatedPet: StoredPet = {
    ...pet,
    photoPath: storagePath,
    updatedAt: new Date().toISOString(),
  }

  state.pets = state.pets.map((item) => item.id === petId ? updatedPet : item)
  await saveAccountState(user, state)
  return petFromStored(updatedPet)
}

function getOrCreateConversation(state: StoredAccountState, petId?: string | null, conversationId?: string | null) {
  if (conversationId) {
    const existing = state.conversations.find((conversation) => conversation.id === conversationId)
    if (existing) return existing
  }

  const now = new Date().toISOString()
  const pet = petId ? state.pets.find((item) => item.id === petId) : null
  const conversation: StoredConversation = {
    id: randomUUID(),
    subject: pet?.name ? `Sprawa: ${pet.name}` : 'Rozmowa z behawiorysta',
    status: 'open',
    petId: pet?.id ?? null,
    bookingId: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }

  state.conversations.unshift(conversation)
  return conversation
}

export async function createAccountMessage(user: User, input: CreateAccountMessageInput) {
  const body = input.body.trim()
  const file = input.file ?? null

  if (!body && !file) {
    throw new Error('Wpisz wiadomosc albo dodaj plik.')
  }

  const { bookings, leadBookings } = await getEligibleAccountRoomBookings(userEmail(user))
  const state = await readAccountState(user)
  await ensureProfile(user, state)
  const mappedAll = [
    ...bookings.map((booking) => ({
      id: booking.id,
      createdAt: booking.createdAt,
      serviceType: booking.serviceType,
      questionsRemaining: booking.questionsRemaining ?? null,
      isLead: false,
      supportEndsAt:
        booking.serviceType === 'konsultacja-behawioralna-online'
          ? new Date(new Date(`${booking.bookingDate}T${booking.bookingTime}:00`).getTime() + 14 * 86400000).getTime()
          : null,
    })),
    ...leadBookings.map((booking) => ({
      id: booking.id,
      createdAt: booking.createdAt,
      serviceType: booking.service || null,
      questionsRemaining: booking.questionsRemaining ?? null,
      isLead: true,
      supportEndsAt:
        booking.service === 'konsultacja-behawioralna-online' && booking.confirmedDate
          ? new Date(new Date(`${booking.confirmedDate}T${booking.confirmedTime ?? '12:00'}:00`).getTime() + 14 * 86400000).getTime()
          : null,
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  const latestBooking = mappedAll[0]
  if (
    latestBooking?.serviceType === 'konsultacja-behawioralna-online' &&
    latestBooking.supportEndsAt !== null &&
    Date.now() > latestBooking.supportEndsAt
  ) {
    throw new Error('14-dniowy okres komunikacji w pokoju po pełnej konsultacji już się zakończył.')
  }
  if (
    latestBooking &&
    (latestBooking.serviceType === 'szybka-konsultacja-15-min' ||
      latestBooking.serviceType === 'kwadrans-na-juz' ||
      latestBooking.serviceType === 'konsultacja-30-min') &&
    latestBooking.questionsRemaining !== null
  ) {
    if (latestBooking.questionsRemaining <= 0) {
      throw new Error('Wykorzystałeś już limit pytań na czacie po tej konsultacji. Jeśli potrzebujesz dalszej pomocy, wybierz kolejną usługę.')
    }

    const nextValue = latestBooking.questionsRemaining - 1
    if (latestBooking.isLead) {
      await updateLeadBooking({ id: latestBooking.id, questionsRemaining: nextValue })
    } else {
      await updateBookingQuiz(latestBooking.id, { questionsRemaining: nextValue })
    }
  }

  const conversation = getOrCreateConversation(state, input.petId, input.conversationId)
  const now = new Date().toISOString()
  const attachments: StoredAttachment[] = []

  if (file) {
    const storagePath = await uploadCustomerFile(user, file, `conversations/${conversation.id}`)
    attachments.push({
      id: randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      storagePath,
      createdAt: now,
    })
  }

  const message: StoredMessage = {
    id: randomUUID(),
    sender: 'customer',
    body,
    attachments,
    createdAt: now,
  }

  conversation.messages.push(message)
  conversation.updatedAt = now
  state.conversations = [
    conversation,
    ...state.conversations.filter((item) => item.id !== conversation.id),
  ]

  await saveAccountState(user, state)
  return { conversationId: conversation.id, messageId: message.id }
}

export async function replyToAccountConversationFromAdmin(input: {
  userId: string
  conversationId: string
  body: string
  closeConversation?: boolean
}) {
  const body = input.body.trim()

  if (!body && !input.closeConversation) {
    throw new Error('Wpisz odpowiedz albo zamknij rozmowe.')
  }

  const state = await readStoredAccountState(input.userId)
  const conversation = state.conversations.find((item) => item.id === input.conversationId)

  if (!conversation) {
    throw new Error('Nie znaleziono rozmowy.')
  }

  const now = new Date().toISOString()
  let messageId: string | null = null

  if (body) {
    const message: StoredMessage = {
      id: randomUUID(),
      sender: 'specialist',
      body,
      attachments: [],
      createdAt: now,
    }

    conversation.messages.push(message)
    messageId = message.id
  }

  if (input.closeConversation) {
    conversation.status = 'closed'
  } else {
    conversation.status = 'open'
  }

  conversation.updatedAt = now
  state.conversations = [
    conversation,
    ...state.conversations.filter((item) => item.id !== conversation.id),
  ]

  await saveStoredAccountState(input.userId, state)

  if (body && state.profile?.email) {
    await sendAccountRoomReplyEmail({
      email: state.profile.email,
      conversationSubject: conversation.subject,
      messageBody: body,
    })
  }

  return {
    conversationId: conversation.id,
    messageId,
    status: conversation.status,
  }
}

export { CUSTOMER_FILES_BUCKET, MAX_ACCOUNT_UPLOAD_BYTES }
