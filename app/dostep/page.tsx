import type { Metadata } from 'next'
import { CommerceAccessForm } from '@/components/CommerceAccessForm'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Otwórz kupiony materiał PDF',
    path: '/dostep',
    description: 'Otwórz płatny materiał PDF za pomocą kodu i adresu e-mail z zamówienia.',
    noIndex: true,
    follow: false,
  })
}

export default function AccessPage() {
  return (
    <NotatnikPageShell
      tag="Dostęp"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      topbarProfile="flow"
      ctaHref="/kontakt"
      ctaLabel="Kontakt"
      footerPrimaryHref="/kontakt"
      footerPrimaryLabel="Kontakt"
    >
      <div className="container">
        <section className="panel centered-panel hero-surface booking-stage-panel transaction-panel booking-flow-panel">
          <div className="section-eyebrow">Kupiony materiał PDF</div>
          <h1>Otwórz swój PDF.</h1>
          <p className="hero-text small-width center-text">
            Wpisz kod z wiadomości po zakupie i ten sam adres e-mail, który podano w zamówieniu. Zaproszenie na Pełną
            konsultację otwiera się z osobistego linku lub kodu na stronie konsultacji.
          </p>
          <CommerceAccessForm />
          <p className="account-login-fallback">
            Chcesz mieć rezerwacje i materiały w jednym miejscu? <a href="/login">Zaloguj się lub utwórz konto opiekuna</a>.
          </p>
        </section>
      </div>
    </NotatnikPageShell>
  )
}
