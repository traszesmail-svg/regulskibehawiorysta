import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  Bone,
  BookOpen,
  Cat,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Leaf,
  ListChecks,
  Mail,
  MessageCircle,
  PawPrint,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { EditorialIndexTopbar } from '@/components/EditorialIndexTopbar'
import { NotatnikFooter } from '@/components/NotatnikA'
import { PdfGuideCover } from '@/components/PdfGuideCover'
import { getPdfGuideBySlug, type PdfGuide } from '@/lib/pdf-guides'
import { buildTechnicalMetadata } from '@/lib/seo'

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Niezbędnik - PDF-y i checklisty dla opiekunów psów i kotów',
  path: '/niezbednik',
  description:
    'Niezbędnik: krótkie PDF-y, checklisty i materiały, które pomagają nazwać sytuację i przygotować się do spokojniejszej rozmowy.',
  noIndex: true,
  follow: false,
})

type MaterialTone = 'dog' | 'cat' | 'neutral'

type FeaturedMaterial = {
  species: 'Pies' | 'Kot'
  title: string
  description: string
  href: string
  guide: Pick<PdfGuide, 'title' | 'coverFileName'>
  tone: MaterialTone
}

type CategoryCard = {
  title: string
  count: string
  href: string
  icon: LucideIcon
}

type NewsItem = {
  species: 'Pies' | 'Kot'
  title: string
  description: string
  href: string
  guide: Pick<PdfGuide, 'title' | 'coverFileName'>
}

function requirePdfGuide(slug: string): PdfGuide {
  const guide = getPdfGuideBySlug(slug)

  if (!guide) {
    throw new Error(`Missing PDF guide required by /niezbednik: ${slug}`)
  }

  return guide
}

const pdfGuides = {
  dogDestruction: requirePdfGuide('pies-niszczy-w-domu'),
  catLitter: requirePdfGuide('kot-i-kuweta-pierwszy-plan-dzialania'),
  dogWalk: requirePdfGuide('pies-reaktywny-na-spacerze'),
  catsConflict: requirePdfGuide('konflikt-miedzy-kotami-w-domu'),
  dogAlone: requirePdfGuide('pies-zostaje-sam-plan-pierwszych-krokow'),
  puppyStart: requirePdfGuide('szczeniak-pierwsze-30-dni'),
  enrichment: requirePdfGuide('domowy-enrichment-plan-na-14-dni'),
} as const

function pdfGuideHref(guide: PdfGuide) {
  return guide.routePath
}

const heroBenefits = [
  {
    title: 'Rzetelna wiedza',
    description: 'Oparta na doświadczeniu i aktualnej nauce',
    icon: ShieldCheck,
  },
  {
    title: 'Praktyczne materiały',
    description: 'Gotowe do wdrożenia w codziennym życiu',
    icon: ListChecks,
  },
  {
    title: 'Dla psów i kotów',
    description: 'Osobne wskazówki dopasowane do gatunku',
    icon: FileText,
  },
] as const

const featuredMaterials: FeaturedMaterial[] = [
  {
    species: 'Pies',
    title: 'Zniszczenia w domu',
    description: 'Dowiedz się, dlaczego pies niszczy rzeczy i jak temu zapobiegać krok po kroku.',
    href: pdfGuideHref(pdfGuides.dogDestruction),
    guide: pdfGuides.dogDestruction,
    tone: 'dog',
  },
  {
    species: 'Kot',
    title: 'Kuweta bez problemów',
    description: 'Jak rozwiązać problemy z załatwianiem się poza kuwetą.',
    href: pdfGuideHref(pdfGuides.catLitter),
    guide: pdfGuides.catLitter,
    tone: 'cat',
  },
  {
    species: 'Pies',
    title: 'Luźna smycz',
    description: 'Praktyczny poradnik, jak nauczyć psa spokojnego chodzenia na smyczy.',
    href: pdfGuideHref(pdfGuides.dogWalk),
    guide: pdfGuides.dogWalk,
    tone: 'dog',
  },
  {
    species: 'Kot',
    title: 'Zabawa, która ma znaczenie',
    description: 'Jak bawić się z kotem, żeby wspierać jego rozwój i dobrostan.',
    href: pdfGuideHref(pdfGuides.catsConflict),
    guide: pdfGuides.catsConflict,
    tone: 'cat',
  },
]

const categories: CategoryCard[] = [
  { title: 'Zachowanie psa', count: '12 materiałów', href: '/materialy#psy', icon: PawPrint },
  { title: 'Zachowanie kota', count: '10 materiałów', href: '/materialy#koty', icon: Cat },
  { title: 'Szczeniak', count: '8 materiałów', href: '/materialy#psy', icon: Bone },
  { title: 'Kocie potrzeby', count: '7 materiałów', href: '/materialy#koty', icon: Heart },
  { title: 'Problemy behawioralne', count: '15 materiałów', href: '/materialy', icon: CircleHelp },
  { title: 'Trening i edukacja', count: '11 materiałów', href: '/materialy#psy', icon: GraduationCap },
  { title: 'Relacja i komunikacja', count: '9 materiałów', href: '/materialy', icon: Users },
  { title: 'Środowisko i enrichment', count: '8 materiałów', href: '/materialy#koty', icon: Home },
]

