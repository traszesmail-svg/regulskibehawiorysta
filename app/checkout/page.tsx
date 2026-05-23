import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CommerceCheckoutActions } from '@/components/CommerceCheckoutActions'
import {
  PaymentReferenceCardTitle,
  PaymentReferenceLayout,
  type PaymentReferenceSummaryRow,
} from '@/components/PaymentReferenceLayout'
import { formatCommercePrice } from '@/lib/commerce'
import {
  getBookingServiceDurationLabel,
  getBookingServiceRoomAccessLabel,
  resolveBookingServiceType,
} from '@/lib/booking-services'
import { formatDateTimeLabel, getProblemLabel } from '@/lib/data'
import {
  createOrReuseConsultationCommerceOrder,
  isCommerceTestModeAllowed,
} from '@/lib/server/commerce-service'
import { getCommerceOrder } from '@/lib/server/commerce-store'
import { getBookingForViewer } from '@/lib/server/db'
import { getOnlinePaymentRuntime } from '@/lib/server/online-payments'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Wybierz metodę płatności',
    path: '/checkout',
    description: 'Wybierz płatność online albo BLIK na telefon.',
    noIndex: true,
    follow: false,
  })
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const orderNumber = readParam(searchParams?.orderNumber)
  const bookingId = readParam(searchParams?.bookingId)
  const access = readParam(searchParams?.access)
  const authorizationHeader = headers().get('authorization')

  if (!orderNumber && bookingId) {
    const order = await createOrReuseConsultationCommerceOrder(bookingId, access, authorizationHeader)
    redirect(`/checkout?orderNumber=${encodeURIComponent(order.orderNumber)}`)
  }

  const order = orderNumber ? await getCommerceOrder(orderNumber) : null
  const onlinePayment = getOnlinePaymentRuntime(order)
  const isConsultation = order?.productType === 'consultation'
  const consultationServiceType = resolveBookingServiceType(order?.meta.serviceType, order?.amount)
  const consultationBooking =
    order?.productType === 'consultation' && order.meta.bookingId
      ? await getBookingForViewer(order.meta.bookingId, order.meta.bookingAccessToken ?? access, authorizationHeader).catch(() => null)
      : null

  const summaryRows: PaymentReferenceSummaryRow[] = order
    ? isConsultation
      ? [
          {
            icon: 'calendar',
            label: 'Termin',
            value: consultationBooking
              ? formatDateTimeLabel(consultationBooking.bookingDate, consultationBooking.bookingTime)
              : 'Termin z rezerwacji',
          },
          {
            icon: 'form',
            label: 'Forma',
            value: getBookingServiceRoomAccessLabel(consultationServiceType),
          },
          {
            icon: 'problem',
            label: 'Problem',
            value: consultationBooking?.problemType
              ? getProblemLabel(consultationBooking.problemType)
              : order.meta.problemType ?? 'Temat konsultacji',
          },
          {
            icon: 'duration',
            label: 'Czas trwania',
            value: getBookingServiceDurationLabel(consultationServiceType),
          },
        ]
      : [
          {
            icon: 'order',
            label: 'Zamówienie',
            value: order.orderNumber,
          },
          {
            icon: 'receipt',
            label: 'Produkt',
            value: order.productName,
          },
          {
            icon: 'form',
            label: 'Dostęp',
            value: 'Kod po płatności',
          },
          {
            icon: 'duration',
            label: 'Wysyłka',
            value: 'Po potwierdzeniu',
          },
        ]
    : [
        {
          icon: 'order',
          label: 'Zamówienie',
          value: 'Nie znaleziono',
        },
        {
          icon: 'receipt',
          label: 'Produkt',
          value: 'Do sprawdzenia',
        },
        {
          icon: 'form',
          label: 'Płatność',
          value: 'Niedostępna',
        },
        {
          icon: 'duration',
          label: 'Status',
          value: 'Link wygasł',
        },
      ]

  return (
    <PaymentReferenceLayout
      title={isConsultation ? 'Ostatni krok do potwierdzenia konsultacji.' : 'Ostatni krok do dostępu do materiału.'}
      lead={
        isConsultation
          ? 'Wybierz BLIK na telefon albo płatność online kartą, Apple Pay lub Google Pay. Termin jest pewny po opłaceniu i potwierdzeniu płatności.'
          : 'Wybierz BLIK na telefon albo płatność online kartą, Apple Pay lub Google Pay. Po potwierdzeniu dostaniesz kod dostępu do materiału.'
      }
      heroImage={order?.meta.animalType === 'Kot' ? 'cat' : 'dog'}
      variant="compact"
      summaryRows={summaryRows}
      lineItemLabel={order?.productName ?? 'Zamówienie'}
      lineItemAmount={order ? formatCommercePrice(order.manualAmount) : 'Do ustalenia'}
      totalLabel={order ? 'BLIK na telefon' : undefined}
    >
      <div className="payment-ref-checkout-content">
        {!order ? (
          <div className="payment-ref-stack">
            <PaymentReferenceCardTitle title="Nie znaleziono zamówienia">
              Ten link do checkoutu jest nieprawidłowy albo wygasł.
            </PaymentReferenceCardTitle>
            <div className="error-box">Wróć do formularza albo napisz wiadomość, jeśli rezerwacja została już utworzona.</div>
            <div className="payment-ref-button-row">
              <Link href="/kontakt#formularz" className="payment-ref-submit">
                Opisz krótko, co się dzieje
              </Link>
            </div>
          </div>
        ) : (
          <>
            <PaymentReferenceCardTitle title={`Płatność za ${isConsultation ? 'konsultację' : 'zamówienie'}`}>
              Zamówienie {order.orderNumber}. Wybierz metodę płatności i dokończ rezerwację bez publicznego numeru telefonu.
            </PaymentReferenceCardTitle>
            <CommerceCheckoutActions
              orderNumber={order.orderNumber}
              productName={order.productName}
              onlineAmount={order.onlineAmount}
              manualAmount={order.manualAmount}
              onlinePayment={onlinePayment}
              testModeAllowed={isCommerceTestModeAllowed()}
            />
          </>
        )}
      </div>
    </PaymentReferenceLayout>
  )
}
