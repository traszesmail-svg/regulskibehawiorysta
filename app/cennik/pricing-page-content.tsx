import Link from 'next/link'
import { CheckCircle2, WalletCards } from 'lucide-react'
import { buildBookHref } from '@/lib/booking-routing'
import { FUNNEL_SERVICE_CONFIG, type PublicBookingServiceType } from '@/lib/funnel'

export const bookHref = '/'
export const contactHref = '/kontakt#formularz'
export const fullPricingHref = '/cennik/pelny'

export const pricingCards: Array<{
  service: PublicBookingServiceType
  badge: string
  title: string
  summaryTitle: string
  price: string
  copy: string
  supportCopy: string
  features: string[]
  cta: string
  featured?: boolean
}> = [
  {
    service: 'szybka-konsultacja-15-min',
    badge: 'najprostszy start',
    title: 'Kwadrans - gdy potrzebujesz pierwszego kierunku',
    summaryTitle: 'Kwadrans  gdy potrzebujesz pierwszego kierunku',
    price: '69 zĹ‚',
    copy: '15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.',
    supportCopy:
      'Dostajesz wstÄ™pnÄ… analizÄ™ zachowania na podstawie przekazanych informacji: co moĹĽe byÄ‡ gĹ‚Ăłwnym mechanizmem zachowania, co warto sprawdziÄ‡ i czego nie robiÄ‡ na Ĺ›lepo.',
    features: ['jedno gĹ‚Ăłwne pytanie', 'audio bez kamery', 'pierwszy kierunek dziaĹ‚ania', 'decyzja, czy potrzebny jest szerszy format'],
    cta: 'ChcÄ™ zaczÄ…Ä‡ od Kwadransa',
    featured: true,
  },
  {
    service: 'kwadrans-na-juz',
    badge: 'priorytet',
    title: 'Kwadrans na juĹĽ - gdy nie chcesz czekaÄ‡',
    summaryTitle: 'Kwadrans na juĹĽ  gdy nie chcesz czekaÄ‡',
    price: '99 zĹ‚',
    copy: 'Ten sam zakres co Kwadrans, ale z priorytetowÄ… odpowiedziÄ… i najbliĹĽszym realnym terminem. Dla spraw pilnych, ktĂłre nie wymagajÄ… dĹ‚uĹĽszej analizy.',
    supportCopy:
      'Nie kupujesz dĹ‚uĹĽszej analizy, tylko priorytet terminu. Zakres rozmowy zostaje taki sam jak w zwykĹ‚ym Kwadransie.',
    features: ['ten sam zakres co Kwadrans', 'priorytetowa odpowiedĹş', 'pierwszy kierunek dziaĹ‚ania', 'dla tematĂłw pilnych, ale krĂłtkich'],
    cta: 'ChcÄ™ szybszy termin',
  },
  {
    service: 'konsultacja-30-min',
    badge: 'wiÄ™cej czasu',
    title: 'Dwa kwadranse - gdy z jednego pytania robi siÄ™ kilka',
    summaryTitle: 'Dwa kwadranse  gdy z jednego pytania robi siÄ™ kilka',
    price: '169 zĹ‚',
    copy: '30 min online, gdy temat ma kilka wÄ…tkĂłw. WiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.',
    supportCopy:
      'WspĂłlnie ukĹ‚adamy fakty, szukamy najbardziej prawdopodobnej przyczyny zachowania i tworzÄ™ analizÄ™ behawioralnÄ… opartÄ… na Twoim opisie, formularzu i kontekĹ›cie domu, spacerĂłw albo relacji miÄ™dzy zwierzÄ™tami.',
    features: ['wiÄ™cej czasu na kontekst', 'spokojniejsze zalecenia', 'dwa-trzy wÄ…tki naraz', 'bez 14-dniowej komunikacji w pokoju klienta'],
    cta: 'ChcÄ™ spokojniej omĂłwiÄ‡ temat',
  },
  {
    service: 'konsultacja-behawioralna-online',
    badge: 'ok. 2h online',
    title: 'PeĹ‚na konsultacja - gdy potrzebny jest plan i wsparcie wdroĹĽenia',
    summaryTitle: 'PeĹ‚na konsultacja  gdy potrzebny jest plan, nie tylko podpowiedĹş',
    price: '470 zĹ‚',
    copy: 'OkoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
    supportCopy:
      'To najlepszy wybĂłr, gdy zachowanie trwa dĹ‚ugo, ma kilka warstw albo wpĹ‚ywa na ĹĽycie caĹ‚ego domu. Analiza powstaje na podstawie formularza, rozmowy, historii zachowania, kontekstu zdrowia, diety, Ĺ›rodowiska, nagraĹ„ i danych, ktĂłre przekaĹĽesz przed konsultacjÄ….',
    features: ['sprawy zĹ‚oĹĽone albo trwajÄ…ce dĹ‚ugo', 'prawdopodobna przyczyna problemu', 'plan dziaĹ‚ania', '14 dni komunikacji w pokoju klienta'],
    cta: 'ChcÄ™ peĹ‚nÄ… konsultacjÄ™',
  },
]

