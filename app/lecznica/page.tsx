import type { Metadata } from 'next'
import Image from 'next/image'
import { ClinicCodeEntry } from '@/components/ClinicCodeEntry'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { CLINIC_PARTNERS } from '@/lib/clinic-partners'
import { buildMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Kod od lecznicy',
  path: '/lecznica',
  description: 'Wejście do Kwadransa dla opiekunów, którzy otrzymali jednorazowy kod w lecznicy.',
})

export default function ClinicCodePage() {
  return (
    <ReferencePageShell className="clinic-program-page" ctaHref="/book">
      <section className="clinic-program-hero">
        <span className="section-eyebrow">Program dla klientów lecznic</span>
        <h1>Masz kod od lecznicy?</h1>
        <p>
          Wpisz go poniżej. Następnie wybierzesz psa lub kota, temat sprawy oraz dostępny termin Kwadransa.
        </p>
        <ClinicCodeEntry />
      </section>

      <section className="clinic-program-steps" aria-label="Jak skorzystać z kodu">
        <article><strong>1. Wpisz kod</strong><span>Sprawdzimy, czy jest aktywny. Samo sprawdzenie nie zużywa kodu.</span></article>
        <article><strong>2. Wybierz gatunek i temat</strong><span>Przejdziesz przez zwykły formularz Kwadransa.</span></article>
        <article><strong>3. Wybierz termin</strong><span>Kod nie omija terminarza ani zasad dostępności.</span></article>
      </section>

      <section className="clinic-partners-section" aria-labelledby="clinic-partners-title">
        <h2 id="clinic-partners-title">Lecznice uczestniczące w programie</h2>
        {CLINIC_PARTNERS.length ? (
          <div className="clinic-partners-grid">
            {CLINIC_PARTNERS.map((clinic) => (
              <a key={clinic.slug} href={clinic.website ?? '#'} className="clinic-partner-card" aria-label={clinic.name}>
                <Image src={clinic.logoSrc} alt={clinic.logoAlt} width={220} height={100} />
                <span>{clinic.name}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="muted">Lista będzie uzupełniana wyłącznie o lecznice, które potwierdziły udział i zgodę na publikację logotypu.</p>
        )}
      </section>
    </ReferencePageShell>
  )
}