import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { Schema } from '@/components/schema'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { getBreadcrumbJsonLd, getServiceJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { PUBLIC_THERAPY_OFFER } from '@/lib/public-offer'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Terapia behawioralna',
  path: '/terapia',
  description:
    'Indywidualna terapia behawioralna psów i kotów, ustalana po pełnej konsultacji. Zakres, forma i dostępność zależą od konkretnej sytuacji.',
})

export default function TherapyPage() {
  return (
    <NotatnikPageShell
      tag="Indywidualna ścieżka"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/zapytaj#formularz"
      ctaLabel="Zacznij od Zapytaj"
      footerPrimaryHref="/zapytaj#formularz"
      footerPrimaryLabel="Zapytaj behawiorystę"
      showSideVisuals={false}
      pageClassName="canonical-service-page therapy-page"
      shellClassName="canonical-service-shell"
      footerVariant="home"
      showFooterReviews={false}
      topbarProfile="flow"
    >
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'Terapia behawioralna', path: '/terapia' },
          ]),
          getServiceJsonLd({
            name: PUBLIC_THERAPY_OFFER.name,
            description: PUBLIC_THERAPY_OFFER.summary,
            serviceUrl: '/terapia',
          }),
        ]}
      />

      <section className="canonical-service-hero" aria-labelledby="therapy-title">
        <div>
          <span className="zapytaj-kicker">DŁUŻSZA PRACA, GDY JEST NA NIĄ PRZESTRZEŃ</span>
          <h1 id="therapy-title">Terapia behawioralna</h1>
          <p>
            Terapia nie jest kolejnym produktem do wybrania z listy. To indywidualna ścieżka pracy: jej cel, tempo,
            forma kontaktu i dostępność ustalamy dopiero wtedy, gdy znamy sytuację z pełnej konsultacji.
          </p>
          <a href="/kontakt" className="notatnik-btn">
            Zapytaj o możliwość terapii <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="canonical-service-hero-art canonical-service-hero-art-therapy" aria-hidden="true">
          <span>02</span>
          <strong>Nie każda sprawa wymaga tej samej drogi.</strong>
          <small>Najpierw sprawdzamy, czego naprawdę potrzebujesz.</small>
        </div>
      </section>

      <section className="canonical-service-explanation" aria-labelledby="therapy-access-title">
        <div className="canonical-service-heading">
          <span className="zapytaj-kicker">DOSTĘP PO PEŁNEJ KONSULTACJI</span>
          <h2 id="therapy-access-title">Najpierw rozpoznanie, potem wspólna praca</h2>
          <p>
            Po pełnej konsultacji otrzymujesz jasną informację, czy terapia jest dobrym kolejnym krokiem. Jeśli tak,
            ustalamy ją indywidualnie. Terminy i zakres ustalamy po rozmowie, bez zakupu gotowego pakietu w ciemno.
          </p>
        </div>
        <div className="canonical-service-steps">
          <article>
            <h3>Pełna konsultacja</h3>
            <p>Najpierw zbieramy kontekst i ustalamy realny cel pracy.</p>
          </article>
          <article>
            <h3>Indywidualna propozycja</h3>
            <p>Forma i tempo wynikają z sytuacji, a nie z gotowego pakietu.</p>
          </article>
          <article>
            <h3>Kontakt ustalony z góry</h3>
            <p>Wiesz, czego dotyczy wsparcie i kiedy możesz z niego skorzystać.</p>
          </article>
        </div>
      </section>

      <section className="canonical-service-note" aria-label="Ważna informacja">
        <strong>Jeśli dopiero szukasz pierwszego kroku</strong>
        <p>Zacznij od krótkiej rozmowy. Nie musisz od razu decydować o terapii.</p>
        <a href="/zapytaj#formularz">Zapytaj behawiorystę <ArrowRight size={16} aria-hidden="true" /></a>
      </section>
    </NotatnikPageShell>
  )
}
