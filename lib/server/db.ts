import { getAdminAccessSecret, hasValidAdminAuthorization } from '@/lib/admin-auth'
import type { UrgentNowRequestRecord } from '@/lib/urgent-now'
import * as localStore from '@/lib/server/local-store'
import { reportRuntimeModeUsage, resolveDataMode } from '@/lib/server/env'
import * as supabaseStore from '@/lib/server/supabase-store'
import { getLeadBookingById, updateLeadBooking } from '@/lib/server/lead-bookings'
import type { BookingRecord } from '@/lib/types'

type StoreProvider = typeof localStore

function getProvider(): StoreProvider {
  reportRuntimeModeUsage()

  return resolveDataMode('booking, availability i admin data layer') === 'supabase'
    ? supabaseStore
    : localStore
}

export async function listAvailability() {
  return getProvider().listAvailability()
}

export async function getActiveConsultationPrice() {
  return getProvider().getActiveConsultationPrice()
}

export async function updateActiveConsultationPrice(amount: number) {
  return getProvider().updateActiveConsultationPrice(amount)
}

export async function listAvailabilityAdmin() {
  return getProvider().listAvailabilityAdmin()
}

export async function getAvailabilitySlot(slotId: string) {
  return getProvider().getAvailabilitySlot(slotId)
}

export async function createAvailabilitySlot(bookingDate: string, bookingTime: string) {
  return getProvider().createAvailabilitySlot(bookingDate, bookingTime)
}

export async function deleteAvailabilitySlot(slotId: string) {
  return getProvider().deleteAvailabilitySlot(slotId)
}

export async function createPendingBooking(form: Parameters<StoreProvider['createPendingBooking']>[0]) {
  return getProvider().createPendingBooking(form)
}

export async function getBookingById(id: string) {
  return getProvider().getBookingById(id)
}

export async function getBookingByCustomerAccess(id: string, accessToken: string) {
  return getProvider().getBookingByCustomerAccess(id, accessToken)
}

function mapLeadBookingToBookingRecord(lead: any): BookingRecord {
  return {
    id: lead.id,
    ownerName: lead.name,
    serviceType: lead.service,
    problemType: 'inne',
    animalType: lead.species === 'kot' ? 'Kot' : 'Pies',
    petAge: '',
    durationNotes: lead.preferredSlots,
    description: lead.description,
    phone: lead.phone ?? '',
    email: lead.email,
    bookingDate: lead.confirmedDate ?? '',
    bookingTime: lead.confirmedTime ?? '',
    slotId: '',
    amount: parseFloat(lead.servicePrice) || 0,
    bookingStatus: lead.status === 'paid' ? 'confirmed' : 'pending',
    paymentStatus: lead.status === 'paid' ? 'paid' : 'unpaid',
    meetingUrl: lead.callRoomUrl ?? '',
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    callId: lead.callId ?? null,
    callStatus: lead.callStatus ?? null,
    startedAt: lead.startedAt ?? null,
    questionsRemaining: lead.questionsRemaining ?? null,
  }
}

export async function getBookingForViewer(
  id: string,
  accessToken?: string | null,
  authorizationHeader?: string | null,
) {
  const adminSecret = getAdminAccessSecret()

  if (adminSecret && hasValidAdminAuthorization(authorizationHeader ?? null, adminSecret)) {
    const b = await getBookingById(id)
    if (b) return b
    const lb = await getLeadBookingById(id)
    if (lb) return mapLeadBookingToBookingRecord(lb)
    return null
  }

  const booking = await getBookingById(id)

  if (!booking) {
    const leadBooking = await getLeadBookingById(id)
    if (!leadBooking) {
      return null
    }
    if (leadBooking.accessToken === accessToken) {
      return mapLeadBookingToBookingRecord(leadBooking)
    }
    return null
  }

  if (!booking.customerAccessTokenHash) {
    return booking
  }

  if (!accessToken) {
    return null
  }

  return getBookingByCustomerAccess(id, accessToken)
}

