import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { CommerceWaitingStatus } from '@/components/CommerceWaitingStatus'
import { PreConsultationForm } from '@/components/PreConsultationForm'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import { readCommerceViewerToken } from '@/lib/commerce'
import { isCommerceTestModeAllowed } from '@/lib/server/commerce-service'
import { canUseCommerceAccess, getCommerceOrderForViewer } from '@/lib/server/commerce-store'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Oczekiwanie na potwierdzenie płatności',
    path: '/oczekiwanie',
    description: 'Status zamówienia po potwierdzeniu płatności.',
    noIndex: true,
    follow: false,
  })
}

async function buildRequestReviewUrl(token: string, action: 'approve' | 'reject') {
  const incomingHeaders = await headers()
  const host = incomingHeaders.get('x-forwarded-host') ?? incomingHeaders.get('host') ?? 'localhost:3000'
  const proto = incomingHeaders.get('x-forwarded-proto') ?? 'https'
  const url = new URL(`/api/admin/confirm-payment/${encodeURIComponent(token)}`, `${proto}://${host}`)
  url.searchParams.set('action', action)
  return url.toString()
}

export default async function WaitingPage(props: {
  params: Promise<{ orderNumber: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.params;
  const searchParams = await props.searchParams
  const viewerToken = readCommerceViewerToken(searchParams?.viewer)
  const order = await getCommerceOrderForViewer(params.orderNumber, viewerToken)
  const accessReady = order ? canUseCommerceAccess(order) : false
  const consultationReady = Boolean(order?.productType === 'consultation' && order.status === 'paid' && order.meta.bookingId)
  const clinicPhoneUpgradePending = Boolean(order?.meta.clinicPhoneUpgrade && order.status === 'payment_reported' && order.meta.bookingId)
  const clinicJitsiUrl = clinicPhoneUpgradePending && order?.meta.bookingId
    ? '/call/' + order.meta.bookingId + (order.meta.bookingAccessToken ? '?access=' + encodeURIComponent(order.meta.bookingAccessToken) : '')
    : null
  const consultationUrl =
    consultationReady && order?.meta.bookingId
      ? `/call/${order.meta.bookingId}${order.meta.bookingAccessToken ? `?access=${encodeURIComponent(order.meta.bookingAccessToken)}` : ''}`
      : null
  const paymentReported = order
    ? order.status === 'payment_reported' || order.status === 'paid' || order.status === 'access_sent'
    : false
  const statusTitle = consultationReady
    ? 'Konsultacja jest potwierdzona.'
    : accessReady
      ? 'Dostęp jest aktywny.'
      : paymentReported
        ? 'Zgłoszenie płatności zostało wysłane.'
        : 'Płatność czeka na zgłoszenie.'
  const statusLead = consultationReady
    ? 'Płatność została potwierdzona. Możesz przejść bezpośrednio do pokoju rozmowy i zachować ten link.'
    : accessReady
      ? 'Kod dostępu jest już aktywny. Możesz przejść dalej bez czekania na dodatkowe odświeżenie.'
      : paymentReported
        ? order?.productType === 'consultation'
          ? 'Po potwierdzeniu płatności otrzymasz mail z terminem i linkiem do pokoju rozmowy. Możesz zostać na tej stronie, status sprawdzi się automatycznie.'
          : 'Po potwierdzeniu płatności otrzymasz kod dostępu na e-mail. Możesz zostać na tej stronie, status sprawdzi się automatycznie.'
        : 'Jeśli płatność została już wykonana, wróć do instrukcji BLIK i kliknij „Zapłaciłem/am”. Status odświeży się tutaj automatycznie.'
  const accessUrl = order && accessReady
    ? `/pokoj?code=${encodeURIComponent(order.accessCode!)}&email=${encodeURIComponent(order.customerEmail)}`
    : null
  const readyUrl = consultationUrl ?? accessUrl
  const testAdminConfirmUrl =
    order &&
    isCommerceTestModeAllowed() &&
    order.status === 'payment_reported' &&
    order.adminConfirmationToken &&
    !order.adminConfirmationTokenUsedAt
      ? await buildRequestReviewUrl(order.adminConfirmationToken, 'approve')
      : null

  return (
    <NotatnikPageShell
      tag="Status płatności"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      topbarProfile="flow"
      ctaHref={consultationReady ? readyUrl ?? '/zapytaj' : '/dostep'}
      ctaLabel={consultationReady ? 'Wejdź do pokoju' : 'Wpisz kod'}
      footerPrimaryHref={consultationReady ? readyUrl ?? '/zapytaj' : '/dostep'}
      footerPrimaryLabel={consultationReady ? 'Wejdź do pokoju rozmowy' : 'Wpisz kod dostępu'}
      pageClassName="commerce-flow-page"
    >
      <div className="container">
        <section className="panel centered-panel hero-surface booking-stage-panel transaction-panel booking-flow-panel">
          {!order ? (
            <div className="stack-gap">
              <h1>Nie znaleziono zamówienia</h1>
              <div className="error-box">Ten link jest nieprawidłowy albo wygasł.</div>
              <Link href="/kontakt#formularz" className="button button-primary big-button">
                Opisz krótko, co się dzieje
              </Link>
            </div>
          ) : (
            <>
              <div className="section-eyebrow">Zamówienie {order.orderNumber}</div>
              <h1>{statusTitle}</h1>
              <p className="hero-text small-width center-text">{statusLead}</p>
              <CommerceWaitingStatus
                orderNumber={order.orderNumber}
                viewerToken={viewerToken}
                initialStatus={order.status}
                initialAccessCode={accessReady ? order.accessCode : null}
                initialAccessUrl={accessUrl}
                initialReady={Boolean(readyUrl)}
                initialReadyUrl={readyUrl}
                initialReadyLabel={consultationReady ? 'Wejdź do pokoju rozmowy' : 'Przejdź do dostępu'}
                initialReadyText={consultationReady ? 'Konsultacja jest potwierdzona. Możesz przejść do pokoju rozmowy.' : null}
                initialTestAdminConfirmUrl={testAdminConfirmUrl}
              />              {clinicJitsiUrl ? (
                <div className="list-card accent-outline top-gap">
                  <strong>Darmowa ścieżka Jitsi pozostaje aktywna</strong>
                  <span>Jeśli dopłata nie będzie jeszcze potwierdzona w chwili terminu, rozmowa odbędzie się przez Jitsi.</span>
                  <Link href={clinicJitsiUrl} className="button button-primary">Wejdź do Jitsi</Link>
                </div>
              ) : null}
            </>
          )}
        </section>

        {order?.productType === 'consultation' && (paymentReported || consultationReady) ? (
          <section className="panel centered-panel hero-surface booking-stage-panel transaction-panel booking-flow-panel" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Pomóż mi przygotować się do rozmowy</h2>
            <p className="hero-text small-width">
              Jeśli masz teraz chwilę, wypełnij ten krótki, opcjonalny formularz. Twoje odpowiedzi pozwolą mi lepiej zrozumieć sytuację jeszcze przed naszym spotkaniem.
            </p>
            <PreConsultationForm orderNumber={order.orderNumber} />
          </section>
        ) : null}
      </div>
    </NotatnikPageShell>
  )
}
