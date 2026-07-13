import { buildBookHref } from './booking-routing'
import { FUNNEL_CTA_LABELS } from './funnel'
import { DEFAULT_PRICE_PLN, formatPricePln } from './pricing'
import { CAT_HOME_PHOTO, SPECIALIST_ONLINE_PHOTO, SPECIALIST_WIDE_PHOTO } from './site'
import { PUBLIC_OFFER_FULL_CONSULTATION_VALUE } from './public-offer-copy'

export type OfferKind = 'booking' | 'resource'

export type Offer = {
  slug: string
  contactServiceSlugs?: string[]
  title: string
  shortTitle: string
  eyebrow: string
  kind: OfferKind
  priceLabel: string | null
  priceAmount: number | null
  forWho: string
  whenToChoose: string
  nextStep: string
  cardSummary: string
  heroSummary: string
  descriptions: string[]
  bestFor: string[]
  outcomes: string[]
  primaryCtaLabel: string
  primaryHref: string
  detailCtaLabel?: string
  detailHref?: string
  secondaryCtaLabel?: string
  secondaryHref?: string
  imageSrc: string
  imageAlt: string
  imageWidth: number
  imageHeight: number
  note?: string
}

export type PdfTopic = {
  id: string
  animal: 'Pies' | 'Kot'
  title: string
  summary: string
}

const quickStartPriceLabel = formatPricePln(DEFAULT_PRICE_PLN)

export const FUNNEL_PRIMARY_HREF = buildBookHref()
export const FUNNEL_PRIMARY_LABEL = FUNNEL_CTA_LABELS.primary
export const FUNNEL_UPGRADE_HREF = buildBookHref(null, 'konsultacja-30-min')
export const FUNNEL_UPGRADE_LABEL = FUNNEL_CTA_LABELS.bridge
export const FUNNEL_FULL_CONSULTATION_HREF = buildBookHref(null, 'konsultacja-behawioralna-online')
export const FUNNEL_FULL_CONSULTATION_LABEL = FUNNEL_CTA_LABELS.consultation
export const FUNNEL_SECONDARY_HREF = '/materialy'
export const FUNNEL_SECONDARY_LABEL = FUNNEL_CTA_LABELS.secondary

