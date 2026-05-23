import Link from 'next/link'
import { NotatnikSectionHead } from '@/components/NotatnikA'
import { COPY_CTA, COPY_SERVICE_NAMES } from '@/lib/copy-governance'
import { getPublicServicePriceLabel } from '@/lib/funnel'
import { PUBLIC_OFFER_DECISION_COPY, PUBLIC_OFFER_FULL_CONSULTATION_VALUE } from '@/lib/public-offer-copy'

type ServiceDecisionSectionProps = {
  index: string
  eyebrow: string
  title: string
  description: string
  audioHref: string
  consultationHref: string
  serviceHref: string
  serviceLead: string
  quickBullets: string[]
  consultationBullets: string[]
  serviceLinkLabel?: string
}

export function ServiceDecisionSection({
  index,
  eyebrow,
  title,
  description,
  audioHref,
  consultationHref,
  serviceHref,
  serviceLead,
  quickBullets,
  consultationBullets,
  serviceLinkLabel = 'strony usługi online',
}: ServiceDecisionSectionProps) {
  return (
    <section className="notatnik-service-section">
      <NotatnikSectionHead index={index} kicker={eyebrow} title={title} />
      <p className="notatnik-service-description">{description}</p>

      <div className="notatnik-service-grid">
        <article className="notatnik-service-card">
          <div className="notatnik-mono">{COPY_SERVICE_NAMES.primary}</div>
          <h3>{PUBLIC_OFFER_DECISION_COPY.quick}</h3>
          <p>{serviceLead}</p>
          <div className="notatnik-service-meta" aria-label="Parametry Kwadransu">
            <span>{COPY_SERVICE_NAMES.primaryDescriptor}</span>
            <span>{getPublicServicePriceLabel('szybka-konsultacja-15-min')}</span>
            <span>najprostszy start</span>
          </div>
          <ul className="notatnik-service-list">
            {quickBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="notatnik-service-actions">
            <Link href={audioHref} prefetch={false} className="notatnik-btn">
              {COPY_CTA.primary}
            </Link>
          </div>
        </article>

        <article className="notatnik-service-card">
          <div className="notatnik-mono">Pełna konsultacja</div>
          <h3>{PUBLIC_OFFER_DECISION_COPY.premium}</h3>
          <p>{PUBLIC_OFFER_FULL_CONSULTATION_VALUE}</p>
          <div className="notatnik-service-meta" aria-label="Parametry pełnej konsultacji">
            <span>ok. 2h online</span>
            <span>{getPublicServicePriceLabel('konsultacja-behawioralna-online')}</span>
            <span>plan + 7 dni WhatsApp</span>
          </div>
          <ul className="notatnik-service-list">
            {consultationBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <p className="notatnik-service-note">
            Po rozmowie masz 7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń. Możesz dopytywać, wysyłać filmy i konsultować kolejne kroki planu.
          </p>
          <div className="notatnik-service-actions">
            <Link href={consultationHref} prefetch={false} className="notatnik-btn notatnik-btn-ghost">
              {COPY_CTA.consultation}
            </Link>
          </div>
        </article>
      </div>

      <p className="notatnik-service-note">
        Jeśli chcesz najpierw zobaczyć pełny opis szerokiej usługi online dla całej Polski, przejdź do{' '}
        <Link href={serviceHref} prefetch={false} className="notatnik-inline-link">
          {serviceLinkLabel}
        </Link>
        .
      </p>
    </section>
  )
}
