import { buildBookHref } from './booking-routing'
import { FUNNEL_CTA_LABELS } from './funnel'
import { DEFAULT_PRICE_PLN } from './pricing'
import { CAT_HOME_PHOTO, SPECIALIST_ONLINE_PHOTO, SPECIALIST_WIDE_PHOTO } from './site'
import { PUBLIC_OFFER_FULL_CONSULTATION_VALUE, PUBLIC_OFFER_PRICES, PUBLIC_OFFER_PRICE_LABELS } from './public-offer-copy'

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

const quickStartPriceLabel = PUBLIC_OFFER_PRICE_LABELS.quick

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
    title: 'Zapytaj behawiorystę',
    shortTitle: 'Zapytaj behawiorystę',
    eyebrow: 'Pierwszy krok',
    kind: 'booking',
    priceLabel: quickStartPriceLabel,
    priceAmount: DEFAULT_PRICE_PLN,
    forWho: 'Dla psa albo kota, gdy chcesz szybko uporządkować temat i wybrać właściwy pierwszy krok.',
    whenToChoose: 'Gdy masz jedno pytanie, potrzebujesz orientacji w temacie albo chcesz zacząć bez kamery i bez długiego przygotowania.',
    nextStep: 'Wybierasz temat, termin i płatność. To pierwszy krok, po którym dostajesz kierunek działania i wiesz, co robić dalej.',
    cardSummary: 'Rozmowa telefoniczna do 15 minut. Opowiadasz, co się dzieje, a dostajesz pierwszy kierunek działania i dwa pytania po rozmowie.',
    heroSummary: 'Rozmowa telefoniczna do 15 minut. Opowiadasz, co się dzieje, a dostajesz pierwszy kierunek działania i dwa pytania po rozmowie.',
    descriptions: [
      'To dobry wybór, gdy chcesz po prostu opowiedzieć o problemie i dostać pierwszy klucz bez czekania, aż temat urośnie.',
      'Po rozmowie wiesz, co zrobić dalej: możesz zostać przy pierwszym kierunku, sięgnąć po dopasowany PDF albo otrzymać rekomendację pełnej konsultacji.',
    ],
    bestFor: ['jedno pytanie', 'orientacja w temacie', 'spokojny pierwszy krok'],
    outcomes: ['uporządkowanie sytuacji', 'pierwszy kierunek działania', 'jasna decyzja, co robić dalej'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    primaryHref: buildBookHref(),
    secondaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    secondaryHref: buildBookHref(null, 'konsultacja-30-min'),
    imageSrc: SPECIALIST_WIDE_PHOTO.src,
    imageAlt: SPECIALIST_WIDE_PHOTO.alt,
    imageWidth: SPECIALIST_WIDE_PHOTO.width,
    imageHeight: SPECIALIST_WIDE_PHOTO.height,
    note: 'Zapytaj behawiorystę to rozmowa telefoniczna do 15 minut: opisujesz sytuację, dostajesz pierwszy kierunek działania i dwa pytania po rozmowie.',
  },
  {
    slug: 'kwadrans-na-juz',
    contactServiceSlugs: ['kwadrans-na-juz', 'pilny-kwadrans', 'na-już'],
    title: 'Zapytaj teraz',
    shortTitle: 'Zapytaj teraz',
    eyebrow: 'Szybki termin',
    kind: 'booking',
    priceLabel: PUBLIC_OFFER_PRICE_LABELS.urgent,
    priceAmount: PUBLIC_OFFER_PRICES.urgent,
    forWho: 'Dla psa albo kota, gdy potrzebujesz tego samego zakresu co Zapytaj behawiorystę, ale z priorytetem i szybszym terminem.',
    whenToChoose: 'Gdy sprawa jest pilna, chcesz rozmawiać jeszcze dziś albo zależy Ci na możliwie szybkim terminie.',
    nextStep: 'Wybierasz ten sam zakres rozmowy. Termin blokuje się w formularzu, a rezerwacja staje się pewna po potwierdzeniu płatności.',
    cardSummary: 'Ten sam zakres co Zapytaj behawiorystę, ale z priorytetem i najbliższym realnym terminem.',
    heroSummary: 'Ten sam zakres co Zapytaj behawiorystę, ale z priorytetem i najbliższym realnym terminem.',
    descriptions: [
      `To ten sam zakres co Zapytaj behawiorystę za ${PUBLIC_OFFER_PRICE_LABELS.quick}: rozmowa telefoniczna do 15 minut, tylko realizowana priorytetowo.`,
      'Różnica dotyczy dostępności i momentu rozmowy, nie dłuższej analizy.',
    ],
    bestFor: ['pilna rozmowa', 'szybki dostęp', 'ten sam zakres co w Zapytaj behawiorystę'],
    outcomes: ['szybkie uporządkowanie sytuacji', 'pierwszy kierunek działania', 'jasna decyzja, czy potrzebny jest kolejny krok'],
    primaryCtaLabel: 'Chcę szybszy termin',
    primaryHref: buildBookHref(null, 'kwadrans-na-juz'),
    detailHref: '/zapytaj',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: SPECIALIST_WIDE_PHOTO.src,
    imageAlt: SPECIALIST_WIDE_PHOTO.alt,
    imageWidth: SPECIALIST_WIDE_PHOTO.width,
    imageHeight: SPECIALIST_WIDE_PHOTO.height,
    note: `To ten sam zakres co Zapytaj behawiorystę za ${PUBLIC_OFFER_PRICE_LABELS.quick}. Różnica dotyczy dostępności i najbliższego realnego terminu.`,
  },
  {
    slug: 'konsultacja-30-min',
    title: 'Starszy wariant rozmowy',
    shortTitle: 'Starszy wariant rozmowy',
    eyebrow: 'Niedostępny publicznie',
    kind: 'booking',
    priceLabel: null,
    priceAmount: null,
    forWho: 'Wyłącznie dla istniejących danych i zgodności technicznej.',
    whenToChoose: 'Nie wybieraj tego wariantu. Aktualny pierwszy krok to Zapytaj behawiorystę.',
    nextStep: 'Przejdź do Zapytaj behawiorystę albo do pełnej konsultacji, jeśli masz indywidualną rekomendację.',
    cardSummary: 'Wariant historyczny ukryty z oferty publicznej.',
    heroSummary: 'Wariant historyczny ukryty z oferty publicznej.',
    descriptions: [
      'Ten wariant nie jest obecnie dostępny publicznie.',
      'Zachowujemy go tylko po to, by nie uszkodzić starszych danych i linków technicznych.',
    ],
    bestFor: ['zgodność techniczna'],
    outcomes: ['brak nowej rezerwacji', 'przejście do aktualnej oferty'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    primaryHref: buildBookHref(null, 'konsultacja-30-min'),
    detailHref: '/zapytaj',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: SPECIALIST_ONLINE_PHOTO.src,
    imageAlt: SPECIALIST_ONLINE_PHOTO.alt,
    imageWidth: SPECIALIST_ONLINE_PHOTO.width,
    imageHeight: SPECIALIST_ONLINE_PHOTO.height,
    note: 'Wariant historyczny — nie jest elementem aktualnej oferty publicznej.',
  },
  {
    slug: 'konsultacja-behawioralna-online',
    title: 'Pełna konsultacja',
    shortTitle: 'Pełna konsultacja',
    eyebrow: 'Pełna analiza',
    kind: 'booking',
    priceLabel: PUBLIC_OFFER_PRICE_LABELS.premium,
    priceAmount: PUBLIC_OFFER_PRICES.premium,
    forWho: 'Dla spraw złożonych, utrwalonych albo wielowątkowych, gdy od razu potrzebujesz szerokiego wejścia w temat.',
    whenToChoose: 'Gdy problem trwa dłużej, wraca albo obejmuje kilka obszarów naraz i potrzebuje pełniejszej analizy.',
    nextStep: 'Umawiasz pełną konsultację online. Po rozmowie dostajesz analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    cardSummary: 'Około 90 minut online: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
    heroSummary: 'Około 90 minut online dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
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
  return offer.detailHref ?? '/zapytaj'
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


