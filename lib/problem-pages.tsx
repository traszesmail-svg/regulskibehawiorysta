import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { NotatnikFooter, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { ReferenceHeroLeaf } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { buildBookHref } from '@/lib/booking-routing'
import { buildCaseMapHref, type CaseMapSearchParams } from '@/lib/case-map-routing'
import { getBreadcrumbJsonLd, getItemListJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { getCanonicalBaseUrl } from '@/lib/server/env'

export type ProblemPageSpecies = 'pies' | 'kot'

export type ProblemPageLink = {
  href: string
  label: string
  copy: string
}

export type ProblemPageConfig = {
  slug: string
  path: string
  species: ProblemPageSpecies
  eyebrow: string
  title: string
  seoTitle: string
  description: string
  intro: string
  signals: string[]
  underneath: string[]
  avoid: string[]
  firstStep: string
  whenKwadrans: string
  whenFullConsultation: string
  blogLinks: ProblemPageLink[]
  relatedLinks: ProblemPageLink[]
  quizProblem: string
}

export const PROBLEM_PAGE_CONFIGS: ProblemPageConfig[] = [
  {
    slug: 'pies-szczeka-na-psy',
    path: '/problemy/pies-szczeka-na-psy',
    species: 'pies',
    eyebrow: 'Pies / spacer',
    title: 'Pies szczeka na inne psy na spacerze',
    seoTitle: 'Pies szczeka na inne psy - od czego zacząć',
    description:
      'Spokojna mapa pierwszego kroku, gdy pies szczeka, napina się albo wyrywa na widok innych psów.',
    intro:
      'Szczekanie na psy nie musi oznaczać agresji. Najpierw trzeba sprawdzić dystans, napięcie, frustrację, historię mijanek i to, czy pies ma jeszcze możliwość uczenia się w tej sytuacji.',
    signals: [
      'Pies napina ciało, wpatruje się, szczeka lub wyrywa zanim drugi pies podejdzie blisko.',
      'Po minięciu bodźca długo nie wraca do kontaktu albo dalej skanuje otoczenie.',
      'Problem nasila się na wąskich chodnikach, przy smyczy krótkiej albo przy zaskoczeniu za rogiem.',
    ],
    underneath: [
      'Za mały dystans i zbyt trudne mijanki.',
      'Frustracja, bo pies chce podejść, ale smycz blokuje ruch.',
      'Lęk, wcześniejsze złe doświadczenia albo przeciążenie spacerem.',
    ],
    avoid: [
      'Nie dokładaj korekt za samo szczekanie, jeśli nie wiesz, co je uruchamia.',
      'Nie ćwicz mijanek w najtrudniejszym miejscu, gdzie pies od razu traci kontakt.',
      'Nie zakładaj, że „musi się przyzwyczaić” przez powtarzanie ekspozycji.',
    ],
    firstStep:
      'Przez 3-5 spacerów notuj dystans, miejsce, porę dnia i to, kiedy pies jeszcze może jeść, węszyć albo spojrzeć na Ciebie. To pokaże próg pobudzenia.',
    whenKwadrans:
      'Kwadrans wystarczy, gdy chcesz ustalić pierwszy bezpieczny dystans, prostą zmianę trasy i priorytet na najbliższe spacery.',
    whenFullConsultation:
      'Pełna konsultacja ma większy sens, gdy były ataki, pies jest duży i trudny do utrzymania albo reakcje pojawiają się codziennie.',
    blogLinks: [
      {
        href: '/blog/dlaczego-moj-pies-szczeka-na-inne-psy',
        label: 'Dlaczego mój pies szczeka na inne psy?',
        copy: 'Artykuł wyjaśnia, co może być pod spodem i dlaczego samo uciszanie zwykle nie rozwiązuje tematu.',
      },
      {
        href: '/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy',
        label: 'Reaktywność na smyczy i luźna smycz',
        copy: 'Dobry kolejny kontekst, jeśli szczekanie łączy się z napięciem na smyczy.',
      },
    ],
    relatedLinks: [
      {
        href: '/problemy/pies-ciagnie-na-smyczy',
        label: 'Pies ciągnie na smyczy',
        copy: 'Sprawdź też, czy problem zaczyna się od ogólnego pobudzenia na spacerze.',
      },
    ],
    quizProblem: 'pies-szczeka-na-psy',
  },
  {
    slug: 'pies-ciagnie-na-smyczy',
    path: '/problemy/pies-ciagnie-na-smyczy',
    species: 'pies',
    eyebrow: 'Pies / smycz',
    title: 'Pies ciągnie na smyczy',
    seoTitle: 'Pies ciągnie na smyczy - pierwszy krok',
    description:
      'Jak uporządkować temat ciągnięcia na smyczy bez zaczynania od samego sprzętu albo presji na psa.',
    intro:
      'Ciągnięcie na smyczy często jest objawem pobudzenia, za szybkiego tempa spaceru, przeciążenia bodźcami albo braku czytelnego rytmu, a nie tylko brakiem „posłuszeństwa”.',
    signals: [
      'Pies idzie stale na napiętej smyczy i trudno mu wrócić do wolniejszego tempa.',
      'Ciągnięcie rośnie przy zapachach, psach, ludziach, samochodach albo na początku spaceru.',
      'Po spacerze pies jest bardziej nakręcony niż spokojny.',
    ],
    underneath: [
      'Za szybkie wejście w bodźce bez czasu na węszenie i obniżenie pobudzenia.',
      'Utrwalony schemat: napięta smycz prowadzi do celu.',
      'Za mało odpoczynku albo zbyt dużo aktywności, która podbija napięcie.',
    ],
    avoid: [
      'Nie zmieniaj sprzętu jako jedynej interwencji.',
      'Nie rób długich sesji „chodzenia przy nodze”, jeśli pies jest już ponad progiem.',
      'Nie karz za ciągnięcie bez sprawdzenia, co pies próbuje osiągnąć albo ominąć.',
    ],
    firstStep:
      'Wybierz jeden krótki odcinek spaceru, na którym celem jest spokojne tempo i kontakt, a nie przejście jak najdalej. Resztę spaceru potraktuj jako zarządzanie emocjami.',
    whenKwadrans:
      'Kwadrans jest dobry, gdy chcesz ustalić prosty plan spaceru i odróżnić problem smyczy od przeciążenia.',
    whenFullConsultation:
      'Pełna konsultacja jest lepsza, gdy ciągnięcie łączy się ze szczekaniem, agresją, lękiem albo brakiem odpoczynku w domu.',
    blogLinks: [
      {
        href: '/blog/pies-ciagnie-na-smyczy',
        label: 'Pies ciągnie na smyczy',
        copy: 'Artykuł porządkuje najczęstsze przyczyny i pierwsze korekty spaceru.',
      },
      {
        href: '/blog/pies-ciagnie-na-smyczy-od-czego-zaczac',
        label: 'Od czego zacząć, gdy pies ciągnie?',
        copy: 'Krótki kontekst dla opiekuna, który chce zacząć od najprostszej zmiany.',
      },
    ],
    relatedLinks: [
      {
        href: '/problemy/pies-szczeka-na-psy',
        label: 'Pies szczeka na inne psy',
        copy: 'Jeśli ciągnięcie rośnie przy psach, zobacz też temat reakcji na spacerze.',
      },
    ],
    quizProblem: 'pies-ciagnie-na-smyczy',
  },
  {
    slug: 'pies-nie-zostaje-sam',
    path: '/problemy/pies-nie-zostaje-sam',
    species: 'pies',
    eyebrow: 'Pies / samotność',
    title: 'Pies nie zostaje sam',
    seoTitle: 'Pies nie zostaje sam - lęk separacyjny i pierwszy krok',
    description:
      'Co sprawdzić, gdy pies wyje, niszczy, szczeka albo wpada w panikę po wyjściu opiekuna.',
    intro:
      'Przy samotności najważniejsze jest nagranie i ocena emocji. Bez tego łatwo pomylić nudę, frustrację, brak rutyny i panikę separacyjną.',
    signals: [
      'Pies wokalizuje, niszczy, dyszy, ślini się albo próbuje wydostać się po wyjściu opiekuna.',
      'Objawy zaczynają się szybko po zamknięciu drzwi, a nie dopiero po wielu godzinach.',
      'Pies śledzi opiekuna po domu i trudno mu odpocząć, gdy ktoś się szykuje do wyjścia.',
    ],
    underneath: [
      'Lęk separacyjny albo frustracja związana z utratą dostępu do opiekuna.',
      'Brak przewidywalnej rutyny wyjść i powrotów.',
      'Zbyt duże kroki treningowe bez sprawdzania poziomu emocji.',
    ],
    avoid: [
      'Nie zostawiaj psa „żeby się wypłakał”, jeśli na nagraniu widać panikę.',
      'Nie zwiększaj czasu samotności skokowo.',
      'Nie zakładaj, że samo zmęczenie psa rozwiąże problem.',
    ],
    firstStep:
      'Nagraj 20-30 minut po wyjściu i zapisz, kiedy pojawia się pierwszy objaw. To decyduje, czy zaczynamy od rutyny, wyciszenia, czy planu separacyjnego.',
    whenKwadrans:
      'Kwadrans wystarczy, gdy potrzebujesz ocenić nagranie, ustalić pierwszą granicę czasu i uniknąć pogłębiania problemu.',
    whenFullConsultation:
      'Pełna konsultacja jest lepsza, gdy pies panikuje, niszczy drzwi, robi sobie krzywdę albo temat trwa długo.',
    blogLinks: [
      {
        href: '/blog/pies-wyje-kiedy-zostaje-sam',
        label: 'Pies wyje, kiedy zostaje sam',
        copy: 'Artykuł pomaga odróżnić samotność, napięcie i panikę.',
      },
      {
        href: '/blog/jak-nauczyc-psa-zostawania-samemu',
        label: 'Jak uczyć psa zostawania samemu',
        copy: 'Kolejny tekst o tym, jak nie robić zbyt dużych kroków.',
      },
    ],
    relatedLinks: [
      {
        href: '/problemy/pies-nie-zostaje-sam',
        label: 'Szerszy landing: lęk separacyjny',
        copy: 'Jeśli chcesz pełniejszy kontekst problemu, przejdź do rozbudowanej strony.',
      },
    ],
    quizProblem: 'pies-nie-zostaje-sam',
  },
  {
    slug: 'kot-sika-poza-kuweta',
    path: '/problemy/kot-sika-poza-kuweta',
    species: 'kot',
    eyebrow: 'Kot / kuweta',
    title: 'Kot sika poza kuwetą',
    seoTitle: 'Kot sika poza kuwetą - zdrowie, stres i pierwszy krok',
    description:
      'Bezpieczny pierwszy krok przy sikaniu poza kuwetą: zdrowie, kuweta, zasoby, stres i napięcie w domu.',
    intro:
      'Przy sikaniu poza kuwetą nie zaczynamy od kar ani zapachów. Najpierw trzeba potraktować temat jako możliwy sygnał zdrowia, bólu, stresu albo problemu z zasobami.',
    signals: [
      'Kot sika poza kuwetą nagle albo częściej niż wcześniej.',
      'Zmieniło się miejsce, ilość moczu, zachowanie przy kuwecie albo napięcie w domu.',
      'W domu są inne koty, remont, przeprowadzka, nowe osoby albo zmiana rutyny.',
    ],
    underneath: [
      'Ból, infekcja, choroba układu moczowego lub inne tło zdrowotne.',
      'Kuweta, żwirek, lokalizacja, liczba kuwet albo dostęp do zasobów.',
      'Stres, konflikt między kotami albo utrata poczucia bezpieczeństwa.',
    ],
    avoid: [
      'Nie karz kota i nie wkładaj go na siłę do kuwety.',
      'Nie zakładaj, że kot robi to „złośliwie”.',
      'Nie odkładaj lekarza weterynarii, jeśli zmiana jest nagła albo mocz wygląda inaczej.',
    ],
    firstStep:
      'Zacznij od kontroli zdrowia, a równolegle spisz: liczbę kuwet, miejsca zdarzeń, zmiany w domu, żwirek i relacje między zwierzętami.',
    whenKwadrans:
      'Kwadrans pomaga szybko uporządkować, co sprawdzić najpierw i czy temat wygląda bardziej środowiskowo czy alarmowo.',
    whenFullConsultation:
      'Pełna konsultacja jest lepsza, gdy problem wraca, w domu jest kilka kotów albo równolegle widać konflikt i stres.',
    blogLinks: [
      {
        href: '/blog/kot-zalatwia-sie-poza-kuweta',
        label: 'Kot załatwia się poza kuwetą',
        copy: 'Artykuł porządkuje zdrowie, kuwetę, stres i relacje.',
      },
      {
        href: '/blog/stres-kota-a-zachowania-toaletowe',
        label: 'Stres kota a zachowania toaletowe',
        copy: 'Dodatkowy kontekst, gdy problem łączy się ze zmianami w domu.',
      },
    ],
    relatedLinks: [
      {
        href: '/problemy/konflikt-miedzy-kotami',
        label: 'Konflikt między kotami',
        copy: 'Jeśli kuweta łączy się z napięciem w domu, sprawdź relacje kotów.',
      },
    ],
    quizProblem: 'kot-sika-poza-kuweta',
  },
  {
    slug: 'kot-gryzie-przy-glaskaniu',
    path: '/problemy/kot-gryzie-przy-glaskaniu',
    species: 'kot',
    eyebrow: 'Kot / kontakt',
    title: 'Kot gryzie przy głaskaniu',
    seoTitle: 'Kot gryzie przy głaskaniu - sygnały i pierwszy krok',
    description:
      'Jak czytać sygnały kota, gdy gryzie przy głaskaniu, i od czego zacząć bez dokładania presji.',
    intro:
      'Gryzienie przy głaskaniu często nie pojawia się bez ostrzeżenia. Kot może wcześniej pokazywać subtelne sygnały napięcia, których opiekun nie odczytuje w porę.',
    signals: [
      'Kot przez chwilę pozwala na kontakt, a potem nagle łapie zębami albo pazurami.',
      'Przed ugryzieniem rusza ogonem, napina skórę, odwraca uszy albo przestaje być miękki w ciele.',
      'Problem nasila się przy konkretnych miejscach dotyku, porach dnia albo po pobudzeniu.',
    ],
    underneath: [
      'Przestymulowanie dotykiem i za długi kontakt.',
      'Ból, dyskomfort albo wrażliwość konkretnej części ciała.',
      'Brak poczucia kontroli nad tym, kiedy kontakt się kończy.',
    ],
    avoid: [
      'Nie przytrzymuj kota, żeby „dokończyć” głaskanie.',
      'Nie karz za ugryzienie bez sprawdzenia wcześniejszych sygnałów.',
      'Nie prowokuj testów, gdy kot już pokazał napięcie.',
    ],
    firstStep:
      'Skróć kontakt do kilku sekund, kończ zanim kot się napnie i obserwuj trzy sygnały: ogon, uszy, skórę/grzbiet. Przy nagłej zmianie sprawdź zdrowie.',
    whenKwadrans:
      'Kwadrans wystarczy, gdy chcesz nauczyć się czytać sygnały i ustalić prosty protokół kontaktu.',
    whenFullConsultation:
      'Pełna konsultacja jest lepsza, gdy gryzienie jest silne, narasta albo łączy się z unikaniem, bólem czy agresją wobec domowników.',
    blogLinks: [
      {
        href: '/blog/stres-kota-a-zachowania-toaletowe',
        label: 'Stres kota i zachowanie',
        copy: 'Ten artykuł pomaga szerzej spojrzeć na napięcie i codzienne sygnały kota.',
      },
      {
        href: '/blog/jak-zapoznac-dwa-koty',
        label: 'Jak zapoznać dwa koty',
        copy: 'Przydatne, jeśli gryzienie przy kontakcie występuje obok napięcia między kotami.',
      },
    ],
    relatedLinks: [
      {
        href: '/problemy/kot-sika-poza-kuweta',
        label: 'Kot sika poza kuwetą',
        copy: 'Jeśli obok gryzienia pojawiły się zmiany toaletowe, najpierw sprawdź zdrowie i stres.',
      },
    ],
    quizProblem: 'kot-gryzie-przy-glaskaniu',
  },
  {
    slug: 'konflikt-miedzy-kotami',
    path: '/problemy/konflikt-miedzy-kotami',
    species: 'kot',
    eyebrow: 'Kot / relacje',
    title: 'Konflikt między kotami',
    seoTitle: 'Konflikt między kotami - napięcie, zasoby i pierwszy krok',
    description:
      'Jak rozpoznać konflikt między kotami: blokowanie zasobów, napięcie przy kuwecie, gonitwy, unikanie kontaktu i ciche sygnały stresu bez otwartej bójki.',
    intro:
      'Konflikt między kotami często jest cichy: blokowanie przejść, zasobów, kuwety, legowisk albo uwagi człowieka. Brak bójki nie zawsze oznacza brak problemu.',
    signals: [
      'Jeden kot blokuje przejścia, kuwetę, jedzenie, drapak albo dostęp do człowieka.',
      'Koty unikają się, syczą, gonią się albo jeden coraz częściej chowa się i zmienia rutynę.',
      'Pojawiają się problemy z kuwetą, nocna aktywność albo napięcie po zmianach w domu.',
    ],
    underneath: [
      'Za mało zasobów albo zasoby ustawione tak, że łatwo je kontrolować.',
      'Zbyt szybkie zapoznanie lub brak bezpiecznych stref.',
      'Stres środowiskowy, ból albo zmiana rutyny jednego z kotów.',
    ],
    avoid: [
      'Nie zostawiaj kotów, żeby „same ustaliły hierarchię”, jeśli narasta napięcie.',
      'Nie dokładaj wspólnych misek i zabaw jako jedynego rozwiązania.',
      'Nie ignoruj cichego blokowania zasobów, bo to często ważniejszy sygnał niż bójka.',
    ],
    firstStep:
      'Zmapuj zasoby: kuwety, miski, wodę, pion, kryjówki i przejścia. Sprawdź, czy każdy kot może korzystać z nich bez mijania drugiego kota na wąsko.',
    whenKwadrans:
      'Kwadrans pomaga szybko ustalić, które zasoby i przejścia są pierwszym punktem do poprawy.',
    whenFullConsultation:
      'Pełna konsultacja jest lepsza, gdy są ataki, mocny stres, problem z kuwetą albo konflikt trwa od dawna.',
    blogLinks: [
      {
        href: '/blog/jak-zapoznac-dwa-koty',
        label: 'Jak zapoznać dwa koty',
        copy: 'Artykuł pomaga zrozumieć tempo, zasoby i bezpieczne etapy zapoznania.',
      },
      {
        href: '/blog/jak-wprowadzic-nowego-kota-do-domu',
        label: 'Jak wprowadzić nowego kota do domu',
        copy: 'Przydatny tekst, jeśli konflikt zaczął się po pojawieniu się nowego kota.',
      },
    ],
    relatedLinks: [
      {
        href: '/problemy/kot-sika-poza-kuweta',
        label: 'Kot sika poza kuwetą',
        copy: 'Jeśli konflikt łączy się z kuwetą, sprawdź też ten temat.',
      },
    ],
    quizProblem: 'konflikt-miedzy-kotami',
  },
]

const PROBLEM_PAGE_BY_SLUG = new Map(PROBLEM_PAGE_CONFIGS.map((page) => [page.slug, page] as const))

export function listProblemPages() {
  return PROBLEM_PAGE_CONFIGS
}

export function listProblemPagePaths() {
  return PROBLEM_PAGE_CONFIGS.map((page) => page.path)
}

export function getProblemPageBySlug(slug: string) {
  return PROBLEM_PAGE_BY_SLUG.get(slug) ?? null
}

export function getProblemPageMetadata(slug: string): Metadata | null {
  const page = getProblemPageBySlug(slug)

  if (!page) {
    return null
  }

  return buildMarketingMetadata({
    title: page.seoTitle,
    path: page.path,
    description: page.description,
    maxTitleLength: 70,
  })
}

function getSpeciesLabel(species: ProblemPageSpecies) {
  return species === 'kot' ? 'Kot' : 'Pies'
}

function getCaseMapHref(page: ProblemPageConfig, searchParams?: CaseMapSearchParams) {
  return buildCaseMapHref({ ...searchParams, problem: page.quizProblem })
}

function getAudioHref(page: ProblemPageConfig) {
  return buildBookHref(null, 'szybka-konsultacja-15-min', false, page.species)
}

function renderList(title: string, items: string[], className?: string) {
  return (
    <article className={`problem-detail-info-card${className ? ` ${className}` : ''}`}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  )
}

function analyticsAttrs(page: ProblemPageConfig, location: string, ctaLabel: string, itemType = 'problem_detail') {
  return {
    'data-analytics-event': 'cta_click',
    'data-analytics-location': location,
    'data-analytics-problem': page.slug,
    'data-analytics-species': page.species,
    'data-analytics-cta-label': ctaLabel,
    'data-analytics-item-type': itemType,
    'data-analytics-item-slug': page.slug,
  }
}

export function ProblemDetailPage({ slug, searchParams }: { slug: string; searchParams?: CaseMapSearchParams }) {
  const page = getProblemPageBySlug(slug)

  if (!page) {
    return null
  }

  const baseUrl = getCanonicalBaseUrl()
  const quizHref = getCaseMapHref(page, searchParams)
  const audioHref = getAudioHref(page)
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.seoTitle,
      description: page.description,
      url: new URL(page.path, baseUrl).toString(),
      inLanguage: 'pl-PL',
      about: {
        '@type': 'Thing',
        name: page.title,
      },
    },
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Problemy', path: '/problemy' },
      { name: page.title, path: page.path },
    ]),
    getItemListJsonLd(
      page.blogLinks.map((link) => ({
        name: link.label,
        url: new URL(link.href, baseUrl).toString(),
      })),
      'https://schema.org/ItemListOrderUnordered',
    ),
  ]

  return (
    <main className="notatnik-page blog-page blog-index-page blog-redesign-page problem-detail-page">
      <Schema data={structuredData} />
      <div className="notatnik-shell blog-index-shell blog-redesign-shell problem-detail-shell">
        <NotatnikTopbar tag="Regulski" navItems={PUBLIC_SITE_NAV_ITEMS} showUtilityLinks={false} ctaHref={quizHref} ctaLabel="Mapa zachowania" />
        <ReferenceHeroLeaf />

        <div className="blog-redesign-content problem-detail-content">
          <section className="problem-detail-hero" aria-labelledby="problem-detail-title">
            <div className="problem-detail-hero-copy">
              <Link href="/problemy" prefetch={false} className="problem-detail-back-link">
                Mapa problemów
              </Link>
              <span className="blog-redesign-kicker">{page.eyebrow}</span>
              <h1 id="problem-detail-title">{page.title}</h1>
              <p>{page.intro}</p>
              <div className="problem-detail-actions">
                <Link
                  href={quizHref}
                  prefetch={false}
                  className="button button-primary big-button"
                  {...analyticsAttrs(page, `${page.slug}-hero-quiz`, 'Przejdź przez Mapę zachowania')}
                >
                  Przejdź przez Mapę zachowania
                  <ArrowRight size={18} strokeWidth={1.9} aria-hidden="true" />
                </Link>
                <Link
                  href={audioHref}
                  prefetch={false}
                  className="button button-ghost big-button"
                  {...analyticsAttrs(page, `${page.slug}-hero-kwadrans`, 'Umów Kwadrans')}
                  data-analytics-service="szybka-konsultacja-15-min"
                >
                  Umów Kwadrans
                </Link>
              </div>
            </div>
            <aside className="problem-detail-hero-note">
              <span>{getSpeciesLabel(page.species)} / pierwszy krok</span>
              <strong>{page.firstStep}</strong>
            </aside>
          </section>

          <section className="problem-detail-grid" aria-label="Rozpoznanie problemu">
            {renderList('3 sygnały, że to może być ten temat', page.signals)}
            {renderList('Co może być pod spodem', page.underneath)}
            {renderList('Czego nie robić na start', page.avoid, 'is-warning')}
          </section>

          <section className="problem-detail-plan-card" aria-labelledby="problem-detail-first-step">
            <div>
              <span className="blog-redesign-kicker">Bezpieczny pierwszy krok</span>
              <h2 id="problem-detail-first-step">{page.firstStep}</h2>
            </div>
            <div className="problem-detail-plan-split">
              <article>
                <h3>Kiedy wystarczy Kwadrans</h3>
                <p>{page.whenKwadrans}</p>
              </article>
              <article>
                <h3>Kiedy lepsza pełna konsultacja</h3>
                <p>{page.whenFullConsultation}</p>
              </article>
            </div>
          </section>

          <section className="problem-detail-link-section" aria-labelledby="problem-detail-blog-links">
            <div className="blog-redesign-section-heading">
              <h2 id="problem-detail-blog-links">Linki do artykułów blogowych</h2>
              <p>Najpierw spokojny kontekst, potem decyzja o kolejnym kroku.</p>
            </div>
            <div className="problem-detail-link-grid">
              {page.blogLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="problem-detail-link-card"
                  {...analyticsAttrs(page, `${page.slug}-blog-link`, link.label, 'blog_link')}
                  data-analytics-target-href={link.href}
                >
                  <strong>{link.label}</strong>
                  <span>{link.copy}</span>
                  <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section className="problem-detail-link-section" aria-labelledby="problem-detail-related-links">
            <div className="blog-redesign-section-heading">
              <h2 id="problem-detail-related-links">Zobacz też</h2>
              <p>Najbliższe tematy, jeśli objawy nakładają się na siebie.</p>
            </div>
            <div className="problem-detail-link-grid">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  className="problem-detail-link-card"
                  {...analyticsAttrs(page, `${page.slug}-related-link`, link.label, 'related_problem')}
                  data-analytics-target-href={link.href}
                >
                  <strong>{link.label}</strong>
                  <span>{link.copy}</span>
                  <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section className="problem-hub-safe-note problem-detail-final-cta">
            <div>
              <span className="blog-redesign-kicker">Domknięcie</span>
              <h2>Nie musisz od razu wybierać usługi</h2>
              <p>
                Jeśli nie wiesz, czy wystarczy krótka rozmowa, czy potrzebna jest pełna konsultacja, przejdź przez Mapę zachowania.
                Wynik pokaże pierwszy krok, czego nie dokładać i gdzie pogłębić temat.
              </p>
            </div>
            <Link href={quizHref} prefetch={false} {...analyticsAttrs(page, `${page.slug}-final-quiz`, 'Otwórz Mapę zachowania')}>
              Otwórz Mapę zachowania
              <ArrowRight size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </section>
        </div>

        <NotatnikFooter showReviews={false} primaryHref={quizHref} primaryLabel="Mapa zachowania" />
      </div>
    </main>
  )
}
