import type { Metadata } from 'next'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ZapytajDzisForm } from '@/components/ZapytajDzisForm'
import { buildMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Zapytaj o najszybszy termin',
  path: '/zapytaj-teraz',
  description: 'Poproś o najszybszy możliwy termin dziś lub jutro. Zgłoszenie nie jest rezerwacją.',
})

export default function ZapytajTerazPage() {
  return (
    <NotatnikPageShell
      tag="Najszybszy możliwy termin"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj"
      ctaLabel="Zapytaj"
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel="Wybierz termin w kalendarzu"
      showSideVisuals={false}
      pageClassName="zapytaj-teraz-page"
      shellClassName="zapytaj-teraz-shell"
      footerVariant="home"
      showFooterReviews={false}
      topbarProfile="flow"
      showZapytajStatus={false}
    >
      <ZapytajDzisForm />
    </NotatnikPageShell>
  )
}
