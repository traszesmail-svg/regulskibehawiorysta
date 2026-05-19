import type { Metadata } from 'next'
import { AccountRoomApp } from '@/components/AccountRoomApp'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Moje konto',
    path: '/konto',
    description: 'Profil opiekuna i pupila w aplikacji Regulski Behawiorysta.',
    noIndex: true,
    follow: false,
  })
}

export default function AccountPage() {
  return (
    <NotatnikPageShell
      tag="Konto"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      ctaHref="/pokoj"
      ctaLabel="Pokoj"
      footerPrimaryHref="/pokoj"
      footerPrimaryLabel="Pokoj opiekuna"
      pageClassName="account-page"
    >
      <div className="container">
        <AccountRoomApp initialView="pupil" />
      </div>
    </NotatnikPageShell>
  )
}