export async function listBookings() {
  return getProvider().listBookings()
}

export async function listFunnelEvents() {
  return getProvider().listFunnelEvents()
}

export async function listUrgentNowRequests(): Promise<UrgentNowRequestRecord[]> {
  return getProvider().listUrgentNowRequests()
}

export async function createUrgentNowRequest(input: Parameters<StoreProvider['createUrgentNowRequest']>[0]) {
  return getProvider().createUrgentNowRequest(input)
}

export async function respondUrgentNowRequest(input: Parameters<StoreProvider['respondUrgentNowRequest']>[0]) {
  return getProvider().respondUrgentNowRequest(input)
}

export async function recordFunnelEvent(
  input: Parameters<StoreProvider['recordFunnelEvent']>[0],
) {
  return getProvider().recordFunnelEvent(input)
}

export async function updateBookingPreparation(
  bookingId: string,
  patch: Parameters<StoreProvider['updateBookingPreparation']>[1],
) {
  return getProvider().updateBookingPreparation(bookingId, patch)
}

export async function attachCheckoutSession(bookingId: string, checkoutSessionId: string) {
  return getProvider().attachCheckoutSession(bookingId, checkoutSessionId)
}

export async function updateBookingCallState(
  bookingId: string,
  patch: Parameters<StoreProvider['updateBookingCallState']>[1],
) {
  return getProvider().updateBookingCallState(bookingId, patch)
}
export async function attachPayuOrder(
  bookingId: string,
  paymentData: Parameters<StoreProvider['attachPayuOrder']>[1],
) {
  return getProvider().attachPayuOrder(bookingId, paymentData)
}

export async function markBookingManualPaymentPending(
  bookingId: string,
  paymentData?: Parameters<StoreProvider['markBookingManualPaymentPending']>[1],
) {
  return getProvider().markBookingManualPaymentPending(bookingId, paymentData)
}

export async function markBookingClinicPhoneUpgrade(bookingId: string, phone: string) {
  return getProvider().markBookingClinicPhoneUpgrade(bookingId, phone)
}

export async function markBookingPaid(
  bookingId: string,
  paymentData?: Parameters<StoreProvider['markBookingPaid']>[1],
) {
  return getProvider().markBookingPaid(bookingId, paymentData)
}

export async function markBookingPaymentFailed(bookingId: string) {
  return getProvider().markBookingPaymentFailed(bookingId)
}

export async function markBookingManualPaymentRejected(bookingId: string, reason?: string) {
  return getProvider().markBookingManualPaymentRejected(bookingId, reason)
}

export async function markBookingRefunded(bookingId: string) {
  return getProvider().markBookingRefunded(bookingId)
}

export async function markBookingExpired(bookingId: string) {
  return getProvider().markBookingExpired(bookingId)
}

export async function markBookingDone(bookingId: string, recommendedNextStep?: string) {
  return getProvider().markBookingDone(bookingId, recommendedNextStep)
}

export async function markBookingReminderSent(bookingId: string) {
  return getProvider().markBookingReminderSent(bookingId)
}

export async function updateBookingQuiz(
  bookingId: string,
  patch: { petAge?: string; durationNotes?: string; description?: string; questionsRemaining?: number | null },
): Promise<BookingRecord | null> {
  const b = await getBookingById(bookingId)
  if (b) {
    return (getProvider() as any).updateBookingQuiz(bookingId, patch)
  }
  const lb = await getLeadBookingById(bookingId)
  if (lb) {
    const updatePayload: any = {}
    if (patch.durationNotes !== undefined) {
      updatePayload.preferredSlots = patch.durationNotes
    }
    if (patch.description !== undefined) {
      updatePayload.description = patch.description
    }
    if (patch.questionsRemaining !== undefined) {
      updatePayload.questionsRemaining = patch.questionsRemaining
    }
    const updatedLb = await updateLeadBooking({ id: bookingId, ...updatePayload })
    if (updatedLb) {
      return mapLeadBookingToBookingRecord(updatedLb)
    }
  }
  return null
}
