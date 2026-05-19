import type { Metadata } from 'next'
import Link from 'next/link'
import { AccountAuthForm } from '@/components/AccountAuthForm'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Logowanie do pokoju opiekuna',
    path: '/login',
    description: 'Logowanie do prywatnego pokoju opiekuna Regulski Behawiorysta.',
    noIndex: true,
    follow: false,
  })
}

export default function LoginPage() {
  return (
    <NotatnikPageShell
      tag="Konto"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      ctaHref="/dostep"
      ctaLabel="Kod dostepu"
      footerPrimaryHref="/pokoj"
      footerPrimaryLabel="Pokoj opiekuna"
      pageClassName="account-page"
    >
      <div className="container">
        <section className="account-room-panel account-login-panel">
          <div className="section-eyebrow">Konto opiekuna</div>
          <h1>Zaloguj sie albo utworz konto.</h1>
          <p className="hero-text small-width center-text">
            Konto laczy rezerwacje, materialy PDF, profil pupila, rozmowe i zalaczniki w jednym pokoju.
          </p>
          <AccountAuthForm />
          <p className="account-login-fallback">
            Masz tylko kod do PDF? <Link href="/dostep">Wpisz kod dostepu</Link>.
          </p>
        </section>
      </div>
    </NotatnikPageShell>
  )
}
