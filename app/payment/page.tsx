import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { headers } from 'next/headers'
import { AnalyticsEventOnMount } from '@/components/AnalyticsEventOnMount'
import { getBookingAnalyticsContextParams } from '@/lib/analytics-schema'
import { CustomerEmailStatusNotice } from '@/components/CustomerEmailStatusNotice'
import { PaymentActions } from '@/components/PaymentActions'
import { formatCommercePrice, getManualAmountForProduct } from '@/lib/commerce'
import {
  PaymentReferenceCardTitle,
  PaymentReferenceInlineLink,
  PaymentReferenceLayout,
  type PaymentReferenceSummaryRow,
} from '@/components/PaymentReferenceLayout'
import {
  getBookingServiceDurationLabel,
  getBookingServiceRoomAccessLabel,
  getBookingServiceRoomSummary,
  getBookingServiceTitle,
  resolveBookingServiceType,
} from '@/lib/booking-services'
import { buildBookHref, buildSlotHref, readQaBookingSearchParam, readSearchParam } from '@/lib/booking-routing'
import { formatDateTimeLabel, getProblemLabel } from '@/lib/data'
import { getManualPaymentDisplayCopy } from '@/lib/manual-payment'
import { formatPricePln } from '@/lib/pricing'
import { getBookingForViewer } from '@/lib/server/db'
import { getDataModeStatus, getPublicFeatureUnavailableMessage } from '@/lib/server/env'
import { getCustomerEmailDeliveryStatus } from '@/lib/server/notifications'
import {
  getManualPaymentReference,
  getPublicManualPaymentConfig,
  getQaCheckoutEligibility,
} from '@/lib/server/payment-options'
import { getOnlinePaymentRuntime, getOnlinePaymentRuntimeForConsultation } from '@/lib/server/online-payments'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Płatność i potwierdzenie',
    path: '/payment',
    description: 'Opłać rezerwację ręcznie i przejdź do potwierdzenia statusu.',
    noIndex: true,
    follow: false,
  })
}

