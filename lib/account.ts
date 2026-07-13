import type { BookingStatus, PaymentStatus } from '@/lib/types'
import type { CommerceOrderStatus, CommerceProductType } from '@/lib/commerce'

export type AccountPetSpecies = 'pies' | 'kot'

export type AccountProfile = {
  userId: string
  email: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export type AccountPet = {
  id: string
  name: string
  species: AccountPetSpecies
  age: string
  behaviorNotes: string
  photoPath: string | null
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export type AccountBookingSummary = {
  id: string
  source: 'booking' | 'lead_booking'
  title: string
  species: string
  description: string
  dateLabel: string
  statusLabel: string
  paymentLabel: string
  meetingUrl: string | null
  paymentUrl: string | null
  createdAt: string
  callId: string | null
  callStatus: string | null
  startedAt: string | null
  questionsRemaining: number | null
  serviceType: string | null
  supportEndsAt: string | null
}

export type AccountMaterialSummary = {
  orderNumber: string
  productName: string
  productType: CommerceProductType
  status: CommerceOrderStatus
  statusLabel: string
  accessUrl: string | null
  createdAt: string
}

export type AccountAttachment = {
  id: string
  fileName: string
  fileType: string
  fileSizeBytes: number
  storagePath: string
  signedUrl: string | null
  createdAt: string
}

export type AccountMessage = {
  id: string
  sender: 'customer' | 'specialist' | 'system'
  body: string
  attachments: AccountAttachment[]
  createdAt: string
}

export type AccountConversation = {
  id: string
  subject: string
  status: 'open' | 'closed'
  petId: string | null
  bookingId: string | null
  messages: AccountMessage[]
  createdAt: string
  updatedAt: string
}

export type AccountTimelineEvent = {
  id: string
  type: 'booking' | 'lead_booking' | 'material' | 'message' | 'pet'
  title: string
  description: string
  href: string | null
  createdAt: string
}

export type AccountHomePayload = {
  profile: AccountProfile
  pets: AccountPet[]
  bookings: AccountBookingSummary[]
  materials: AccountMaterialSummary[]
  conversations: AccountConversation[]
  timeline: AccountTimelineEvent[]
}

export function getBookingStatusLabel(status: BookingStatus | string) {
  switch (status) {
    case 'pending':
      return 'oczekuje'
    case 'pending_manual_payment':
      return 'czeka na potwierdzenie platnosci'
    case 'confirmed':
      return 'potwierdzona'
    case 'done':
      return 'zakonczona'
    case 'cancelled':
      return 'anulowana'
    case 'expired':
      return 'wygasla'
    default:
      return 'status w toku'
  }
}

export function getPaymentStatusLabel(status: PaymentStatus | string) {
  switch (status) {
    case 'unpaid':
      return 'nieoplacona'
    case 'pending_manual_review':
      return 'platnosc zgloszona'
    case 'paid':
      return 'oplacona'
    case 'failed':
      return 'platnosc nieudana'
    case 'rejected':
      return 'platnosc odrzucona'
    case 'refunded':
      return 'zwrocona'
    default:
      return 'platnosc w toku'
  }
}

export function getCommerceStatusLabel(status: CommerceOrderStatus) {
  switch (status) {
    case 'created':
      return 'utworzone'
    case 'waiting_manual_payment':
      return 'czeka na platnosc'
    case 'payment_reported':
      return 'platnosc zgloszona'
    case 'paid':
      return 'oplacone'
    case 'access_sent':
      return 'dostep aktywny'
    case 'cancelled':
      return 'anulowane'
    case 'expired':
      return 'wygasle'
    default:
      return 'w toku'
  }
}