const howToSteps = [
  {
    title: 'Wybierz temat',
    description: 'Zastanów się, co chcesz poprawić lub lepiej zrozumieć.',
    icon: Search,
  },
  {
    title: 'Pobierz materiał',
    description: 'Sięgnij po poradnik, checklistę lub kartę pracy.',
    icon: Download,
  },
  {
    title: 'Działaj krok po kroku',
    description: 'Wdrażaj wskazówki w swoim tempie i obserwuj efekty.',
    icon: ListChecks,
  },
  {
    title: 'W razie potrzeby skonsultuj się',
    description: 'Jeśli sytuacja jest trudna, jesteśmy tu, by pomóc.',
    icon: MessageCircle,
  },
] as const

const newsItems: NewsItem[] = [
  {
    species: 'Pies',
    title: 'Sam zostaje w domu',
    description: 'Jak przygotować psa do samotności bez stresu.',
    href: pdfGuideHref(pdfGuides.dogAlone),
    guide: pdfGuides.dogAlone,
  },
  {
    species: 'Kot',
    title: 'Domowy enrichment',
    description: 'Prosty plan urozmaicania dnia bez przebodźcowania.',
    href: pdfGuideHref(pdfGuides.enrichment),
    guide: pdfGuides.enrichment,
  },
  {
    species: 'Pies',
    title: 'Szczeniak: pierwsze 30 dni',
    description: 'Plan spokojnego startu bez chaosu i przeciążenia.',
    href: pdfGuideHref(pdfGuides.puppyStart),
    guide: pdfGuides.puppyStart,
  },
]

