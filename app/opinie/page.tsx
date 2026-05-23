import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  GraduationCap,
  Heart,
  Leaf,
  PawPrint,
  ShieldCheck,
} from 'lucide-react'
import { NotatnikFooter, NotatnikSideVisuals, NotatnikTopbar, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { OpinionsReviewGrid, type OpinionReview } from '@/components/OpinionsReviewGrid'
import { buildBookHref } from '@/lib/booking-routing'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { getCanonicalBaseUrl } from '@/lib/server/env'
import {
  PUBLIC_CONTACT_EMAIL_FALLBACK,
  SITE_NAME,
  SITE_TAGLINE,
  getPublicContactDetails,
} from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Opinie o konsultacjach behawioralnych',
  path: '/opinie',
  description:
    'Opinie opiekunów psów i kotów po konsultacjach behawioralnych. Historie, które pokazują spokojny proces zmiany.',
})

const bookingHref = buildBookHref(null, 'szybka-konsultacja-15-min')
const addOpinionHref = '/opinie/dodaj'

const filters = [
  'Pies',
  'Kot',
] as const

const reviews: OpinionReview[] = [
  {
    name: 'Opiekunka psa',
    service: 'reakcje na spacerze',
    text:
      'Przed rozmową mieliśmy w głowie chaos: spacer, szczekanie, emocje. Po konsultacji wiedzieliśmy, co robimy najpierw i czego na razie nie dokładać.',
    avatar: '/branding/topic-cards/dog-forest-calm.jpg',
    categories: ['Pies', 'Konsultacje online', 'Sytuacja na spacerze'],
  },
  {
    name: 'Opiekunka psa',
    service: 'praca w domu',
    text:
      'Najbardziej pomogło mi to, że nikt mnie nie oceniał. Zamiast listy zakazów dostałam prosty plan, który dało się wdrożyć w naszym domu.',
    avatar: '/branding/topic-cards/french-bulldog-leash.jpg',
    categories: ['Pies', 'Praca w domu', 'Konsultacje online'],
  },
  {
    name: 'Opiekunowie kota',
    service: 'kuweta i napięcie',
    text:
      'Myśleliśmy, że kotka jest złośliwa. Po rozmowie zobaczyliśmy, że to raczej napięcie i środowisko. Wreszcie wiedzieliśmy, co sprawdzić po kolei.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Kuweta i napięcie'],
  },
  {
    name: 'Kasia i Mruczek',
    service: 'Konsultacje online',
    text:
      'Dzięki spotkaniom z panem Krzysztofem nauczyłam się, jak wspierać mojego kota w trudnych sytuacjach. Spokój w domu wrócił, a nasza relacja jest lepsza niż kiedykolwiek.',
    avatar: '/images/homepage/home-bg-cat-1to1.webp',
    categories: ['Kot', 'Konsultacje online'],
  },
  {
    name: 'Paweł i Nala',
    service: 'Agresja do psów',
    text:
      'Rzetelność, ogromna wiedza i indywidualne podejście. Widać serce do zwierząt i pasję do tego, co robi. Zdecydowanie polecam!',
    avatar: '/branding/topic-cards/dog-checkup.jpg',
    categories: ['Pies', 'Agresja', 'Problemy behawioralne'],
  },
  {
    name: 'Agnieszka i Mija',
    service: 'Problemy kuwetowe',
    text:
      'Pan Krzysztof pomógł nam zrozumieć potrzeby naszego kota i wypracować rozwiązania, które naprawdę działają. Cierpliwość i profesjonalizm na najwyższym poziomie.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Anna i Mia',
    service: 'Konsultacja online',
    text:
      'Po rozmowie przestaliśmy zgadywać. Dostaliśmy analizę zachowania opartą na informacjach, pierwsze kroki i spokojny plan obserwacji kota bez nerwowych zmian w domu.',
    avatar: '/branding/case-cat-sofa.jpg',
    categories: ['Kot', 'Konsultacje online', 'Problemy behawioralne'],
  },
  {
    name: 'Karolina i Niko',
    service: 'Kwadrans',
    text:
      'W 15 minut udało się nazwać sytuację i odróżnić to, co pilne, od tego, co można spokojnie obserwować. Bardzo konkretny pierwszy krok.',
    avatar: '/images/homepage/home-bg-dog-1to1.webp',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Łukasz i Figa',
    service: 'Praca z lękiem',
    text:
      'Najbardziej pomogło mi wyjaśnienie, skąd może brać się napięcie. Plan był prosty i dopasowany do naszego rytmu dnia.',
    avatar: '/branding/topic-cards/dog-window-alone.jpg',
    categories: ['Pies', 'Praca z lękiem', 'Problemy behawioralne'],
  },
  {
    name: 'Natalia i Tosia',
    service: 'Problemy behawioralne',
    text:
      'Nie było oceniania ani straszenia. Były pytania, analiza zachowania oparta na informacjach i konkret: co zmienić dziś, a co sprawdzać później.',
    avatar: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    categories: ['Kot', 'Problemy behawioralne', 'Praca z lękiem'],
  },
  {
    name: 'Michał i Roki',
    service: 'Spacer i reaktywność',
    text:
      'Pierwszy raz ktoś uporządkował nam spacer bez kolejnej magicznej metody. Wiemy, kiedy pies jeszcze daje radę i kiedy trzeba zwiększyć dystans.',
    avatar: '/branding/topic-cards/french-bulldog-leash.jpg',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Ewa i Karmel',
    service: 'Konsultacja online',
    text:
      'Dostaliśmy spokojne wyjaśnienie prawdopodobnej przyczyny zachowania i plan pracy bez presji. To dało nam dużo pewności.',
    avatar: '/branding/topic-cards/dog-resting-home.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Patrycja i Mela',
    service: 'Konflikt między kotami',
    text:
      'Zamiast czekać aż koty same się dogadają, zaczęliśmy od przestrzeni i zasobów. Napięcie w domu wyraźnie spadło.',
    avatar: '/branding/topic-cards/cats/cat-intercat-conflict.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Grzegorz i Sara',
    service: 'Szczeniak',
    text:
      'Konsultacja pomogła nam zrozumieć pobudzenie szczeniaka. Po kilku zmianach w rytmie dnia w domu zrobiło się spokojniej.',
    avatar: '/images/cutover/dog-puppy-home.png',
    categories: ['Pies', 'Szczenięta / Kocięta'],
  },
  {
    name: 'Magda i Leon',
    service: 'Pełna konsultacja',
    text:
      'Przy dłuższej sytuacji potrzebowaliśmy więcej niż listy porad. Dostaliśmy analizę zachowania opartą na danych, możliwe tło problemu i kierunek pracy krok po kroku.',
    avatar: '/branding/specialist-cat-support.jpg',
    categories: ['Kot', 'Konsultacje online', 'Problemy behawioralne'],
  },
  {
    name: 'Robert i Abi',
    service: 'Agresja i zasoby',
    text:
      'Bardzo spokojne podejście do trudnego tematu. Najpierw bezpieczeństwo i zrozumienie przyczyny, dopiero potem ćwiczenia.',
    avatar: '/branding/topic-cards/dog-checkup.jpg',
    categories: ['Pies', 'Agresja', 'Problemy behawioralne'],
  },
  {
    name: 'Iza i Frida',
    service: 'Konsultacja online',
    text:
      'Dzięki pytaniom Krzysztofa zobaczyliśmy, że temat nie jest jednym zachowaniem, tylko całym układem dnia. To dużo zmieniło.',
    avatar: '/branding/case-dog-home.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Ola i Kropka',
    service: 'Kuweta',
    text:
      'W końcu mieliśmy kolejność sprawdzania: zdrowie, kuweta, stres i środowisko. Bez losowego zmieniania wszystkiego naraz.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Tomasz i Maja',
    service: 'Praca z lękiem',
    text:
      'Najważniejsze było dla nas tempo. Plan nie wymagał forsowania kontaktu, tylko dawał bezpieczne warunki i obserwację reakcji.',
    avatar: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    categories: ['Kot', 'Praca z lękiem'],
  },
  {
    name: 'Beata i Hugo',
    service: 'Dwa kwadranse',
    text:
      '30 minut dało nam miejsce na kontekst. Po rozmowie wiedzieliśmy, co jest pierwszym priorytetem i czego nie dokładać psu.',
    avatar: '/branding/case-studies/German_Shepherd.jpg',
    categories: ['Pies', 'Konsultacje online', 'Problemy behawioralne'],
  },
  {
    name: 'Marta i Pixel',
    service: 'Szczekanie w domu',
    text:
      'Po rozmowie przestaliśmy reagować chaotycznie na każde szczeknięcie. Dostaliśmy prostą kolejność: obserwacja, bodźce, odpoczynek i dopiero potem ćwiczenia.',
    avatar: '/branding/topic-cards/dog-resting-home.jpg',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Joanna i Tobi',
    service: 'Samotność psa',
    text:
      'Najbardziej pomogło rozpisanie małych kroków. Wreszcie wiedzieliśmy, jak nagrywać psa i kiedy wydłużać wyjścia bez dokładania mu stresu.',
    avatar: '/branding/topic-cards/dog-window-alone.jpg',
    categories: ['Pies', 'Praca z lękiem'],
  },
  {
    name: 'Kamil i Luna',
    service: 'Reaktywność na spacerze',
    text:
      'Zamiast walczyć ze spacerem, zaczęliśmy rozpoznawać moment, w którym pies jeszcze może się uczyć. To dało nam więcej spokoju i mniej szarpania.',
    avatar: '/branding/topic-cards/french-bulldog-leash.jpg',
    categories: ['Pies', 'Problemy behawioralne', 'Sytuacja na spacerze'],
  },
  {
    name: 'Ala i Bruno',
    service: 'Pobudzenie',
    text:
      'Dostaliśmy bardzo konkretną odpowiedź, co robić po powrocie do domu i jak nie nakręcać psa dodatkowymi komendami. Po kilku dniach było spokojniej.',
    avatar: '/images/cutover/dog-pobudzenie.png',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Dorota i Fado',
    service: 'Szczeniak',
    text:
      'Kwadrans uporządkował nam pierwsze dni ze szczeniakiem. Nie dostaliśmy listy zakazów, tylko kilka zasad, które dało się wdrożyć od razu.',
    avatar: '/branding/topic-cards/puppy-hands.jpg',
    categories: ['Pies', 'Szczenięta / Kocięta'],
  },
  {
    name: 'Marcin i Ares',
    service: 'Obrona zasobów',
    text:
      'W trudnym temacie najważniejsze było bezpieczeństwo. Po rozmowie wiedzieliśmy, czego nie prowokować i jak zacząć pracę bez presji.',
    avatar: '/images/cutover/dog-resource-guarding.png',
    categories: ['Pies', 'Agresja', 'Problemy behawioralne'],
  },
  {
    name: 'Paulina i Nero',
    service: 'Goście w domu',
    text:
      'Pierwszy raz ktoś wyjaśnił nam, że problem nie zaczyna się w chwili dzwonka do drzwi. Plan przygotowania domu bardzo nam pomógł.',
    avatar: '/branding/topic-cards/dog-checkup.jpg',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Basia i Odi',
    service: 'Konsultacja online',
    text:
      'Bałam się, że online będzie za mało konkretnie. A wyszłam z rozmowy z jasnym planem i poczuciem, że wiem, co obserwować.',
    avatar: '/branding/case-dog-rest.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Wojtek i Hera',
    service: 'Spacer',
    text:
      'Po konsultacji zmieniliśmy trasę, tempo i sposób mijania psów. To nie była magia, tylko spokojne ustawienie warunków, które pies unosi.',
    avatar: '/branding/topic-cards/dog-forest-side.jpg',
    categories: ['Pies', 'Sytuacja na spacerze'],
  },
  {
    name: 'Sylwia i Maks',
    service: 'Dwa kwadranse',
    text:
      'Dłuższa rozmowa dała nam miejsce na szczegóły. Dostaliśmy plan bez straszenia i bez obietnic cudów, za to bardzo możliwy do sprawdzenia.',
    avatar: '/branding/case-dog-home.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Marta i Mila',
    service: 'Kuweta',
    text:
      'Wreszcie ktoś ułożył nam temat kuwety po kolei: zdrowie, ustawienie, zasoby i stres. Przestaliśmy zmieniać wszystko naraz.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Aneta i Rysiek',
    service: 'Nocna aktywność',
    text:
      'Po rozmowie zobaczyliśmy, że nocne pobudki mają związek z całym rytmem dnia. Kilka zmian w zabawie i karmieniu zrobiło dużą różnicę.',
    avatar: '/branding/topic-cards/cats/cat-night-meowing.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Kuba i Nori',
    service: 'Konflikt między kotami',
    text:
      'Nie musieliśmy od razu rozdzielać kotów na ślepo. Dostaliśmy plan zasobów, dystansu i obserwacji napięcia, który dał się spokojnie wdrożyć.',
    avatar: '/branding/topic-cards/cats/cat-intercat-conflict.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Ela i Fibi',
    service: 'Lęk i chowanie się',
    text:
      'Najważniejsze było dla nas, że nikt nie kazał wyciągać kota na siłę. Plan opierał się na tempie Fibi i jasnych sygnałach stresu.',
    avatar: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    categories: ['Kot', 'Praca z lękiem'],
  },
  {
    name: 'Olek i Kira',
    service: 'Drapanie mebli',
    text:
      'Zrozumieliśmy, że samo mówienie "nie" nic nie zmienia. Po ustawieniu drapaków i rytuałów napięcie w domu wyraźnie spadło.',
    avatar: '/blog-covers/blog-kot-drapie-meble-photo.webp',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Justyna i Puszek',
    service: 'Konsultacja online',
    text:
      'Rozmowa była spokojna i bardzo konkretna. Dostaliśmy wskazówki do obserwacji kota, a nie gotową etykietę bez kontekstu.',
    avatar: '/images/homepage/home-bg-cat-1to1.webp',
    categories: ['Kot', 'Konsultacje online'],
  },
  {
    name: 'Bartek i Sombra',
    service: 'Dotyk i pielęgnacja',
    text:
      'W końcu zrozumieliśmy, kiedy kot mówi "dość". To bardzo zmieniło nasze podejście do głaskania i zabiegów pielęgnacyjnych.',
    avatar: '/branding/topic-cards/cats/cat-touch-defensive.jpg',
    categories: ['Kot', 'Praca z lękiem'],
  },
  {
    name: 'Natalia i Coco',
    service: 'Nowy kot w domu',
    text:
      'Plan zapoznawania kotów był prosty i bez pośpiechu. Dzięki temu nie spaliliśmy pierwszych dni i uniknęliśmy eskalacji.',
    avatar: '/blog-covers/blog-jak-wprowadzic-nowego-kota-do-domu-photo.webp',
    categories: ['Kot', 'Szczenięta / Kocięta'],
  },
  {
    name: 'Renata i Tofik',
    service: 'Stres kota',
    text:
      'Po konsultacji inaczej patrzymy na zmiany w mieszkaniu. Małe rzeczy, które ignorowaliśmy, okazały się ważne dla poczucia bezpieczeństwa kota.',
    avatar: '/blog-covers/blog-stres-kota-a-zachowania-toaletowe-photo.webp',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Piotr i Lili',
    service: 'Pełna konsultacja',
    text:
      'Przy dłuższym problemie potrzebowaliśmy szerszej analizy. Dostaliśmy spokojne wyjaśnienie możliwych przyczyn i plan pracy bez gwałtownych zmian.',
    avatar: '/branding/specialist-cat-support.jpg',
    categories: ['Kot', 'Konsultacje online', 'Problemy behawioralne'],
  },
]

