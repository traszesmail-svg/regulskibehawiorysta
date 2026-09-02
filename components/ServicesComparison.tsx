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
    title: 'Zapytaj behawiorystę',
    badge: 'Najprostszy start',
    price: PUBLIC_OFFER_PRICES.quick,
    duration: 'do 15 min',
    mode: 'rozmowa telefoniczna',
    who: 'opisanie sytuacji i szybkie uporządkowanie pierwszego kroku',
    plan: 'pierwszy kierunek działania i dwa pytania po rozmowie',
    materials: 'pokój klienta z możliwością 2 dopytań',
    refund: PUBLIC_OFFER_CANCELLATION_COPY,
    cta: 'Zapytaj behawiorystę',
  },
  {
    id: 'kwadrans-na-juz',
    title: 'Zapytaj teraz',
    badge: 'Tylko przy dostępności',
    price: PUBLIC_OFFER_PRICES.urgent,
    duration: 'do 15 min',
    mode: 'rozmowa telefoniczna',
    who: 'gdy widzisz, że behawiorysta jest właśnie dostępny',
    plan: 'ten sam pierwszy kierunek i dwa pytania, bez czekania na zwykły termin',
    materials: 'pokój klienta z możliwością 2 dopytań',
    refund: PUBLIC_OFFER_CANCELLATION_COPY,
    cta: 'Zapytaj teraz',
  },
  {
    id: 'konsultacja-behawioralna-online',
    title: 'Pełna konsultacja',
    badge: null,
    price: PUBLIC_OFFER_PRICES.premium,
    duration: 'około 90 minut przez Jitsi',
    mode: 'Jitsi (audio lub wideo)',
    who: 'gdy po pierwszej rozmowie potrzebny jest szerszy, indywidualny proces',
    plan: 'analiza zachowania, prawdopodobna przyczyna problemu i plan działania',
    materials: '14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń',
    refund: 'Osobny regulamin dla pełnej konsultacji.',
    cta: 'Zobacz pełną konsultację',
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
  if (serviceId === 'konsultacja-behawioralna-online') return '/konsultacja'

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

