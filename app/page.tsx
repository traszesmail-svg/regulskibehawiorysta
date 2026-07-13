import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarCheck, Headphones, MessageSquareText, Video } from 'lucide-react'
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
import { getSeasonalTrendRadar } from '@/lib/seasonal-trend-radar'
import { HOME_TREND_PROBLEM_CARDS } from '@/lib/trend-problems'

export async function generateMetadata(): Promise<Metadata> {
  return buildHomeMetadata()
}

const serviceLandingHref = '/'

const processIcons = [MessageSquareText, Headphones, CalendarCheck] as const

const HOME_PROBLEM_VISUALS: Record<string, { src: string; alt: string }> = {
  'pies-szczeka-na-psy': {
    src: '/branding/topic-cards/border-collie-running.jpg',
    alt: 'Pies reagujÄ…cy na innego psa podczas spaceru',
  },
  'pies-ciagnie-na-smyczy': {
    src: '/branding/topic-cards/french-bulldog-leash.jpg',
    alt: 'Pies ciÄ…gnÄ…cy na smyczy',
  },
  'pies-nie-zostaje-sam': {
    src: '/branding/topic-cards/dog-window-alone.jpg',
    alt: 'Pies czekajÄ…cy przy oknie w domu',
  },
  'kot-sika-poza-kuweta': {
    src: '/branding/topic-cards/cats/cat-litter-box.jpg',
    alt: 'Kot obok kuwety',
  },
}

function getHomeProblemVisual(problemId: string) {
  return HOME_PROBLEM_VISUALS[problemId] ?? {
    src: '/branding/regulski-web/hero/hero-home.png',
    alt: 'Pies i kot w spokojnym domowym otoczeniu',
  }
}

const routerFaqItems = [
  {
    question: 'Czy jeĹ›li nie wiem, co wybraÄ‡, mogÄ™ zaczÄ…Ä‡ od quizu?',
    answer: 'Tak. Quiz jest po to, ĹĽeby spokojnie wybraÄ‡ pierwszy krok bez znajomoĹ›ci fachowych nazw.',
  },
  {
    question: 'Czy konsultacja jest dla psĂłw i kotĂłw?',
    answer: 'Tak. Pierwszy wybĂłr prowadzi osobno przez tematy psie i kocie.',
  },
  {
    question: 'Czy muszÄ™ juĹĽ wiedzieÄ‡, co jest przyczynÄ…?',
    answer: 'Nie. Wystarczy opis codziennej sytuacji. Na tej podstawie ukĹ‚adamy dane i szukamy najrozsÄ…dniejszego pierwszego kroku.',
  },
  {
    question: 'Co jeĹ›li sytuacja ma kilka warstw?',
    answer: 'Wtedy lepiej zebraÄ‡ wiÄ™cej kontekstu: formularz, historiÄ™ zachowania, rutynÄ™ domu lub spacerĂłw i nagrania, jeĹ›li sÄ….',
  },
] as const

