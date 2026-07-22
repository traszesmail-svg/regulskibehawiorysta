import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, CalendarCheck, Cat, Dog, MailCheck, ShieldCheck } from 'lucide-react'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getNewsletterPlanPreview } from '@/lib/newsletter-plan'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'

export const dynamic = 'force-static'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Newsletter dla opiekunów psów i kotów',
  path: '/newsletter',
  description:
    'Spokojny newsletter o zachowaniu psów i kotów: jeden praktyczny temat miesięcznie, materiał startowy i wskazówki bez codziennego spamu.',
})

const newsletterBenefits = [
  {
    icon: CalendarCheck,
    title: 'Jedna wiadomość w miesiącu',
    copy: 'Temat dobrany do pory roku i codziennych sytuacji opiekunów, bez częstych kampanii.',
  },
  {
    icon: BookOpenCheck,
    title: 'Materiał od razu po zapisie',
    copy: 'PDF dobierany do psa, kota albo obu. Możesz pobrać go także bezpośrednio po wysłaniu formularza.',
  },
  {
    icon: ShieldCheck,
    title: 'Jasne zasady',
    copy: 'Wiesz, czego się spodziewać, a z wiadomości możesz wypisać się jednym kliknięciem.',
  },
] as const

const welcomeMaterials = [
  {
    icon: Dog,
    label: 'Dla opiekuna psa',
    title: 'Ruch czy mniej pobudzenia?',
    copy: 'Jak odróżnić brak aktywności od przeciążenia i od czego zacząć obserwację.',
  },
  {
    icon: Cat,
    label: 'Dla opiekuna kota',
    title: 'Czy kot żyje w napięciu?',
    copy: 'Ciche sygnały stresu, środowisko i pierwsze zmiany, które warto sprawdzić.',
  },
] as const

export default function NewsletterPage() {
  const upcomingIssues = getNewsletterPlanPreview()

  return (
    <main className="notatnik-page newsletter-page newsletter-redesign-page">
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Newsletter', path: '/newsletter' },
        ])}
      />

      <div className="notatnik-shell newsletter-redesign-shell">
        <NotatnikTopbar
          tag="Newsletter"
          navItems={PUBLIC_SITE_NAV_ITEMS}
          showUtilityLinks={false}
          ctaHref="/cennik"
          ctaLabel="Umów konsultację"
        />
        <ReferenceHeroLeaf />

        <div className="newsletter-redesign-content">
          <section className="newsletter-redesign-hero" aria-labelledby="newsletter-title">
            <div className="newsletter-redesign-hero-copy">
              <span className="blog-redesign-kicker">Newsletter dla opiekunów</span>
              <h1 id="newsletter-title">Spokojna wiadomość, do której można wrócić</h1>
              <p>
                Raz w miesiącu wybieram jeden ważny temat dotyczący psa lub kota. Bez skrótów, bez straszenia
                i bez codziennego szumu.
              </p>
              <div className="newsletter-redesign-hero-facts" aria-label="Najważniejsze informacje">
                <span>
                  <MailCheck size={18} strokeWidth={1.8} aria-hidden="true" />
                  1 wiadomość miesięcznie
                </span>
                <span>
                  <BookOpenCheck size={18} strokeWidth={1.8} aria-hidden="true" />
                  PDF na start
                </span>
                <span>
                  <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
                  Rezygnacja jednym kliknięciem
                </span>
              </div>
              <a href="#zapis" className="newsletter-redesign-hero-cta">
                Zapisz się i odbierz materiał
                <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
              </a>
            </div>
            <figure className="newsletter-redesign-hero-media">
              <Image
                src="/branding/section-heroes/newsletter-reading-v1.webp"
                alt="Opiekun czyta spokojną wiadomość przy odpoczywającym psie i kocie"
                fill
                sizes="(max-width: 760px) 92vw, 560px"
                priority
              />
            </figure>
          </section>

          <section className="newsletter-redesign-signup" id="zapis" aria-labelledby="newsletter-signup-title">
            <div className="newsletter-redesign-signup-copy">
              <span>Twój pierwszy materiał</span>
              <h2 id="newsletter-signup-title">Wybierz, czy bliższy jest Ci pies, kot czy oba</h2>
              <p>
                Po zapisie od razu pokażemy link do właściwego PDF-u i wyślemy go na podany adres. Dzięki temu
                newsletter zaczyna się od konkretnej pomocy, a nie od pustego potwierdzenia.
              </p>
              <div className="newsletter-welcome-materials">
                {welcomeMaterials.map((material) => {
                  const Icon = material.icon

                  return (
                    <article key={material.label}>
                      <span aria-hidden="true">
                        <Icon size={21} strokeWidth={1.7} />
                      </span>
                      <div>
                        <small>{material.label}</small>
                        <strong>{material.title}</strong>
                        <p>{material.copy}</p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <NewsletterSignup
              location="newsletter-page"
              sourcePage="/newsletter"
              className="newsletter-redesign-form-card"
              title="Zapis do newslettera"
              lead="Podaj adres, wybierz temat i potwierdź zgodę. Pierwszy materiał dostaniesz od razu."
            />
          </section>

          <section className="newsletter-redesign-plan" aria-labelledby="newsletter-plan-title">
            <div className="newsletter-redesign-section-head">
              <div>
                <span>W kolejnych wiadomościach</span>
                <h2 id="newsletter-plan-title">Pomoc dopasowana do tego, co dzieje się teraz</h2>
              </div>
              <p>
                Burze, zmiana codziennego rytmu, goście czy napięcie w domu. Każda wiadomość pomaga zauważyć
                najważniejsze sygnały i podpowiada jeden spokojny krok do wypróbowania.
              </p>
            </div>

            <div className="newsletter-redesign-issue-grid">
              {upcomingIssues.map((issue) => (
                <article key={issue.period}>
                  <span>{issue.monthLabel}</span>
                  <h3>{issue.title}</h3>
                  <p>{issue.focus}</p>
                  <Link href={issue.resourceHref} prefetch={false}>
                    {issue.resourceLabel}
                    <ArrowRight size={15} strokeWidth={1.9} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="newsletter-redesign-benefits" aria-labelledby="newsletter-benefits-title">
            <div className="newsletter-redesign-section-head">
              <div>
                <span>Co dokładnie dostajesz</span>
                <h2 id="newsletter-benefits-title">Mało wiadomości, dużo użytecznego kontekstu</h2>
              </div>
            </div>
            <div className="newsletter-redesign-benefit-grid">
              {newsletterBenefits.map((benefit) => {
                const Icon = benefit.icon

                return (
                  <article key={benefit.title}>
                    <span aria-hidden="true">
                      <Icon size={25} strokeWidth={1.7} />
                    </span>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.copy}</p>
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <NotatnikFooter showReviews={false} primaryHref="/cennik" primaryLabel="Umów konsultację" />
      </div>
    </main>
  )
}
