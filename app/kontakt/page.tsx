import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Mail,
  MessageSquare,
} from 'lucide-react'
import { ContactLeadForm } from '@/components/ContactLeadForm'
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
          ctaHref="/zapytaj"
          ctaLabel="Zapytaj behawiorystę – 79 zł"
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

            <div className="contact-pathways-grid" aria-label="Wybierz formę kontaktu">
              <div className="contact-pathway-card is-highlight">
                <div className="contact-pathway-badge">Problem z zachowaniem</div>
                <h2>Zapytaj behawiorystę</h2>
                <p className="contact-pathway-price">79 zł · telefonicznie do 15 min</p>
                <p className="contact-pathway-desc">
                  Gdy potrzebujesz pilnej rozmowy, omówienia sytuacji psa lub kota i ustalonego pierwszego kierunku działania.
                </p>
                <Link href="/zapytaj" prefetch={false} className="contact-pathway-action is-primary">
                  Zapytaj behawiorystę – 79 zł
                </Link>
              </div>

              <div className="contact-pathway-card">
                <div className="contact-pathway-badge">Zwykła wiadomość</div>
                <h2>Formularz kontaktowy</h2>
                <p className="contact-pathway-price">Pytanie ogólne · bezpłatnie</p>
                <p className="contact-pathway-desc">
                  Gdy masz sprawę organizacyjną, techniczną lub chcesz spokojnie opisać temat drogą mailową.
                </p>
                <a href="#formularz" className="contact-pathway-action is-secondary">
                  Przejdź do formularza <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>
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

        <section className="contact-trust-card" aria-labelledby="contact-trust-title">
          <div className="contact-trust-content">
            <div className="contact-trust-badge">
              <Image
                src={COAPE_POLSKA_LOGO.src}
                alt={COAPE_POLSKA_LOGO.alt}
                width={COAPE_POLSKA_LOGO.width}
                height={COAPE_POLSKA_LOGO.height}
                className="contact-trust-logo"
              />
              <span className="contact-trust-badge-label">Krzysztof Regulski · Dyplomant COAPE · technik weterynarii</span>
            </div>

            <h2 id="contact-trust-title">Wiadomości czytam i odpowiadam osobiście.</h2>
            <p className="contact-trust-lead">
              Każda sytuacja ze zwierzęciem jest inna. Wiadomości czytam osobiście i odpowiadam zazwyczaj w ciągu 24–48 godzin roboczych — bez oceniania, ze spokojem i uważnością na Waszą codzienność.
            </p>

            <div className="contact-trust-channels">
              <div className="contact-trust-channel">
                <span className="contact-trust-channel-label">Bezpośredni kontakt e-mail:</span>
                <a href={`mailto:${email}`} className="contact-trust-channel-link">
                  {email}
                </a>
              </div>
              <div className="contact-trust-channel">
                <span className="contact-trust-channel-label">Potrzebujesz pilnej rozmowy?</span>
                <Link href="/zapytaj" prefetch={false} className="contact-trust-channel-action">
                  Zapytaj behawiorystę — 79 zł →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
