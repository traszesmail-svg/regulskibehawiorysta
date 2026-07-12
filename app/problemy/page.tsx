import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, Cat, Dog, PawPrint, Search, ShieldCheck } from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { INSTAGRAM_PROBLEM_ROUTES } from '@/lib/instagram-problem-routes'
import { getSeasonalTrendRadar } from '@/lib/seasonal-trend-radar'
import { getBreadcrumbJsonLd, getItemListJsonLd } from '@/lib/schema'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import { buildMarketingMetadata } from '@/lib/seo'
import { TREND_PROBLEM_CARDS, TREND_PROBLEM_GROUPS, type TrendProblemGroupId } from '@/lib/trend-problems'

const PROBLEMY_DESCRIPTION =
  'Mapa najczęstszych problemów psów i kotów: szczekanie, smycz, samotność, kuweta, gryzienie, relacje kotów i nagła zmiana zachowania. Zacznij od konkretnej sytuacji.'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Najczęstsze problemy psów i kotów',
  path: '/problemy',
  description: PROBLEMY_DESCRIPTION,
})

const problemVisuals: Record<string, { src: string; alt: string }> = {
  'pies-szczeka-na-psy': {
    src: '/branding/topic-cards/border-collie-running.jpg',
    alt: 'Pies w ruchu podczas spaceru, symbol reaktywności i napięcia',
  },
  'pies-ciagnie-na-smyczy': {
    src: '/branding/topic-cards/french-bulldog-leash.jpg',
    alt: 'Pies na smyczy podczas spaceru',
  },
  'pies-nie-zostaje-sam': {
    src: '/branding/topic-cards/dog-window-alone.jpg',
    alt: 'Pies przy oknie, gdy opiekun wychodzi z domu',
  },
  'pies-niszczy-lub-nie-wycisza-sie': {
    src: '/branding/topic-cards/dog-forest-calm.jpg',
    alt: 'Spokojny pies w naturalnym otoczeniu',
  },
  'nowy-pies-pierwsze-dni': {
    src: '/branding/topic-cards/puppy-hands.jpg',
    alt: 'Szczeniak i dłonie opiekuna w pierwszych dniach w domu',
  },
  'kot-sika-poza-kuweta': {
    src: '/branding/topic-cards/cats/cat-litter-box.jpg',
    alt: 'Kot obok kuwety',
  },
  'kot-gryzie-przy-glaskaniu': {
    src: '/branding/topic-cards/cats/cat-touch-defensive.jpg',
    alt: 'Kot reagujący na dotyk opiekuna',
  },
  'konflikt-miedzy-kotami': {
    src: '/branding/topic-cards/cats/cat-intercat-conflict.jpg',
    alt: 'Dwa koty w napięciu w domu',
  },
  'kot-chowa-sie-lub-zyje-w-napieciu': {
    src: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    alt: 'Kot chowający się w domu',
  },
  'nagla-zmiana-zachowania': {
    src: '/branding/topic-cards/dog-checkup.jpg',
    alt: 'Wizyta kontrolna i sprawdzanie możliwego tła zdrowotnego',
  },
  'halas-burza-fajerwerki': {
    src: '/branding/pdf-covers/pies-boi-sie-gosci-i-dzwiekow.svg',
    alt: 'Pies reagujący na trudne dźwięki',
  },
}

const seasonalVisuals: Record<string, { src: string; alt: string }> = {
  'burze-i-nagly-halas': {
    src: '/branding/pdf-covers/pies-boi-sie-gosci-i-dzwiekow.svg',
    alt: 'Pies i trudne dźwięki sezonowe',
  },
  'wakacje-opieka-i-zmiana-rytmu': {
    src: '/branding/pdf-covers/pierwsze-dni-po-adopcji-psa-lub-kota.svg',
    alt: 'Torba i zmiana rytmu dnia w czasie wyjazdów',
  },
  'powrot-do-pracy-i-szkoly': {
    src: '/branding/topic-cards/dog-window-alone.jpg',
    alt: 'Pies przy oknie po zmianie rutyny domowej',
  },
  'sylwester-i-fajerwerki': {
    src: '/branding/pdf-covers/pies-boi-sie-gosci-i-dzwiekow.svg',
    alt: 'Pies reagujący na fajerwerki i hałas',
  },
  'adopcja-i-pierwsze-tygodnie': {
    src: '/branding/topic-cards/puppy-hands.jpg',
    alt: 'Nowy pies w domu i pierwsze tygodnie adaptacji',
  },
}

