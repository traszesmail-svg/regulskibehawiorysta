import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  Mail,
  MessageSquare,
  PenLine,
  Search,
} from 'lucide-react'
import { ContactLeadForm } from '@/components/ContactLeadForm'
import { MobileFirstStepCta } from '@/components/MobileFirstStepCta'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getFaqPageJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { buildMailtoHref, COAPE_ORG_URL, COAPE_POLSKA_LOGO, getPublicContactDetails } from '@/lib/site'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Kontakt i pierwszy krok',
  path: '/kontakt',
  description:
    'Napisz krótko, co się dzieje u Twojego psa lub kota. Pomogę wybrać najrozsądniejszy pierwszy krok.',
})

const contactFaqItems = [
  {
    question: 'Czy konsultacja online jest skuteczna?',
    answer:
      'Tak, jeśli dobrze zbierzemy kontekst: opis sytuacji, historię zachowania, rutynę, środowisko i nagrania, jeśli są. Przy wielu tematach to wystarcza, żeby zaplanować pierwszy krok.',
  },
  {
    question: 'Ile trwa proces terapii behawioralnej?',
    answer:
      'To zależy od problemu, czasu trwania, zdrowia zwierzęcia i możliwości opiekuna. Po pierwszym kontakcie podpowiem, czy wystarczy krótka rozmowa, czy potrzebny będzie szerszy plan.',
  },
  {
    question: 'Jak mogę się przygotować do konsultacji?',
    answer:
      'Zapisz, od kiedy trwa sytuacja, kiedy się pojawia, co już próbowaliście i co najbardziej Cię martwi. Jeśli masz krótkie nagrania, wspomnij o nich w formularzu.',
  },
]

