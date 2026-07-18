import type { Metadata } from 'next'
import Link from 'next/link'
import { CommerceBlikActions } from '@/components/CommerceBlikActions'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import {
  buildCommerceCheckoutHref,
  formatCommercePrice,
  readCommerceViewerToken,
} from '@/lib/commerce'
import { getCommerceOrderForViewer } from '@/lib/server/commerce-store'
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

  return (
    <NotatnikPageShell
      tag="BLIK po instrukcji e-mail"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
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
          ) : (
            <>
              <div className="section-eyebrow">Płatność ręczna</div>
              <h1>BLIK po instrukcji e-mail</h1>
              <p className="hero-text small-width center-text">
                Kwota: <strong>{formatCommercePrice(order.manualAmount)}</strong>. Zrób przelew BLIK na numer{' '}
                <strong>{manual.phoneDisplay ?? manual.phone ?? 'brak numeru'}</strong> i w tytule wpisz dokładnie numer zamówienia.
              </p>
              <CommerceBlikActions
                orderNumber={order.orderNumber}
                viewerToken={viewerToken}
                phoneDisplay={manual.phoneDisplay ?? manual.phone}
              />
              <div className="disclaimer">
                Po wykonaniu wpłaty kliknij „Zapłaciłem/am”. Dostęp zostanie aktywowany po ręcznym potwierdzeniu płatności.
              </div>
            </>
          )}
        </section>
      </div>
    </NotatnikPageShell>
  )
}
