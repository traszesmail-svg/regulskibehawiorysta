import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons-config'
import { WEEKLY_PRICE_VALIDITY_COPY } from '@/lib/pricing'

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
    price: '69 zĹ‚',
    desc: '15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Po rozmowie masz prawo do 2 dopytaĹ„ na czacie w swoim pokoju konsultacji.',
    features: ['jedno gĹ‚Ăłwne pytanie', '15 min audio', 'do 2 pytaĹ„ w pokoju po rozmowie'],
    highlight: true,
    bookUrl: '/book',
  },
  {
    slug: 'kwadrans-na-juz',
    icon: 'zap',
    title: 'Kwadrans na juĹĽ',
    price: '99 zĹ‚',
    desc: 'Ten sam zakres co Kwadrans (w tym prawo do 2 dopytaĹ„ na czacie w pokoju), ale z priorytetem i najbliĹĽszym realnym terminem.',
    features: ['wariant priorytetowy', 'najbliĹĽszy realny termin', 'do 2 pytaĹ„ w pokoju po rozmowie'],
    bookUrl: '/book?service=kwadrans-na-juz',
  },
  {
    slug: 'dwa-kwadranse',
    icon: 'search',
    title: 'Dwa kwadranse',
    price: '169 zĹ‚',
    desc: '30 min online, gdy temat ma kilka wÄ…tkĂłw. Po rozmowie masz prawo do 4 dopytaĹ„ na czacie w swoim pokoju konsultacji.',
    features: ['30 min online', 'wiÄ™cej kontekstu', 'do 4 pytaĹ„ w pokoju po rozmowie'],
    bookUrl: '/book?service=konsultacja-30-min',
  },
  {
    slug: 'pelna-konsultacja',
    icon: 'clipboard-list',
    title: 'PeĹ‚na konsultacja',
    price: '470 zĹ‚',
    desc: 'OkoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, plan dziaĹ‚ania i czat w pokoju po rozmowie (tylko w miarÄ™ dostÄ™pnoĹ›ci czasu).',
    features: ['ok. 2h online', 'plan dziaĹ‚ania', 'czat w pokoju (w miarÄ™ czasu)'],
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
            UmĂłw spokojny pierwszy krok
            <Icon name="arrow-right" size={16} />
          </Link>
        </article>
      ))}
    </section>
  )
}