export default function HomePage() {
  const seasonalTrendRadar = getSeasonalTrendRadar()
  const structuredData = [
    getBreadcrumbJsonLd([{ name: 'Strona gĹ‚Ăłwna', path: '/' }]),
    getServiceJsonLd({
      name: 'Behawiorysta psĂłw i kotĂłw online',
      description:
        'Konsultacje behawioralne online dla opiekunĂłw psĂłw i kotĂłw. W kaĹĽdej usĹ‚udze punktem wyjĹ›cia jest analiza zachowania oparta na informacjach przekazanych przez opiekuna.',
      serviceUrl: serviceLandingHref,
      offerCatalog: [
        { name: 'Kwadrans', description: '15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.', url: '/book?service=szybka-konsultacja-15-min', price: 69 },
        { name: 'Kwadrans na juĹĽ', description: 'Ten sam zakres co Kwadrans, ale z priorytetowÄ… odpowiedziÄ… i najbliĹĽszym realnym terminem.', url: '/kwadrans-na-juz', price: 99 },
        { name: 'Dwa kwadranse', description: '30 min online, gdy temat ma kilka wÄ…tkĂłw. WiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.', url: '/book?service=konsultacja-30-min', price: 169 },
        {
          name: 'PeĹ‚na konsultacja',
          description: 'OkoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
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

        <section className="compact-home-section home-trend-problems-section home-problem-story-section" id="najczestsze-problemy">
          <div className="home-problem-story-heading">
            <span className="home-trend-problems-kicker">NajczÄ™Ĺ›ciej szukane teraz</span>
            <h2>Wybierz problem, ktĂłry najbardziej przypomina TwojÄ… sytuacjÄ™</h2>
            <p>
              Nie musisz znaÄ‡ przyczyny. Zacznij od tego, co widzisz na co dzieĹ„, a potem przejdĹş do artykuĹ‚u,
              pierwszego kroku albo quizu.
            </p>
            <Link
              href="/problemy"
              prefetch={false}
              className="home-trend-problems-all"
              data-analytics-event="cta_click"
              data-analytics-location="home-trend-problems"
              data-analytics-cta-label="Zobacz mapÄ™ problemĂłw"
              data-analytics-item-type="problem_hub"
            >
              Zobacz mapÄ™ problemĂłw
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>

          <div className="home-problem-story-list">
            {HOME_TREND_PROBLEM_CARDS.slice(0, 4).map((problem) => {
              const visual = getHomeProblemVisual(problem.id)

              return (
                <article key={problem.id} className={'home-problem-story-card home-problem-story-card-' + problem.group}>
                  <figure className="home-problem-story-media">
                    <Image src={visual.src} alt={visual.alt} fill sizes="(max-width: 760px) 92vw, 420px" />
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
                          data-analytics-cta-label={problem.secondaryLabel ?? 'Czytaj artykuĹ‚'}
                          data-analytics-item-type="problem_card_secondary"
                          data-analytics-item-slug={problem.id}
                          data-analytics-target-href={problem.secondaryHref}
                        >
                          {problem.secondaryLabel ?? 'Czytaj artykuĹ‚'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="home-problem-story-more">
            <span>PrzesuĹ„ niĹĽej, ĹĽeby zobaczyÄ‡ wiÄ™cej tematĂłw</span>
            <Link href="/problemy" prefetch={false}>
              Zobacz wiÄ™cej problemĂłw
              <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <section className="compact-home-section home-seasonal-trend-section" aria-labelledby="home-seasonal-trend-title">
          <div className="home-seasonal-trend-panel">
            <div className="home-seasonal-trend-copy">
              <span className="home-trend-problems-kicker">Trend radar sezonowy</span>
              <h2 id="home-seasonal-trend-title">Teraz warto sprawdziÄ‡ tematy, ktĂłre zwykle nasilajÄ… siÄ™ w sezonie</h2>
              <p>
                To nie sÄ… osobne usĹ‚ugi. To szybkie wejĹ›cia do istniejÄ…cej Ĺ›cieĹĽki: problem, pierwszy kontekst i quiz, gdy trzeba wybraÄ‡ zakres pomocy.
              </p>
            </div>
            <div className="home-seasonal-trend-grid">
              {seasonalTrendRadar.activeEntries.map((entry) => (
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
                  <span>{entry.eyebrow}</span>
                  <strong>{entry.title}</strong>
                  <p>{entry.copy}</p>
                  <small>
                    {entry.seasonLabel}
                    <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                  </small>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="compact-home-section home-process-section" id="jak-to-dziaĹ‚a">
          <div className="home-section-title">
            <h2>Jak wyglÄ…da wspĂłĹ‚praca?</h2>
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
            <p className="home-diagnosis-kicker">POMOC BEHAWIORALNA DLA PSĂ“W I KOTĂ“W</p>
            <div className="home-section-title home-diagnosis-title">
              <h2>Jestem tu, ĹĽeby pomĂłc Tobie i Twojemu zwierzÄ™ciu</h2>
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
                  <span>zwierzÄ…t towarzyszÄ…cych COAPE</span>
                </p>
              </div>
            </div>
            <div className="home-diagnosis-copy">
              <p className="notatnik-service-description">
                Ja ukĹ‚adam fakty i sprawdzam, co moĹĽe staÄ‡ za zachowaniem: emocje, zdrowie, bĂłl, dietÄ™, Ĺ›rodowisko, historiÄ™ uczenia siÄ™ i codziennÄ… rutynÄ™. Dopiero potem wybieramy pierwszy krok.
              </p>
              <p className="notatnik-service-description">
                To konsultacja behawioralna dla opiekuna, nie porada weterynaryjna ani diagnoza medyczna. JeĹ›li opis wskazuje na bĂłl, chorobÄ™ albo nagĹ‚Ä… zmianÄ™ stanu, pierwszym krokiem jest lekarz weterynarii.
              </p>
            </div>
            <div className="home-diagnosis-separator home-diagnosis-separator-bottom" aria-hidden="true" />
          </div>
        </section>

        <section className="compact-home-section home-faq-section">
          <div className="home-section-title">
            <h2>
              <Link href="/faq" prefetch={false} className="home-faq-title-link">
                NajczÄ™Ĺ›ciej zadawane pytania
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

