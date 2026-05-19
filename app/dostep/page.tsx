import type { Metadata } from 'next'
import { CommerceAccessForm } from '@/components/CommerceAccessForm'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Wpisz kod dostępu',
    path: '/dostep',
    description: 'Wpisz kod dostępu do konsultacji lub materiału cyfrowego.',
    noIndex: true,
    follow: false,
  })
}

export default function AccessPage() {
  return (
    <NotatnikPageShell
      tag="Dostęp"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      ctaHref="/kontakt"
      ctaLabel="Kontakt"
      footerPrimaryHref="/kontakt"
      footerPrimaryLabel="Kontakt"
    >
      <div className="container">
        <section className="panel centered-panel hero-surface booking-stage-panel transaction-panel booking-flow-panel">
          <div className="section-eyebrow">Kod dostępu</div>
          <h1>Wpisz kod dostępu.</h1>
          <p className="hero-text small-width center-text">
            Kod znajdziesz w e-mailu po potwierdzeniu płatności. Wpisz go razem z adresem e-mail użytym przy zamówieniu.
          </p>
          <CommerceAccessForm />
          <p className="account-login-fallback">
            Chcesz miec materialy i rezerwacje w aplikacji? <a href="/login">Zaloguj sie do pokoju opiekuna</a>.
          </p>
        </section>
      </div>
    </NotatnikPageShell>
  )
}
