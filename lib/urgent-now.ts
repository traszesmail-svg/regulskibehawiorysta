import type { FunnelSpecies } from './funnel'
import type { ProblemType } from './types'

export const URGENT_NOW_INTENT = 'kwadrans-na-juz'

export type UrgentNowRequestStatus = 'new' | 'responded'

export type UrgentNowRequestRecord = {
  id: string
  createdAt: string
  updatedAt: string
  status: UrgentNowRequestStatus
  name: string
  email: string
  phone?: string | null
  species: FunnelSpecies
  topicId: ProblemType
  topicLabel: string
  message: string
  requestedDate: string
  requestedTime: string
  respondedAt?: string | null
  proposedDate?: string | null
  proposedTime?: string | null
  responseNote?: string | null
  availabilitySlotId?: string | null
  bookingHref?: string | null
}

export function isUrgentNowIntent(value: string | null | undefined) {
  return value?.trim().toLowerCase() === URGENT_NOW_INTENT
}

export type UrgentRequestedSlot = {
  date: string
  time: string
}

export type UrgentNowSlotCandidate = {
  id: string
  date: string
  time: string
}

const REQUESTED_SLOTS_PREFIX = 'Wybrane godziny na dziś:'
const URGENT_NOW_MAX_SLOTS = 5
const URGENT_NOW_SLOT_STEP_MINUTES = 30
const URGENT_NOW_LAST_SLOT_MINUTES = 18 * 60

function getWarsawDateAndMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function roundUpToNextUrgentSlot(minutes: number) {
  return Math.ceil(minutes / URGENT_NOW_SLOT_STEP_MINUTES) * URGENT_NOW_SLOT_STEP_MINUTES
}

export function buildTodayUrgentSlotCandidates(now = new Date()): UrgentNowSlotCandidate[] {
  const boundary = getWarsawDateAndMinutes(now)
  const startMinutes = roundUpToNextUrgentSlot(boundary.minutes)
  const slots: UrgentNowSlotCandidate[] = []

  for (
    let minutes = startMinutes;
    minutes <= URGENT_NOW_LAST_SLOT_MINUTES && slots.length < URGENT_NOW_MAX_SLOTS;
    minutes += URGENT_NOW_SLOT_STEP_MINUTES
  ) {
    const time = minutesToTime(minutes)
    slots.push({
      id: `${boundary.date}-${time}`,
      date: boundary.date,
      time,
    })
  }

  return slots
}

export function isTodayUrgentSlotCandidate(date: string | null | undefined, time: string | null | undefined, now = new Date()) {
  if (!date || !time) {
    return false
  }

  return buildTodayUrgentSlotCandidates(now).some((slot) => slot.date === date && slot.time === time)
}

export function formatUrgentRequestedSlot(slot: UrgentRequestedSlot) {
  return `${slot.date} ${slot.time}`
}

export function formatUrgentRequestedSlots(slots: UrgentRequestedSlot[]) {
  return slots.map(formatUrgentRequestedSlot).join('; ')
}

export function appendUrgentRequestedSlotsToMessage(message: string, slots: UrgentRequestedSlot[]) {
  const summary = formatUrgentRequestedSlots(slots)
  return `${REQUESTED_SLOTS_PREFIX} ${summary}\n\n${message.trim()}`
}

export function parseUrgentRequestedSlotsFromMessage(
  message: string,
  fallback?: UrgentRequestedSlot | null,
): UrgentRequestedSlot[] {
  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? ''
  const raw = firstLine.startsWith(REQUESTED_SLOTS_PREFIX)
    ? firstLine.slice(REQUESTED_SLOTS_PREFIX.length).trim()
    : ''

  const parsed = raw
    .split(';')
    .map((item) => item.trim())
    .map((item) => {
      const match = item.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/)
      return match ? { date: match[1], time: match[2] } : null
    })
    .filter((slot): slot is UrgentRequestedSlot => slot !== null)

  if (parsed.length > 0) {
    return parsed
  }

  return fallback ? [fallback] : []
}

export function stripUrgentRequestedSlotsFromMessage(message: string) {
  const lines = message.split(/\r?\n/)
  if (lines[0]?.trim().startsWith(REQUESTED_SLOTS_PREFIX)) {
    return lines.slice(1).join('\n').trim()
  }

  return message
}
