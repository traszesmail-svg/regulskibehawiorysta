import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
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
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getFaqPageJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { buildMailtoHref, getPublicContactDetails } from '@/lib/site'

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

export default function ContactPage() {
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
        <NotatnikTopbar tag="Kontakt" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} />

        <section className="contact-reference-hero" aria-labelledby="contact-title">
          <div className="contact-reference-photo-wrap">
            <figure className="contact-reference-photo">
              <Image
                src="/branding/omnie3.png"
                alt="Krzysztof Regulski w granatowym stroju medycznym"
                width={1024}
                height={1536}
                priority
                sizes="(max-width: 760px) 86vw, 360px"
              />
            </figure>
          </div>

          <div className="contact-reference-hero-copy">
            <h1 id="contact-title">
              Napisz krótko, co się dzieje. Pomogę Ci wybrać najrozsądniejszy pierwszy krok.
            </h1>
            <p>
              Krótka wiadomość wystarczy, bym zrozumiał sytuację i podpowiedział, od czego
              najlepiej zacząć. Bez oceniania. Z uważnością i fachową wiedzą.
            </p>
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
              <h2>Szeroka perspektywa</h2>
              <p>Łączę wiedzę, doświadczenie i wgląd w zachowanie zwierząt.</p>
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
              <Link href="/" prefetch={false} className="contact-reference-secondary">
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
                Formularz wymaga włączonego JavaScriptu. Możesz od razu napisać bezpośrednio:{' '}
                <a href={fallbackMailHref} className="contact-fallback-email">{email}</a>.
              </div>
            </noscript>
            <Suspense
              fallback={
                <div className="info-box">
                  Formularz się ładuje. Jeśli nie pojawi się po chwili, napisz bezpośrednio:{' '}
                  <a href={fallbackMailHref} className="contact-fallback-email">{email}</a>.
                </div>
              }
            >
              <ContactLeadForm />
            </Suspense>
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

        <section className="contact-reference-reassurance" aria-label="Podejście do pracy">
          <span className="contact-reference-reassurance-icon" aria-hidden="true">
            <Leaf size={42} strokeWidth={1.6} />
          </span>
          <div>
            <h2>Pracuję z uważnością, szacunkiem i empatią</h2>
            <p>Bo każde zwierzę i każda relacja zasługują na zrozumienie.</p>
          </div>
        </section>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
