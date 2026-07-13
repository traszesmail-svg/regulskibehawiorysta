import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Hourglass,
  MessageCircle,
  ShieldCheck,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import type { BookingServiceType } from '@/lib/booking-services'
import { buildBookHref, readProblemTypeSearchParam, type BookingSpecies } from '@/lib/booking-routing'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildTechnicalMetadata } from '@/lib/seo'
import type { ProblemType } from '@/lib/types'
import styles from '../wybor/wybor.module.css'

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Wybierz format konsultacji',
  path: '/format-konsultacji',
  description: 'Wybierz format konsultacji behawioralnej po wskazaniu tematu psa albo kota.',
  noIndex: true,
  follow: true,
})

type Animal = 'dog' | 'cat'

type FormatChoice = {
  id: string
  title: string
  badge: string
  price: string
  desc: string
  checks: string[]
  icon: LucideIcon
  service: BookingServiceType | null
  featured?: boolean
  wide?: boolean
}

type AnimalFormatCopy = {
  species: BookingSpecies
  title: string
  lead: string
  fullImage: string
  fullImageAlt: string
  contactHref: string
}

const animalCopy: Record<Animal, AnimalFormatCopy> = {
  dog: {
    species: 'pies',
    title: 'Wybierz format konsultacji',
    lead: 'Teraz wybierz, ile czasu potrzebujesz.',
    fullImage: '/wybor/dog-choice-avatar.png',
    fullImageAlt: 'Pies podczas konsultacji behawioralnej',
    contactHref: '/kontakt?species=pies#formularz',
  },
  cat: {
    species: 'kot',
    title: 'Wybierz format konsultacji',
    lead: 'Teraz wybierz, ile czasu potrzebujesz.',
    fullImage: '/wybor/cat-choice-avatar.png',
    fullImageAlt: 'Kot podczas konsultacji behawioralnej',
    contactHref: '/kontakt?species=kot#formularz',
  },
}

const topicTitles: Record<Animal, Partial<Record<ProblemType, string>>> = {
  dog: {
    pobudzenie: 'Zachowanie w domu',
    spacer: 'Zachowanie na spacerach',
    separacja: 'Lęk i stres',
    agresja: 'Relacje z innymi zwierzętami',
    szczeniak: 'Szczeniak i młody pies',
    inne: 'Inny problem',
  },
  cat: {
    'kot-kuweta': 'Kuweta i załatwianie poza kuwetą',
    'kot-zmiany-w-domu': 'Stres lub zmiana w domu',
    'kot-konflikt': 'Konflikty między kotami',
    'kot-stres': 'Lęk, agresja lub wycofanie',
    'kot-wokalizacja': 'Nocna aktywność i pobudzenie',
    inne: 'Inny problem z kotem',
  },
}

const formatChoices: FormatChoice[] = [
  {
    id: 'kwadrans',
    title: 'Kwadrans',
    badge: '15 min',
    price: '69 zł',
    desc: '15 min audio bez kamery na jedno główne pytanie. Po rozmowie masz prawo do 2 dopytań na czacie w swoim pokoju konsultacji.',
    checks: ['Jedno główne pytanie', 'Do 2 pytań w pokoju po rozmowie'],
    icon: Clock3,
    service: null,
  },
  {
    id: 'kwadrans-na-juz',
    title: 'Kwadrans na już',
    badge: '15 min',
    price: '99 zł',
    desc: 'Ten sam zakres co Kwadrans (w tym prawo do 2 dopytań w pokoju), ale z priorytetem i najbliższym realnym terminem.',
    checks: ['Wariant priorytetowy', 'Do 2 pytań w pokoju po rozmowie'],
    icon: Zap,
    service: 'kwadrans-na-juz',
    featured: true,
  },
  {
    id: 'dwa-kwadranse',
    title: 'Dwa kwadranse',
    badge: '30 min',
    price: '169 zł',
    desc: '30 min online, gdy temat ma kilka wątków. Po rozmowie masz prawo do 4 dopytań na czacie w swoim pokoju konsultacji.',
    checks: ['Więcej czasu na kontekst', 'Do 4 pytań w pokoju po rozmowie'],
    icon: Hourglass,
    service: 'konsultacja-30-min',
  },
  {
    id: 'pelna-konsultacja',
    title: 'Pełna konsultacja',
    badge: 'ok. 2h online',
    price: '470 zł',
    desc: 'Około 2h online dla spraw złożonych: analiza zachowania, plan działania i czat w pokoju po rozmowie (tylko w miarę dostępności czasu).',
    checks: ['Analiza i plan działania', 'Czat w pokoju (w miarę czasu)'],
    icon: Star,
    service: 'konsultacja-behawioralna-online',
    wide: true,
  },
]

