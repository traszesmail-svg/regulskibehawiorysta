import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { headers } from 'next/headers'
import { AnalyticsEventOnMount } from '@/components/AnalyticsEventOnMount'
import { BookingReminderOptIn } from '@/components/BookingReminderOptIn'
import { getBookingAnalyticsContextParams } from '@/lib/analytics-schema'
import { CustomerEmailStatusNotice } from '@/components/CustomerEmailStatusNotice'
import { ConfirmationStatusWatcher } from '@/components/ConfirmationStatusWatcher'
import { HardNavLink } from '@/components/HardNavLink'
import {
  PaymentReferenceCardTitle,
  PaymentReferenceLayout,
  type PaymentReferenceSummaryRow,
} from '@/components/PaymentReferenceLayout'
import { PreparationMaterialsCard } from '@/components/PreparationMaterialsCard'
import { SelfCancellationActions } from '@/components/SelfCancellationActions'
import {
  type BookingServiceType,
  getBookingServiceDurationLabel,
  getBookingServiceRoomAccessLabel,
  getBookingServiceTitle,
  resolveBookingServiceType,
} from '@/lib/booking-services'
import { buildBookHref } from '@/lib/booking-routing'
import { formatDateTimeLabel, getProblemLabel } from '@/lib/data'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { formatPricePln } from '@/lib/pricing'
import { canSelfCancelBooking, getRemainingSelfCancellationSeconds } from '@/lib/self-cancellation'
import { getBookingForViewer } from '@/lib/server/db'
import { getDataModeStatus } from '@/lib/server/env'
import { getCustomerEmailDeliveryStatus } from '@/lib/server/notifications'
import { buildTechnicalMetadata } from '@/lib/seo'
import { SmsConfirmationStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Potwierdzenie rezerwacji',
    path: '/confirmation',
    description: 'Sprawdź status wpłaty, potwierdzenie rezerwacji i dalszy krok do rozmowy.',
    noIndex: true,
    follow: false,
  })
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function getSmsPanelContent(status: SmsConfirmationStatus | null | undefined) {
  if (status === 'sent') {
    return {
      title: 'Potwierdzenie zostało wysłane',
      body: 'Wysłaliśmy krótkie potwierdzenie rezerwacji.',
    }
  }

  if (status === 'processing') {
    return {
      title: 'Kończymy wysyłkę potwierdzenia',
      body: 'Płatność jest już potwierdzona. Jeśli wiadomość nie pojawi się od razu, szczegóły rezerwacji są zapisane na tej stronie.',
    }
  }

  return {
    title: 'Potwierdzenie jest zapisane',
    body: 'Jeśli wiadomość nie dotrze od razu, potwierdzenie i dalsze instrukcje są zapisane na tej stronie.',
  }
}

function getCallRoomCtaLabel(serviceType: BookingServiceType, roomAccessLabel: string) {
  if (serviceType === 'konsultacja-behawioralna-online') {
    return 'Zobacz pokój konsultacji online'
  }

  if (serviceType === 'konsultacja-30-min') {
    return 'Zobacz pokój konsultacji'
  }

  return roomAccessLabel === 'pokój rozmowy audio' ? 'Zobacz pokój rozmowy audio' : 'Zobacz pokój rozmowy'
}

function getConfirmedChecklist(serviceType: BookingServiceType) {
  if (serviceType === 'konsultacja-behawioralna-online') {
    return {
      title: 'Przed konsultacją online',
      items: [
        'Zachowaj termin i wróć do tego linku kilka minut przed konsultacją online.',
        'Przygotuj 2-3 najważniejsze obserwacje, krótki kontekst problemu i materiały, które chcesz omówić.',
        'Możesz dodać krótkie nagranie zachowania psa lub kota, żeby specjalista lepiej przygotował się do rozmowy. To nie oznacza konsultacji wideo.',
      ],
      materialsLead:
        'To nie jest obowiązkowe. Materiały pomagają skrócić wstęp i szybciej przejść do zaleceń po pełnej konsultacji.',
    }
  }

  return {
    title: 'Przed rozmową audio',
    items: [
      'Zachowaj termin i wróć do tego linku kilka minut przed rozmową audio.',
      'Możesz dodać krótkie nagranie zachowania psa lub kota, żeby specjalista lepiej przygotował się do rozmowy. To nie oznacza konsultacji wideo.',
      'Przed rozmową możesz też spokojnie przejrzeć materiały PDF, jeśli chcesz uporządkować temat jeszcze lepiej.',
    ],
    materialsLead:
      'To nie jest obowiązkowe. Jeśli chcesz, możesz teraz dodać nagranie, link do materiałów albo krótki opis sytuacji, żeby szybciej uporządkować temat przed rozmową.',
  }
}