function PaymentDetailsDisclosure({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <details className="payment-ref-disclosure">
      <summary>{title}</summary>
      <div className="payment-ref-disclosure-body">{children}</div>
    </details>
  )
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  noStore()
  const bookingId = readSearchParam(searchParams?.bookingId)
  const accessToken = readSearchParam(searchParams?.access)
  const cancelled = readSearchParam(searchParams?.cancelled)
  const qaBookingHint = readQaBookingSearchParam(searchParams?.qa)
  const dataMode = getDataModeStatus()
  const authorizationHeader = headers().get('authorization')
  const manualPayment = getPublicManualPaymentConfig()
  const manualPaymentCopy = getManualPaymentDisplayCopy({
    phoneDisplay: manualPayment.phoneDisplay,
  })
  let booking: Awaited<ReturnType<typeof getBookingForViewer>> = null
  let flowError: string | null = null

  if (!dataMode.isValid) {
    flowError = getPublicFeatureUnavailableMessage('payment')
  } else if (bookingId) {
    try {
      booking = await getBookingForViewer(bookingId, accessToken, authorizationHeader)
    } catch (error) {
      console.warn('[regulski-behawiorysta][payment] failed to load booking', error)
      flowError = 'Nie udało się wczytać rezerwacji do płatności. Spróbuj ponownie za moment.'
    }
  }

  const qaBooking = Boolean(booking?.qaBooking ?? qaBookingHint)
  const qaEligibility = booking ? getQaCheckoutEligibility(booking) : null

  if (!flowError && qaBooking && qaEligibility && !qaEligibility.isAllowed) {
    flowError = qaEligibility.reason ?? qaEligibility.summary
  }

  const bookingPriceLabel = booking ? formatPricePln(booking.amount) : null
  const bookingManualPriceLabel = booking ? formatCommercePrice(getManualAmountForProduct('consultation', booking.amount)) : null
  const bookingServiceType = booking ? resolveBookingServiceType(booking.serviceType, booking.amount) : null
  const onlinePayment = bookingServiceType
    ? getOnlinePaymentRuntimeForConsultation(bookingServiceType)
    : getOnlinePaymentRuntime(null)
  const bookingServiceTitle = bookingServiceType ? getBookingServiceTitle(bookingServiceType) : null
  const bookingServiceSummary = bookingServiceType ? getBookingServiceRoomSummary(bookingServiceType) : null
  const roomAccessLabel = bookingServiceType ? getBookingServiceRoomAccessLabel(bookingServiceType) : 'pokój rozmowy'
  const quickAudioHref = buildBookHref(null, 'szybka-konsultacja-15-min', qaBooking)
  const customerEmailStatus = booking ? getCustomerEmailDeliveryStatus(booking.email) : null
  const customerEmailAvailable = customerEmailStatus?.state === 'ready'
  const isConfirmed = booking?.paymentStatus === 'paid' && (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done')
  const isWaitingManual = booking?.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review'
  const isClosed =
    booking?.bookingStatus === 'cancelled' ||
    booking?.bookingStatus === 'expired' ||
    booking?.paymentStatus === 'failed' ||
    booking?.paymentStatus === 'rejected'

  const postPaymentMaterialsCopy = qaBooking
    ? 'To jest rezerwacja testowa. Po potwierdzeniu zobaczysz standardowe potwierdzenie bez realnej płatności.'
    : isConfirmed
      ? 'Na ekranie potwierdzenia możesz od razu dodać materiały do sprawy.'
      : isWaitingManual
        ? 'Dodawanie materiałów odblokuje się od razu po potwierdzeniu wpłaty.'
        : isClosed
          ? 'Dodawanie materiałów nie jest dostępne dla zamkniętej rezerwacji.'
          : 'Po opłaceniu możesz dodać nagranie MP4, link do materiału albo krótki opis sytuacji.'

  const heroLead = qaBooking
    ? 'Ta rezerwacja jest testowa i przejdzie przez bezpieczną ścieżkę bez realnego obciążenia klienta.'
    : isWaitingManual
      ? `Wpłata jest już zgłoszona. Potwierdzimy ją ręcznie w godzinach obsługi. Po zmianie statusu zobaczysz ${roomAccessLabel} i dalszą instrukcję.`
      : manualPayment.isAvailable
        ? onlinePayment.available
          ? `Termin jest wstępnie zablokowany na czas płatności. Wybierz BLIK po instrukcji e-mail albo płatność online; po potwierdzeniu wpłaty rezerwacja staje się pewna.`
          : 'Termin jest wstępnie zablokowany na czas płatności. Wybierz BLIK po instrukcji e-mail. Płatność online jest chwilowo niedostępna.'
        : 'Płatność jest chwilowo niedostępna. Opisz krótko, co się dzieje, i wróć do rezerwacji później.'

  const paymentSummaryRows: PaymentReferenceSummaryRow[] = booking
    ? [
        {
          icon: 'calendar',
          label: 'Termin',
          value: formatDateTimeLabel(booking.bookingDate, booking.bookingTime),
        },
        {
          icon: 'form',
          label: 'Forma',
          value: roomAccessLabel,
        },
        {
          icon: 'problem',
          label: 'Problem',
          value: getProblemLabel(booking.problemType),
        },
        {
          icon: 'duration',
          label: 'Czas trwania',
          value: bookingServiceType ? getBookingServiceDurationLabel(bookingServiceType) : '15 minut',
        },
      ]
    : [
        {
          icon: 'calendar',
          label: 'Termin',
          value: 'Link do rezerwacji',
        },
        {
          icon: 'form',
          label: 'Forma',
          value: 'Rozmowa audio online',
        },
        {
          icon: 'problem',
          label: 'Problem',
          value: 'Do sprawdzenia',
        },
        {
          icon: 'duration',
          label: 'Czas trwania',
          value: '15-30 minut',
        },
      ]

  const heroTitle = qaBooking
    ? 'Bezpieczny test płatności.'
    : isWaitingManual
      ? 'Czekamy na potwierdzenie wpłaty.'
      : 'Płatność i potwierdzenie terminu.'

  return (
    <PaymentReferenceLayout
      title={heroTitle}
      lead={heroLead}
      heroImage={booking?.animalType === 'Kot' ? 'cat' : 'dog'}
      variant="compact"
      summaryRows={paymentSummaryRows}
      lineItemLabel={bookingServiceTitle ?? 'Konsultacja behawioralna'}
      lineItemAmount={bookingManualPriceLabel ?? bookingPriceLabel ?? 'Do ustalenia'}
      totalLabel={bookingManualPriceLabel ? 'BLIK po instrukcji' : undefined}
    >
      <div
        data-payment-state={
            qaBooking
              ? 'qa-checkout'
              : isConfirmed
                ? 'confirmed'
                : isWaitingManual
                  ? 'pending-manual-review'
                  : isClosed
                    ? 'closed'
                    : 'payment-selection'
          }
        data-analytics-disabled={qaBooking ? 'true' : undefined}
        data-qa-booking={qaBooking ? 'true' : 'false'}
        data-customer-email-state={customerEmailStatus?.state ?? 'unknown'}
      >
        {booking && !flowError ? (
          <AnalyticsEventOnMount
            eventName="payment_viewed"
            params={{
              booking_id: booking.id,
              payment_status: booking.paymentStatus,
              qa_booking: qaBooking,
              source_page: '/payment',
              ...getBookingAnalyticsContextParams({
                serviceType: bookingServiceType ?? 'szybka-konsultacja-15-min',
                quickConsultationPrice: booking.amount,
                animalType: booking.animalType,
                problemType: booking.problemType,
                bookingStatus: booking.bookingStatus,
                paymentMode: booking.paymentMethod ?? 'unknown',
              }),
            }}
          />
        ) : null}

        <PaymentReferenceCardTitle
          title={qaBooking ? 'Kontrolowany test płatności' : isWaitingManual ? 'Wpłata została zgłoszona' : 'Wybierz płatność'}
        >
          {qaBooking
            ? 'To kontrolowana ścieżka testowa bez realnego obciążenia.'
            : onlinePayment.available
              ? 'BLIK po instrukcji e-mail jest najtańszy, bo nie przechodzi przez prowizyjnego pośrednika. Karta, Apple Pay i Google Pay są dostępne jako płatność online. Jeśli płatność nie zostanie potwierdzona w czasie blokady, termin wróci do kalendarza.'
              : 'BLIK po instrukcji e-mail jest najtańszy, bo nie przechodzi przez prowizyjnego pośrednika. Płatność online jest chwilowo niedostępna. Jeśli płatność nie zostanie potwierdzona w czasie blokady, termin wróci do kalendarza.'}
        </PaymentReferenceCardTitle>

        {flowError ? (
          <div className="payment-ref-stack">
            <div className="error-box">
              {flowError}{' '}
              {qaBooking
                ? 'To jest rezerwacja testowa. Sprawdź TEST_CHECKOUT_ENABLED, allowlistę kontaktu albo użyj akcji „Potwierdź QA” w panelu admina.'
                : 'Jeśli chcesz, przejdź do krótkiej wiadomości i wróć do rezerwacji później.'}
            </div>
            <div className="payment-ref-button-row">
              <Link href={quickAudioHref} className="payment-ref-secondary-button">
                Wróć do rezerwacji
              </Link>
              <Link href="/kontakt#formularz" className="payment-ref-secondary-button">
                Opisz krótko, co się dzieje
              </Link>
            </div>
          </div>
        ) : !booking ? (
          <div className="payment-ref-stack">
            <div className="error-box">Ten link do płatności jest nieprawidłowy albo wygasł. Wróć do wyboru tematu albo użyj krótkiej wiadomości.</div>
            <div className="payment-ref-button-row">
              <Link href={quickAudioHref} className="payment-ref-secondary-button">
                Wróć do tematów
              </Link>
              <Link href="/kontakt#formularz" className="payment-ref-secondary-button">
                Opisz krótko, co się dzieje
              </Link>
            </div>
          </div>
        ) : (
          <>
            {cancelled ? <div className="info-box top-gap">Ten etap płatności został przerwany. Możesz wrócić do płatności i dokończyć rezerwację później.</div> : null}

            {isClosed ? (
              <div className="error-box top-gap">
                {booking.paymentStatus === 'rejected'
                  ? booking.paymentRejectedReason ?? 'Nie znaleziono wpłaty dla tej rezerwacji.'
                  : 'Ta rezerwacja nie jest już aktywna. Termin wrócił do kalendarza.'}
              </div>
            ) : null}

            {isConfirmed ? (
              <div className="payment-ref-submit-row">
                <Link
                  href={`/confirmation?bookingId=${booking.id}${accessToken ? `&access=${encodeURIComponent(accessToken)}` : ''}${qaBooking ? '&qa=1' : ''}`}
                  className="payment-ref-submit"
                >
                  Zobacz potwierdzenie
                </Link>
              </div>
            ) : isWaitingManual ? (
              <div className="payment-ref-stack">
                <div className="info-box">
                  Zgłoszenie wpłaty jest zapisane pod tytułem <strong>{booking.paymentReference ?? getManualPaymentReference(booking.id)}</strong>.{' '}
                  {customerEmailAvailable
                    ? `Po potwierdzeniu wyślemy link do ${roomAccessLabel} na adres ${booking.email}.`
                    : `Po potwierdzeniu pokażemy link do ${roomAccessLabel} bezpośrednio na stronie potwierdzenia.`}
                </div>
                <div className="payment-ref-button-row">
                  <Link
                    href={`/confirmation?bookingId=${booking.id}${accessToken ? `&access=${encodeURIComponent(accessToken)}` : ''}&manual=reported${qaBooking ? '&qa=1' : ''}`}
                    className="payment-ref-submit"
                  >
                    Odśwież status
                  </Link>
                  <Link
                    href={`/kontakt?service=${encodeURIComponent(bookingServiceType ?? 'szybka-konsultacja-15-min')}&intent=reschedule&bookingId=${encodeURIComponent(booking.id)}#formularz`}
                    className="payment-ref-secondary-button"
                  >
                    Zgłoś zmianę terminu
                  </Link>
                </div>
              </div>
            ) : isClosed ? (
              <div className="payment-ref-button-row">
                <Link href={buildSlotHref(booking.problemType, bookingServiceType, qaBooking)} prefetch={false} className="button button-primary big-button">
                  Wybierz nowy termin
                </Link>
                <Link href="/kontakt#formularz" className="payment-ref-secondary-button">
                  Opisz krótko, co się dzieje
                </Link>
              </div>
            ) : (
              <PaymentActions
                  bookingId={booking.id}
                  accessToken={accessToken ?? ''}
                  amountLabel={bookingPriceLabel ?? ''}
                  manualAmountLabel={bookingManualPriceLabel}
                  paymentReference={
                    booking.paymentReference ??
                    (qaBooking ? qaEligibility?.paymentReference ?? getQaCheckoutEligibility(booking).paymentReference : getManualPaymentReference(booking.id))
                  }
                  manualAvailable={manualPayment.isAvailable}
                  onlinePayment={onlinePayment}
                  manualPhoneDisplay={manualPayment.phoneDisplay}
                  manualAccountName={manualPayment.accountName}
                  manualInstructions={manualPayment.instructions}
                  manualSummary={manualPayment.summary}
                  customerEmailAvailable={customerEmailAvailable}
                  serviceType={bookingServiceType ?? 'szybka-konsultacja-15-min'}
                  amount={booking.amount}
                  animalType={booking.animalType}
                  problemType={booking.problemType}
                  bookingStatus={booking.bookingStatus}
                  qaBooking={qaBooking}
                  qaEligibility={qaEligibility}
                  roomAccessLabel={roomAccessLabel}
                />
            )}

            <div className="payment-ref-disclosures" aria-label="Szczegóły płatności i rezerwacji">
              {!qaBooking && customerEmailStatus && !isClosed ? (
                <PaymentDetailsDisclosure title="Potwierdzenie e-mail">
                  <CustomerEmailStatusNotice
                    status={customerEmailStatus}
                    recipientEmail={booking.email}
                    context="payment"
                  />
                </PaymentDetailsDisclosure>
              ) : null}

              <PaymentDetailsDisclosure title="Co kupujesz">
                <div className="payment-ref-mini-grid payment-ref-mini-grid--inside">
                  <div className="payment-ref-mini-note">
                    <strong>Usługa</strong>
                    <span>{bookingServiceSummary ?? 'Rozmowę behawioralną online prowadzoną przez Krzysztofa Regulskiego.'}</span>
                  </div>
                  <div className="payment-ref-mini-note">
                    <strong>BLIK po instrukcji e-mail</strong>
                    <span>{manualPaymentCopy.description}</span>
                  </div>
                </div>
              </PaymentDetailsDisclosure>

              <PaymentDetailsDisclosure title="Dokumenty przed płatnością">
                <div className="payment-ref-docs">
                  <span>Przed opłaceniem rezerwacji sprawdź regulamin, politykę prywatności oraz zasady zmiany terminu i anulowania.</span>
                  <div className="payment-ref-doc-links">
                    <PaymentReferenceInlineLink href="/regulamin">Regulamin usługi</PaymentReferenceInlineLink>
                    <PaymentReferenceInlineLink href="/polityka-prywatnosci">Polityka prywatności</PaymentReferenceInlineLink>
                  </div>
                </div>
              </PaymentDetailsDisclosure>

              <PaymentDetailsDisclosure title={qaBooking ? 'Materiały po teście' : 'Materiały po płatności'}>
                <div className="payment-ref-mini-note payment-ref-materials-note">
                  <span>{postPaymentMaterialsCopy}</span>
                </div>
              </PaymentDetailsDisclosure>

              {isWaitingManual ? (
                <PaymentDetailsDisclosure title="Zmiana terminu lub rezygnacja">
                  <div className="payment-ref-mini-note">
                    <span>Jeśli w ciągu 24 godzin chcesz zmienić termin albo zrezygnować, użyj krótkiej wiadomości.</span>
                  </div>
                </PaymentDetailsDisclosure>
              ) : null}
            </div>
            </>
          )}
      </div>
    </PaymentReferenceLayout>
  )
}