const formatBenefits = [
  {
    title: 'Dopasowany czas',
    copy: 'Wybierz format idealny do Twojej sytuacji',
    icon: Clock3,
  },
  {
    title: 'Najbliższe terminy',
    copy: 'Pokażemy Ci dostępne okna w kolejnym kroku',
    icon: CalendarDays,
  },
  {
    title: 'Bezpieczne płatności',
    copy: 'Twoje dane są u nas zawsze bezpieczne',
    icon: ShieldCheck,
  },
]

function readAnimal(value: string | string[] | undefined): Animal {
  const raw = Array.isArray(value) ? value[0] : value

  return raw === 'cat' || raw === 'kot' ? 'cat' : 'dog'
}

function buildFormatHref(problem: ProblemType, species: BookingSpecies, service: BookingServiceType | null) {
  return buildBookHref(problem, service, false, species)
}

export default function ConsultationFormatPage({
  searchParams,
}: {
  searchParams?: { animal?: string | string[]; problem?: string | string[] }
}) {
  const animal = readAnimal(searchParams?.animal)
  const problem = readProblemTypeSearchParam(searchParams?.problem)
  const topicTitle = problem ? topicTitles[animal][problem] : null

  if (!problem || !topicTitle) {
    redirect(`/wybor?animal=${animal}`)
  }

  const copy = animalCopy[animal]
  const backHref = `/wybor?animal=${animal}`

  return (
    <NotatnikPageShell
      tag="Regulski"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/quiz"
      ctaLabel="Quiz"
      footerPrimaryHref={backHref}
      footerPrimaryLabel="Wróć do wyboru"
      sideVisualVariant={animal === 'cat' ? 'cat' : 'dog'}
      pageClassName={`homepage-shell ${styles.page} ${styles.formatOnlyPage} ${
        animal === 'cat' ? styles.catPage : styles.dogPage
      }`}
      shellClassName={`homepage-main ${styles.shell}`}
      showFooterReviews={false}
    >
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Wybór tematu', path: '/wybor' },
          { name: 'Wybór formatu', path: '/format-konsultacji' },
        ])}
      />
        <div className={styles.content}>
          <Link className={styles.backLink} href={backHref} prefetch={false}>
            <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
            <span>Wróć</span>
          </Link>

          <section className={styles.intro} aria-labelledby="format-title">
            <div className={styles.progressGroup} aria-label="Wybór formatu konsultacji">
              <span>Krok 2 z 2</span>
              <span className={styles.progressTrack}>
                <span className={styles.formatProgressFill} />
              </span>
            </div>

            <div className={styles.heroRow}>
              <span className={styles.heroIcon} aria-hidden="true">
                <CalendarDays size={28} strokeWidth={1.8} />
              </span>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>Format konsultacji</span>
                <h1 id="format-title">{copy.title}</h1>
                <p>
                  Temat: <strong>{topicTitle}</strong>. {copy.lead}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.choiceSection} aria-label="Wybierz format konsultacji">
            <div className={styles.formatBenefitStrip} aria-label="Co ułatwia wybór formatu">
              {formatBenefits.map((benefit) => {
                const Icon = benefit.icon

                return (
                  <article key={benefit.title} className={styles.formatBenefit}>
                    <span className={styles.formatBenefitIcon} aria-hidden="true">
                      <Icon size={25} strokeWidth={1.75} />
                    </span>
                    <span>
                      <strong>{benefit.title}</strong>
                      <small>{benefit.copy}</small>
                    </span>
                  </article>
                )
              })}
            </div>

            <div className={styles.formatTopGrid}>
              {formatChoices
                .filter((format) => !format.wide)
                .map((format) => {
                  const Icon = format.icon

                  return (
                    <Link
                      key={format.id}
                      href={buildFormatHref(problem, copy.species, format.service)}
                      prefetch={false}
                      className={`${styles.formatChoiceCard} ${format.featured ? styles.featuredFormatCard : ''}`}
                    >
                      {format.featured ? <span className={styles.formatPopularBadge}>Popularne</span> : null}
                      <span className={styles.formatChoiceIcon} aria-hidden="true">
                        <Icon size={35} strokeWidth={1.65} />
                      </span>
                      <span className={styles.formatChoiceCopy}>
                        <strong>{format.title}</strong>
                        <span className={styles.formatPriceRow}>
                          <small>{format.badge}</small>
                          <span className={styles.formatPrice}>{format.price}</span>
                        </span>
                        <p>{format.desc}</p>
                      </span>
                      <span className={styles.formatCheckList}>
                        {format.checks.map((check) => (
                          <span key={check}>
                            <Check size={17} strokeWidth={2} aria-hidden="true" />
                            {check}
                          </span>
                        ))}
                      </span>
                      <span className={styles.formatArrow} aria-hidden="true">
                        <ArrowRight size={22} strokeWidth={1.9} />
                      </span>
                    </Link>
                  )
                })}
            </div>

            <div className={styles.formatBottomGrid}>
              {formatChoices
                .filter((format) => format.wide)
                .map((format) => {
                  const Icon = format.icon

                  return (
                    <Link
                      key={format.id}
                      href={buildFormatHref(problem, copy.species, format.service)}
                      prefetch={false}
                      className={styles.fullFormatCard}
                    >
                      <span className={styles.fullFormatCopy}>
                        <span className={styles.formatChoiceIcon} aria-hidden="true" style={{ marginBottom: '16px' }}>
                          <Icon size={35} strokeWidth={1.65} />
                        </span>
                        <strong>{format.title}</strong>
                        <span className={styles.formatPriceRow}>
                          <small>{format.badge}</small>
                          <span className={styles.formatPrice}>{format.price}</span>
                        </span>
                        <p>{format.desc}</p>
                        <span className={styles.formatCheckList}>
                          {format.checks.map((check) => (
                            <span key={check}>
                              <Check size={17} strokeWidth={2} aria-hidden="true" />
                              {check}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className={styles.fullFormatImage} aria-hidden="true">
                        <Image
                          src={copy.fullImage}
                          alt=""
                          fill
                          loading="eager"
                          sizes="(max-width: 520px) 230px, (max-width: 900px) 220px, 190px"
                        />
                      </span>
                      <span className={styles.formatArrow} aria-hidden="true">
                        <ArrowRight size={22} strokeWidth={1.9} />
                      </span>
                    </Link>
                  )
                })}

              <aside className={styles.formatHelpCard}>
                <h2>Nie wiesz, co wybrać?</h2>
                <p>Napisz do mnie - pomogę Ci dobrać najlepszy format do Twojej sytuacji.</p>
                <Link href={copy.contactHref} prefetch={false}>
                  <span>Napisz wiadomość</span>
                  <MessageCircle size={18} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </aside>
            </div>
          </section>
        </div>
    </NotatnikPageShell>
  )
}

