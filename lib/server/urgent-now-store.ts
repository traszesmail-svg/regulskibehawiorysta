import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { FunnelSpecies } from '@/lib/funnel'
import type { ProblemType } from '@/lib/types'
import { type UrgentNowRequestRecord } from '@/lib/urgent-now'
import { countZapytajNowPaymentLinkRequestsForDate, getWarsawDateAndDay, URGENT_NOW_DAILY_LIMIT } from '@/lib/urgent-now-policy'
import { getLocalStoreDataDir } from './local-store-path'

type CreateUrgentNowRequestInput = {
  name: string
  email: string
  phone?: string | null
  contactPreference: 'payment_link' | 'notify_only'
  species: FunnelSpecies | null
  topicId: ProblemType
  topicLabel: string
  message: string
  requestedDate: string
  requestedTime: string
  activeBookingCount?: number
}

type RespondUrgentNowRequestInput = {
  id: string
  proposedDate: string
  proposedTime: string
  responseNote?: string | null
  availabilitySlotId?: string | null
  bookingHref?: string | null
}

type StoreShape = {
  requests: UrgentNowRequestRecord[]
}

let createQueue = Promise.resolve()

function getUrgentRequestsPath(rootDir = process.cwd()) {
  return path.join(getLocalStoreDataDir(rootDir), 'urgent-now-requests.json')
}

async function readStore(): Promise<StoreShape> {
  const filePath = getUrgentRequestsPath()

  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoreShape>
    return {
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
    }
  } catch {
    return { requests: [] }
  }
}

async function writeStore(store: StoreShape) {
  const filePath = getUrgentRequestsPath()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf8')
}

export async function listUrgentNowRequests() {
  const store = await readStore()
  return [...store.requests].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function createUrgentNowRequest(input: CreateUrgentNowRequestInput) {
  const next = createQueue.then(async () => {
    const now = new Date().toISOString()
    const { isWeekend } = getWarsawDateAndDay(new Date(now))
    if (isWeekend) throw new Error('URGENT_NOW_WEEKEND')
    const store = await readStore()
    const acceptedForTarget = countZapytajNowPaymentLinkRequestsForDate(store.requests, input.requestedDate)
    if (input.contactPreference === 'payment_link' && acceptedForTarget + (input.activeBookingCount ?? 0) >= URGENT_NOW_DAILY_LIMIT) throw new Error('URGENT_NOW_DAILY_LIMIT')
    const record: UrgentNowRequestRecord = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'new',
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    contactPreference: input.contactPreference,
    species: input.species,
    topicId: input.topicId,
    topicLabel: input.topicLabel,
    message: input.message,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
    respondedAt: null,
    proposedDate: null,
    proposedTime: null,
    responseNote: null,
    availabilitySlotId: null,
    bookingHref: null,
    }

    store.requests.unshift(record)
    await writeStore(store)
    return record
  })
  createQueue = next.then(() => undefined, () => undefined)
  return next
}

export async function respondUrgentNowRequest(input: RespondUrgentNowRequestInput) {
  const store = await readStore()
  const request = store.requests.find((item) => item.id === input.id)

  if (!request) {
    return null
  }

  const now = new Date().toISOString()
  request.status = 'responded'
  request.updatedAt = now
  request.respondedAt = now
  request.proposedDate = input.proposedDate
  request.proposedTime = input.proposedTime
  request.responseNote = input.responseNote ?? null
  request.availabilitySlotId = input.availabilitySlotId ?? null
  request.bookingHref = input.bookingHref ?? null

  await writeStore(store)
  return request
}

export async function markUrgentNoResponseSms(input: { id: string; status: 'sent' | 'failed' | 'skipped' }) {
  const next = createQueue.then(async () => {
    const store = await readStore()
    const request = store.requests.find((item) => item.id === input.id)
    if (!request || request.status !== 'new' || request.noResponseSmsStatus !== 'processing') return null
    request.noResponseSmsStatus = input.status
    request.noResponseSmsSentAt = input.status === 'sent' ? new Date().toISOString() : null
    request.updatedAt = new Date().toISOString()
    await writeStore(store)
    return request
  })
  createQueue = next.then(() => undefined, () => undefined)
  return next
}

export async function claimUrgentNoResponseSms(id: string) {
  const next = createQueue.then(async () => {
    const store = await readStore()
    const request = store.requests.find((item) => item.id === id)
    const staleProcessing = request?.noResponseSmsStatus === 'processing' && Date.now() - Date.parse(request.updatedAt) >= 5 * 60 * 1000
    if (!request || request.status !== 'new' || (request.noResponseSmsStatus && !staleProcessing)) return null
    request.noResponseSmsStatus = 'processing'
    request.updatedAt = new Date().toISOString()
    await writeStore(store)
    return request
  })
  createQueue = next.then(() => undefined, () => undefined)
  return next
}
