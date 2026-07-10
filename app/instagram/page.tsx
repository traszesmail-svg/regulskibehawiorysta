import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPinned, Send } from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { INSTAGRAM_PROBLEM_ROUTES } from '@/lib/instagram-problem-routes'
import { getSeasonalTrendRadar } from '@/lib/seasonal-trend-radar'
import { buildMarketingMetadata } from '@/lib/seo'

const INSTAGRAM_LINK_DESCRIPTION =
  'Linki do tematów z Instagrama Regulski Behawiorysta: mapa problemów, quiz pierwszego kroku i sezonowe tematy dla opiekunów psów i kotów.'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Instagram - linki do tematów',
  path: '/instagram',
  description: INSTAGRAM_LINK_DESCRIPTION,
})

function withInstagramBioUtm(path: string, content: string) {
  const params = new URLSearchParams({
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'trend_radar',
    utm_content: content,
  })

  return `${path}?${params.toString()}`
}

export default function InstagramLinksPage() {
  const seasonalTrendRadar = getSeasonalTrendRadar()
  const primaryLinks = [
    {
      id: 'bio-quiz',
      icon: Send,
      eyebrow: 'Start',
      title: 'Quiz pierwszego kroku',
      copy: 'Jeśli nie wiesz, od czego zacząć, quiz porządkuje problem i podpowiada zakres rozmowy.',
      href: withInstagramBioUtm('/quiz', 'bio-quiz'),
      ctaLabel: 'Przejdź do quizu',
      itemType: 'instagram_bio_primary',
    },
    {
      id: 'bio-problemy',
      icon: MapPinned,
      eyebrow: 'Mapa',
      title: 'Najczęstsze problemy',
      copy: 'Szczekanie, smycz, samotność, kuweta, gryzienie, konflikty kotów i nagłe zmiany zachowania.',
      href: withInstagramBioUtm('/problemy', 'bio-problemy'),
      ctaLabel: 'Zobacz mapę problemów',
      itemType: 'instagram_bio_primary',
    },
  ] as const

  return (
    <main className="notatnik-page blog-page blog-index-page blog-redesign-page instagram-link-page">
      <div className="notatnik-shell blog-index-shell blog-redesign-shell instagram-link-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} ctaHref="/quiz" ctaLabel="Quiz" />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content instagram-link-content">
          <section className="instagram-link-hero" aria-labelledby="instagram-link-title">
            <span className="blog-redesign-kicker">Regulski Behawiorysta / Instagram</span>
            <h1 id="instagram-link-title">Linki do tematów z postów i stories</h1>
            <p>
              Wybierz temat, który pasuje do sytuacji. Link prowadzi do strony problemowej, artykułu albo quizu, żeby nie zgadywać
              zakresu pomocy po samym poście.
            </p>
          </section>

          <section className="instagram-link-section" aria-labelledby="instagram-link-main-title">
            <div className="blog-redesign-section-heading">
              <h2 id="instagram-link-main-title">Najkrótsza ścieżka</h2>
              <p>Dwa linki, które powinny być pod ręką w bio, wyróżnionych relacjach i opisach postów.</p>
            </div>
            <div className="instagram-link-grid instagram-link-grid-primary">
              {primaryLinks.map((link) => {
                const Icon = link.icon

                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    prefetch={false}
                    className="instagram-link-card is-primary"
                    data-analytics-event="topic_selected"
                    data-analytics-location="instagram-link-primary"
                    data-analytics-campaign="trend_radar"
                    data-analytics-cta-label={link.ctaLabel}
                    data-analytics-item-type={link.itemType}
                    data-analytics-item-slug={link.id}
                    data-analytics-target-href={link.href}
                  >
                    <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                    <span>{link.eyebrow}</span>
                    <strong>{link.title}</strong>
                    <p>{link.copy}</p>
                    <small>
                      {link.ctaLabel}
                      <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                    </small>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="instagram-link-section" aria-labelledby="instagram-link-seasonal-title">
            <div className="blog-redesign-section-heading">
              <h2 id="instagram-link-seasonal-title">Teraz w sezonie</h2>
              <p>Tematy, które można podpiąć pod bieżące posty, stories i wyróżnione relacje.</p>
            </div>
            <div className="instagram-link-grid">
              {seasonalTrendRadar.activeEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.instagramHref}
                  prefetch={false}
                  className="instagram-link-card"
                  data-analytics-event="topic_selected"
                  data-analytics-location="instagram-link-seasonal"
                  data-analytics-campaign={seasonalTrendRadar.campaign}
                  data-analytics-problem={entry.problemKey}
                  data-analytics-species={entry.species}
                  data-analytics-cta-label={entry.ctaLabel}
                  data-analytics-item-type="instagram_seasonal_topic"
                  data-analytics-item-slug={entry.id}
                  data-analytics-target-href={entry.instagramHref}
                >
                  <CalendarDays size={22} strokeWidth={1.9} aria-hidden="true" />
                  <span>{entry.eyebrow}</span>
                  <strong>{entry.title}</strong>
                  <p>{entry.copy}</p>
                  <small>
                    {entry.ctaLabel}
                    <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                  </small>
                </Link>
              ))}
            </div>
          </section>

          <section className="instagram-link-section" aria-labelledby="instagram-link-posts-title">
            <div className="blog-redesign-section-heading">
              <h2 id="instagram-link-posts-title">Mapa linków do postów</h2>
              <p>Stałe adresy dla najmocniejszych tematów. Każdy link ma UTM, więc da się mierzyć wejście z Instagrama.</p>
            </div>
            <div className="instagram-link-grid">
              {INSTAGRAM_PROBLEM_ROUTES.map((route) => (
                <Link
                  key={route.id}
                  href={route.href}
                  prefetch={false}
                  className="instagram-link-card"
                  data-analytics-event="topic_selected"
                  data-analytics-location="instagram-link-problem-map"
                  data-analytics-campaign="trend_radar"
                  data-analytics-problem={route.problemKey}
                  data-analytics-cta-label={route.label}
                  data-analytics-item-type="instagram_problem_route"
                  data-analytics-item-slug={route.problemKey}
                  data-analytics-target-href={route.publicHref}
                >
                  <span>{route.postTopic}</span>
                  <strong>{route.label}</strong>
                  <p>{route.publicHref}</p>
                  <small>
                    Otwórz temat
                    <ArrowRight size={14} strokeWidth={1.9} aria-hidden="true" />
                  </small>
                </Link>
              ))}
            </div>
          </section>

          <section className="instagram-link-note">
            <strong>Do użycia w bio:</strong>
            <span>https://regulskibehawiorysta.pl/instagram</span>
          </section>
        </div>

        <NotatnikFooter showReviews={false} primaryHref="/quiz" primaryLabel="Quiz" />
      </div>
    </main>
  )
}