function getConfirmedFlowCards(
  serviceType: BookingServiceType,
  roomAccessLabel: string,
  customerEmailReady: boolean,
  email: string,
) {
  if (serviceType === 'konsultacja-behawioralna-online') {
      return [
        {
          title: 'Termin jest zapisany',
      body: 'Pełna konsultacja jest potwierdzona. Wróć do tego linku kilka minut przed spotkaniem.',
        },
      {
        title: 'Dalszy link i instrukcja',
        body: customerEmailReady
          ? `Link do ${roomAccessLabel} i dalszą instrukcję wyślemy także na ${email}.`
          : `Link do ${roomAccessLabel} i dalszą instrukcję masz stale na tej stronie, więc zachowaj ten adres.`,
      },
      {
        title: 'Przygotowanie',
        body: 'Jeśli masz nagranie, link do materiałów albo krótki opis tła sprawy, dodaj je teraz, żeby wejść od razu w konkrety.',
      },
    ]
  }

  return [
    {
      title: 'Termin jest zapisany',
      body: 'Kwadrans z behawiorystą jest potwierdzony. Wróć do tego linku kilka minut przed rozmową.',
    },
    {
      title: 'Dalszy link i instrukcja',
      body: customerEmailReady
        ? `Link do ${roomAccessLabel} i krótkie potwierdzenie wyślemy także na ${email}.`
        : `Link do ${roomAccessLabel} i dalszą instrukcję masz stale na tej stronie, więc zachowaj ten adres.`,
    },
    {
      title: 'Przygotowanie',
      body: 'Jeśli chcesz, dodaj nagranie, link albo krótki opis sytuacji. To pomaga szybciej uporządkować temat podczas rozmowy.',
    },
  ]
}

async function finalizeLegacyCheckoutSession(
  _sessionId: string,
  _options?: {
    triggerPaymentConfirmationSms?: boolean
  },
): Promise<void> {
  return
}

