import type { BookingServiceType } from '@/lib/booking-services'
import type { CommerceOrder } from '@/lib/commerce'

export type OnlinePaymentProvider = 'stripe' | 'none'

export type OnlinePaymentRuntime = {
  provider: OnlinePaymentProvider
  available: boolean
  label: string
  buttonLabel: string
  description: string
  unavailableMessage: string
}

function hasStripeSecretKey(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

function getStripeRuntime(): OnlinePaymentRuntime {
  return {
    provider: 'stripe',
    available: true,
    label: 'Karta / Apple Pay / Google Pay',
    buttonLabel: 'Zapłać online',
    description: 'Karta oraz portfele Apple Pay i Google Pay, gdy urządzenie i przeglądarka je udostępniają.',
    unavailableMessage: '',
  }
}

function getUnavailableRuntime(description: string): OnlinePaymentRuntime {
  return {
    provider: 'none',
    available: false,
    label: 'Płatność online',
    buttonLabel: 'Zapłać online',
    description,
    unavailableMessage:
      'Płatność kartą, Apple Pay i Google Pay jest chwilowo niedostępna. Użyj BLIK po instrukcji e-mail.',
  }
}

export function getOnlinePaymentRuntimeForClinicPhoneUpgrade(): OnlinePaymentRuntime {
  if (hasStripeSecretKey()) return getStripeRuntime()

  return getUnavailableRuntime('Płatność online dla dopłaty telefonicznej jest chwilowo niedostępna.')
}

export function getOnlinePaymentRuntimeForConsultation(_serviceType: BookingServiceType): OnlinePaymentRuntime {
  return getOnlinePaymentRuntime(null)
}

export function getOnlinePaymentRuntime(_order?: CommerceOrder | null): OnlinePaymentRuntime {
  if (hasStripeSecretKey()) return getStripeRuntime()

  return getUnavailableRuntime('Płatność online będzie dostępna po dodaniu konfiguracji Stripe.')
}
