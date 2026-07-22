import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, Cat, Compass, Dog, PawPrint, Search, ShieldCheck } from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getSeasonalTrendRadar, SEASONAL_TREND_ENTRIES } from '@/lib/seasonal-trend-radar'
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
  'nowy-pies-pierwsze-dni': {
    src: 'https://images.pexels.com/photos/35614255/pexels-photo-35614255.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Szczeniak poznaje spokojne, jasne wnętrze nowego domu',
  },
  'kot-sika-poza-kuweta': {
    src: 'https://images.unsplash.com/photo-1727510153658-643787acb16a?auto=format&fit=crop&crop=entropy&w=1600&h=1000&q=86',
    alt: 'Kot korzysta z nowoczesnej kuwety w domowym wnętrzu',
  },
  'kot-gryzie-przy-glaskaniu': {
    src: 'https://images.pexels.com/photos/3927415/pexels-photo-3927415.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Pręgowany kot chwyta zębami dłoń podczas kontaktu z człowiekiem',
  },
  'konflikt-miedzy-kotami': {
    src: 'https://images.pexels.com/photos/16169491/pexels-photo-16169491.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Dwa koty wchodzą ze sobą w napiętą konfrontację',
  },
  'kot-chowa-sie-lub-zyje-w-napieciu': {
    src: 'https://images.pexels.com/photos/36427304/pexels-photo-36427304.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Kot ostrożnie wygląda spod stołu w przyciemnionym wnętrzu',
  },
  'nagla-zmiana-zachowania': {
    src: 'https://images.pexels.com/photos/28644631/pexels-photo-28644631.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Weterynarz bada kota stetoskopem w gabinecie',
  },
  'halas-burza-fajerwerki': {
    src: 'https://images.pexels.com/photos/5913975/pexels-photo-5913975.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
    alt: 'Mały pies szuka bezpiecznego miejsca pod kanapą',
  },
}

const seasonalVisuals: Record<string, { src: string; alt: string }> = {
  'burze-i-nagly-halas': {
    src: 'https://images.pexels.com/photos/18948630/pexels-photo-18948630.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1000&fit=crop',
    alt: 'Pies chowa się pod sofą i szuka spokojnego schronienia',
  },
  'wakacje-opieka-i-zmiana-rytmu': {
    src: 'https://images.pexels.com/photos/10972597/pexels-photo-10972597.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1000&fit=crop',
    alt: 'Pies bezpiecznie podróżuje samochodem podczas wyjazdu',
  },
  'powrot-do-pracy-i-szkoly': {
    src: 'https://images.pexels.com/photos/4969879/pexels-photo-4969879.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1000&fit=crop',
    alt: 'Pies odpoczywa sam na łóżku po zmianie domowego rytmu',
  },
  'sylwester-i-fajerwerki': {
    src: 'https://images.pexels.com/photos/19823544/pexels-photo-19823544.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1000&fit=crop',
    alt: 'Pies odpoczywa pod kocem w bezpiecznym miejscu podczas hałasu',
  },
  'adopcja-i-pierwsze-tygodnie': {
    src: 'https://images.pexels.com/photos/31525931/pexels-photo-31525931.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1000&fit=crop',
    alt: 'Szczeniak spokojnie oswaja się z nowym domem',
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
    title: '3. Artykuł albo Mapa zachowania',
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
      src:
        groupId === 'kot'
          ? 'https://images.pexels.com/photos/4240092/pexels-photo-4240092.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop'
          : 'https://images.pexels.com/photos/4588894/pexels-photo-4588894.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop',
      alt: groupId === 'kot' ? 'Kot w domowym otoczeniu' : 'Pies podczas spokojnego spaceru',
    }
  )
}

function getSeasonalVisual(entryId: string) {
  return (
    seasonalVisuals[entryId] ?? {
      src: 'https://images.pexels.com/photos/35711491/pexels-photo-35711491.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1000&fit=crop',
      alt: 'Pies i kot odpoczywają razem w naturalnym świetle',
    }
  )
}

