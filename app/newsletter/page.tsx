import type { Metadata } from 'next'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { NotatnikPageShell, NotatnikSectionHead, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Newsletter dla opiekunów psów i kotów',
  path: '/newsletter',
  description:
    'Spokojny newsletter o zachowaniu psów i kotów: konkretne obserwacje, nowe teksty i materiały bez presji sprzedażowej.',
})

const newsletterCards = [
  {
    title: 'Raz w miesiącu, bez codziennego szumu',
    copy: 'Raz w miesiącu spokojna porcja wiedzy o psach, kotach i pierwszych krokach w trudnych sytuacjach.',
  },
  {
    title: 'Segment: pies, kot albo oba',
    copy: 'Przy zapisie wybierasz najbliższy obszar. To pomaga nie mieszać tematów, które nie dotyczą Twojej sytuacji.',
  },
  {
    title: 'Bez diagnozowania na siłę',
    copy: 'Newsletter ma pomagać nazwać sytuację i spokojnie przejść do następnego kroku, nie zastępuje konsultacji ani badania zdrowia.',
  },
] as const

export default function NewsletterPage() {
  return (
    <NotatnikPageShell
      tag="Newsletter"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/mapa-sprawy"
      ctaLabel="Mapa zachowania"
      footerPrimaryHref="/mapa-sprawy"
      footerPrimaryLabel="Mapa zachowania"
      sideVisualVariant="blog"
      pageClassName="newsletter-page"
    >
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Newsletter', path: '/newsletter' },
        ])}
      />

      <div className="container editorial-stack">
        <section className="panel section-panel newsletter-hero-panel">
          <div className="editorial-section-head">
            <div className="editorial-section-head-copy">
              <div className="section-eyebrow">Newsletter</div>
              <h1>Raz w miesiącu spokojna porcja wiedzy o psach i kotach.</h1>
            </div>
            <p className="editorial-section-lead">
              Bez spamu, bez codziennych maili. Dostajesz konkret o zachowaniu, napięciu, środowisku i pierwszych krokach w trudnych sytuacjach.
            </p>
          </div>

          <div className="premium-two-column-grid top-gap-small">
            <NewsletterSignup location="newsletter-page" sourcePage="/newsletter" />
          </div>
        </section>

        <section className="panel section-panel">
          <NotatnikSectionHead index="I." kicker="Zasady" title="Co dostajesz po zapisie." />
          <div className="card-grid three-up top-gap-small">
            {newsletterCards.map((card) => (
              <article key={card.title} className="summary-card tree-backed-card">
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </NotatnikPageShell>
  )
}
