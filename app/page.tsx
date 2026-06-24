import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { CalendarCheck, Headphones, MessageSquareText, Video } from 'lucide-react'
import { EditorialIndexTopbar } from '@/components/EditorialIndexTopbar'
import { FinalReviewsQuoteCarousel } from '@/components/FinalReviewsQuoteCarousel'
import { FaqAccordion } from '@/components/FaqAccordion'
import { HomepageIntroPopup } from '@/components/HomepageIntroPopup'
import { HomepageServiceSelector } from '@/components/HomepageServiceSelector'
import { NotatnikFooter } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { homepageProcessSteps } from '@/lib/homepage-data'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildHomeMetadata } from '@/lib/seo'
import { COAPE_POLSKA_LOGO, HOME_HERO_PHOTO } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata()
}

const serviceLandingHref = '/'

const processIcons = [MessageSquareText, Headphones, CalendarCheck] as const

const routerFaqItems = [
  {
    question: 'Czy jeśli nie wiem, co wybrać, mogę zacząć od quizu?',
    answer: 'Tak. Quiz jest po to, żeby spokojnie wybrać pierwszy krok bez znajomości fachowych nazw.',
  },
  {
    question: 'Czy konsultacja jest dla psów i kotów?',
    answer: 'Tak. Pierwszy wybór prowadzi osobno przez tematy psie i kocie.',
  },
  {
    question: 'Czy muszę już wiedzieć, co jest przyczyną?',
    answer: 'Nie. Wystarczy opis codziennej sytuacji. Na tej podstawie układamy dane i szukamy najrozsądniejszego pierwszego kroku.',
  },
  {
    question: 'Co jeśli sytuacja ma kilka warstw?',
    answer: 'Wtedy lepiej zebrać więcej kontekstu: formularz, historię zachowania, rutynę domu lub spacerów i nagrania, jeśli są.',
  },
] as const

export default function HomePage() {
  const structuredData = [
    getBreadcrumbJsonLd([{ name: 'Strona główna', path: '/' }]),
    getServiceJsonLd({
      name: 'Behawiorysta psów i kotów online',
      description:
        'Konsultacje behawioralne online dla opiekunów psów i kotów. W każdej usłudze punktem wyjścia jest analiza zachowania oparta na informacjach przekazanych przez opiekuna.',
      serviceUrl: serviceLandingHref,
      offerCatalog: [
        { name: 'Kwadrans', description: '15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.', url: '/book?service=szybka-konsultacja-15-min', price: 69 },
        { name: 'Kwadrans na już', description: 'Ten sam zakres co Kwadrans, ale z priorytetową odpowiedzią i najbliższym realnym terminem.', url: '/kwadrans-na-juz', price: 99 },
        { name: 'Dwa kwadranse', description: '30 min online, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.', url: '/book?service=konsultacja-30-min', price: 169 },
        {
          name: 'Pełna konsultacja',
          description: 'Około 2h online dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 7 dni wsparcia przez WhatsApp.',
          url: '/book?service=konsultacja-behawioralna-online',
          price: 470,
        },
      ],
    }),
    getFaqPageJsonLd([...routerFaqItems]),
  ]

  return (
    <main className="notatnik-page homepage-shell">
      <Schema data={structuredData} />
      <HomepageIntroPopup />
      <div className="notatnik-shell homepage-main">
        <EditorialIndexTopbar />

        <section className="notatnik-router-hero-section">
          <HomepageServiceSelector />
        </section>

        <section className="compact-home-section home-process-section" id="jak-to-działa">
          <div className="home-section-title">
            <h2>Jak wygląda współpraca?</h2>
          </div>
          <div className="process-grid process-grid-compact top-gap-small">
            {homepageProcessSteps.map((step, index) => {
              const Icon = processIcons[index] ?? MessageSquareText

              return (
              <article key={step.step} className="process-card">
                <span aria-hidden="true">
                  {index === 1 ? (
                    <span className="process-icon-combo">
                      <Icon size={29} strokeWidth={1.7} />
                      <Video className="process-icon-video" size={15} strokeWidth={2} />
                    </span>
                  ) : (
                    <Icon size={28} strokeWidth={1.7} />
                  )}
                </span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
              )
            })}
          </div>
        </section>

        <section className="compact-home-section home-diagnosis-section">
          <div className="home-diagnosis-layout">
            <p className="home-diagnosis-kicker">POMOC BEHAWIORALNA DLA PSÓW I KOTÓW</p>
            <div className="home-section-title home-diagnosis-title">
              <h2>Jestem tu, żeby pomóc Tobie i Twojemu zwierzęciu</h2>
            </div>
            <div className="home-diagnosis-separator" aria-hidden="true" />
            <div className="home-diagnosis-photo-stack">
              <figure className="router-home-photo home-diagnosis-photo">
                <Image
                  src={HOME_HERO_PHOTO.src}
                  alt={HOME_HERO_PHOTO.alt}
                  fill
                  quality={86}
                  loading="lazy"
                  sizes="(max-width: 760px) 100vw, (max-width: 1180px) 42vw, 420px"
                  className="router-home-photo-image"
                />
              </figure>
              <div className="home-diagnosis-caption-row">
                <Image
                  src={COAPE_POLSKA_LOGO.src}
                  alt={COAPE_POLSKA_LOGO.alt}
                  width={COAPE_POLSKA_LOGO.width}
                  height={COAPE_POLSKA_LOGO.height}
                  loading="lazy"
                  className="home-diagnosis-coape-logo"
                />
                <p className="home-diagnosis-caption">
                  <span className="home-diagnosis-caption-name">Krzysztof Regulski</span>
                  <span>tech. wet. behawiorysta i trener</span>
                  <span>zwierząt towarzyszących COAPE</span>
                </p>
              </div>
            </div>
            <div className="home-diagnosis-copy">
              <p className="notatnik-service-description">
                Ja układam fakty i sprawdzam, co może stać za zachowaniem: emocje, zdrowie, ból, dietę, środowisko, historię uczenia się i codzienną rutynę. Dopiero potem wybieramy pierwszy krok.
              </p>
              <p className="notatnik-service-description">
                To konsultacja behawioralna dla opiekuna, nie porada weterynaryjna ani diagnoza medyczna. Jeśli opis wskazuje na ból, chorobę albo nagłą zmianę stanu, pierwszym krokiem jest lekarz weterynarii.
              </p>
            </div>
            <div className="home-diagnosis-separator home-diagnosis-separator-bottom" aria-hidden="true" />
          </div>
        </section>

        <section className="compact-home-section home-faq-section">
          <div className="home-section-title">
            <h2>
              <Link href="/faq" prefetch={false} className="home-faq-title-link">
                Najczęściej zadawane pytania
              </Link>
            </h2>
          </div>
          <div className="notatnik-faq-compact top-gap-small">
            <FaqAccordion items={routerFaqItems.map((item) => ({ q: item.question, a: item.answer }))} />
          </div>
        </section>

        <NotatnikFooter variant="home" primaryHref="/quiz" primaryLabel="Quiz" />
      </div>
    </main>
  )
}