const stats = [
  { value: '5.0/5', label: 'średnia opinii', icon: PawPrint },
  { value: 'Psy i koty', label: 'dwa gatunki', icon: ShieldCheck },
  { value: 'Bez kar', label: 'spokojna praca', icon: Heart },
] as const

const visibleReviews = reviews

const proofItems = [
  {
    title: 'Bezpieczeństwo',
    copy: 'Spokojna praca bez przemocy, straszenia i dominowania.',
    icon: ShieldCheck,
  },
  {
    title: 'Wiedza i doświadczenie',
    copy: 'Praktyka oparta na nauce i wieloletniej pracy.',
    icon: GraduationCap,
  },
  {
    title: 'Empatia i zrozumienie',
    copy: 'Wsparcie dla Ciebie i Twojego zwierzęcia.',
    icon: PawPrint,
  },
  {
    title: 'Konkret po rozmowie',
    copy: 'Pierwszy krok, którego opiekun naprawdę może spróbować w swoim domu.',
    icon: Leaf,
  },
] as const

function HeroStats() {
  return (
    <div className="opinions-showcase-stats" aria-label="Podsumowanie opinii">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div key={stat.value} className="opinions-showcase-stat">
            <Icon size={26} strokeWidth={1.65} />
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </div>
        )
      })}
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="opinions-showcase-hero-visual" aria-hidden="true">
      <div className="opinions-showcase-hero-photo-frame">
        <Image
          src="/faq/faq-hero-pets.png"
          alt=""
          fill
          priority
          sizes="(max-width: 860px) 92vw, 560px"
          className="opinions-showcase-hero-image"
        />
      </div>
      <Image
        src="/decor/leaf-transparent/leaf-top-right.png"
        alt=""
        width={160}
        height={220}
        sizes="(max-width: 680px) 86px, 128px"
        className="opinions-showcase-hero-leaf"
      />
      <span className="opinions-showcase-hero-badge">
        <Leaf size={16} strokeWidth={1.8} />
        po pierwszej rozmowie
      </span>
    </div>
  )
}