const flowSteps = [
  {
    icon: Search,
    title: '1. Problem',
    copy: 'Wybierz sytuację, która najbardziej przypomina to, co widzisz.',
  },
  {
    icon: PawPrint,
    title: '2. Pierwszy krok',
    copy: 'Zobacz, co można sprawdzić bez zgadywania.',
  },
  {
    icon: BookOpen,
    title: '3. Artykuł albo quiz',
    copy: 'Przeczytaj kontekst lub dobierz format pomocy.',
  },
] as const

const groupMascots: Partial<Record<TrendProblemGroupId, { src: string; alt: string }>> = {
  pies: {
    src: '/branding/homepage/choice-dog-clean.png',
    alt: 'Ilustracja psa z kategorii Pies',
  },
  kot: {
    src: '/branding/homepage/choice-cat-clean.png',
    alt: 'Ilustracja kota z kategorii Kot',
  },
}

function getGroupIcon(groupId: TrendProblemGroupId) {
  if (groupId === 'kot') return Cat
  if (groupId === 'bezpieczenstwo') return ShieldCheck
  return Dog
}

function getAnalyticsSpecies(groupId: TrendProblemGroupId) {
  return groupId === 'bezpieczenstwo' ? undefined : groupId
}

function getProblemVisual(problemId: string, groupId: TrendProblemGroupId) {
  return (
    problemVisuals[problemId] ?? {
      src: groupId === 'kot' ? '/branding/pet-topics/cat-panel.png' : '/branding/pet-topics/dog-panel.png',
      alt: groupId === 'kot' ? 'Kot w spokojnym domu' : 'Pies w spokojnym domu',
    }
  )
}

function getSeasonalVisual(entryId: string) {
  return (
    seasonalVisuals[entryId] ?? {
      src: '/branding/pdf-covers/pierwsze-dni-po-adopcji-psa-lub-kota.svg',
      alt: 'Sezonowa zmiana rytmu dla psa lub kota',
    }
  )
}

