import type { Metadata } from 'next'
import Link from 'next/link'
import { CommerceBlikActions } from '@/components/CommerceBlikActions'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import {
  buildCommerceCheckoutHref,
  buildCommerceWaitingHref,
  formatCommercePrice,
  readCommerceViewerToken,
} from '@/lib/commerce'
import { isBookingAwaitingPayment } from '@/lib/booking-expiry'
import { getCommerceOrderForViewer } from '@/lib/server/commerce-store'
import { getBookingById } from '@/lib/server/db'
import { getManualPaymentConfig } from '@/lib/server/payment-options'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'BLIK po instrukcji e-mail',
    path: '/platnosc/blik',
    description: 'Instrukcja ręcznej płatności BLIK bez publicznego numeru.',
    noIndex: true,
    follow: false,
  })
}

export default async function BlikPaymentPage(props: {
  params: Promise<{ orderNumber: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params;
  const searchParams = await props.searchParams
  const viewerToken = readCommerceViewerToken(searchParams?.viewer)
  // Rendering this page must be a read-only operation. The manual-payment
  // state is created only when the buyer explicitly reports a completed BLIK.
  const order = await getCommerceOrderForViewer(params.orderNumber, viewerToken)
  const manual = getManualPaymentConfig()
  const isClinicPhoneUpgrade = Boolean(order?.meta.clinicPhoneUpgrade)
  const needsActiveConsultationBooking =
    order?.productType === 'consultation' &&
    (order.status === 'created' || order.status === 'waiting_manual_payment' || order.status === 'payment_reported')
  const consultationBooking =
    needsActiveConsultationBooking && order?.meta.bookingId ? await getBookingById(order.meta.bookingId) : null
  const consultationBookingUnavailable = Boolean(
    needsActiveConsultationBooking && !isClinicPhoneUpgrade && (!consultationBooking || !isBookingAwaitingPayment(consultationBooking)),
  )

  return (
    <NotatnikPageShell
      tag="BLIK po instrukcji e-mail"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      topbarProfile="flow"
      ctaHref="/dostep"
      ctaLabel="Wpisz kod"
      footerPrimaryHref="/dostep"
      footerPrimaryLabel="Wpisz kod dostępu"
      pageClassName="commerce-flow-page"
    >
      <div className="container">
        <section className="panel centered-panel hero-surface booking-stage-panel transaction-panel booking-flow-panel">
          {!order ? (
            <div className="stack-gap">
              <h1>Nie znaleziono zamówienia</h1>
              <div className="error-box">Ten link do płatności jest nieprawidłowy albo wygasł.</div>
              <Link href="/kontakt#formularz" className="button button-primary big-button">
                Opisz krótko, co się dzieje
              </Link>
            </div>
          ) : !manual.isAvailable ? (
            <div className="stack-gap">
              <h1>BLIK jest chwilowo niedostępny</h1>
              <div className="error-box">{manual.summary}</div>
              <Link href={buildCommerceCheckoutHref(order.orderNumber, viewerToken)} className="button button-primary big-button">
                Wróć do metod płatności
              </Link>
            </div>
          ) : consultationBookingUnavailable ? (
            <div className="stack-gap">
              <h1>Termin rezerwacji nie jest już aktywny</h1>
              <div className="error-box">
                Termin wrócił do kalendarza. Jeśli wpłata została już wysłana, nie wysyłaj jej drugi raz — opisz krótko sytuację przez formularz kontaktowy.
              </div>
              <div className="hero-actions centered-actions">
                <Link href="/book" className="button button-primary big-button">
                  Wybierz nowy termin
                </Link>
                <Link href="/kontakt#formularz" className="button button-ghost big-button">
                  Opisz krótko, co się dzieje
                </Link>
              </div>
            </div>
          ) : order.status === 'payment_reported' ? (
            <div className="stack-gap">
              <h1>{isClinicPhoneUpgrade ? 'Zgłoszenie dopłaty BLIK zostało wysłane.' : 'Zgłoszenie płatności zostało wysłane.'}</h1>
              <p className="hero-text small-width center-text">
                {isClinicPhoneUpgrade
                  ? 'Nie musisz zgłaszać wpłaty drugi raz. Do czasu potwierdzenia dopłaty nadal możesz rozmawiać przez bezpłatne Jitsi.'
                  : 'Nie musisz zgłaszać wpłaty drugi raz. Otwórz status, aby zobaczyć dalszą informację po ręcznej weryfikacji.'}
              </p>
              <Link href={buildCommerceWaitingHref(order.orderNumber, viewerToken)} className="button button-primary big-button">
                Otwórz status płatności
              </Link>
            </div>
          ) : (
            <>
              <div className="section-eyebrow">Płatność ręczna</div>
              <h1>{isClinicPhoneUpgrade ? "Dopłata BLIK na telefon" : "BLIK po instrukcji e-mail"}</h1>
              <p className="hero-text small-width center-text">
                Kwota: <strong>{formatCommercePrice(order.manualAmount)}</strong>. Wyślij dopłatę BLIK na telefon na numer{' '}
                <strong>{manual.phoneDisplay ?? manual.phone ?? 'brak numeru'}</strong> i w tytule wpisz dokładnie numer zamówienia.
              </p>
              <CommerceBlikActions
                orderNumber={order.orderNumber}
                viewerToken={viewerToken}
                phoneDisplay={manual.phoneDisplay ?? manual.phone}
              />
              <div className="disclaimer">
                Po wykonaniu wpłaty kliknij „Zapłaciłem/am”. {isClinicPhoneUpgrade ? 'Brak potwierdzenia nie odbiera bezpłatnego Jitsi; telefon włączymy dopiero po akceptacji.' : 'Dostęp zostanie aktywowany po ręcznym potwierdzeniu płatności.'}
              </div>
            </>
          )}
        </section>
      </div>
    </NotatnikPageShell>
  )
}
