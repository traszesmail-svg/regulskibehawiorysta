import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Cat, Dog, ShieldCheck } from 'lucide-react'
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

function getGroupIcon(groupId: TrendProblemGroupId) {
  if (groupId === 'kot') return Cat
  if (groupId === 'bezpieczenstwo') return ShieldCheck
  return Dog
}

function getAnalyticsSpecies(groupId: TrendProblemGroupId) {
  return groupId === 'bezpieczenstwo' ? undefined : groupId
}

export default function ProblemyPage() {
  const seasonalTrendRadar = getSeasonalTrendRadar()
  const baseUrl = getCanonicalBaseUrl()
  const groupedProblems = TREND_PROBLEM_GROUPS.map((group) => ({
    ...group,
    cards: TREND_PROBLEM_CARDS.filter((card) => card.group === group.id),
  }))
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
    <main className="notatnik-page blog-page blog-index-page blog-redesign-page problem-hub-page">
      <Schema data={structuredData} />
      <div className="notatnik-shell blog-index-shell blog-redesign-shell problem-hub-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} ctaHref="/quiz" ctaLabel="Quiz" />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content problem-hub-content">
          <section className="problem-hub-hero" aria-labelledby="problem-hub-title">
            <div className="problem-hub-hero-copy">
              <span className="blog-redesign-kicker">Mapa problemów</span>
              <h1 id="problem-hub-title">Zacznij od sytuacji, którą widzisz u psa albo kota</h1>
              <p>
                Nie musisz od razu wiedzieć, czy to lęk, stres, ból, frustracja czy kwestia środowiska. Wybierz najbliższy opis,
                przeczytaj pierwszy kontekst albo przejdź przez quiz.
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
                  href="/blog"
                  prefetch={false}
                  data-analytics-event="cta_click"
                  data-analytics-location="problem-hub-hero"
                  data-analytics-cta-label="Zobacz blog"
                  data-analytics-item-type="blog"
                >
                  Zobacz blog
                </Link>
              </div>
            </div>
            <aside className="problem-hub-hero-card" aria-label="Jak korzystać z mapy problemów">
              <span>Jak korzystać</span>
              <strong>Problem → pierwszy krok → artykuł albo quiz</strong>
              <p>
                Kafle prowadzą do stron problemowych, artykułów albo quizu. To ma ograniczyć zgadywanie i utrzymać spokojny ton pracy.
              </p>
            </aside>
          </section>

          <section className="problem-hub-seasonal" aria-labelledby="problem-hub-seasonal-title">
            <div className="problem-hub-group-heading">
              <span className="problem-hub-group-icon" aria-hidden="true">
                <CalendarDays size={21} strokeWidth={1.9} />
              </span>
              <div>
                <span className="blog-redesign-kicker">Trend radar sezonowy</span>
                <h2 id="problem-hub-seasonal-title">Tematy, które teraz zwykle wracają częściej</h2>
                <p>
                  To szybka warstwa nad bankiem problemów: sezonowy bodziec, pierwszy bezpieczny kierunek i link do quizu albo strony problemowej.
                </p>
              </div>
            </div>
            <div className="problem-hub-seasonal-grid">
              {seasonalTrendRadar.activeEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.href}
                  prefetch={false}
                  className="problem-hub-seasonal-card"
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
          </section>
          {groupedProblems.map((group) => {
            const Icon = getGroupIcon(group.id)

            return (
              <section key={group.id} id={group.id} className="problem-hub-group" aria-labelledby={`problem-group-${group.id}`}>
                <div className="problem-hub-group-heading">
                  <span className="problem-hub-group-icon" aria-hidden="true">
                    <Icon size={21} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h2 id={`problem-group-${group.id}`}>{group.title}</h2>
                    <p>{group.copy}</p>
                  </div>
                </div>

                <div className="problem-hub-card-grid">
                  {group.cards.map((problem) => (
                    <article key={problem.id} className="problem-hub-card">
                      <span>{problem.eyebrow}</span>
                      <h3>{problem.title}</h3>
                      <p>{problem.copy}</p>
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
                  ))}
                </div>
              </section>
            )
          })}

          <section className="problem-hub-ig-map" aria-labelledby="problem-hub-ig-title">
            <div className="blog-redesign-section-heading">
              <h2 id="problem-hub-ig-title">Linki docelowe dla postów z Instagrama</h2>
              <p>
                Każdy mocny temat ma jeden URL. Dzięki temu post, bio, stories i reklama prowadzą do tej samej logiki:
                problem, kontekst, quiz albo rezerwacja.
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

          <section className="problem-hub-safe-note">
            <div>
              <span className="blog-redesign-kicker">Bez zgadywania</span>
              <h2>Kiedy problem może mieć tło zdrowotne</h2>
              <p>
                Nagła zmiana zachowania, ból, apatia, sikanie poza kuwetą, agresja lub chowanie się mogą wymagać równoległej konsultacji
                z lekarzem weterynarii. Behawioralnie porządkujemy kontekst, ale nie zastępujemy diagnostyki medycznej.
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
        </div>

        <NotatnikFooter showReviews={false} primaryHref="/quiz" primaryLabel="Quiz" />
      </div>
    </main>
  )
}