export const OFFERS: Offer[] = [
  {
    slug: 'szybka-konsultacja-15-min',
    title: '15-minutowa konsultacja behawioralna',
    shortTitle: '15-minutowa konsultacja behawioralna',
    eyebrow: 'Pierwszy krok',
    kind: 'booking',
    priceLabel: quickStartPriceLabel,
    priceAmount: DEFAULT_PRICE_PLN,
    forWho: 'Dla psa albo kota, gdy chcesz szybko uporządkować temat i wybrać właściwy pierwszy krok.',
    whenToChoose: 'Gdy masz jedno pytanie, potrzebujesz orientacji w temacie albo chcesz zacząć bez kamery i bez długiego przygotowania.',
    nextStep: 'Wybierasz temat, termin i płatność. To szybki pierwszy krok, który porządkuje sytuację i pokazuje, czy potrzebny jest szerszy format.',
    cardSummary: '15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    heroSummary: '15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    descriptions: [
      'To dobry wybór, gdy temat jest świeży, wąski albo chcesz szybko sprawdzić, czy potrzebujesz szerszego formatu.',
      'Po rozmowie masz analizę zachowania opartą na zebranych informacjach i wiesz, czy wystarczy ten pierwszy krok, czy lepiej przejść do Dwóch kwadransów albo Pełnej konsultacji.',
    ],
    bestFor: ['jedno pytanie', 'orientacja w temacie', 'spokojny pierwszy krok'],
    outcomes: ['analiza sytuacji w Kwadrans', 'co zrobić od razu', 'jasna decyzja o kolejnym kroku'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    primaryHref: buildBookHref(),
    secondaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    secondaryHref: buildBookHref(null, 'konsultacja-30-min'),
    imageSrc: SPECIALIST_WIDE_PHOTO.src,
    imageAlt: SPECIALIST_WIDE_PHOTO.alt,
    imageWidth: SPECIALIST_WIDE_PHOTO.width,
    imageHeight: SPECIALIST_WIDE_PHOTO.height,
    note: 'Kwadrans to 15 min audio bez kamery na jedno główne pytanie. Służy do szybkiego uporządkowania sytuacji i wybrania pierwszego kierunku działania.',
  },
  {
    slug: 'kwadrans-na-juz',
    contactServiceSlugs: ['kwadrans-na-juz', 'pilny-kwadrans', 'na-już'],
    title: 'Kwadrans na już',
    shortTitle: 'Kwadrans na już',
    eyebrow: 'Szybki termin',
    kind: 'booking',
    priceLabel: formatPricePln(99),
    priceAmount: 99,
    forWho: 'Dla psa albo kota, gdy potrzebujesz tego samego 15-minutowego formatu co Kwadrans, ale z priorytetem i szybszym terminem.',
    whenToChoose: 'Gdy sprawa jest pilna, chcesz rozmawiać jeszcze dziś albo zależy Ci na możliwie szybkim terminie.',
    nextStep: 'Wybierasz ten sam format 15 minut audio. Termin blokuje się w formularzu, a rezerwacja staje się pewna po potwierdzeniu płatności.',
    cardSummary: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    heroSummary: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    descriptions: [
      'To ta sama forma co Kwadrans za 69 zł: 15 minut audio bez kamery, tylko realizowana priorytetowo.',
      'Zakres rozmowy jest taki sam jak w zwykłym Kwadransie. Różnica dotyczy tylko tempa wejścia i priorytetu obsługi.',
    ],
    bestFor: ['pilna rozmowa', 'szybki dostęp', 'ten sam zakres co w Kwadransie'],
    outcomes: ['analiza zachowania oparta na informacjach bez czekania na zwykły termin', 'ten sam format 15 minut co w Kwadransie', 'jasna decyzja, czy potrzebny jest kolejny krok'],
    primaryCtaLabel: 'Chcę szybszy termin',
    primaryHref: buildBookHref(null, 'kwadrans-na-juz'),
    detailHref: '/cennik',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: SPECIALIST_WIDE_PHOTO.src,
    imageAlt: SPECIALIST_WIDE_PHOTO.alt,
    imageWidth: SPECIALIST_WIDE_PHOTO.width,
    imageHeight: SPECIALIST_WIDE_PHOTO.height,
    note: 'To ten sam zakres co Kwadrans za 69 zł. Różnica dotyczy priorytetu i najbliższego realnego terminu, nie dłuższej analizy.',
  },
  {
    slug: 'konsultacja-30-min',
    title: 'Dwa kwadranse z behawiorystą',
    shortTitle: 'Dwa kwadranse',
    eyebrow: 'Szerszy zakres',
    kind: 'booking',
    priceLabel: formatPricePln(169),
    priceAmount: 169,
    forWho: 'Dla spraw, które potrzebują więcej czasu niż sam Kwadrans, ale nie wymagają od razu pełnej konsultacji.',
    whenToChoose: 'Gdy temat jest szerszy niż jedno pytanie, chcesz spokojniej wejść w rozmowę online albo potrzebujesz 30 minut na uporządkowanie dwóch-trzech wątków.',
    nextStep: 'Od razu rezerwujesz 30-minutowy termin online i przechodzisz do formularza oraz płatności.',
    cardSummary: '30 min online, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    heroSummary: '30 min online, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    descriptions: [
      'To format dla sytuacji, w których potrzebujesz chwili więcej na kontekst i pytania, ale nadal zależy Ci na prostym starcie.',
      'Po rozmowie masz jaśniejszy kierunek, pierwsze zalecenia, krótką notatkę i decyzję, czy kolejny krok to już pełna konsultacja behawioralna.',
    ],
    bestFor: ['spokojniejszy start online', 'dwa-trzy wątki naraz', 'gdy 15 min to za mało'],
    outcomes: ['więcej czasu na uporządkowanie sytuacji', 'wstępne zalecenia i krótka notatka po rozmowie', 'decyzja, czy potrzebna jest pełna konsultacja'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    primaryHref: buildBookHref(null, 'konsultacja-30-min'),
    detailHref: '/cennik',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: SPECIALIST_ONLINE_PHOTO.src,
    imageAlt: SPECIALIST_ONLINE_PHOTO.alt,
    imageWidth: SPECIALIST_ONLINE_PHOTO.width,
    imageHeight: SPECIALIST_ONLINE_PHOTO.height,
    note: 'Dobry wybór, gdy 15 minut to za mało, ale temat nie wymaga jeszcze około 2h pełnej konsultacji i 14 dni komunikacji w pokoju klienta.',
  },
  {
    slug: 'konsultacja-behawioralna-online',
    title: 'Pełna konsultacja behawioralna',
    shortTitle: 'Pełna konsultacja',
    eyebrow: 'Pełna analiza',
    kind: 'booking',
    priceLabel: formatPricePln(470),
    priceAmount: 470,
    forWho: 'Dla spraw złożonych, utrwalonych albo wielowątkowych, gdy od razu potrzebujesz szerokiego wejścia w temat.',
    whenToChoose: 'Gdy problem trwa dłużej, wraca albo obejmuje kilka obszarów naraz i potrzebuje pełniejszej analizy.',
    nextStep: 'Umawiasz pełną konsultację online. Po rozmowie dostajesz analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    cardSummary: 'Około 2h online: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
    heroSummary: 'Około 2h online dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    descriptions: [
      'To format dla sytuacji, w których szybki start byłby zbyt płytki: problem wraca, narasta albo dotyka kilku rzeczy naraz.',
      'Po rozmowie dostajesz analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    ],
    bestFor: ['temat złożony', 'kilka wątków naraz', 'gdy potrzebujesz analizy zachowania, możliwego tła problemu i codziennego wsparcia wdrożenia'],
    outcomes: ['analiza zachowania i prawdopodobna przyczyna problemu', 'plan działania po rozmowie', '14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.consultation,
    primaryHref: buildBookHref(null, 'konsultacja-behawioralna-online'),
    detailHref: buildBookHref(null, 'konsultacja-behawioralna-online'),
    secondaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    secondaryHref: buildBookHref(null, 'konsultacja-30-min'),
    imageSrc: SPECIALIST_ONLINE_PHOTO.src,
    imageAlt: SPECIALIST_ONLINE_PHOTO.alt,
    imageWidth: SPECIALIST_ONLINE_PHOTO.width,
    imageHeight: SPECIALIST_ONLINE_PHOTO.height,
    note: PUBLIC_OFFER_FULL_CONSULTATION_VALUE,
  },
  {
    slug: 'poradniki-pdf',
    contactServiceSlugs: ['poradniki-pdf', 'poradnik-pdf', 'pdf', 'poradniki'],
    title: 'Materiały PDF',
    shortTitle: 'Materiały PDF',
    eyebrow: 'Materiały pomocnicze',
    kind: 'resource',
    priceLabel: null,
    priceAmount: null,
    forWho: 'Dla osób, które chcą wracać do materiałów i rekomendacji między rozmowami.',
    whenToChoose: 'Gdy chcesz spokojnie wrócić do tematu, przygotować się do rozmowy albo sprawdzić, czy z czymś da się ruszyć samodzielnie.',
    nextStep: 'Najpierw porządkujesz temat, a potem łatwiej decydujesz, czy wystarczy materiał, czy lepiej wejść w rozmowę.',
    cardSummary: 'Materiały do samodzielnej pracy jako drugi krok.',
    heroSummary: 'Materiały do samodzielnej pracy: własne przewodniki, książki i narzędzia dobrane pod konkretne sytuację.',
    descriptions: [
      'Znajdziesz tu materiały, do których możesz wrócić przed rozmową, po rozmowie albo między kolejnymi krokami.',
      'To miejsce z przewodnikami i narzędziami dobranymi pod konkretne sytuacje.',
    ],
    bestFor: ['powrót do zaleceń', 'materiały pomocnicze', 'spokojne pogłębienie tematu'],
    outcomes: ['czytelny materiał na później', 'mniej chaosu między krokami', 'łatwiejsza decyzja o kolejnym ruchu'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.secondary,
    primaryHref: '/materialy',
    detailCtaLabel: FUNNEL_CTA_LABELS.secondary,
    detailHref: '/materialy',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: CAT_HOME_PHOTO.src,
    imageAlt: CAT_HOME_PHOTO.alt,
    imageWidth: CAT_HOME_PHOTO.width,
    imageHeight: CAT_HOME_PHOTO.height,
    note: 'Materiały PDF pomagają przygotować się do rozmowy albo wrócić do zaleceń po konsultacji.',
  },
]

export const CAT_SUPPORT_AREAS = [
  'sika poza kuwetą',
  'konflikt między kotami',
  'żyje w napięciu albo się chowa',
  'źle znosi zmiany w domu',
  'budzi dom po nocy',
] as const

export const CAT_POPULAR_CATEGORIES = [
  {
    title: 'Kuweta i sikanie poza kuwetą',
    summary: 'Najczęstszy start: omijanie kuwety, napięcie przy kuwecie albo nagła zmiana nawyku.',
  },
  {
    title: 'Konflikt między kotami',
    summary: 'Gonitwy, blokowanie przejść, napięcie przy zasobach albo rozjazd relacji w domu.',
  },
  {
    title: 'Wycofanie i napięcie',
    summary: 'Wycofanie, stres po zmianie i trudność z powrotem do codziennego spokoju.',
  },
  {
    title: 'Wokalizacja i pobudzenie',
    summary: 'Miauczenie, nocne pobudki i rytm dnia, który rozsypuje spokój w domu.',
  },
] as const

export const PDF_TOPICS: PdfTopic[] = [
  {
    id: 'pies-ciagnie-na-smyczy',
    animal: 'Pies',
    title: 'Pies ciągnie na smyczy',
    summary: 'Na pierwszy start ze spacerem i napięciem.',
  },
  {
    id: 'pies-zostaje-sam',
    animal: 'Pies',
    title: 'Pies zostaje sam',
    summary: 'Na pierwszy porządek przy wyciu, szczekaniu i chaosie po wyjściu.',
  },
  {
    id: 'pies-rzuca-się-do-psów',
    animal: 'Pies',
    title: 'Pies rzuca się do innych psów',
    summary: 'Na start przy trudnych spacerach i reaktywności.',
  },
  {
    id: 'szczeniak-gryzie',
    animal: 'Pies',
    title: 'Szczeniak gryzie i nie umie się wyciszyć',
    summary: 'Na start przy gryzieniu, skakaniu i chaosie w domu.',
  },
  {
    id: 'pies-boi-sie',
    animal: 'Pies',
    title: 'Pies boi się ludzi albo dźwięków',
    summary: 'Na pierwszy porządek przy lęku i przeciążeniu.',
  },
  {
    id: 'kot-poza-kuweta-plan',
    animal: 'Kot',
    title: 'Kot sika poza kuwetą',
    summary: 'Na pierwszy porządek przy kuwecie i stresie.',
  },
  {
    id: 'kot-kuweta-wet-czy-behawior',
    animal: 'Kot',
    title: 'Kuweta: wet czy zachowanie',
    summary: 'Na szybkie odróżnienie alarmu od stresu.',
  },
  {
    id: 'konflikt-miedzy-kotami-pdf',
    animal: 'Kot',
    title: 'Konflikt między kotami',
    summary: 'Na start przy napięciu i gonitwach w domu.',
  },
  {
    id: 'kot-wycofany',
    animal: 'Kot',
    title: 'Kot lękowy albo wycofany',
    summary: 'Na prosty start przy chowaniu się i napięciu.',
  },
  {
    id: 'kot-przy-dotyku',
    animal: 'Kot',
    title: 'Kot przy trudnym dotyku i pielęgnacji',
    summary: 'Na start przy pielęgnacji i trudnym kontakcie.',
  },
]

export function getOfferBySlug(slug: string) {
  return OFFERS.find((offer) => offer.slug === slug) ?? null
}

export function getOfferDetailHref(offer: Pick<Offer, 'slug' | 'detailHref'>) {
  return offer.detailHref ?? '/cennik'
}

export function getOfferDetailCtaLabel(offer: Pick<Offer, 'detailCtaLabel'>) {
  return offer.detailCtaLabel ?? 'Zobacz szczegóły'
}

export function getOfferByServiceSlug(serviceSlug: string) {
  const normalizedServiceSlug = serviceSlug.trim().toLowerCase()

  return (
    OFFERS.find((offer) => {
      const aliases = [offer.slug, ...(offer.contactServiceSlugs ?? [])].map((value) => value.trim().toLowerCase())
      return aliases.includes(normalizedServiceSlug)
    }) ?? null
  )
}


