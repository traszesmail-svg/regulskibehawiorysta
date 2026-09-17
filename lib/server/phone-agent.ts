import { timingSafeEqual } from 'node:crypto'
import type { BookingRecord } from '@/lib/types'

export type PhoneCallProvider = 'manual_sim' | 'android_agent' | 'zadarma_fallback'

export type PhoneAgentCase = {
  id: string
  ownerName: string
  phone: string
  customerPhone?: string
  animalType: string
  problemType: string
  petAge: string
  durationNotes: string
  description: string
  bookingDate: string
  bookingTime: string
  serviceType: string | null
  consultationMode: string | null
  liveMode: boolean
  paymentStatus: string
  bookingStatus: string
  callStatus: string | null
  callLastError: string | null
  voiceBriefing: string
}

export function getPhoneCallProvider(): PhoneCallProvider {
  const value = process.env.PHONE_CALL_PROVIDER?.trim()
  if (value === 'android_agent' || value === 'zadarma_fallback') return value
  return 'manual_sim'
}

export function isAndroidPhoneAgentEnabled() {
  return getPhoneCallProvider() === 'android_agent'
}

export function hasValidPhoneAgentAuthorization(authorization: string | null) {
  const configured = process.env.PHONE_AGENT_TOKEN?.trim()
  const received = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!configured || !received) return false

  const expected = Buffer.from(configured)
  const actual = Buffer.from(received)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function toPhoneAgentCase(booking: BookingRecord): PhoneAgentCase {
  const animalInfo = booking.animalType ? `Zwierzak: ${booking.animalType}` : ''
  const ageInfo = booking.petAge ? `, wiek ${booking.petAge}` : ''
  const problemInfo = booking.problemType ? `. Problem: ${booking.problemType}` : ''
  const descInfo = booking.description ? `. Szczegóły: ${booking.description.slice(0, 160)}` : ''
  const voiceBriefing = `Rozmowa z opiekunem: ${booking.ownerName}. ${animalInfo}${ageInfo}${problemInfo}${descInfo}`.trim()

  const dialTarget = process.env.PHONE_AGENT_OPERATOR_DIAL_TARGET?.trim()
  const phone = dialTarget ? dialTarget : booking.phone

  return {
    id: booking.id,
    ownerName: booking.ownerName,
    phone,
    customerPhone: booking.phone,
    animalType: booking.animalType,
    problemType: booking.problemType,
    petAge: booking.petAge,
    durationNotes: booking.durationNotes,
    description: booking.description,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    serviceType: booking.serviceType ?? null,
    consultationMode: booking.consultationMode ?? null,
    liveMode: Boolean(booking.liveMode),
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    callStatus: booking.callStatus ?? null,
    callLastError: booking.callLastError ?? null,
    voiceBriefing,
  }
}

export function isPhoneAgentCandidate(booking: BookingRecord) {
  return booking.paymentStatus === 'paid' && booking.bookingStatus !== 'done' && booking.bookingStatus !== 'cancelled' && booking.bookingStatus !== 'expired'
}
