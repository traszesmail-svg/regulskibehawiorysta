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
    slug: 'zapytaj-behawioryste',
    icon: 'timer',
    title: 'Zapytaj behawiorystę',
    price: PUBLIC_OFFER_PRICE_LABELS.quick,
    desc: 'Rozmowa telefoniczna do 15 minut. Opowiadasz, co się dzieje, a po rozmowie masz prawo do 2 dopytań w swoim pokoju.',
    features: ['pierwszy kierunek działania', 'do 15 min telefonicznie', 'do 2 pytań w pokoju po rozmowie'],
    highlight: true,
    bookUrl: '/zapytaj',
  },
  {
    slug: 'zapytaj-teraz',
    icon: 'zap',
    title: 'Zapytaj teraz',
    price: PUBLIC_OFFER_PRICE_LABELS.urgent,
    desc: 'Ten sam zakres co Zapytaj behawiorystę, ale w najbliższym dostępnym oknie. Opcja pojawia się tylko przy ręcznie włączonej dostępności.',
    features: ['najbliższe wolne okno', 'do 15 min telefonicznie', 'do 2 pytań w pokoju po rozmowie'],
    bookUrl: '/zapytaj',
  },
  {
    slug: 'pelna-konsultacja',
    icon: 'clipboard-list',
    title: 'Pełna konsultacja',
    price: PUBLIC_OFFER_PRICE_LABELS.premium,
    desc: 'Około 90 minut przez Jitsi dla spraw złożonych: analiza zachowania, plan działania i 14 dni komunikacji w pokoju klienta.',
    features: ['około 90 minut przez Jitsi', 'plan działania', '14 dni w pokoju klienta'],
    bookUrl: '/konsultacja',
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

