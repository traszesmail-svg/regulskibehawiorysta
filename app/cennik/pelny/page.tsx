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
  title: 'Pełny cennik rozmów behawioralnych',
  path: '/cennik/pelny',
  description:
    'Pełna tabela rozmów: Kwadrans 69 zł, Kwadrans na już 99 zł, Dwa kwadranse 169 zł i Pełna konsultacja 470 zł.',
})

export default function FullPricingPage() {
  return (
    <ReferencePageShell className="reference-pricing-page reference-full-pricing-page" ctaHref={bookHref} showHeroLeaf>
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'Cennik', path: '/cennik' },
            { name: 'Pełny cennik', path: '/cennik/pelny' },
          ]),
          getServiceJsonLd({
            name: 'Pełny cennik rozmów behawioralnych - psy i koty',
            description:
              'Pełna tabela rozmów: Kwadrans, Kwadrans na już, Dwa kwadranse i Pełna konsultacja online.',
            serviceUrl: '/cennik/pelny',
            offerCatalog: getPricingOfferCatalog(),
          }),
        ]}
      />

      <section className="reference-hero reference-pricing-hero">
        <div className="reference-hero-copy">
          <span className="reference-pill">Pełny cennik</span>
          <h1>Wybierz rozmowę na miarę sytuacji</h1>
          <p>
            Poniżej masz wszystkie rozmowy w jednym miejscu. Kliknięcie w dowolną opcję prowadzi do tego samego wyboru psa, kota i najbliższego tematu, żeby zacząć od danych, a nie od zgadywania.
          </p>
        </div>
      </section>

      <PricingCardsSection className="reference-full-pricing-section" />
    </ReferencePageShell>
  )
}
