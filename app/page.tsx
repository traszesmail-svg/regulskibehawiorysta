import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, CalendarDays, MessageSquareText, PhoneCall } from 'lucide-react'
import { EditorialIndexTopbar } from '@/components/EditorialIndexTopbar'
import { FaqAccordion } from '@/components/FaqAccordion'
import { FinalReviewsQuoteCarousel } from '@/components/FinalReviewsQuoteCarousel'
import { HomepageZapytajHero } from '@/components/HomepageZapytajHero'
import { NotatnikFooter } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { PUBLIC_ZAPYTAJ_OFFER, formatPublicOfferPrice } from '@/lib/public-offer'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildHomeMetadata } from '@/lib/seo'
import { SPECIALIST_NAME, SPECIALIST_PUBLIC_STATUS } from '@/lib/site'
import { reviews } from '@/lib/reviews.config'
import styles from './homepage-light.module.css'

export async function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata()
}

const routerFaqItems = [
  {
    question: 'Czy muszę znać nazwę problemu?',
    answer: 'Nie. Wystarczy własnymi słowami opisać, co robi pies albo kot, kiedy to się dzieje i co już było próbowane.',
  },
  {
    question: 'Co dostanę po rozmowie?',
    answer: 'Porządkujemy sytuację, wskazuję pierwszy praktyczny krok i mówię, co robić dalej. Jeśli temat wymaga szerszego procesu, wyjaśnię to wprost.',
  },
  {
    question: 'Czym różni się Zapytaj behawiorystę od pełnej konsultacji?',
    answer: 'Zapytaj behawiorystę to krótka, płatna rozmowa na pierwszy kierunek. Pełna konsultacja trwa około 90 minut i jest dostępna po indywidualnym zaproszeniu oraz osobnej płatności.',
  },
  {
    question: 'Czy pracujesz z psami i kotami?',
    answer: 'Tak. Rozmowa może dotyczyć zachowania psa lub kota, a opis sytuacji zaczynasz bez wybierania rasy i bez fachowych etykiet.',
  },
] as const

const homepageSteps = [
  { title: 'Opisujesz sytuację', copy: 'Kilka zdań o tym, co Cię niepokoi.', Icon: MessageSquareText },
  { title: 'Rezerwujesz rozmowę', copy: 'Wybierasz dostępny termin i opłacasz rozmowę.', Icon: CalendarDays },
  { title: 'Rozmawiamy', copy: 'Ustalamy pierwszy krok i dalsze możliwości pomocy.', Icon: PhoneCall },
] as const

export default function HomePage() {
  const structuredData = [
    getBreadcrumbJsonLd([{ name: 'Strona główna', path: '/' }]),
    getServiceJsonLd({
      name: 'Behawiorysta psów i kotów online',
      description:
        'Wsparcie behawioralne online dla opiekunów psów i kotów. Pierwszym krokiem jest krótka, płatna rozmowa z behawiorystą, która porządkuje sytuację i wskazuje, co można zrobić dalej.',
      serviceUrl: '/zapytaj',
      offerCatalog: [
        {
          name: 'Zapytaj behawiorystę',
          description: 'Krótka, płatna rozmowa telefoniczna na pierwszy praktyczny kierunek.',
          url: '/zapytaj',
          price: 79,
        },
      ],
    }),
    getFaqPageJsonLd([...routerFaqItems]),
  ]

  return (
    <main className={`${styles.page} notatnik-page homepage-shell homepage-sales-page`}>
      <Schema data={structuredData} />
      <div className="notatnik-shell homepage-main">
        <EditorialIndexTopbar />

        <section className="notatnik-router-hero-section homepage-sales-hero">
          <HomepageZapytajHero />
        </section>

        <section className="homepage-sales-process" id="jak-to-działa" aria-labelledby="homepage-process-title">
          <div className="homepage-sales-section-heading">
            <span>JAK ZACZĄĆ</span>
            <h2 id="homepage-process-title">Trzy proste kroki.</h2>
          </div>
          <div className="homepage-sales-process-grid">
            {homepageSteps.map(({ title, copy, Icon }) => (
              <article key={title}>
                <Icon aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="homepage-trust-line" aria-label="Informacje o specjaliście">
          <BadgeCheck aria-hidden="true" />
          <span><strong>{SPECIALIST_NAME}</strong> · {SPECIALIST_PUBLIC_STATUS} · technik weterynarii</span>
          <Link href="/o-mnie" prefetch={false}>Poznaj podejście <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>

        <FinalReviewsQuoteCarousel reviews={reviews} initialIndex={0} layout="editorial" />

        <section className="homepage-sales-faq" aria-labelledby="homepage-faq-title">
          <div className="homepage-sales-section-heading">
            <span>NAJCZĘSTSZE PYTANIA</span>
            <h2 id="homepage-faq-title">Zanim zaczniesz</h2>
            <p>Nie wiesz, jak opisać sytuację? <Link href="/mapa-sprawy" prefetch={false}>Otwórz Mapę zachowania.</Link></p>
          </div>
          <FaqAccordion items={routerFaqItems.map((item) => ({ q: item.question, a: item.answer }))} />
        </section>

        <section className="homepage-final-cta" aria-labelledby="homepage-final-cta-title">
          <div>
            <h2 id="homepage-final-cta-title">Chcesz wiedzieć, od czego zacząć?</h2>
            <p>Opowiedz, co się dzieje. W rozmowie do 15 minut ustalimy pierwszy kierunek działania.</p>
            <Link href="/zapytaj" prefetch={false} className="notatnik-btn homepage-final-cta-button">
              <span>Zapytaj behawiorystę — {formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}</span>
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <NotatnikFooter
          variant="home"
          primaryHref="/zapytaj#formularz"
          primaryLabel={`Zapytaj behawiorystę — ${formatPublicOfferPrice(PUBLIC_ZAPYTAJ_OFFER.pricePln)}`}
          showReviews={false}
        />
      </div>
    </main>
  )
}