export default async function ConfirmationPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  noStore()
  const bookingId = readSearchParam(searchParams?.bookingId)
  const accessToken = readSearchParam(searchParams?.access)
  const sessionId = readSearchParam(searchParams?.session_id)
  const manualReported = readSearchParam(searchParams?.manual)
  const adminNotice = readSearchParam(searchParams?.adminNotice)
  const dataMode = getDataModeStatus()
  const returnedFromOnlineCheckout = Boolean(sessionId)
  let booking: Awaited<ReturnType<typeof getBookingForViewer>> = null
  let flowError: string | null = null
  let onlineSyncWarning: string | null = null

  if (!dataMode.isValid) {
    flowError = 'Potwierdzenie chwilowo nie jest dostępne. Spróbuj ponownie za kilka minut.'
  }

  if (!flowError && bookingId && sessionId) {
    try {
      await finalizeLegacyCheckoutSession(sessionId, {
        triggerPaymentConfirmationSms: false,
      })
    } catch (error) {
      console.warn('[regulski-behawiorysta][confirmation] stripe return finalize failed', {
        bookingId,
        sessionId,
        error,
      })
      onlineSyncWarning = 'Nie udał się teraz zapis finalnego statusu rezerwacji. Ta strona spróbuje ponownie sama za chwilę.'
    }
  }

  if (!flowError && bookingId) {
    try {
      booking = await getBookingForViewer(bookingId, accessToken, (await headers()).get('authorization'))
    } catch (error) {
      console.warn('[regulski-behawiorysta][confirmation] failed to load booking', {
        bookingId,
        hasAccessToken: Boolean(accessToken),
        error,
      })
      flowError = 'Nie udało się wczytać potwierdzenia. Spróbuj ponownie za moment.'
    }
  }

  const isConfirmed = booking?.paymentStatus === 'paid' && (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done')
  const isWaitingManual = booking?.bookingStatus === 'pending_manual_payment' && booking.paymentStatus === 'pending_manual_review'
  const isRejected = booking?.paymentStatus === 'rejected' && booking.bookingStatus === 'cancelled'
  const isSelfCancelled = booking?.paymentStatus === 'refunded' && booking.bookingStatus === 'cancelled'
  const isClosed =
    !isSelfCancelled &&
    !isRejected &&
    (booking?.bookingStatus === 'cancelled' || booking?.bookingStatus === 'expired' || booking?.paymentStatus === 'failed')
  const isAwaitingOnlineConfirmation =
    returnedFromOnlineCheckout && Boolean(booking) && !isConfirmed && !isWaitingManual && !isRejected && !isSelfCancelled && !isClosed
  const canSelfCancel = Boolean(booking && accessToken && canSelfCancelBooking(booking))
  const initialRemainingSeconds = booking ? getRemainingSelfCancellationSeconds(booking) : 0
  const smsPanel = getSmsPanelContent(booking?.smsConfirmationStatus)
  const customerEmailStatus = booking ? getCustomerEmailDeliveryStatus(booking.email) : null
  const isPromoPayment = booking?.paymentMethod === 'promo'
  const bookingServiceType = booking ? resolveBookingServiceType(booking.serviceType, booking.amount) : null
  const bookingServiceTitle = bookingServiceType ? getBookingServiceTitle(bookingServiceType) : null
  const roomAccessLabel = bookingServiceType ? getBookingServiceRoomAccessLabel(bookingServiceType) : 'pokój rozmowy'
  const qaBooking = Boolean(booking?.qaBooking)
  const quickAudioHref = buildBookHref(null, 'szybka-konsultacja-15-min', qaBooking)
  const showAdminNoticeQueued = isWaitingManual && manualReported === 'reported' && adminNotice === 'queued'
  const showAdminNoticeWarning = isWaitingManual && manualReported === 'reported' && (adminNotice === 'failed' || adminNotice === 'skipped')
  const confirmationState = isSelfCancelled
    ? 'self-cancelled'
    : isConfirmed
      ? 'confirmed'
      : isWaitingManual
        ? 'pending-manual-review'
        : isRejected
          ? 'manual-rejected'
          : isClosed
            ? 'closed'
            : isAwaitingOnlineConfirmation
              ? 'awaiting-online-confirmation'
              : booking
                ? 'loaded'
                : 'invalid'

  const serviceLabel = bookingServiceTitle ?? 'usługa'
  const callRoomCtaLabel = bookingServiceType ? getCallRoomCtaLabel(bookingServiceType, roomAccessLabel) : 'Zobacz pokój rozmowy'
  const confirmedChecklist = bookingServiceType ? getConfirmedChecklist(bookingServiceType) : null
  const confirmedFlowCards =
    booking && bookingServiceType ? getConfirmedFlowCards(bookingServiceType, roomAccessLabel, customerEmailStatus?.state === 'ready', booking.email) : []
  const pushPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null
  const confirmationSummaryRows: PaymentReferenceSummaryRow[] = booking
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
          value: 'Rozmowa online',
        },
        {
          icon: 'problem',
          label: 'Problem',
          value: 'Do sprawdzenia',
        },
        {
          icon: 'duration',
          label: 'Czas trwania',
          value: '15–30 minut',
        },
      ]
  const confirmationTitle = flowError
    ? 'Potwierdzenie rezerwacji chwilowo niedostępne'
    : !booking
      ? 'Potwierdzenie rezerwacji wygasło'
      : isSelfCancelled
        ? 'Rezerwacja została anulowana'
        : isConfirmed
          ? qaBooking
            ? 'Testowa płatność została potwierdzona'
            : isPromoPayment
              ? `Termin na ${serviceLabel} został potwierdzony kodem promocyjnym`
              : `Wpłata za ${serviceLabel} została potwierdzona`
          : isWaitingManual
            ? 'Czekamy na potwierdzenie wpłaty.'
            : isRejected
              ? 'Wpłata nie została potwierdzona'
              : isClosed
                ? 'Rezerwacja nie jest już aktywna'
                : 'Sprawdzamy status wpłaty'
  const confirmationLead = flowError
    ? 'Spróbuj ponownie za chwilę albo wróć do rezerwacji.'
    : !booking
      ? 'Ten link do potwierdzenia jest nieprawidłowy albo wygasł.'
      : isSelfCancelled
        ? 'Termin wrócił do kalendarza, a płatność została cofnięta. Możesz od razu wybrać nowy termin albo wrócić później.'
        : isConfirmed
          ? qaBooking
            ? 'To jest rezerwacja testowa. Poniżej masz potwierdzenie i kolejny krok bez realnej płatności.'
            : isPromoPayment
              ? `Kod promocyjny został przyjęty. Poniżej masz podsumowanie rezerwacji, status wiadomości, ${roomAccessLabel} i dalszy krok.`
              : `Wpłata jest już potwierdzona. Poniżej masz podsumowanie rezerwacji, status wiadomości, ${roomAccessLabel} i dalszy krok.`
          : isWaitingManual
            ? `Sprawdzamy wpłatę ręcznie i potwierdzimy ją w godzinach obsługi. Gdy status zmieni się na opłacony, zobaczysz ${roomAccessLabel} i sekcję materiałów.`
            : isRejected
              ? booking.paymentRejectedReason ?? 'Termin wrócił do puli. Jeśli trzeba, utwórz nową rezerwację i zgłoś wpłatę ponownie.'
              : isClosed
                ? 'Ta rezerwacja nie jest już aktywna. Jeśli chcesz, wybierz nowy termin.'
                : 'Status rezerwacji jest jeszcze domykany. Ta strona sprawdzi go ponownie za chwilę.'
  const confirmationCardTitle = isWaitingManual
    ? 'Wpłata została zgłoszona'
    : isConfirmed
      ? 'Potwierdzenie rezerwacji'
      : isSelfCancelled
        ? 'Rezerwacja została anulowana'
        : isRejected
          ? 'Wpłata niepotwierdzona'
          : isClosed
            ? 'Rezerwacja zamknięta'
            : 'Status rezerwacji'
  const confirmationCardLead = isWaitingManual
    ? 'Wpłata jest zapisana pod właściwym tytułem. Po ręcznym potwierdzeniu odblokujemy dalszy krok.'
    : isConfirmed
      ? 'Termin i kolejne kroki są zapisane pod tym linkiem.'
      : 'Najważniejsze informacje o rezerwacji są zapisane pod tym linkiem.'
  const confirmationSummarySafety = isSelfCancelled || isRejected || isClosed
    ? {
        title: 'Status rezerwacji',
        description: 'Ta rezerwacja nie jest już aktywna. Jeśli potrzebujesz nowego terminu, wybierz go od początku.',
      }
    : isConfirmed
      ? {
          title: 'Wpłata potwierdzona',
          description: `Termin jest zapisany. Link do ${roomAccessLabel} i dalszą instrukcję masz na tej stronie.`,
        }
      : {
          title: 'Czekamy na potwierdzenie',
          description: 'Wpłatę sprawdzamy ręcznie w godzinach obsługi. Nie musisz wykonywać ponownie płatności.',
        }
  const confirmationAmount = booking ? (isPromoPayment ? '0 zł' : formatPricePln(booking.amount)) : 'Do ustalenia'
  const confirmationTotalLabel = isPromoPayment
    ? 'Rozliczenie'
    : isConfirmed
      ? 'Opłacono'
      : isWaitingManual
        ? 'BLIK po instrukcji'
        : 'Razem'

  return (
    <PaymentReferenceLayout
      title={confirmationTitle}
      lead={confirmationLead}
      variant="compact"
      summaryRows={confirmationSummaryRows}
      lineItemLabel={bookingServiceTitle ?? 'Konsultacja behawioralna'}
      lineItemAmount={confirmationAmount}
      totalLabel={confirmationTotalLabel}
      summarySafety={confirmationSummarySafety}
    >
      <div
        className="payment-ref-confirmation-content"
        data-confirmation-state={confirmationState}
        data-booking-id={booking?.id ?? ''}
        data-customer-email-state={customerEmailStatus?.state ?? 'unknown'}
      >
          {flowError ? (
            <div className="payment-ref-stack">
              <div className="error-box">
                {flowError} Użyj krótkiej wiadomości albo wróć do rezerwacji, jeśli chcesz sprawdzić wszystko jeszcze raz.
              </div>
              <div className="payment-ref-button-row">
                <HardNavLink href={quickAudioHref} className="payment-ref-submit">
                  Wróć do rezerwacji
                </HardNavLink>
                <HardNavLink href="/kontakt#formularz" className="payment-ref-secondary-button">
                  {FUNNEL_CTA_LABELS.contact}
                </HardNavLink>
              </div>
            </div>
          ) : booking ? (
            <>
              <PaymentReferenceCardTitle title={confirmationCardTitle}>{confirmationCardLead}</PaymentReferenceCardTitle>
              <div className="success-badge">
                {isSelfCancelled
                  ? 'Zakup anulowany'
                  : isConfirmed
                    ? isPromoPayment
                      ? 'Kod promocyjny użyty'
                      : 'Wpłata potwierdzona'
                    : isWaitingManual
                      ? 'Czekamy na potwierdzenie wpłaty'
                      : isRejected
                        ? 'Wpłata niepotwierdzona'
                        : 'Sprawdzamy status wpłaty'}
              </div>
              {qaBooking ? <div className="status-pill transaction-status-pill top-gap-small">Rezerwacja testowa</div> : null}
              <AnalyticsEventOnMount
                eventName="confirmation_viewed"
                params={{
                  booking_id: booking.id,
                  payment_status: booking.paymentStatus,
                  source_page: '/confirmation',
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
              <details className="payment-ref-disclosure payment-ref-confirmation-details">
                <summary>Szczegóły rezerwacji</summary>
                <div className="payment-ref-disclosure-body">
                  <div className="payment-ref-mini-grid">
                    <div className="payment-ref-mini-note">
                      <strong>Usługa</strong>
                      <span>{serviceLabel}</span>
                    </div>
                    <div className="payment-ref-mini-note">
                      <strong>Kontakt</strong>
                      <span>{booking.email}</span>
                    </div>
                    {qaBooking ? (
                      <div className="payment-ref-mini-note">
                        <strong>Tryb</strong>
                        <span>Test</span>
                      </div>
                    ) : null}
                    <div className="payment-ref-mini-note">
                      <strong>{isPromoPayment ? 'Rozliczenie' : 'Kwota'}</strong>
                      <span>{isPromoPayment ? 'Kod promocyjny' : formatPricePln(booking.amount)}</span>
                    </div>
                  </div>
                </div>
              </details>

              {!qaBooking && customerEmailStatus && !isClosed ? (
                <CustomerEmailStatusNotice
                  status={customerEmailStatus}
                  recipientEmail={booking.email}
                  context="confirmation"
                  className="top-gap"
                />
              ) : null}

              {isConfirmed && accessToken ? (
                <BookingReminderOptIn
                  role="customer"
                  publicKey={pushPublicKey}
                  bookingId={booking.id}
                  accessToken={accessToken}
                  targetUrl={`/call/${booking.id}?access=${encodeURIComponent(accessToken)}`}
                  className="top-gap"
                />
              ) : null}

              {!isSelfCancelled && !isClosed ? (
                <div className="payment-ref-confirmation-flow top-gap">
                  {(isConfirmed ? confirmedFlowCards : [
                    {
                      title: 'Status płatności',
                      body: isWaitingManual
                        ? 'Wpłata jest zapisana i czeka na potwierdzenie w godzinach obsługi.'
                        : 'Wpłata nie jest jeszcze potwierdzona. Jeśli właśnie wysłałeś BLIK zgodnie z instrukcją, poczekaj na potwierdzenie.',
                    },
                    {
                      title: 'Kolejny krok',
                      body: 'Nie musisz zgadywać, co dalej. Gdy status się zmieni, potwierdzenie pokaże właściwy stan rezerwacji.',
                    },
                    {
                      title: 'Co odblokuje się potem',
                      body: `Po statusie opłacone zobaczysz ${roomAccessLabel}, dalszą instrukcję i sekcję materiałów do sprawy.`,
                    },
                  ]).map((card) => (
                    <div key={card.title} className="payment-ref-mini-note">
                      <strong>{card.title}</strong>
                      <span>{card.body}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {canSelfCancel ? (
                <SelfCancellationActions
                  bookingId={booking.id}
                  accessToken={accessToken ?? ''}
                  initialRemainingSeconds={initialRemainingSeconds}
                  contactHref={`/kontakt?service=${encodeURIComponent(bookingServiceType ?? 'szybka-konsultacja-15-min')}&intent=reschedule&bookingId=${encodeURIComponent(booking.id)}#formularz`}
                />
              ) : null}

              <ConfirmationStatusWatcher
                active={isWaitingManual || isAwaitingOnlineConfirmation}
                bookingId={booking.id}
                accessToken={accessToken}
                currentState={`${booking.bookingStatus}:${booking.paymentStatus}`}
                roomAccessLabel={roomAccessLabel}
              />

              {showAdminNoticeQueued ? (
                <div className="info-box top-gap">
                  Zgłoszenie wpłaty zostało zapisane. Automatyczne powiadomienie obsługi wysyła się jeszcze w tle, więc nie blokuje to potwierdzenia. Zachowaj ten link, a status nadal będzie odświeżany automatycznie.
                </div>
              ) : null}

              {showAdminNoticeWarning ? (
                <div className="info-box top-gap">
                  Zgłoszenie wpłaty zostało zapisane, ale automatyczne powiadomienie obsługi o tej wpłacie nie zostało teraz dostarczone. Zachowaj ten link. Jeśli status nie zmieni się w godzinach obsługi, skontaktuj się przez formularz kontaktowy.
                </div>
              ) : null}

              {isAwaitingOnlineConfirmation ? (
                <div className="info-box top-gap">
                  {`Status rezerwacji jest jeszcze domykany. Ta strona sama sprawdzi go ponownie i odblokuje ${roomAccessLabel} bez dodatkowego klikania.`}
                </div>
              ) : null}

              {onlineSyncWarning ? <div className="info-box top-gap">{onlineSyncWarning}</div> : null}

              {isClosed ? (
                <div className="error-box top-gap">
                  {booking.paymentStatus === 'failed'
                    ? 'Wpłata nie została potwierdzona, a termin wrócił do kalendarza.'
                    : 'Ta rezerwacja nie jest już aktywna. Jeśli chcesz, wybierz nowy termin.'}
                </div>
              ) : null}

              {isWaitingManual ? (
                <div className="info-box top-gap">
                  Tytuł wpłaty: <strong>{booking.paymentReference ?? booking.id}</strong>.{' '}
                  {customerEmailStatus?.state === 'ready'
                    ? `Gdy tylko potwierdzimy wpłatę, wyślemy link do ${roomAccessLabel} na ${booking.email} i odblokujemy materiały.`
                    : customerEmailStatus?.state === 'disabled'
                      ? `Gdy tylko potwierdzimy wpłatę, odblokujemy materiały, a aktywny link do ${roomAccessLabel} znajdziesz pod tym adresem.`
                      : `Gdy tylko potwierdzimy wpłatę, odblokujemy materiały, a aktywny link do ${roomAccessLabel} znajdziesz pod tym adresem, nawet jeśli e-mail dotrze chwilę później.`}
                </div>
              ) : null}

              {!isSelfCancelled && !isClosed ? (
                <div className="stack-gap top-gap">
                  {isConfirmed ? (
                    <>
                      <div className="list-card tree-backed-card">
                        <strong>{smsPanel.title}</strong>
                        <span>{smsPanel.body}</span>
                      </div>
                      <div className="prep-checklist tree-backed-card">
                        <strong>{confirmedChecklist?.title ?? 'Przed rozmową'}</strong>
                        <ul>
                          {(confirmedChecklist?.items ?? []).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="list-card accent-outline tree-backed-card">
                        <strong>Dodaj materiały do sprawy</strong>
                        <span>{confirmedChecklist?.materialsLead ?? 'To nie jest obowiązkowe. Jeśli chcesz, możesz teraz dodać nagranie, link do materiałów albo krótki opis sytuacji.'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="list-card tree-backed-card">
                        <strong>Po płatności zobaczysz</strong>
                        <span>{`Po statusie opłacone zobaczysz finalne potwierdzenie, status wiadomości, ${roomAccessLabel} i sekcję do dodania materiałów do sprawy.`}</span>
                      </div>
                      <div className="list-card accent-outline tree-backed-card">
                        <strong>Jeśli temat okaże się szerszy</strong>
                        <span>
                          {bookingServiceType === 'konsultacja-behawioralna-online'
                            ? 'Po konsultacji możesz wrócić do zaleceń, materiałów do sprawy albo ustalić dalsze kroki.'
                            : 'Jeśli po rozmowie temat okaże się szerszy, kolejnym krokiem może być pełna konsultacja.'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="list-card accent-outline top-gap tree-backed-card">
                  <strong>Co stało się po anulacji</strong>
                  <span>To anulowanie zwolniło termin i zakończyło tę rezerwację. Jeśli wrócisz do rezerwacji, przejdziesz przez zwykły wybór tematu i nowego terminu.</span>
                </div>
              )}

              <div className="payment-ref-button-row payment-ref-confirmation-actions">
                {isSelfCancelled || isRejected || isClosed ? (
                  <>
                    <HardNavLink href={quickAudioHref} className="payment-ref-submit">
                      Wybierz nowy termin
                    </HardNavLink>
                    <HardNavLink href="/kontakt#formularz" className="payment-ref-secondary-button">
                      {FUNNEL_CTA_LABELS.contact}
                    </HardNavLink>
                  </>
                ) : isConfirmed ? (
                  <>
                    <Link
                      href={`/call/${booking.id}${accessToken ? `?access=${encodeURIComponent(accessToken)}` : ''}`}
                      className="payment-ref-submit"
                    >
                      {callRoomCtaLabel}
                    </Link>
                    <Link href="#materialy-do-sprawy" className="payment-ref-secondary-button">
                      Dodaj materiały
                    </Link>
                  </>
                ) : (
                  <>
                    <HardNavLink
                      href={`/payment?bookingId=${booking.id}${accessToken ? `&access=${encodeURIComponent(accessToken)}` : ''}`}
                      className="payment-ref-submit"
                    >
                      Wróć do płatności
                    </HardNavLink>
                    <HardNavLink href="/kontakt#formularz" className="payment-ref-secondary-button">
                      {FUNNEL_CTA_LABELS.contact}
                    </HardNavLink>
                  </>
                )}
              </div>

              {isConfirmed ? (
                <div id="materialy-do-sprawy">
                  <PreparationMaterialsCard
                    bookingId={booking.id}
                    accessToken={accessToken ?? ''}
                    canEdit={true}
                    hasVideo={Boolean(booking.prepVideoPath)}
                    prepVideoFilename={booking.prepVideoFilename ?? null}
                    prepVideoSizeBytes={booking.prepVideoSizeBytes ?? null}
                    prepLinkUrl={booking.prepLinkUrl ?? null}
                    prepNotes={booking.prepNotes ?? null}
                    prepUploadedAt={booking.prepUploadedAt ?? null}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="payment-ref-stack">
              <div className="error-box">Ten link do potwierdzenia jest nieprawidłowy albo wygasł.</div>
              <div className="payment-ref-button-row">
                <HardNavLink href={quickAudioHref} className="payment-ref-submit">
                  Przejdź do rezerwacji
                </HardNavLink>
                <HardNavLink href="/kontakt#formularz" className="payment-ref-secondary-button">
                  {FUNNEL_CTA_LABELS.contact}
                </HardNavLink>
              </div>
            </div>
          )}
      </div>
    </PaymentReferenceLayout>
  )
}