export default async function ContactPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const contact = getPublicContactDetails()
  const email = contact.email ?? 'kontakt@regulskibehawiorysta.pl'
  const fallbackMailHref = buildMailtoHref(
    email,
    'Pytanie z formularza - Regulski Behawiorysta',
    'Opis sytuacji:\n\nGatunek:\nOd kiedy trwa:\nCo najbardziej martwi:\n',
  )
  const structuredData = [
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Kontakt', path: '/kontakt' },
    ]),
    getFaqPageJsonLd(contactFaqItems),
  ]

  return (
    <main className="notatnik-page contact-page contact-page-redesign contact-page-reference">
      <Schema data={structuredData} />
      <div className="notatnik-shell contact-shell">
        <NotatnikTopbar
          tag="Kontakt"
          navItems={PUBLIC_SITE_NAV_ITEMS}
          showUtilityLinks={false}
          ctaHref="/cennik"
          ctaLabel="Umów konsultację"
        />
        <ReferenceHeroLeaf />

        <section className="contact-reference-hero" aria-labelledby="contact-title">
          <div className="contact-reference-hero-copy">
            <span className="reference-pill">Kontakt</span>
            <h1 id="contact-title">
              Napisz krótko, co się dzieje. Pomogę Ci wybrać najrozsądniejszy pierwszy krok.
            </h1>
            <p>
              Krótka wiadomość wystarczy, bym zrozumiał sytuację i podpowiedział, od czego
              najlepiej zacząć. Bez oceniania. Z uważnością i fachową wiedzą.
            </p>
            <MobileFirstStepCta
              eyebrow="Nie musisz znać nazwy problemu"
              title="Opisz sytuację w kilku zdaniach"
              copy="Jeśli nie wiesz, czy wybrać Kwadrans, dłuższą rozmowę czy najpierw doprecyzować temat, zacznij od formularza."
              primaryHref="#formularz"
              primaryLabel="Przejdź do formularza"
              secondaryHref="/cennik"
              secondaryLabel="Zobacz cennik"
            />
          </div>
          <div className="contact-reference-photo-wrap">
            <figure className="contact-reference-photo">
              <Image
                src="/branding/section-heroes/contact-message-v1.webp"
                alt="Opiekunka opisuje sytuację psa i kota w krótkiej wiadomości"
                width={1122}
                height={1402}
                priority
                sizes="(max-width: 760px) 86vw, 360px"
              />
            </figure>
          </div>
        </section>

        <section className="contact-reference-benefits" aria-label="Jak pomagam uporządkować sytuację">
          <article>
            <span className="contact-reference-icon" aria-hidden="true">
              <Leaf size={34} strokeWidth={1.8} />
            </span>
            <div>
              <h2>Rozumiem przyczynę</h2>
              <p>Docieram do źródła problemu, nie tylko do objawów.</p>
            </div>
          </article>
          <article>
            <span className="contact-reference-icon" aria-hidden="true">
              <Search size={34} strokeWidth={1.8} />
            </span>
            <div>
              <h2>Patrzę szerzej</h2>
              <p>Łączę zachowanie, zdrowie, środowisko i codzienny rytm zwierzęcia.</p>
            </div>
          </article>
          <article>
            <span className="contact-reference-icon" aria-hidden="true">
              <CheckCircle2 size={36} strokeWidth={1.8} />
            </span>
            <div>
              <h2>Jasny pierwszy krok</h2>
              <p>Otrzymasz konkretną propozycję działania dopasowaną do Ciebie.</p>
            </div>
          </article>
        </section>

        <section className="contact-reference-cta-card" aria-labelledby="contact-write-title">
          <div className="contact-reference-cta-icon" aria-hidden="true">
            <Mail size={48} strokeWidth={1.6} />
          </div>
          <div className="contact-reference-cta-copy">
            <h2 id="contact-write-title">Napisz do mnie</h2>
            <p>
              Opisz krótko, co się dzieje u Ciebie i Twojego psa lub kota. Odpowiem i zaproponuję
              najlepszy pierwszy krok.
            </p>
            <div className="contact-reference-actions">
              <Link href="#formularz" className="contact-reference-primary">
                <PenLine size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>Przejdź do formularza</span>
              </Link>
              <Link href="/cennik" prefetch={false} className="contact-reference-secondary">
                Umów konsultację
              </Link>
            </div>
          </div>
        </section>

        <section className="contact-reference-form-section" id="formularz" aria-labelledby="contact-form-title">
          <div className="contact-reference-section-head">
            <span className="contact-reference-heading-icon" aria-hidden="true">
              <MessageSquare size={26} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="contact-form-title">Formularz kontaktowy</h2>
              <p>Wystarczy kilka zdań. Najważniejsze: co się dzieje, od kiedy i co Cię martwi.</p>
            </div>
          </div>
          <div className="contact-reference-form-card">
            <noscript>
              <div className="info-box">
                Formularz działa także bez JavaScriptu. Po wysłaniu wrócisz do tej sekcji z potwierdzeniem albo komunikatem,
                co trzeba poprawić.
              </div>
            </noscript>
            <ContactLeadForm searchParams={searchParams} />
            <div className="contact-form-fallback">
              <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>
                Jeśli formularz się nie załaduje, możesz napisać bezpośrednio:{' '}
                <a href={fallbackMailHref} className="contact-fallback-email">{email}</a>
              </span>
            </div>
          </div>
        </section>

        <section className="contact-reference-faq" id="faq" aria-labelledby="contact-faq-title">
          <h2 id="contact-faq-title">Najczęściej zadawane pytania</h2>
          <div className="contact-reference-faq-list">
            {contactFaqItems.map((item) => (
              <details key={item.question} className="contact-reference-faq-item">
                <summary>
                  <span>{item.question}</span>
                  <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="contact-reference-reassurance" aria-labelledby="contact-approach-title">
          <div className="contact-reference-reassurance-copy">
            <div className="contact-reference-reassurance-heading-row">
              <span className="contact-reference-reassurance-icon" aria-hidden="true">
                <Leaf size={34} strokeWidth={1.6} />
              </span>
              <span className="contact-reference-reassurance-kicker">Moje podejście</span>
            </div>
            <h2 id="contact-approach-title">Pracuję z uważnością, szacunkiem i empatią</h2>
            <p>
              Zanim zaproponuję rozwiązanie, chcę zrozumieć kontekst, granice i codzienność
              Waszej relacji.
            </p>

            <ul className="contact-reference-values" aria-label="Co to oznacza w praktyce">
              <li>
                <CheckCircle2 size={21} strokeWidth={2} aria-hidden="true" />
                <span>
                  <strong>Bez oceniania</strong>
                  <small>Słucham i porządkuję sytuację.</small>
                </span>
              </li>
              <li>
                <CheckCircle2 size={21} strokeWidth={2} aria-hidden="true" />
                <span>
                  <strong>Bez presji</strong>
                  <small>Tempo dopasowuję do zwierzęcia.</small>
                </span>
              </li>
              <li>
                <CheckCircle2 size={21} strokeWidth={2} aria-hidden="true" />
                <span>
                  <strong>Z konkretnym krokiem</strong>
                  <small>Wiesz, od czego spokojnie zacząć.</small>
                </span>
              </li>
            </ul>

            <p className="contact-reference-reassurance-signoff">
              Każde zwierzę i każda relacja zasługują na zrozumienie.
            </p>
          </div>

          <div className="contact-reference-reassurance-visual">
            <Image
              src="/branding/contact/approach-animals-v1.png"
              alt="Spokojny pies i kot odpoczywają razem w domu"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 430px"
            />
            <a
              className="contact-reference-reassurance-credential"
              href={COAPE_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Poznaj metodologię COAPE"
            >
              <Image
                src={COAPE_POLSKA_LOGO.src}
                alt={COAPE_POLSKA_LOGO.alt}
                width={COAPE_POLSKA_LOGO.width}
                height={COAPE_POLSKA_LOGO.height}
              />
              <span>Praca oparta na metodologii COAPE</span>
            </a>
          </div>
        </section>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