export default function ProblemyPage() {
  const seasonalTrendRadar = getSeasonalTrendRadar()
  const baseUrl = getCanonicalBaseUrl()
  const groupedProblems = TREND_PROBLEM_GROUPS.map((group) => ({
    ...group,
    cards: TREND_PROBLEM_CARDS.filter((card) => card.group === group.id),
  }))
  const animalGroups = groupedProblems.filter((group) => group.id !== 'bezpieczenstwo')
  const structuredData = [
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Problemy', path: '/problemy' },
    ]),
    getItemListJsonLd(
      TREND_PROBLEM_CARDS.map((problem) => ({
        name: problem.title,
        url: new URL(problem.primaryHref, baseUrl).toString(),
      })),
      'https://schema.org/ItemListOrderUnordered',
    ),
  ]

  return (
    <main className="notatnik-page blog-page blog-index-page blog-redesign-page problem-hub-page problem-hub-redesign-page">
      <Schema data={structuredData} />
      <div className="notatnik-shell blog-index-shell blog-redesign-shell problem-hub-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} ctaHref="/quiz" ctaLabel="Quiz" />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content problem-hub-content">
          <section className="problem-hub-hero problem-hub-map-hero" aria-labelledby="problem-hub-title">
            <div className="problem-hub-hero-copy">
              <h1 id="problem-hub-title">Mapa problemów</h1>
              <p>
                Zacznij od sytuacji, którą widzisz u swojego psa lub kota. Znajdziesz tu pierwszy krok,
                artykuł albo quiz, które pomogą spokojnie ruszyć dalej.
              </p>
              <div className="problem-hub-hero-actions">
                <Link
                  href="/quiz"
                  prefetch={false}
                  data-analytics-event="cta_click"
                  data-analytics-location="problem-hub-hero"
                  data-analytics-cta-label="Przejdź przez quiz"
                  data-analytics-item-type="problem_hub"
                >
                  Przejdź przez quiz
                  <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
                </Link>
                <Link
                  href="#pies"
                  prefetch={false}
                  data-analytics-event="cta_click"
                  data-analytics-location="problem-hub-hero"
                  data-analytics-cta-label="Zobacz problemy"
                  data-analytics-item-type="problem_hub"
                >
                  Zobacz problemy
                </Link>
              </div>
            </div>

            <figure className="problem-hub-hero-visual">
              <Image
                src="/branding/regulski-web/hero/hero-home.png"
                alt="Spokojny pies i kot z głównego nagłówka strony"
                fill
                priority
                sizes="(max-width: 860px) 100vw, 58vw"
              />
            </figure>

            <div className="problem-hub-flow" aria-label="Jak korzystać z mapy problemów">
              {flowSteps.map((step) => {
                const Icon = step.icon

                return (
                  <article key={step.title}>
                    <span aria-hidden="true">
                      <Icon size={30} strokeWidth={1.75} />
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.copy}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          {animalGroups.map((group) => {
            const Icon = getGroupIcon(group.id)
            const mascot = groupMascots[group.id]

            return (
              <section
                key={group.id}
                id={group.id}
                className={'problem-hub-group problem-hub-animal-group problem-hub-group-' + group.id}
                aria-labelledby={'problem-group-' + group.id}
              >
                <div className="problem-hub-group-heading">
                  {mascot ? (
                    <span className="problem-hub-group-mascot" aria-hidden="true">
                      <Image src={mascot.src} alt="" fill sizes="64px" />
                    </span>
                  ) : (
                    <span className="problem-hub-group-icon" aria-hidden="true">
                      <Icon size={23} strokeWidth={1.85} />
                    </span>
                  )}
                  <div>
                    <h2 id={'problem-group-' + group.id}>{group.title}</h2>
                    <p>{group.copy}</p>
                  </div>
                </div>

                <div className="problem-hub-card-grid problem-hub-visual-grid">
                  {group.cards.map((problem) => {
                    const visual = getProblemVisual(problem.id, problem.group)

                    return (
                      <article key={problem.id} className={'problem-hub-card problem-hub-visual-card problem-hub-visual-card-' + problem.group}>
                        <Link
                          href={problem.primaryHref}
                          prefetch={false}
                          className="problem-hub-card-media"
                          aria-label={problem.title + ' - ' + problem.primaryLabel}
                          data-analytics-event="topic_selected"
                          data-analytics-location="problem-hub-card-image"
                          data-analytics-problem={problem.id}
                          data-analytics-species={getAnalyticsSpecies(problem.group)}
                          data-analytics-cta-label={problem.primaryLabel}
                          data-analytics-item-type="problem_card"
                          data-analytics-item-slug={problem.id}
                          data-analytics-target-href={problem.primaryHref}
                        >
                          <Image src={visual.src} alt={visual.alt} fill sizes="(max-width: 760px) 86vw, 260px" />
                        </Link>
                        <div className="problem-hub-card-body">
                          <span>{problem.eyebrow}</span>
                          <h3>{problem.title}</h3>
                          <p>{problem.copy}</p>
                        </div>
                        <div className="problem-hub-card-actions">
                          <Link
                            href={problem.primaryHref}
                            prefetch={false}
                            data-analytics-event="topic_selected"
                            data-analytics-location="problem-hub-card"
                            data-analytics-problem={problem.id}
                            data-analytics-species={getAnalyticsSpecies(problem.group)}
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
                              className="problem-hub-card-secondary"
                              data-analytics-event="cta_click"
                              data-analytics-location="problem-hub-card-secondary"
                              data-analytics-problem={problem.id}
                              data-analytics-species={getAnalyticsSpecies(problem.group)}
                              data-analytics-cta-label={problem.secondaryLabel ?? 'Zobacz więcej'}
                              data-analytics-item-type="problem_card_secondary"
                              data-analytics-item-slug={problem.id}
                              data-analytics-target-href={problem.secondaryHref}
                            >
                              {problem.secondaryLabel ?? 'Zobacz więcej'}
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}

          <section className="problem-hub-seasonal problem-hub-seasonal-map" aria-labelledby="problem-hub-seasonal-title">
            <div className="problem-hub-group-heading">
              <span className="problem-hub-group-icon problem-hub-season-icon" aria-hidden="true">
                <CalendarDays size={23} strokeWidth={1.85} />
              </span>
              <div>
                <h2 id="problem-hub-seasonal-title">Sezon</h2>
                <p>
                  Są tematy, które wracają falami: hałas, wyjazdy, opieka zastępcza i zmiana rytmu.
                  Tu dostajesz szybkie wejście do właściwego pierwszego kroku.
                </p>
              </div>
            </div>
            <div className="problem-hub-seasonal-grid">
              {seasonalTrendRadar.activeEntries.map((entry) => {
                const visual = getSeasonalVisual(entry.id)

                return (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    prefetch={false}
                    className="problem-hub-seasonal-card problem-hub-seasonal-card-visual"
                    data-analytics-event="topic_selected"
                    data-analytics-location="problem-hub-seasonal"
                    data-analytics-campaign={seasonalTrendRadar.campaign}
                    data-analytics-problem={entry.problemKey}
                    data-analytics-species={entry.species}
                    data-analytics-cta-label={entry.ctaLabel}
                    data-analytics-item-type="seasonal_topic"
                    data-analytics-item-slug={entry.id}
                    data-analytics-target-href={entry.href}
                  >
                    <span className="problem-hub-seasonal-media" aria-hidden="true">
                      <Image src={visual.src} alt="" fill sizes="(max-width: 760px) 36vw, 190px" />
                    </span>
                    <span>{entry.eyebrow}</span>
                    <strong>{entry.title}</strong>
                    <p>{entry.copy}</p>
                    <small>
                      {entry.seasonLabel}
                      <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                    </small>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="problem-hub-safe-note problem-hub-safe-note-map">
            <figure className="problem-hub-safe-visual" aria-hidden="true">
              <Image
                src="/branding/topic-cards/dog-checkup.jpg"
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 760px) 100vw, 220px"
              />
            </figure>
            <div>
              <h2>Nagła zmiana zachowania</h2>
              <p>
                Jeżeli zachowanie psa albo kota zmieniło się nagle, najpierw trzeba wykluczyć tło zdrowotne.
                Równolegle możesz uporządkować objawy i sprawdzić, jaki pierwszy krok ma sens.
              </p>
            </div>
            <Link
              href="/quiz?problem=nagla-zmiana-zachowania"
              prefetch={false}
              data-analytics-event="cta_click"
              data-analytics-location="problem-hub-safe-note"
              data-analytics-problem="nagla-zmiana-zachowania"
              data-analytics-cta-label="Sprawdź pierwszy krok"
              data-analytics-item-type="safety_quiz"
            >
              Sprawdź pierwszy krok
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </section>

          <section className="problem-hub-ig-map problem-hub-routes-map" aria-labelledby="problem-hub-ig-title">
            <div className="blog-redesign-section-heading">
              <h2 id="problem-hub-ig-title">Szybkie ścieżki z Instagrama</h2>
              <p>
                Jeśli trafiasz tu z posta albo stories, te linki prowadzą do tej samej logiki:
                problem, krótki kontekst, quiz albo rezerwacja.
              </p>
            </div>
            <div className="problem-hub-ig-grid">
              {INSTAGRAM_PROBLEM_ROUTES.map((route) => (
                <Link
                  key={route.id}
                  href={route.href}
                  prefetch={false}
                  data-analytics-event="topic_selected"
                  data-analytics-location="problem-hub-instagram-map"
                  data-analytics-problem={route.problemKey}
                  data-analytics-cta-label={route.label}
                  data-analytics-item-type="instagram_problem_route"
                  data-analytics-item-slug={route.problemKey}
                  data-analytics-target-href={route.publicHref}
                  data-analytics-campaign="trend_radar"
                >
                  <span>{route.postTopic}</span>
                  <strong>{route.label}</strong>
                  <small>{route.publicHref}</small>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <NotatnikFooter showReviews={false} primaryHref="/quiz" primaryLabel="Quiz" />
      </div>
    </main>
  )
}
