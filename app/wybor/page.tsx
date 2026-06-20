import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Baby,
  Cat,
  ChevronRight,
  CloudLightning,
  Footprints,
  Home,
  MessageCircle,
  Moon,
  PawPrint,
  RefreshCw,
  Toilet,
  type LucideIcon,
} from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { Schema } from '@/components/schema'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import type { ProblemType } from '@/lib/types'
import styles from './wybor.module.css'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Wybierz temat konsultacji',
  path: '/wybor',
  description:
    'Wybierz najbliższy temat dotyczący psa albo kota i przejdź do terminarza konsultacji behawioralnej.',
})

type Animal = 'dog' | 'cat'

type Choice = {
  id: string
  title: string
  desc: string
  icon: LucideIcon
  problem: ProblemType
  image?: string
  imageAlt?: string
}

type AnimalCopy = {
  eyebrow: string
  title: string
  lead: string
  noteTitle: string
  noteCopy: string
  heroImage: string
  heroAlt: string
}

const animalCopy: Record<Animal, AnimalCopy> = {
  dog: {
    eyebrow: 'Mam psa',
    title: 'Skupmy się na Twoim psie',
    lead: 'Wybierz obszar, który najlepiej opisuje sytuację, z którą się zmagasz.',
    noteTitle: 'Nie wiesz, co wybrać?',
    noteCopy: 'Wybierz najbliższy temat. W formularzu możesz dopisać szczegóły własnymi słowami.',
    heroImage: '/wybor/dog-choice-avatar.png',
    heroAlt: 'Spokojny pies',
  },
  cat: {
    eyebrow: 'Mam kota',
    title: 'Skupmy się na Twoim kocie',
    lead: 'Wybierz obszar, który najlepiej opisuje sytuację, z którą się zmagasz.',
    noteTitle: 'Nie wiesz, co wybrać?',
    noteCopy: 'Wybierz najbliższy temat. W formularzu możesz dopisać szczegóły własnymi słowami.',
    heroImage: '/wybor/cat-choice-avatar.png',
    heroAlt: 'Spokojny kot',
  },
}

const dogChoices: Choice[] = [
  {
    id: 'dom',
    title: 'Zachowanie w domu',
    desc: 'Niszczenie, szczekanie, problemy z zostawaniem samemu.',
    icon: Home,
    problem: 'pobudzenie',
    image: '/wybor/dog-choice-home.png',
    imageAlt: 'Pies w domu',
  },
  {
    id: 'spacer',
    title: 'Zachowanie na spacerach',
    desc: 'Reakcje na inne psy/ludzi, ciągnięcie na smyczy, nadmierne pobudzenie.',
    icon: Footprints,
    problem: 'spacer',
    image: '/wybor/dog-choice-walk.png',
    imageAlt: 'Pies na spacerze',
  },
  {
    id: 'lek-stres',
    title: 'Lęk i stres',
    desc: 'Lęk separacyjny, strach przed burzą, fajerwerkami, nowymi sytuacjami.',
    icon: CloudLightning,
    problem: 'separacja',
    image: '/wybor/dog-choice-stress.png',
    imageAlt: 'Pies odpoczywający w domu',
  },
  {
    id: 'relacje',
    title: 'Relacje z innymi zwierzętami',
    desc: 'Konflikty między psami, napięcie w relacjach, agresja.',
    icon: Cat,
    problem: 'agresja',
    image: '/wybor/dog-choice-relations.png',
    imageAlt: 'Pies i inne zwierzęta',
  },
  {
    id: 'szczeniak',
    title: 'Szczeniak i młody pies',
    desc: 'Problemy z nauką, nadmierne pobudzenie, gryzienie, potrzeby szczeniaka.',
    icon: Baby,
    problem: 'szczeniak',
    image: '/wybor/dog-choice-puppy.png',
    imageAlt: 'Szczeniak',
  },
  {
    id: 'inne',
    title: 'Inny problem',
    desc: 'Nie musisz znać nazwy. Opiszesz sytuację w formularzu.',
    icon: MessageCircle,
    problem: 'inne',
    image: '/wybor/dog-choice-other.png',
    imageAlt: 'Notatka do opisania problemu',
  },
]

