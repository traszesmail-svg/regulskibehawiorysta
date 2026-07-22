import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  Award,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Heart,
  HelpCircle,
  Leaf,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  Utensils,
} from 'lucide-react'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd, getFaqPageJsonLd, getPersonJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import {
  ABOUT_SPECIALIST_PHOTO,
  CAPBT_PROFILE_URL,
  COAPE_ORG_URL,
  INSTAGRAM_PROFILE_URL,
  MEDIA_MENTIONS,
  SPECIALIST_NAME,
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
    title: 'Behawiorysta i trener zwierząt towarzyszących COAPE',
    copy: 'Analiza zachowania i praktyczny trening prowadzone w jednym, spójnym planie.',
    icon: <Award size={28} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    title: 'Modyfikacja diety',
    copy: 'Niezbędne wsparcie terapii behawioralnej.',
    icon: <Utensils size={28} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    title: 'Technik weterynarii',
    copy: 'Kontekst zdrowia, bezpieczeństwa i sytuacji wymagających lekarza.',
    icon: <Stethoscope size={28} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    title: 'Bez kar i przymusu',
    copy: 'Praca oparta na zaufaniu, dobrostanie i jasnej komunikacji.',
    icon: <Leaf size={28} strokeWidth={1.8} aria-hidden="true" />,
  },
]

const featuredArticles = MEDIA_MENTIONS.filter((mention) =>
  mention.id === 'magwet-fear' || mention.id === 'magwet-litter-box',
)
const featuredArticle = featuredArticles[0] ?? MEDIA_MENTIONS[0]

const publicLinks = [
  { label: 'COAPE / COAPE', href: COAPE_ORG_URL, icon: <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" /> },
  {
    label: 'CAPBT / Profil',
    href: CAPBT_PROFILE_URL,
    icon: <User size={18} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    label: 'Magwet / Artykuł',
    href: featuredArticle.href,
    icon: <BookOpen size={18} strokeWidth={1.8} aria-hidden="true" />,
  },
  {
    label: 'Instagram / Profil',
    href: INSTAGRAM_PROFILE_URL,
    icon: <ExternalLink size={18} strokeWidth={1.8} aria-hidden="true" />,
  },
]

export default function AboutPage() {
  const faqItems = FAQ_SHORTLISTS.consultation.slice(0, 2)

  return (
    <ReferencePageShell className="reference-about-page reference-about-redesign-page" ctaHref="/cennik">
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
          <span className="reference-pill">O mnie</span>
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
              zaczynają robić się trudne. Pracuję spokojnie, bez oceniania i bez kar - najpierw szukam przyczyny
              napięcia, dopiero potem dobieram konkretne kroki.
            </p>
            <p>
              Możesz zgłosić się z codziennym tematem, takim jak szczekanie, ciągnięcie, kuweta, stres czy napięcie
              między zwierzętami - ale też z sytuacją bardziej złożoną, która trwa od miesięcy i zaczyna wpływać na całe
              życie w domu.
            </p>
            <p>
              Jako behawiorysta, doświadczony technik weterynarii i dietetyk patrzę na zachowanie szerzej: przez emocje,
              zdrowie, ból, dietę, środowisko i codzienną rutynę. Dzięki temu mogę pomóc oddzielić objaw od możliwej
              przyczyny i wybrać pierwszy krok, który ma sens.
            </p>
          </div>
        </section>

        <section className="reference-section-card reference-methodology-card reference-about-methodology-card" id="metodologia-pracy">
          <div className="reference-about-card-icon" aria-hidden="true">
            <Leaf size={28} strokeWidth={1.7} />
          </div>
          <div className="reference-about-card-body">
            <h2>Metodologia pracy</h2>
            <p>
              W pracy behawioralnej opieram się na metodologii COAPE: holistycznym, opartym na aktualnej wiedzy naukowej
              podejściu do terapii zachowania zwierząt towarzyszących. Nie analizuję zachowania psa lub kota wyłącznie
              jako problemu do wygaszenia, ale jako efekt współdziałania emocji, nastroju, stanu zdrowia, środowiska,
              historii uczenia się, relacji społecznych oraz jakości codziennego funkcjonowania zwierzęcia.
            </p>
            <p>
              Centralnym elementem tej metodologii jest model MHERA, wykorzystywany w COAPE do oceny emocjonalnych i
              behawioralnych przyczyn problemów. Model ten pozwala uporządkować analizę przypadku i zaplanować działanie
              w sposób etyczny, skuteczny i możliwy do utrzymania.
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

        <section className="reference-section-card reference-about-credentials-card">
          <div className="reference-about-card-icon" aria-hidden="true">
            <User size={28} strokeWidth={1.7} />
          </div>
          <div className="reference-about-card-body">
            <h2>Kwalifikacje i profil</h2>
            <p>
              Na stronie pokazuję tylko publicznie wspierane informacje: status, organizacje i profil, które można
              sprawdzić samodzielnie.
            </p>
            <div className="reference-about-credential-grid">
              {credentialCards.map((card) => (
                <article key={card.title} className="reference-about-credential">
                  <span className="reference-about-credential-icon">{card.icon}</span>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="reference-section-card reference-about-public-card">
          <div className="reference-about-card-icon" aria-hidden="true">
            <ShieldCheck size={28} strokeWidth={1.7} />
          </div>
          <div className="reference-about-card-body">
            <h2>Co możesz sprawdzić publicznie</h2>
            <div className="reference-about-proof-links">
              {publicLinks.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
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

        <section className="reference-about-green-cta site-help-cta">
          <div className="site-help-cta-copy">
            <h2>Zróbmy pierwszy krok spokojnie</h2>
            <p>Umów konsultację i uporządkujmy sytuację Twojego psa lub kota. Wspólnie wybierzemy plan, który naprawdę ma sens.</p>
            <div className="site-help-cta-actions">
              <Link href="/cennik" prefetch={false}>
                Umów konsultację
                <ChevronRight size={19} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="site-help-cta-image" aria-hidden="true">
            <Image src="/faq/faq-help-illustration-clean.png" alt="" width={355} height={208} sizes="(max-width: 760px) 58vw, 210px" />
          </div>
        </section>
      </section>
    </ReferencePageShell>
  )
}