export default function EssentialsPage() {
  redirect('/materialy')

  return (
    <main className="notatnik-page essentials-showcase-page">
      <div className="notatnik-shell essentials-showcase-shell">
        <EditorialIndexTopbar />

        <div className="essentials-showcase-grid" aria-label="Niezbędnik">
          <section className="essentials-showcase-panel essentials-showcase-hero" aria-labelledby="essentials-showcase-title">
            <div className="essentials-showcase-hero-copy">
              <span className="essentials-showcase-pill">Niezbędnik</span>
              <h1 id="essentials-showcase-title">Praktyczna wiedza na co dzień.</h1>
              <p>
                Sprawdzone poradniki, checklisty i materiały, które pomagają Ci lepiej zrozumieć swojego psa lub kota i
                skutecznie działać.
              </p>
            </div>

            <div className="essentials-showcase-hero-image" aria-hidden="true">
              <Image
                src="/branding/omnie.png"
                alt=""
                fill
                priority
                sizes="(max-width: 760px) 88vw, 320px"
              />
            </div>

            <div className="essentials-showcase-benefits">
              {heroBenefits.map((item) => {
                const Icon = item.icon

                return (
                  <article key={item.title}>
                    <span aria-hidden="true">
                      <Icon size={24} strokeWidth={1.7} />
                    </span>
                    <div>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                    </div>
                  </article>
                )
              })}
            </div>

            <Link href="/materialy" prefetch={false} className="essentials-showcase-primary-link">
              Przeglądaj wszystkie materiały
              <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </Link>

            <p className="essentials-showcase-note">
              <BookOpen size={15} strokeWidth={1.8} aria-hidden="true" />
              Nowe materiały dodawane regularnie
            </p>

            <div className="essentials-showcase-soft-card essentials-showcase-start-card">
              <h2>Nie wiesz, od czego zacząć?</h2>
              <p>Dobierz materiał do problemu, z którym się zmagasz.</p>
              <Link href="/quiz" prefetch={false}>
                Przejdź do przewodnika
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
              <Image src="/faq/faq-hero-pets.png" alt="" width={520} height={340} aria-hidden="true" />
            </div>
          </section>

          <section className="essentials-showcase-panel essentials-showcase-materials" aria-labelledby="essentials-materials-title">
            <header className="essentials-showcase-section-head">
              <h2 id="essentials-materials-title">Polecane materiały</h2>
              <p>Najczęściej wybierane przez opiekunów psów i kotów.</p>
            </header>

            <div className="essentials-showcase-material-list">
              {featuredMaterials.map((material) => (
                <article key={material.title} className="essentials-showcase-material-card">
                  <div className="essentials-showcase-material-image">
                    <PdfGuideCover guide={material.guide} className="essentials-showcase-pdf-cover" sizes="(max-width: 760px) 42vw, 128px" />
                  </div>
                  <div className="essentials-showcase-material-copy">
                    <span className={`essentials-showcase-chip is-${material.tone}`}>{material.species}</span>
                    <h3>{material.title}</h3>
                    <p>{material.description}</p>
                    <Link href={material.href} prefetch={false}>
                      <Download size={15} strokeWidth={1.8} aria-hidden="true" />
                      Pobierz PDF
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <Link href="/materialy" prefetch={false} className="essentials-showcase-primary-link">
              Zobacz wszystkie materiały
              <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
            </Link>

            <div className="essentials-showcase-soft-card essentials-showcase-support-card">
              <div>
                <h2>Potrzebujesz indywidualnego wsparcia?</h2>
                <p>Materiały to świetny start, ale czasem warto skonsultować sytuację 1 na 1.</p>
                <Link href="/wybor" prefetch={false}>
                  Umów konsultację
                  <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </div>
              <Image src="/branding/omnie2.png" alt="" width={300} height={360} aria-hidden="true" />
            </div>
          </section>

          <section className="essentials-showcase-panel essentials-showcase-categories" aria-labelledby="essentials-categories-title">
            <header className="essentials-showcase-section-head is-left">
              <h2 id="essentials-categories-title">Kategorie</h2>
              <p>Wybierz obszar, który Cię interesuje i znajdź odpowiednie materiały.</p>
            </header>

            <div className="essentials-showcase-category-grid">
              {categories.map((category) => {
                const Icon = category.icon

                return (
                  <Link key={category.title} href={category.href} prefetch={false} className="essentials-showcase-category-card">
                    <span aria-hidden="true">
                      <Icon size={25} strokeWidth={1.75} />
                    </span>
                    <strong>{category.title}</strong>
                    <small>{category.count}</small>
                  </Link>
                )
              })}
            </div>

            <section className="essentials-showcase-free-card">
              <Gift size={30} strokeWidth={1.7} aria-hidden="true" />
              <div>
                <h2>Darmowe materiały</h2>
                <p>Pobierz bezpłatne poradniki na dobry początek.</p>
              </div>
              <Link href="/materialy" prefetch={false}>
                Zobacz darmowe
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </section>

            <section className="essentials-showcase-news" aria-labelledby="essentials-news-title">
              <h2 id="essentials-news-title">Nowości w Niezbędniku</h2>
              <p>Zobacz najnowsze materiały, które właśnie dodaliśmy.</p>
              <div className="essentials-showcase-news-list">
                {newsItems.map((item) => (
                  <Link key={item.title} href={item.href} prefetch={false} className="essentials-showcase-news-item">
                    <span className="essentials-showcase-news-image">
                      <PdfGuideCover guide={item.guide} decorative className="essentials-showcase-news-cover" sizes="58px" />
                    </span>
                    <span>
                      <small>{item.species}</small>
                      <strong>{item.title}</strong>
                      <em>{item.description}</em>
                    </span>
                  </Link>
                ))}
              </div>
              <Link href="/materialy" prefetch={false} className="essentials-showcase-secondary-link">
                Zobacz wszystkie nowości
                <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
            </section>
          </section>

          <aside className="essentials-showcase-panel essentials-showcase-guide" aria-labelledby="essentials-guide-title">
            <header className="essentials-showcase-section-head is-left">
              <h2 id="essentials-guide-title">Jak korzystać z Niezbędnika?</h2>
            </header>

            <div className="essentials-showcase-step-list">
              {howToSteps.map((step, index) => {
                const Icon = step.icon

                return (
                  <article key={step.title} className="essentials-showcase-step">
                    <span className="essentials-showcase-step-number">{index + 1}</span>
                    <span className="essentials-showcase-step-icon" aria-hidden="true">
                      <Icon size={24} strokeWidth={1.7} />
                    </span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </article>
                )
              })}
            </div>

            <blockquote className="essentials-showcase-quote">
              <Sparkles size={32} strokeWidth={1.6} aria-hidden="true" />
              <p>
                Materiały Krzysztofa są konkretne, zrozumiałe i naprawdę pomocne w codziennych sytuacjach. Polecam
                każdemu opiekunowi!
              </p>
              <cite>- Ania i Luno</cite>
            </blockquote>

            <section className="essentials-showcase-newsletter" aria-labelledby="essentials-newsletter-title">
              <span aria-hidden="true">
                <Mail size={28} strokeWidth={1.7} />
              </span>
              <h2 id="essentials-newsletter-title">Bądź na bieżąco</h2>
              <p>Zapisz się, a poinformujemy Cię o nowych materiałach.</p>
              <form action="/newsletter">
                <label className="sr-only" htmlFor="essentials-newsletter-email">
                  Twój e-mail
                </label>
                <input id="essentials-newsletter-email" name="email" type="email" placeholder="Twój e-mail" />
                <button type="submit">Zapisz się</button>
              </form>
              <small>Bez spamu. W każdej chwili możesz się wypisać.</small>
            </section>

            <section className="essentials-showcase-topic-card">
              <h2>Masz pomysł na temat?</h2>
              <p>Daj znać, jakie materiały byłyby dla Ciebie najbardziej przydatne.</p>
              <Link href="/kontakt#formularz" prefetch={false}>
                Napisz do mnie
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </Link>
              <Image src="/faq/faq-help-illustration.png" alt="" width={310} height={180} aria-hidden="true" />
            </section>
          </aside>
        </div>

        <p className="essentials-showcase-footer-note">
          <Leaf size={15} strokeWidth={1.8} aria-hidden="true" />
          Dobrostan. Zrozumienie. Współpraca.
        </p>
        <NotatnikFooter showReviews={false} />
      </div>
    </main>
  )
}
