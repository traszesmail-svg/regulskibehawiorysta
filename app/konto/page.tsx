import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AccountRoomApp } from '@/components/AccountRoomApp'
import { NotatnikPageShell, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import { ACCOUNT_ACCESS_COOKIE, ACCOUNT_REFRESH_COOKIE } from '@/lib/server/account-auth'
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
  const cookieStore = cookies()
  const initialSessionHint = Boolean(
    cookieStore.get(ACCOUNT_ACCESS_COOKIE)?.value || cookieStore.get(ACCOUNT_REFRESH_COOKIE)?.value,
  )

  return (
    <NotatnikPageShell
      tag="Konto"
      navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS}
      ctaHref="/pokoj"
      ctaLabel="Pokój"
      footerPrimaryHref="/pokoj"
      footerPrimaryLabel="Pokój opiekuna"
      pageClassName="account-page"
    >
      <div className="container">
        <AccountRoomApp initialView="pupil" initialSessionHint={initialSessionHint} />
      </div>
    </NotatnikPageShell>
  )
}
