import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarCheck, Headphones, MessageSquareText, Video } from 'lucide-react'
import { EditorialIndexTopbar } from '@/components/EditorialIndexTopbar'
import { ClinicCodeEntry } from '@/components/ClinicCodeEntry'
import { FaqAccordion } from '@/components/FaqAccordion'
import { HomepageIntroPopup } from '@/components/HomepageIntroPopup'
import { HomepageServiceSelector } from '@/components/HomepageServiceSelector'
import { NotatnikFooter } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { homepageProcessSteps } from '@/lib/homepage-data'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildHomeMetadata } from '@/lib/seo'
import { COAPE_POLSKA_LOGO, HOME_HERO_PHOTO } from '@/lib/site'
import { getSeasonalTrendRadar } from '@/lib/seasonal-trend-radar'
import { HOME_TREND_PROBLEM_CARDS } from '@/lib/trend-problems'
import { PUBLIC_OFFER_PRICES } from '@/lib/public-offer-copy'

export async function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata()
}

const serviceLandingHref = '/'

const processIcons = [MessageSquareText, Headphones, CalendarCheck] as const

const HOME_PROBLEM_VISUALS: Record<string, { src: string; alt: string }> = {
  'pies-szczeka-na-psy': {
    src: '/blog-covers/blog-dlaczego-moj-pies-szczeka-na-inne-psy-photo.webp',
    alt: 'Dwa psy spotykają się na smyczach podczas spaceru',
  },
  'pies-ciagnie-na-smyczy': {
    src: 'https://images.pexels.com/photos/9956390/pexels-photo-9956390.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Pies na smyczy pracuje z opiekunem podczas treningu spacerowego',
  },
  'pies-nie-zostaje-sam': {
    src: 'https://images.pexels.com/photos/5672282/pexels-photo-5672282.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Pies czeka przy drzwiach wejściowych w ciepłym domowym świetle',
  },
  'pies-niszczy-lub-nie-wycisza-sie': {
    src: 'https://images.pexels.com/photos/5482639/pexels-photo-5482639.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Dalmatyńczyk zajmuje się zabawką w spokojnym domowym wnętrzu',
  },
}

const HOME_SEASONAL_VISUALS: Record<string, { src: string; alt: string }> = {
  'burze-i-nagly-halas': {
    src: 'https://images.pexels.com/photos/18948630/pexels-photo-18948630.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    alt: 'Pies odpoczywa w osłoniętym miejscu podczas głośnego zdarzenia',
  },
  'wakacje-opieka-i-zmiana-rytmu': {
    src: 'https://images.pexels.com/photos/10972597/pexels-photo-10972597.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    alt: 'Pies podróżuje samochodem razem z opiekunem',
  },
  'powrot-do-pracy-i-szkoly': {
    src: 'https://images.pexels.com/photos/4969879/pexels-photo-4969879.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    alt: 'Pies odpoczywa w domu po zmianie codziennego rytmu',
  },
  'sylwester-i-fajerwerki': {
    src: 'https://images.pexels.com/photos/19823544/pexels-photo-19823544.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    alt: 'Pies odpoczywa pod kocem w spokojnym miejscu',
  },
  'adopcja-i-pierwsze-tygodnie': {
    src: 'https://images.pexels.com/photos/31525931/pexels-photo-31525931.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop',
    alt: 'Młody pies poznaje nowy dom',
  },
}

function getHomeProblemVisual(problemId: string) {
  return HOME_PROBLEM_VISUALS[problemId] ?? {
    src: 'https://images.pexels.com/photos/4588894/pexels-photo-4588894.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Pies podczas spokojnego spaceru',
  }
}

function getHomeSeasonalVisual(entryId: string) {
  return HOME_SEASONAL_VISUALS[entryId] ?? {
    src: '/images/mobile-header-pies-kot-reference.png',
    alt: 'Pies i kot odpoczywają razem w domu',
  }
}

