import Link from 'next/link'
import { CheckCircle2, WalletCards } from 'lucide-react'
import { buildBookHref } from '@/lib/booking-routing'
import { FUNNEL_SERVICE_CONFIG, type PublicBookingServiceType } from '@/lib/funnel'
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
import { PRICE_PROMOTION_LABEL, WEEKLY_PRICE_VALIDITY_COPY } from '@/lib/pricing'

export const bookHref = '/zapytaj'
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
    title: 'Zapytaj behawiorystę - gdy potrzebujesz pierwszego kierunku',
    summaryTitle: 'Zapytaj behawiorystę',
    price: PUBLIC_OFFER_PRICE_LABELS.quick,
    copy: 'Rozmowa telefoniczna do 15 minut. Opowiadasz, co się dzieje, a dostajesz pierwszy kierunek działania i dwa pytania po rozmowie.',
    supportCopy:
      'Dostajesz pierwszą ocenę sytuacji na podstawie przekazanych informacji: co warto sprawdzić i czego na razie nie dokładać na ślepo.',
    features: ['do 15 minut telefonicznie', 'pierwszy kierunek działania', '2 pytania po rozmowie', 'brak presji na zakup kolejnej usługi'],
    cta: 'Zapytaj behawiorystę',
    featured: true,
  },
  {
    service: 'kwadrans-na-juz',
    badge: 'tylko przy dostępności',
    title: 'Zapytaj teraz - gdy widzisz aktywne okno',
    summaryTitle: 'Zapytaj teraz',
    price: PUBLIC_OFFER_PRICE_LABELS.urgent,
    copy: 'Ten sam zakres co Zapytaj behawiorystę, ale w najbliższym dostępnym oknie telefonicznym. Opcja znika, gdy nie jestem dostępny.',
    supportCopy:
      'Nie kupujesz dłuższej analizy. Płacisz za możliwość wejścia w najbliższe wolne okno, kiedy ręcznie włączę dostępność.',
    features: ['do 15 minut telefonicznie', 'najbliższe wolne okno', 'ten sam zakres co Zapytaj behawiorystę', '2 pytania po rozmowie'],
    cta: 'Zapytaj teraz',
  },
  {
    service: 'konsultacja-behawioralna-online',
    badge: 'około 90 minut przez Jitsi',
    title: 'Pełna konsultacja - gdy potrzebny jest plan i wsparcie wdrożenia',
    summaryTitle: 'Pełna konsultacja',
    price: PUBLIC_OFFER_PRICE_LABELS.premium,
    copy: 'Około 90 minut przez Jitsi dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    supportCopy:
      'To najlepszy wybór, gdy zachowanie trwa długo, ma kilka warstw albo wpływa na życie całego domu. Analiza powstaje na podstawie formularza, rozmowy, historii zachowania, kontekstu zdrowia, diety, środowiska, nagrań i danych, które przekażesz przed konsultacją.',
    features: ['sprawy złożone albo trwające długo', 'prawdopodobna przyczyna problemu', 'plan działania', '14 dni komunikacji w pokoju klienta'],
    cta: 'Zobacz pełną konsultację',
  },
]

export function getDirectBookingHref(service: PublicBookingServiceType) {
  if (service === 'konsultacja-behawioralna-online') return '/konsultacja'

  return buildBookHref(null, service)
}

export const pricingFaqItems = [
  {
    question: 'Czy w Zapytaj behawiorystę dostanę analizę sytuacji?',
    answer:
      'Dostaniesz pierwszy kierunek oparty na Twoim opisie i dwa pytania po rozmowie. Przy sprawach złożonych pełniejsza analiza wymaga około 90 minut, formularza, historii zachowania i czasem nagrań.',
  },
  {
    question: 'Czym różni się Zapytaj teraz?',
    answer:
      'Zakres jest taki sam jak przy Zapytaj behawiorystę, ale rozmowa odbywa się w najbliższym wolnym oknie. Opcja jest widoczna tylko przy ręcznie włączonej dostępności.',
  },
  {
    question: 'Kiedy od razu pełna konsultacja?',
    answer:
      'Gdy zachowanie trwa długo, wraca mimo prób, wpływa na życie domowników albo dotyczy kilku obszarów naraz. Pełna konsultacja trwa około 90 minut przez Jitsi i ma sens wtedy, gdy potrzebujesz analizy, planu oraz 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
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
        <span>od {PUBLIC_OFFER_PRICE_LABELS.quick}</span>
      </div>
      <p className="reference-price-validity">
        {PRICE_PROMOTION_LABEL}. {WEEKLY_PRICE_VALIDITY_COPY}
      </p>
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
              <div className="reference-price-value">
                <span className="reference-price-promo-label">{PRICE_PROMOTION_LABEL}</span>
                <strong>{card.price}</strong>
                <small className="reference-price-validity">{WEEKLY_PRICE_VALIDITY_COPY}</small>
              </div>
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

