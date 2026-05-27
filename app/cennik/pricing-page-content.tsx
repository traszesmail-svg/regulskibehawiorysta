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
    price: '69 zł',
    copy: '15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    supportCopy:
      'Dostajesz wstępną analizę zachowania na podstawie przekazanych informacji: co może być głównym mechanizmem zachowania, co warto sprawdzić i czego nie robić na ślepo.',
    features: ['jedno główne pytanie', 'audio bez kamery', 'pierwszy kierunek działania', 'decyzja, czy potrzebny jest szerszy format'],
    cta: 'Chcę zacząć od Kwadransa',
    featured: true,
  },
  {
    service: 'kwadrans-na-juz',
    badge: 'priorytet',
    title: 'Kwadrans na już - gdy nie chcesz czekać',
    summaryTitle: 'Kwadrans na już  gdy nie chcesz czekać',
    price: '99 zł',
    copy: 'Ten sam zakres co Kwadrans, ale z priorytetową odpowiedzią i najbliższym realnym terminem. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    supportCopy:
      'Nie kupujesz dłuższej analizy, tylko priorytet terminu. Zakres rozmowy zostaje taki sam jak w zwykłym Kwadransie.',
    features: ['ten sam zakres co Kwadrans', 'priorytetowa odpowiedź', 'pierwszy kierunek działania', 'dla tematów pilnych, ale krótkich'],
    cta: 'Chcę szybszy termin',
  },
  {
    service: 'konsultacja-30-min',
    badge: 'więcej czasu',
    title: 'Dwa kwadranse - gdy z jednego pytania robi się kilka',
    summaryTitle: 'Dwa kwadranse  gdy z jednego pytania robi się kilka',
    price: '169 zł',
    copy: '30 min online, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    supportCopy:
      'Wspólnie układamy fakty, szukamy najbardziej prawdopodobnej przyczyny zachowania i tworzę analizę behawioralną opartą na Twoim opisie, formularzu i kontekście domu, spacerów albo relacji między zwierzętami.',
    features: ['więcej czasu na kontekst', 'spokojniejsze zalecenia', 'dwa-trzy wątki naraz', 'bez 7-dniowego wsparcia WhatsApp'],
    cta: 'Chcę spokojniej omówić temat',
  },
  {
    service: 'konsultacja-behawioralna-online',
    badge: 'ok. 2h online',
    title: 'Pełna konsultacja - gdy potrzebny jest plan i wsparcie wdrożenia',
    summaryTitle: 'Pełna konsultacja  gdy potrzebny jest plan, nie tylko podpowiedź',
    price: '470 zł',
    copy: 'Około 2h online dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń.',
    supportCopy:
      'To najlepszy wybór, gdy zachowanie trwa długo, ma kilka warstw albo wpływa na życie całego domu. Analiza powstaje na podstawie formularza, rozmowy, historii zachowania, kontekstu zdrowia, diety, środowiska, nagrań i danych, które przekażesz przed konsultacją.',
    features: ['sprawy złożone albo trwające długo', 'prawdopodobna przyczyna problemu', 'plan działania', '7 dni wsparcia przez WhatsApp'],
    cta: 'Chcę pełną konsultację',
  },
]

export function getDirectBookingHref(service: PublicBookingServiceType) {
  return buildBookHref(null, service)
}

export const pricingFaqItems = [
  {
    question: 'Czy w Kwadransie też dostanę analizę behawioralną?',
    answer:
      'Tak, ale zakres analizy zależy od ilości informacji. W Kwadransie dostajesz wstępną analizę zachowania i pierwszy kierunek działania. Przy sprawach złożonych pełniejsza analiza wymaga dłuższej rozmowy, formularza, historii zachowania i czasem nagrań.',
  },
  {
    question: 'Kiedy wybrać Dwa kwadranse?',
    answer:
      'Gdy jedno pytanie zaczyna łączyć się z kilkoma rzeczami: spacerem, emocjami, domem, relacją, dietą albo zdrowiem. 30 minut daje więcej miejsca na uporządkowanie faktów i spokojniejszą analizę zachowania opartą na danych.',
  },
  {
    question: 'Kiedy od razu pełna konsultacja?',
    answer:
      'Gdy zachowanie trwa długo, wraca mimo prób, wpływa na życie domowników albo dotyczy kilku obszarów naraz. Pełna konsultacja trwa około 2h online i ma sens wtedy, gdy potrzebujesz analizy, planu oraz 7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń.',
  },
  {
    question: 'Czy analiza zachowania zastępuje wizytę u lekarza weterynarii?',
    answer:
      'Nie. Analiza zachowania opiera się na informacjach o zachowaniu, środowisku, rutynie, diecie i historii zwierzęcia. Jeśli coś może mieć tło zdrowotne, warto równolegle skonsultować się z lekarzem weterynarii.',
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
    <div className="reference-pricing-summary" aria-label="Skrót cennika">
      <div className="reference-pricing-badge">
        <WalletCards size={24} strokeWidth={1.7} aria-hidden="true" />
        <span>od 69 zł</span>
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
          Zobacz pełny cennik
        </Link>
      </div>
    </div>
  )
}

export function PricingCardsSection({ className = '' }: { className?: string }) {
  return (
    <section className={`reference-section-card ${className}`.trim()}>
      <h2>Wybierz konkretną rozmowę</h2>
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
                Nie wiem, pomóż dobrać
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