export function getDirectBookingHref(service: PublicBookingServiceType) {
  return buildBookHref(null, service)
}

export const pricingFaqItems = [
  {
    question: 'Czy w Kwadransie teĹĽ dostanÄ™ analizÄ™ behawioralnÄ…?',
    answer:
      'Tak, ale zakres analizy zaleĹĽy od iloĹ›ci informacji. W Kwadransie dostajesz wstÄ™pnÄ… analizÄ™ zachowania i pierwszy kierunek dziaĹ‚ania. Przy sprawach zĹ‚oĹĽonych peĹ‚niejsza analiza wymaga dĹ‚uĹĽszej rozmowy, formularza, historii zachowania i czasem nagraĹ„.',
  },
  {
    question: 'Kiedy wybraÄ‡ Dwa kwadranse?',
    answer:
      'Gdy jedno pytanie zaczyna Ĺ‚Ä…czyÄ‡ siÄ™ z kilkoma rzeczami: spacerem, emocjami, domem, relacjÄ…, dietÄ… albo zdrowiem. 30 minut daje wiÄ™cej miejsca na uporzÄ…dkowanie faktĂłw i spokojniejszÄ… analizÄ™ zachowania opartÄ… na danych.',
  },
  {
    question: 'Kiedy od razu peĹ‚na konsultacja?',
    answer:
      'Gdy zachowanie trwa dĹ‚ugo, wraca mimo prĂłb, wpĹ‚ywa na ĹĽycie domownikĂłw albo dotyczy kilku obszarĂłw naraz. PeĹ‚na konsultacja trwa okoĹ‚o 2h online i ma sens wtedy, gdy potrzebujesz analizy, planu oraz 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
  },
  {
    question: 'Czy analiza zachowania zastÄ™puje wizytÄ™ u lekarza weterynarii?',
    answer:
      'Nie. Analiza zachowania opiera siÄ™ na informacjach o zachowaniu, Ĺ›rodowisku, rutynie, diecie i historii zwierzÄ™cia. JeĹ›li coĹ› moĹĽe mieÄ‡ tĹ‚o zdrowotne, warto rĂłwnolegle skonsultowaÄ‡ siÄ™ z lekarzem weterynarii.',
  },
]

export function getPricingOfferCatalog() {
  return pricingCards.map((card) => {
    const service = FUNNEL_SERVICE_CONFIG[card.service]

    return {
      name: service.title,
      description: service.publicSummary,
      url: getDirectBookingHref(card.service),
      price: service.priceAmount,
    }
  })
}

export function PricingSummaryCard() {
  return (
    <div className="reference-pricing-summary" aria-label="SkrĂłt cennika">
      <div className="reference-pricing-badge">
        <WalletCards size={24} strokeWidth={1.7} aria-hidden="true" />
        <span>od 69 zĹ‚</span>
      </div>
      <div className="reference-price-ladder">
        {pricingCards.map((card) => (
          <Link key={card.service} href={getDirectBookingHref(card.service)} prefetch={false} className="reference-price-ladder-row">
            <span>{card.summaryTitle}</span>
            <strong>{card.price}</strong>
          </Link>
        ))}
      </div>
      <div className="reference-pricing-summary-action">
        <Link href={fullPricingHref} prefetch={false} className="reference-btn reference-btn-secondary">
          Zobacz peĹ‚ny cennik
        </Link>
      </div>
    </div>
  )
}

export function PricingCardsSection({ className = '' }: { className?: string }) {
  return (
    <section className={`reference-section-card ${className}`.trim()}>
      <h2>Wybierz konkretnÄ… rozmowÄ™</h2>
      <div className="reference-pricing-grid">
        {pricingCards.map((card) => (
          <article key={card.service} className={`reference-price-card${card.featured ? ' is-featured' : ''}`}>
            <span className="reference-price-badge">{card.badge}</span>
            <div className="reference-price-heading">
              <h3>{card.title}</h3>
              <strong>{card.price}</strong>
            </div>
            <p>{card.copy}</p>
            <p>{card.supportCopy}</p>
            <ul>
              {card.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={17} strokeWidth={1.8} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="reference-price-actions">
              <Link
                href={getDirectBookingHref(card.service)}
                prefetch={false}
                className={card.featured ? 'reference-btn reference-btn-primary' : 'reference-btn reference-btn-secondary'}
              >
                {card.cta}
              </Link>
              <Link href={bookHref} prefetch={false} className="reference-price-helper-link">
                Nie wiem, pomĂłĹĽ dobraÄ‡
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

