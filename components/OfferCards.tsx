import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons-config'

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
    price: '69 zł',
    desc: '15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    features: ['jedno główne pytanie', '15 min audio', 'pierwszy kierunek'],
    highlight: true,
    bookUrl: '/book',
  },
  {
    slug: 'kwadrans-na-juz',
    icon: 'zap',
    title: 'Kwadrans na już',
    price: '99 zł',
    desc: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    features: ['wariant priorytetowy', 'najbliższy realny termin', 'ten sam zakres'],
    bookUrl: '/book?service=kwadrans-na-juz',
  },
  {
    slug: 'dwa-kwadranse',
    icon: 'search',
    title: 'Dwa kwadranse',
    price: '169 zł',
    desc: '30 min online, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    features: ['30 min online', 'więcej kontekstu', 'decyzja o kolejnym kroku'],
    bookUrl: '/book?service=konsultacja-30-min',
  },
  {
    slug: 'pelna-konsultacja',
    icon: 'clipboard-list',
    title: 'Pełna konsultacja',
    price: '470 zł',
    desc: 'Około 2h online dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 7 dni wsparcia przez WhatsApp.',
    features: ['ok. 2h online', 'plan działania', '7 dni WhatsApp'],
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
            <div className="offer-format-price">{offer.price}</div>
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
