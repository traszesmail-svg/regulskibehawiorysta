import type { Metadata } from 'next'
import Image from 'next/image'
import {
  BookOpen,
  ExternalLink,
  Heart,
  HelpCircle,
  Leaf,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { NotatnikFinalCta } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getPersonJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import {
  ABOUT_SPECIALIST_PHOTO,
  CAPBT_PROFILE_URL,
  COAPE_ORG_URL,
  COAPE_POLSKA_LOGO,
  MEDIA_MENTIONS,
  SPECIALIST_NAME,
  SPECIALIST_PUBLIC_STATUS,
} from '@/lib/site'
import { FAQ_SHORTLISTS } from '@/lib/trust-layer'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Krzysztof Regulski - behawiorysta COAPE',
  path: '/o-mnie',
  description:
    'Krzysztof Regulski - behawiorysta psów i kotów online. Podejście, kwalifikacje, profil publiczny i informacje przed pierwszym kontaktem.',
})

const methodologyPoints = [
  { label: 'Holistyczne podejście', icon: <Leaf size={20} strokeWidth={1.8} aria-hidden="true" /> },
  { label: 'Oparte na nauce', icon: <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" /> },
  { label: 'Etyczne i bez przemocy', icon: <Heart size={20} strokeWidth={1.8} aria-hidden="true" /> },
  { label: 'Skupione na jakości życia', icon: <ShieldCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
]

const credentialCards = [
  {
    title: SPECIALIST_PUBLIC_STATUS,
    copy: 'Metodologia pracy z zachowaniem zwierząt towarzyszących.',
    icon: (
      <Image
        src={COAPE_POLSKA_LOGO.src}
        alt=""
        width={72}
        height={24}
        className="coape-inline-badge"
      />
    ),
  },
  {
    title: 'Technik weterynarii',
    copy: 'Pomaga uwzględnić zdrowie i rozpoznać moment, gdy potrzebny jest lekarz.',
    icon: <Stethoscope size={28} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    title: 'Bez kar i przymusu',
    copy: 'Zmianę budujemy przez bezpieczeństwo, zrozumienie i praktyczne kroki.',
    icon: <Leaf size={28} strokeWidth={1.8} aria-hidden="true" />,
  },
]

const featuredArticles = MEDIA_MENTIONS.filter((mention) =>
  mention.id === 'magwet-fear' || mention.id === 'magwet-litter-box',
)

const publicSources = [
  { label: 'COAPE Polska — metodologia', href: COAPE_ORG_URL },
  {
    label: 'Publiczny profil CAPBT',
    href: CAPBT_PROFILE_URL,
  },
]

export default function AboutPage() {
  const faqItems = FAQ_SHORTLISTS.consultation.slice(0, 2)

  return (
    <ReferencePageShell className="reference-about-page reference-about-redesign-page" ctaHref="/zapytaj" ctaLabel="Zapytaj behawiorystę – 79 zł">
      <Schema
        data={[
          getPersonJsonLd(),
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'O mnie', path: '/o-mnie' },
          ]),
          getFaqPageJsonLd(faqItems),
        ]}
      />

      <section className="reference-hero reference-about-hero reference-about-redesign-hero">
        <div className="reference-hero-copy reference-about-hero-copy">
          <span className="reference-pill">O MNIE</span>
          <h1>{SPECIALIST_NAME}. Behawiorysta psów i kotów.</h1>
          <p>
            Pomagam uporządkować sytuację psa lub kota tak, żeby po rozmowie został jasny pierwszy krok. Bez sztucznej
            pewności, tam gdzie najpierw trzeba coś sprawdzić.
          </p>
        </div>
        <figure className="reference-photo-card reference-about-portrait-card">
          <Image
            src={ABOUT_SPECIALIST_PHOTO.src}
            alt={ABOUT_SPECIALIST_PHOTO.alt}
            width={ABOUT_SPECIALIST_PHOTO.width}
            height={ABOUT_SPECIALIST_PHOTO.height}
            priority
            sizes="(max-width: 760px) 88vw, 430px"
          />
        </figure>
        <span className="reference-about-leaf reference-about-leaf-left" aria-hidden="true" />
        <span className="reference-about-leaf reference-about-leaf-right" aria-hidden="true" />
      </section>

      <section className="reference-content-column reference-wide-column reference-about-redesign-flow">
        <section className="reference-section-card reference-about-story-card">
          <div className="reference-about-card-icon" aria-hidden="true">
            <Users size={28} strokeWidth={1.7} />
          </div>
          <div className="reference-about-card-body">
            <h2>Jak pracuję z opiekunami psów i kotów</h2>
            <p>
              Od ponad 10 lat pomagam opiekunom psów i kotów zrozumieć zachowania, które w domu albo na spacerze
              zaczynają robić się trudne. Pracuję spokojnie, bez oceniania i bez kar — najpierw szukam przyczyny
              napięcia, dopiero potem dobieram konkretne kroki.
            </p>
            <p>
              Jako behawiorysta, doświadczony technik weterynarii i dietetyk patrzę na zachowanie szerzej:
            </p>
            <ul className="reference-about-bullet-list">
              <li><strong>Emocje i codzienne zachowanie:</strong> szczekanie, ciągnięcie, lęk, kuweta, relacje w domu.</li>
              <li><strong>Zdrowie i samopoczucie:</strong> wykluczenie bólu i somatycznych przyczyn zmiany zachowania.</li>
              <li><strong>Środowisko i rutyna:</strong> odpowiednia dieta, stymulacja i bezpieczny rytm dnia.</li>
            </ul>
            <p>
              Dzięki temu oddzielamy objaw od możliwej przyczyny i wybieramy pierwszy krok, który ma realny sens.
            </p>
            <div className="reference-about-credentials-inline">
              <h3>Kwalifikacje i podejście</h3>
              <div className="reference-about-credential-grid">
                {credentialCards.map((card) => (
                  <article key={card.title} className="reference-about-credential">
                    <span className="reference-about-credential-icon">{card.icon}</span>
                <h3>{card.title}</h3>
                    <p>{card.copy}</p>
                  </article>
                ))}
              </div>
              <div className="reference-about-sources" aria-label="Źródła i profil publiczny">
                <span>Więcej informacji:</span>
                <div>
                  {publicSources.map((source) => (
                    <a key={source.label} href={source.href} target="_blank" rel="noopener noreferrer">
                      {source.label}
                      <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="reference-section-card reference-methodology-card reference-about-methodology-card" id="metodologia-pracy">
          <div className="reference-about-card-icon" aria-hidden="true">
            <Leaf size={28} strokeWidth={1.7} />
          </div>
          <div className="reference-about-card-body">
            <h2>Metodologia pracy</h2>
            <p>
              W pracy behawioralnej opieram się na metodologii COAPE — holistycznym, opartym na nauce podejściu do terapii zachowania zwierząt towarzyszących.
            </p>
            <p>
              Zamiast traktować zachowanie jedynie jako problem do wygaszenia, analizujemy współdziałanie kluczowych czynników:
            </p>
            <ul className="reference-about-bullet-list">
              <li><strong>Emocje i nastrój:</strong> analiza motywacji i poziomu stresu w modelu MHERA.</li>
              <li><strong>Stan zdrowia:</strong> powiązanie samopoczucia fizycznego z reakcjami zwierzęcia.</li>
              <li><strong>Środowisko i uczenie się:</strong> historia doświadczeń, relacje społeczne i codzienna rutyna.</li>
            </ul>
            <p>
              Model MHERA pozwala zaplanować działanie w sposób etyczny, skuteczny i możliwy do utrzymania w Waszym domu.
            </p>
          </div>
          <div className="reference-methodology-points" aria-label="Założenia metodologii">
            {methodologyPoints.map((point) => (
              <div key={point.label} className="reference-methodology-point">
                {point.icon}
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="reference-section-card reference-about-publication-card">
          <div className="reference-magwet-logo-frame">
            <Image
              src="https://magwet.pl/assets/magwet_logo_green-2c8e69910c786ae0c91c1e2a409bf5e8effee4241abbf9778fd43858d3cf696d.png"
              alt="Logo Magazynu Weterynaryjnego"
              fill
              sizes="(max-width: 760px) 90vw, 300px"
            />
          </div>
          <div className="reference-about-publication-copy">
            <span>Publikacje eksperckie</span>
            <h2>Artykuły w Magazynie Weterynaryjnym</h2>
            <div className="reference-about-publication-list">
              {featuredArticles.map((article) => (
                <article key={article.id}>
                  <span>{article.label}</span>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                  <a href={article.href} target="_blank" rel="noopener noreferrer">
                    {article.cta}
                    <ExternalLink size={16} strokeWidth={1.8} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          </div>
          <span className="reference-about-leaf reference-about-leaf-publication" aria-hidden="true" />
        </section>

        <section className="reference-section-card reference-about-faq-card">
          <div className="reference-about-card-icon" aria-hidden="true">
            <HelpCircle size={28} strokeWidth={1.7} />
          </div>
          <div className="reference-about-card-body">
            <h2>Najczęstsze pytania o sposób pracy</h2>
            <div className="reference-compact-faq">
              {faqItems.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {item.question}
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <NotatnikFinalCta
          title="Porozmawiajmy o sytuacji Twojego zwierzęcia."
          copy="Napisz, co się dzieje. Wspólnie ustalimy, jaki kolejny krok ma sens."
          primaryHref="/zapytaj"
          primaryLabel="Zapytaj behawiorystę"
        />
      </section>
    </ReferencePageShell>
  )
}
