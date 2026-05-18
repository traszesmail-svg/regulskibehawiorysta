import Link from 'next/link'
import { PriceDisplay } from '@/components/PriceDisplay'
import { buildBookHref, type BookingSpecies } from '@/lib/booking-routing'
import { PUBLIC_OFFER_CANCELLATION_COPY, PUBLIC_OFFER_FULL_VALUE_POINTS, PUBLIC_OFFER_PRICES } from '@/lib/public-offer-copy'

type ServicesComparisonProps = {
  species?: BookingSpecies | null
  qaBooking?: boolean
  className?: string
}

const SERVICES = [
  {
    id: 'szybka-konsultacja-15-min',
    title: '15-minutowa konsultacja behawioralna',
    badge: 'Najprostszy start',
    price: PUBLIC_OFFER_PRICES.quick,
    duration: '15 min',
    mode: 'audio, bez kamery',
    who: 'jedno główne pytanie i szybkie uporządkowanie sytuacji',
    plan: 'pierwszy kierunek działania i decyzja, czy potrzebny jest szerszy format',
    materials: 'bez wsparcia po rozmowie; to krótki pierwszy krok',
    refund: PUBLIC_OFFER_CANCELLATION_COPY,
    cta: 'Chcę zacząć od Kwadransa',
  },
  {
    id: 'konsultacja-30-min',
    title: 'Dwa kwadranse',
    badge: null,
    price: PUBLIC_OFFER_PRICES.bridge,
    duration: '30 min',
    mode: 'audio lub video',
    who: 'gdy temat ma kilka wątków i 15 minut to za mało',
    plan: 'więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja',
    materials: 'bez 7-dniowego wsparcia WhatsApp po rozmowie',
    refund: PUBLIC_OFFER_CANCELLATION_COPY,
    cta: 'Chcę spokojniej omówić temat',
  },
  {
    id: 'konsultacja-behawioralna-online',
    title: 'Pełna konsultacja',
    badge: null,
    price: PUBLIC_OFFER_PRICES.premium,
    duration: 'ok. 2h online',
    mode: 'audio lub video',
    who: 'gdy sytuacja jest złożona, trwa długo albo obejmuje kilka obszarów naraz',
    plan: 'diagnoza, prawdopodobna przyczyna problemu i plan działania',
    materials: '7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń',
    refund: 'Osobny regulamin dla pełnej konsultacji.',
    cta: 'Chcę pełną konsultację',
  },
] as const

const ROWS = [
  { key: 'price', label: 'Cena' },
  { key: 'duration', label: 'Czas' },
  { key: 'mode', label: 'Forma' },
  { key: 'who', label: 'Kiedy wybrać' },
  { key: 'plan', label: 'Po co ta rozmowa' },
  { key: 'materials', label: 'Po rozmowie' },
  { key: 'refund', label: 'Zmiana / zwrot' },
  { key: 'cta', label: 'CTA' },
] as const

function getHref(serviceId: (typeof SERVICES)[number]['id'], species?: BookingSpecies | null, qaBooking?: boolean) {
  return buildBookHref(null, serviceId === 'szybka-konsultacja-15-min' ? null : serviceId, qaBooking ?? false, species ?? null)
}

export function ServicesComparison({ species = null, qaBooking = false, className }: ServicesComparisonProps) {
  return (
    <section className={className ? `services-comparison ${className}` : 'services-comparison'} aria-label="Porównanie usług">
      <div className="services-comparison-desktop" role="table" aria-label="Tabela porównawcza usług">
        <div className="services-comparison-grid services-comparison-grid-head" role="rowgroup">
          <div className="services-comparison-cell services-comparison-feature" role="columnheader">
            Cecha
          </div>
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className={`services-comparison-cell services-comparison-service${service.id === 'szybka-konsultacja-15-min' ? ' is-featured' : ''}`}
              role="columnheader"
            >
              <div className="services-comparison-service-head">
                <span>{service.title}</span>
                {service.badge ? <span className="services-comparison-badge">{service.badge}</span> : null}
              </div>
            </div>
          ))}
        </div>

        {ROWS.map((row) => (
          <div key={row.key} className="services-comparison-grid" role="row">
            <div className="services-comparison-cell services-comparison-feature" role="rowheader">
              {row.label}
            </div>
            {SERVICES.map((service) => (
              <div
                key={`${row.key}-${service.id}`}
                className={`services-comparison-cell${service.id === 'szybka-konsultacja-15-min' ? ' is-featured' : ''}`}
                role="cell"
              >
                {row.key === 'price' ? (
                  <PriceDisplay amount={service.price} />
                ) : row.key === 'cta' ? (
                  <Link href={getHref(service.id, species, qaBooking)} prefetch={false} className="services-comparison-link">
                    {service.cta}
                  </Link>
        ) : (
          <span>{service[row.key]}</span>
        )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="services-comparison-mobile">
        {SERVICES.map((service) => (
          <article key={service.id} className={`services-mobile-card${service.id === 'szybka-konsultacja-15-min' ? ' is-featured' : ''}`}>
            <div className="services-mobile-card-head">
              <div>
                <div className="notatnik-mono">{service.title}</div>
                <h3>{service.title}</h3>
              </div>
              {service.badge ? <span className="services-comparison-badge">{service.badge}</span> : null}
            </div>

            <div className="services-mobile-price">
              <PriceDisplay amount={service.price} />
            </div>

            <dl className="services-mobile-list">
              <div>
                <dt>Czas</dt>
                <dd>{service.duration}</dd>
              </div>
              <div>
                <dt>Forma</dt>
                <dd>{service.mode}</dd>
              </div>
              <div>
                <dt>Kiedy wybrać</dt>
                <dd>{service.who}</dd>
              </div>
              <div>
                <dt>Po co ta rozmowa</dt>
                <dd>{service.plan}</dd>
              </div>
              <div>
                <dt>Po rozmowie</dt>
                <dd>{service.materials}</dd>
              </div>
              <div>
                <dt>Zmiana / zwrot</dt>
                <dd>{service.refund}</dd>
              </div>
            </dl>

            {service.id === 'konsultacja-behawioralna-online' ? (
              <div className="notatnik-service-note top-gap-small" aria-label="Zakres pełnej konsultacji">
                <ul className="notatnik-service-list">
                  {PUBLIC_OFFER_FULL_VALUE_POINTS.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link href={getHref(service.id, species, qaBooking)} prefetch={false} className="services-comparison-link">
              {service.cta}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