export default function ProblemyPage() {
  const seasonalTrendRadar = getSeasonalTrendRadar()
  const activeSeasonalIds = new Set(seasonalTrendRadar.activeEntries.map((entry) => entry.id))
  const seasonalEntries = [
    ...seasonalTrendRadar.activeEntries,
    ...SEASONAL_TREND_ENTRIES.filter((entry) => !activeSeasonalIds.has(entry.id)),
  ]
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
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} ctaHref="/mapa-sprawy" ctaLabel="Mapa zachowania" />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content problem-hub-content">
          <section className="problem-hub-hero problem-hub-map-hero" aria-labelledby="problem-hub-title">
            <div className="problem-hub-hero-copy">
              <h1 id="problem-hub-title">
                <span>Mapa</span>
                <span>problemów</span>
              </h1>
              <p>
                Zacznij od sytuacji, którą widzisz u swojego psa lub kota. Znajdziesz tu pierwszy krok,
                artykuł albo Mapę sprawy, które pomogą spokojnie ruszyć dalej.
              </p>
              <div className="problem-hub-hero-actions">
                <Link
                  href="/mapa-sprawy"
                  prefetch={false}
                  data-analytics-event="cta_click"
                  data-analytics-location="problem-hub-hero"
                  data-analytics-cta-label="Przejdź przez Mapę sprawy"
                  data-analytics-item-type="problem_hub"
                >
                  Przejdź przez Mapę sprawy
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
                src="/branding/problemy/hero-problemy-opiekun-pies-kot-v2.webp"
                alt="Zatroskana opiekunka obserwuje napiętego psa i czujnego kota w domu"
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
                          <Image src={visual.src} alt={visual.alt} fill sizes="(max-width: 760px) 86vw, 260px" unoptimized />
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
                <h2 id="problem-hub-seasonal-title">Gdy zmienia się pora roku</h2>
                <p>
                  Latem częściej pojawia się lęk przed burzą i napięcie związane z wyjazdami. Jesienią
                  wracają trudności z zostawaniem samemu, a zimą lęk przed fajerwerkami.
                </p>
              </div>
            </div>
            <div className="problem-hub-seasonal-grid">
              {seasonalEntries.map((entry) => {
                const visual = getSeasonalVisual(entry.id)
                const isActive = activeSeasonalIds.has(entry.id)

                return (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    prefetch={false}
                    className={`problem-hub-seasonal-card problem-hub-seasonal-card-visual${isActive ? ' is-active' : ''}`}
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
                      <Image src={visual.src} alt="" fill sizes="(max-width: 760px) 36vw, 190px" unoptimized />
                    </span>
                    <span className="problem-hub-seasonal-status">
                      {isActive ? 'Teraz' : entry.seasonLabel}
                    </span>
                    <strong>{entry.title}</strong>
                    <p>{entry.copy}</p>
                    <small>
                      {entry.ctaLabel}
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
                src="https://images.pexels.com/photos/6235233/pexels-photo-6235233.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop"
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 220px"
                unoptimized
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
              href="/mapa-sprawy?problem=nagla-zmiana-zachowania"
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

          <section className="problem-hub-next-step" aria-labelledby="problem-hub-next-step-title">
            <span className="problem-hub-next-step-icon" aria-hidden="true">
              <Compass size={30} strokeWidth={1.75} />
            </span>
            <div>
              <p className="problem-hub-next-step-kicker">Nie widzisz swojej sytuacji?</p>
              <h2 id="problem-hub-next-step-title">Nie musisz dopasowywać problemu na siłę</h2>
              <p>
                Ta strona zbiera najczęstsze sytuacje. Jeśli objawy się mieszają albo problem wygląda
                inaczej, przejdź przez Mapę zachowania i zacznij od tego, co naprawdę obserwujesz.
              </p>
            </div>
            <div className="problem-hub-next-step-actions">
              <Link href="/mapa-sprawy" prefetch={false}>
                Przejdź przez Mapę zachowania
                <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" />
              </Link>
              <Link href="/blog" prefetch={false} className="is-secondary">
                Zobacz wszystkie artykuły
              </Link>
            </div>
          </section>
        </div>

        <NotatnikFooter showReviews={false} primaryHref="/mapa-sprawy" primaryLabel="Mapa zachowania" />
      </div>
    </main>
  )
}