const catChoices: Choice[] = [
  {
    id: 'kuweta',
    title: 'Kuweta i załatwianie poza kuwetą',
    desc: 'Załatwianie poza kuwetą, znaczenie miejsc albo nagła zmiana nawyków.',
    icon: Toilet,
    problem: 'kot-kuweta',
    image: '/wybor/cat-choice-litter.png',
    imageAlt: 'Kot w domu',
  },
  {
    id: 'stres-zmiany',
    title: 'Stres lub zmiana w domu',
    desc: 'Przeprowadzka, remont, nowy domownik albo napięcie w codzienności.',
    icon: RefreshCw,
    problem: 'kot-zmiany-w-domu',
    image: '/wybor/cat-choice-change.png',
    imageAlt: 'Kot odpoczywający',
  },
  {
    id: 'konflikty-koty',
    title: 'Konflikty między kotami',
    desc: 'Syczenie, pościgi, blokowanie zasobów albo unikanie kontaktu.',
    icon: Cat,
    problem: 'kot-konflikt',
    image: '/wybor/cat-choice-conflict.png',
    imageAlt: 'Kot w jasnym wnętrzu',
  },
  {
    id: 'lek-wycofanie',
    title: 'Lęk, agresja lub wycofanie',
    desc: 'Chowanie się, ataki, gryzienie albo trudność z dotykiem.',
    icon: CloudLightning,
    problem: 'kot-stres',
    image: '/wybor/cat-choice-fear.png',
    imageAlt: 'Spokojny kot',
  },
  {
    id: 'noc-aktywnosc',
    title: 'Nocna aktywność i pobudzenie',
    desc: 'Miauczenie, bieganie nocą, pobudzenie albo domaganie się uwagi.',
    icon: Moon,
    problem: 'kot-wokalizacja',
    image: '/wybor/cat-choice-night.png',
    imageAlt: 'Kot w legowisku',
  },
  {
    id: 'inne',
    title: 'Inny problem z kotem',
    desc: 'Nie musisz znać nazwy. Opiszesz sytuację w formularzu.',
    icon: MessageCircle,
    problem: 'inne',
    image: '/wybor/cat-choice-other.png',
    imageAlt: 'Notatka do opisania problemu z kotem',
  },
]

function getAnimal(searchParams?: { animal?: string | string[] }): Animal {
  const raw = Array.isArray(searchParams?.animal) ? searchParams.animal[0] : searchParams?.animal

  return raw === 'cat' || raw === 'kot' ? 'cat' : 'dog'
}

function buildChoiceHref(choice: Choice, animal: Animal) {
  return `/format-konsultacji?animal=${animal}&problem=${choice.problem}`
}

export default function ChoicePage({
  searchParams,
}: {
  searchParams?: { animal?: string | string[] }
}) {
  const animal = getAnimal(searchParams)
  const copy = animalCopy[animal]
  const choices = animal === 'cat' ? catChoices : dogChoices
  return (
    <NotatnikPageShell
      tag="Regulski"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/quiz"
      ctaLabel="Quiz"
      footerPrimaryHref="/"
      footerPrimaryLabel="Wróć do strony głównej"
      sideVisualVariant={animal === 'cat' ? 'cat' : 'dog'}
      pageClassName={`homepage-shell ${styles.page} ${animal === 'cat' ? styles.catPage : styles.dogPage}`}
      shellClassName={`homepage-main ${styles.shell}`}
      showFooterReviews={false}
    >
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Wybór tematu', path: '/wybor' },
        ])}
      />
        <div className={styles.content}>
          <Link className={styles.backLink} href="/" prefetch={false}>
            <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
            <span>Wróć</span>
          </Link>

          <section className={styles.intro} aria-labelledby="wybor-title">
            <div className={styles.progressGroup} aria-label="Wybór tematu">
              <span>Krok 1 z 2</span>
              <span className={styles.progressTrack}>
                <span className={styles.progressFill} />
              </span>
            </div>

            <div className={styles.heroRow}>
              <span className={styles.heroIcon} aria-hidden="true">
                <PawPrint size={28} strokeWidth={1.8} />
              </span>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>{copy.eyebrow}</span>
                <h1 id="wybor-title">{copy.title}</h1>
                <p>{copy.lead}</p>
              </div>
              <figure className={styles.heroImage}>
                <Image src={copy.heroImage} alt={copy.heroAlt} fill priority sizes="170px" />
              </figure>
            </div>
          </section>

          <section className={styles.choiceSection} aria-label="Wybierz temat konsultacji">
            <div className={styles.unknownCard}>
              <span className={styles.unknownIcon} aria-hidden="true">
                <MessageCircle size={25} strokeWidth={1.8} />
              </span>
              <div>
                <h2>{copy.noteTitle}</h2>
                <p>{copy.noteCopy}</p>
              </div>
            </div>

            <div className={styles.choiceGrid}>
              {choices.map((choice) => {
                const Icon = choice.icon
                const href = buildChoiceHref(choice, animal)

                return (
                  <Link
                    key={choice.id}
                    className={`${styles.choiceCard} ${choice.image ? styles.photoCard : styles.textOnlyCard}`}
                    data-choice={choice.id}
                    href={href}
                    prefetch={false}
                  >
                    {choice.image ? (
                      <span className={styles.choicePhoto} aria-hidden="true">
                        <Image src={choice.image} alt={choice.imageAlt ?? ''} fill sizes="(max-width: 520px) 100vw, 220px" />
                      </span>
                    ) : null}
                    <span className={styles.choiceBody}>
                      <span className={styles.choiceIcon} aria-hidden="true">
                        <Icon size={24} strokeWidth={1.9} />
                      </span>
                      <span className={styles.choiceText}>
                        <h3>{choice.title}</h3>
                        <p>{choice.desc}</p>
                      </span>
                      <ChevronRight className={styles.choiceArrow} size={22} strokeWidth={2} aria-hidden="true" />
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
    </NotatnikPageShell>
  )
}
