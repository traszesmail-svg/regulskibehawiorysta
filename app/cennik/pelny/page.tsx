import type { Metadata } from 'next'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import {
  PricingCardsSection,
  bookHref,
  getPricingOfferCatalog,
} from '../pricing-page-content'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'PeĹ‚ny cennik rozmĂłw behawioralnych',
  path: '/cennik/pelny',
  description:
    'PeĹ‚na tabela rozmĂłw: Kwadrans 69 zĹ‚, Kwadrans na juĹĽ 99 zĹ‚, Dwa kwadranse 169 zĹ‚ i PeĹ‚na konsultacja 470 zĹ‚.',
})

export default function FullPricingPage() {
  return (
    <ReferencePageShell className="reference-pricing-page reference-full-pricing-page" ctaHref={bookHref} showHeroLeaf>
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona gĹ‚Ăłwna', path: '/' },
            { name: 'Cennik', path: '/cennik' },
            { name: 'PeĹ‚ny cennik', path: '/cennik/pelny' },
          ]),
          getServiceJsonLd({
            name: 'PeĹ‚ny cennik rozmĂłw behawioralnych - psy i koty',
            description:
              'PeĹ‚na tabela rozmĂłw: Kwadrans, Kwadrans na juĹĽ, Dwa kwadranse i PeĹ‚na konsultacja online.',
            serviceUrl: '/cennik/pelny',
            offerCatalog: getPricingOfferCatalog(),
          }),
        ]}
      />

      <section className="reference-hero reference-pricing-hero">
        <div className="reference-hero-copy">
          <span className="reference-pill">PeĹ‚ny cennik</span>
          <h1>Wybierz rozmowÄ™ na miarÄ™ sytuacji</h1>
          <p>
            PoniĹĽej masz wszystkie rozmowy w jednym miejscu. KlikniÄ™cie w dowolnÄ… opcjÄ™ prowadzi do tego samego wyboru psa, kota i najbliĹĽszego tematu, ĹĽeby zaczÄ…Ä‡ od danych, a nie od zgadywania.
          </p>
        </div>
      </section>

      <PricingCardsSection className="reference-full-pricing-section" />
    </ReferencePageShell>
  )
}

