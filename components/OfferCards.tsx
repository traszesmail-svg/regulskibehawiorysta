import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons-config'
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
import { PRICE_PROMOTION_LABEL, WEEKLY_PRICE_VALIDITY_COPY } from '@/lib/pricing'

interface Offer {
  slug: string
  icon: IconName
  title: string
  price: string
  desc: string
  features: string[]
  highlight?: boolean
  bookUrl: string
}

const offers: Offer[] = [
  {
    slug: 'kwadrans',
    icon: 'timer',
    title: 'Kwadrans',
    price: PUBLIC_OFFER_PRICE_LABELS.quick,
    desc: '15 min połączenia telefonicznego na jedno główne pytanie. Po rozmowie masz prawo do 2 dopytań w swoim pokoju konsultacji.',
    features: ['jedno główne pytanie', '15 min telefonicznie', 'do 2 pytań w pokoju po rozmowie'],
    highlight: true,
    bookUrl: '/book',
  },
  {
    slug: 'kwadrans-na-juz',
    icon: 'zap',
    title: 'Kwadrans na już',
    price: PUBLIC_OFFER_PRICE_LABELS.urgent,
    desc: 'Ten sam zakres co Kwadrans (w tym prawo do 2 dopytań na czacie w pokoju), ale z priorytetem i najbliższym realnym terminem.',
    features: ['wariant priorytetowy', 'najbliższy realny termin', 'do 2 pytań w pokoju po rozmowie'],
    bookUrl: '/book?service=kwadrans-na-juz',
  },
  {
    slug: 'dwa-kwadranse',
    icon: 'search',
    title: 'Dwa kwadranse',
    price: PUBLIC_OFFER_PRICE_LABELS.bridge,
    desc: '30 min połączenia telefonicznego, gdy temat ma kilka wątków. Po rozmowie masz prawo do 4 dopytań w swoim pokoju konsultacji.',
    features: ['30 min telefonicznie', 'więcej kontekstu', 'do 4 pytań w pokoju po rozmowie'],
    bookUrl: '/book?service=konsultacja-30-min',
  },
  {
    slug: 'pelna-konsultacja',
    icon: 'clipboard-list',
    title: 'Pełna konsultacja',
    price: PUBLIC_OFFER_PRICE_LABELS.premium,
    desc: 'Około 2h przez Jitsi dla spraw złożonych: analiza zachowania, plan działania i 14 dni komunikacji w pokoju klienta.',
    features: ['ok. 2h przez Jitsi', 'plan działania', '14 dni w pokoju klienta'],
    bookUrl: '/book?service=konsultacja-behawioralna-online',
  },
]

export function OfferCards() {
  return (
    <section className="offer-format-grid" aria-label="Formaty konsultacji">
      {offers.map((offer) => (
        <article key={offer.slug} className={`offer-format-card${offer.highlight ? ' is-highlighted' : ''}`}>
          <div className="offer-format-icon">
            <Icon name={offer.icon} size={28} />
          </div>

          <div className="offer-format-head">
            <h3>{offer.title}</h3>
            <div>
              <span className="offer-format-promo-label">{PRICE_PROMOTION_LABEL}</span>
              <div className="offer-format-price">{offer.price}</div>
              <small className="offer-format-validity">{WEEKLY_PRICE_VALIDITY_COPY}</small>
            </div>
          </div>
          <p className="offer-format-desc">{offer.desc}</p>

          <ul className="offer-format-features">
            {offer.features.map((feature) => (
              <li key={feature}>
                <Icon name="check" size={18} strokeWidth={3} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Link href={offer.bookUrl} prefetch={false} className="offer-format-link">
            Umów spokojny pierwszy krok
            <Icon name="arrow-right" size={16} />
          </Link>
        </article>
      ))}
    </section>
  )
}