const routerFaqItems = [
  {
    question: 'Czy jeśli nie wiem, co wybrać, mogę zacząć od Mapy zachowania?',
    answer: 'Tak. Mapa zachowania pomaga spokojnie wybrać pierwszy krok bez znajomości fachowych nazw.',
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
  const seasonalTrendRadar = getSeasonalTrendRadar()
  const structuredData = [
    getBreadcrumbJsonLd([{ name: 'Strona główna', path: '/' }]),
    getServiceJsonLd({
      name: 'Behawiorysta psów i kotów online',
      description:
        'Konsultacje behawioralne online dla opiekunów psów i kotów. W każdej usłudze punktem wyjścia jest analiza zachowania oparta na informacjach przekazanych przez opiekuna.',
      serviceUrl: serviceLandingHref,
      offerCatalog: [
        { name: 'Kwadrans', description: '15 min połączenia telefonicznego na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.', url: '/book?service=szybka-konsultacja-15-min', price: PUBLIC_OFFER_PRICES.quick },
        { name: 'Kwadrans na już', description: 'Ten sam zakres co Kwadrans, ale z priorytetową odpowiedzią i najbliższym realnym terminem telefonicznym.', url: '/kwadrans-na-juz', price: PUBLIC_OFFER_PRICES.urgent },
        { name: 'Dwa kwadranse', description: '30 min połączenia telefonicznego, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.', url: '/book?service=konsultacja-30-min', price: PUBLIC_OFFER_PRICES.bridge },
        {
          name: 'Pełna konsultacja',
          description: 'Około 2h przez Jitsi dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
          url: '/book?service=konsultacja-behawioralna-online',
          price: PUBLIC_OFFER_PRICES.premium,
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

        <aside className="homepage-clinic-entry" aria-label="Kod od lecznicy">
          <div>
            <strong>Masz kod od lecznicy?</strong>
          </div>
          <ClinicCodeEntry />
        </aside>

        <section className="compact-home-section home-trend-problems-section home-problem-story-section" id="najczestsze-problemy">
          <div className="home-problem-story-heading">
            <span className="home-trend-problems-kicker">Najczęściej szukane teraz</span>
            <h2>Wybierz problem, który najbardziej przypomina Twoją sytuację</h2>
            <p>
              Nie musisz znać przyczyny. Zacznij od tego, co widzisz na co dzień, a potem przejdź do artykułu,
              pierwszego kroku albo Mapy zachowania.
            </p>
            <Link
              href="/problemy"
              prefetch={false}
              className="home-trend-problems-all"
              data-analytics-event="cta_click"
              data-analytics-location="home-trend-problems"
              data-analytics-cta-label="Zobacz mapę problemów"
              data-analytics-item-type="problem_hub"
            >
              Zobacz mapę problemów
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>

          <div className="home-problem-story-list">
            {HOME_TREND_PROBLEM_CARDS.slice(0, 4).map((problem) => {
              const visual = getHomeProblemVisual(problem.id)

              return (
                <article
                  key={problem.id}
                  className={`home-problem-story-card home-problem-story-card-${problem.group} home-problem-story-card-${problem.id}`}
                >
                  <figure className="home-problem-story-media">
                    <Image src={visual.src} alt={visual.alt} fill unoptimized sizes="(max-width: 760px) 92vw, 420px" />
                  </figure>
                  <div className="home-problem-story-copy">
                    <span className="home-trend-problem-eyebrow">{problem.eyebrow}</span>
                    <h3>{problem.title}</h3>
                    <p>{problem.copy}</p>
                    <div className="home-trend-problem-actions">
                      <Link
                        href={problem.primaryHref}
                        prefetch={false}
                        data-analytics-event="topic_selected"
                        data-analytics-location="home-trend-problems"
                        data-analytics-problem={problem.id}
                        data-analytics-species={problem.group === 'bezpieczenstwo' ? undefined : problem.group}
                        data-analytics-cta-label={problem.primaryLabel}
                        data-analytics-item-type="problem_card"
                        data-analytics-item-slug={problem.id}
                        data-analytics-target-href={problem.primaryHref}
                      >
                        {problem.primaryLabel}
                        <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
                      </Link>
                      {problem.secondaryHref ? (
                        <Link
                          href={problem.secondaryHref}
                          prefetch={false}
                          data-analytics-event="cta_click"
                          data-analytics-location="home-trend-problems-secondary"
                          data-analytics-problem={problem.id}
                          data-analytics-species={problem.group === 'bezpieczenstwo' ? undefined : problem.group}
                          data-analytics-cta-label={problem.secondaryLabel ?? 'Czytaj artykuł'}
                          data-analytics-item-type="problem_card_secondary"
                          data-analytics-item-slug={problem.id}
                          data-analytics-target-href={problem.secondaryHref}
                        >
                          {problem.secondaryLabel ?? 'Czytaj artykuł'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="home-problem-story-more">
            <span>Przesuń niżej, żeby zobaczyć więcej tematów</span>
            <Link href="/problemy" prefetch={false}>
              Zobacz więcej problemów
              <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="compact-home-section home-seasonal-trend-section" aria-labelledby="home-seasonal-trend-title">
          <div className="home-seasonal-trend-panel">
            <div className="home-seasonal-trend-heading">
              <span className="home-seasonal-trend-icon" aria-hidden="true">
                <CalendarCheck size={28} strokeWidth={1.75} />
              </span>
              <div className="home-seasonal-trend-copy">
                <span className="home-trend-problems-kicker">Ważne o tej porze roku</span>
                <h2 id="home-seasonal-trend-title">Burze i wyjazdy mogą zmienić codzienny rytm</h2>
                <p>
                  Latem częściej pojawia się lęk przed nagłym hałasem, a wyjazd lub zmiana opiekuna mogą
                  zwiększyć napięcie. Wybierz sytuację i przeczytaj, co zrobić jako pierwsze.
                </p>
              </div>
              <Link href="/problemy#problem-hub-seasonal-title" prefetch={false} className="home-seasonal-trend-all">
                Wszystkie pory roku
                <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-seasonal-trend-grid">
              {seasonalTrendRadar.activeEntries.map((entry) => {
                const visual = getHomeSeasonalVisual(entry.id)

                return (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    prefetch={false}
                    className="home-seasonal-trend-card"
                    data-analytics-event="topic_selected"
                    data-analytics-location="home-seasonal-trends"
                    data-analytics-campaign={seasonalTrendRadar.campaign}
                    data-analytics-problem={entry.problemKey}
                    data-analytics-species={entry.species}
                    data-analytics-cta-label={entry.ctaLabel}
                    data-analytics-item-type="seasonal_topic"
                    data-analytics-item-slug={entry.id}
                    data-analytics-target-href={entry.href}
                  >
                    <figure className="home-seasonal-trend-media">
                      <Image src={visual.src} alt={visual.alt} fill unoptimized sizes="(max-width: 700px) 92vw, 420px" />
                    </figure>
                    <div className="home-seasonal-trend-card-copy">
                      <span>Teraz</span>
                      <strong>{entry.title}</strong>
                      <p>{entry.copy}</p>
                      <small>
                        {entry.ctaLabel}
                        <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                      </small>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
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

        <NotatnikFooter
          variant="home"
          primaryHref="/mapa-sprawy"
          primaryLabel="Mapa zachowania"
          reviewLayout="editorial"
        />
      </div>
    </main>
  )
}