export default function OpinionsPage() {
  const baseUrl = getCanonicalBaseUrl()
  const contact = getPublicContactDetails()
  const email = contact.email ?? PUBLIC_CONTACT_EMAIL_FALLBACK
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: SITE_NAME,
      description: `${SITE_TAGLINE}. Opinie po konsultacjach behawioralnych online.`,
      url: new URL('/opinie', baseUrl).toString(),
      areaServed: [{ '@type': 'Country', name: 'Polska' }],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5.0',
        reviewCount: String(visibleReviews.length),
        bestRating: '5',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email,
        areaServed: [{ '@type': 'Country', name: 'Polska' }],
      },
    },
    getBreadcrumbJsonLd([
      { name: 'Strona główna', path: '/' },
      { name: 'Opinie', path: '/opinie' },
    ]),
  ]

  return (
    <main className="notatnik-page opinions-showcase-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <NotatnikSideVisuals variant="mixed" />
      <div className="notatnik-shell opinions-showcase-shell">
        <NotatnikTopbar
          tag="Opinie"
          navItems={PUBLIC_SITE_NAV_ITEMS}
          ctaHref={bookingHref}
          ctaLabel="Umów spokojny pierwszy krok"
        />

        <section className="opinions-showcase-hero">
          <div className="opinions-showcase-hero-copy">
            <span className="opinions-showcase-eyebrow">Opinie</span>
            <h1>
              Co mówią opiekunowie po rozmowie?
            </h1>
            <p>
              Najczęściej wraca jedno: mniej chaosu, mniej oceniania i jaśniejszy pierwszy krok.
            </p>
          </div>

          <div className="opinions-showcase-hero-aside">
            <HeroStats />
            <HeroVisual />
          </div>
        </section>

        <OpinionsReviewGrid filters={[...filters]} reviews={visibleReviews} />

        <section className="opinions-story-band">
          <div className="opinions-story-copy">
            <Leaf size={58} strokeWidth={1.1} />
            <div>
              <h2>Twoja historia może pomóc innym</h2>
              <p>Każda opinia wspiera innych opiekunów w podjęciu decyzji i daje im nadzieję na lepszą relację ze zwierzęciem.</p>
              <Link href={addOpinionHref} prefetch={false} className="opinions-story-button">
                Dodaj opinię <ArrowRight size={17} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
          <div className="opinions-story-photo" aria-hidden="true">
            <Image src="/images/homepage/home-bg-cat-1to1.webp" alt="" fill sizes="(max-width: 860px) 90vw, 390px" />
          </div>
        </section>

        <section className="opinions-proof-strip" aria-label="Dlaczego opiekunowie wracają do spokojnego procesu">
          {proofItems.map((item) => {
            const Icon = item.icon

            return (
              <article key={item.title} className="opinions-proof-item">
                <span>
                  <Icon size={32} strokeWidth={1.55} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              </article>
            )
          })}
        </section>

        <NotatnikFooter />
      </div>
    </main>
  )
}
