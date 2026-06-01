import type { BookingServiceType } from './booking-services'

export type DogProblemType = 'szczeniak' | 'separacja' | 'spacer' | 'pobudzenie' | 'agresja'

export type PublicCatProblemType =
  | 'kot-kuweta'
  | 'kot-wycofanie'
  | 'kot-konflikt'
  | 'kot-zmiany-w-domu'
  | 'kot-wokalizacja'

export type LegacyCatProblemType = 'kot-dotyk' | 'kot-stres' | 'kot-nocna-wokalizacja'

export type CatProblemType = PublicCatProblemType | LegacyCatProblemType

export type ProblemType = DogProblemType | CatProblemType | 'inne'

export type AnimalType = 'Pies' | 'Kot'

export type BookingStatus = 'pending' | 'pending_manual_payment' | 'confirmed' | 'done' | 'cancelled' | 'expired'

export type PaymentStatus = 'unpaid' | 'pending_manual_review' | 'paid' | 'failed' | 'rejected' | 'refunded'

export type PaymentMethod = 'manual' | 'payu' | 'stripe' | 'mock' | 'promo'

export type FunnelEventType =
  | 'page_view'
  | 'view_page'
  | 'funnel_entry_15_min'
  | 'funnel_entry_60_min'
  | 'newsletter_signup'
  | 'lead_magnet_signup'
  | 'booking_start'
  | 'booking_service_selected'
  | 'booking_slot_selected'
  | 'booking_form_started'
  | 'booking_form_submitted'
  | 'payment_viewed'
  | 'payment_marked_pending'
  | 'payment_completed'
  | 'booking_confirmed'
  | 'booking_drop'
  | 'confirmation_viewed'
  | 'call_room_viewed'
  | 'contact_form_started'
  | 'contact_form_submitted'
  | 'hero_cta_click'
  | 'service_select'
  | 'slot_select'
  | 'form_start'
  | 'form_submit'
  | 'payment_start'
  | 'payment_reported'
  | 'payment_confirmed'
  | 'home_view'
  | 'dogs_page_view'
  | 'cta_click'
  | 'topic_selected'
  | 'slot_selected'
  | 'form_started'
  | 'payment_opened'
  | 'manual_pending'
  | 'paid'
  | 'confirmed'
  | 'reject_cancel'
  | 'payment_started'
  | 'payment_success'
  | 'payment_failed'
  | 'faq_open'
  | 'opinion_add'
  | 'room_entered'
  | 'quiz_completed'
  | 'notification_optin_submitted'
  | 'notification_optout_submitted'

export type FunnelEventSource = 'client' | 'server'

export type FunnelEventProperties = Record<string, string | number | boolean | null>

export interface FunnelEventInput {
  eventType: FunnelEventType
  bookingId?: string | null
  qaBooking?: boolean
  source?: FunnelEventSource
  pagePath?: string | null
  location?: string | null
  properties?: FunnelEventProperties
  createdAt?: string
}

export interface FunnelEventRecord {
  id: string
  eventType: FunnelEventType
  bookingId?: string | null
  qaBooking: boolean
  source: FunnelEventSource
  pagePath?: string | null
  location?: string | null
  properties: FunnelEventProperties
  createdAt: string
}

export type SmsConfirmationStatus =
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped_missing_phone'
  | 'skipped_invalid_phone'
  | 'skipped_not_configured'

export interface ProblemOption {
  id: ProblemType
  icon: string
  title: string
  desc: string
  marketingTitle?: string
  marketingDesc?: string
  examples?: string[]
  visualLabel?: string
}

export interface AvailabilitySeed {
  date: string
  times: string[]
}

export interface AvailabilitySlot {
  id: string
  bookingDate: string
  bookingTime: string
  isBooked: boolean
  lockedByBookingId?: string | null
  lockedUntil?: string | null
  createdAt: string
  updatedAt: string
}

export interface BookingFormData {
  ownerName: string
  serviceType?: BookingServiceType
  problemType: ProblemType
  animalType: AnimalType
  petAge: string
  durationNotes: string
  description: string
  phone?: string | null
  email: string
  slotId: string
  qaBooking?: boolean
}

export interface UserRecord {
  id: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface BookingRecord {
  id: string
  userId?: string | null
  customerAccessTokenHash?: string | null
  ownerName: string
  serviceType?: BookingServiceType
  problemType: ProblemType
  animalType: AnimalType
  petAge: string
  durationNotes: string
  description: string
  phone: string
  email: string
  bookingDate: string
  bookingTime: string
  slotId: string
  qaBooking?: boolean
  amount: number
  bookingStatus: BookingStatus
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod | null
  paymentReference?: string | null
  meetingUrl: string
  createdAt: string
  updatedAt: string
  paidAt?: string | null
  paymentReportedAt?: string | null
  paymentRejectedAt?: string | null
  paymentRejectedReason?: string | null
  cancelledAt?: string | null
  expiredAt?: string | null
  refundedAt?: string | null
  checkoutSessionId?: string | null
  paymentIntentId?: string | null
  payuOrderId?: string | null
  payuOrderStatus?: string | null
  customerPhoneNormalized?: string | null
  smsConfirmationStatus?: SmsConfirmationStatus | null
  smsConfirmationSentAt?: string | null
  smsProviderMessageId?: string | null
  smsErrorCode?: string | null
  smsErrorMessage?: string | null
  recommendedNextStep?: string | null
  reminderSent?: boolean
  prepVideoPath?: string | null
  prepVideoFilename?: string | null
  prepVideoSizeBytes?: number | null
  prepLinkUrl?: string | null
  prepNotes?: string | null
  prepUploadedAt?: string | null
}

export interface BookingCreateResult {
  booking: BookingRecord
  slot: AvailabilitySlot
  accessToken: string
}

export interface QaCheckoutEligibility {
  isAllowed: boolean
  reason: string | null
  summary: string
  paymentReference: string
}

export interface BookingPreparationPatch {
  prepVideoPath?: string | null
  prepVideoFilename?: string | null
  prepVideoSizeBytes?: number | null
  prepLinkUrl?: string | null
  prepNotes?: string | null
  prepUploadedAt?: string | null
}

export interface GroupedAvailability {
  date: string
  label: string
  slots: AvailabilitySlot[]
}
