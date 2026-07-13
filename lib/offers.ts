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
    forWho: 'Dla psa albo kota, gdy chcesz szybko uporzÄ…dkowaÄ‡ temat i wybraÄ‡ wĹ‚aĹ›ciwy pierwszy krok.',
    whenToChoose: 'Gdy masz jedno pytanie, potrzebujesz orientacji w temacie albo chcesz zaczÄ…Ä‡ bez kamery i bez dĹ‚ugiego przygotowania.',
    nextStep: 'Wybierasz temat, termin i pĹ‚atnoĹ›Ä‡. To szybki pierwszy krok, ktĂłry porzÄ…dkuje sytuacjÄ™ i pokazuje, czy potrzebny jest szerszy format.',
    cardSummary: '15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.',
    heroSummary: '15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.',
    descriptions: [
      'To dobry wybĂłr, gdy temat jest Ĺ›wieĹĽy, wÄ…ski albo chcesz szybko sprawdziÄ‡, czy potrzebujesz szerszego formatu.',
      'Po rozmowie masz analizÄ™ zachowania opartÄ… na zebranych informacjach i wiesz, czy wystarczy ten pierwszy krok, czy lepiej przejĹ›Ä‡ do DwĂłch kwadransĂłw albo PeĹ‚nej konsultacji.',
    ],
    bestFor: ['jedno pytanie', 'orientacja w temacie', 'spokojny pierwszy krok'],
    outcomes: ['analiza sytuacji w Kwadrans', 'co zrobiÄ‡ od razu', 'jasna decyzja o kolejnym kroku'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    primaryHref: buildBookHref(),
    secondaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    secondaryHref: buildBookHref(null, 'konsultacja-30-min'),
    imageSrc: SPECIALIST_WIDE_PHOTO.src,
    imageAlt: SPECIALIST_WIDE_PHOTO.alt,
    imageWidth: SPECIALIST_WIDE_PHOTO.width,
    imageHeight: SPECIALIST_WIDE_PHOTO.height,
    note: 'Kwadrans to 15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. SĹ‚uĹĽy do szybkiego uporzÄ…dkowania sytuacji i wybrania pierwszego kierunku dziaĹ‚ania.',
  },
  {
    slug: 'kwadrans-na-juz',
    contactServiceSlugs: ['kwadrans-na-juz', 'pilny-kwadrans', 'na-juĹĽ'],
    title: 'Kwadrans na juĹĽ',
    shortTitle: 'Kwadrans na juĹĽ',
    eyebrow: 'Szybki termin',
    kind: 'booking',
    priceLabel: formatPricePln(99),
    priceAmount: 99,
    forWho: 'Dla psa albo kota, gdy potrzebujesz tego samego 15-minutowego formatu co Kwadrans, ale z priorytetem i szybszym terminem.',
    whenToChoose: 'Gdy sprawa jest pilna, chcesz rozmawiaÄ‡ jeszcze dziĹ› albo zaleĹĽy Ci na moĹĽliwie szybkim terminie.',
    nextStep: 'Wybierasz ten sam format 15 minut audio. Termin blokuje siÄ™ w formularzu, a rezerwacja staje siÄ™ pewna po potwierdzeniu pĹ‚atnoĹ›ci.',
    cardSummary: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliĹĽszym realnym terminem. Dla spraw pilnych, ktĂłre nie wymagajÄ… dĹ‚uĹĽszej analizy.',
    heroSummary: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliĹĽszym realnym terminem. Dla spraw pilnych, ktĂłre nie wymagajÄ… dĹ‚uĹĽszej analizy.',
    descriptions: [
      'To ta sama forma co Kwadrans za 69 zĹ‚: 15 minut audio bez kamery, tylko realizowana priorytetowo.',
      'Zakres rozmowy jest taki sam jak w zwykĹ‚ym Kwadransie. RĂłĹĽnica dotyczy tylko tempa wejĹ›cia i priorytetu obsĹ‚ugi.',
    ],
    bestFor: ['pilna rozmowa', 'szybki dostÄ™p', 'ten sam zakres co w Kwadransie'],
    outcomes: ['analiza zachowania oparta na informacjach bez czekania na zwykĹ‚y termin', 'ten sam format 15 minut co w Kwadransie', 'jasna decyzja, czy potrzebny jest kolejny krok'],
    primaryCtaLabel: 'ChcÄ™ szybszy termin',
    primaryHref: buildBookHref(null, 'kwadrans-na-juz'),
    detailHref: '/cennik',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: SPECIALIST_WIDE_PHOTO.src,
    imageAlt: SPECIALIST_WIDE_PHOTO.alt,
    imageWidth: SPECIALIST_WIDE_PHOTO.width,
    imageHeight: SPECIALIST_WIDE_PHOTO.height,
    note: 'To ten sam zakres co Kwadrans za 69 zĹ‚. RĂłĹĽnica dotyczy priorytetu i najbliĹĽszego realnego terminu, nie dĹ‚uĹĽszej analizy.',
  },
  {
    slug: 'konsultacja-30-min',
    title: 'Dwa kwadranse z behawiorystÄ…',
    shortTitle: 'Dwa kwadranse',
    eyebrow: 'Szerszy zakres',
    kind: 'booking',
    priceLabel: formatPricePln(169),
    priceAmount: 169,
    forWho: 'Dla spraw, ktĂłre potrzebujÄ… wiÄ™cej czasu niĹĽ sam Kwadrans, ale nie wymagajÄ… od razu peĹ‚nej konsultacji.',
    whenToChoose: 'Gdy temat jest szerszy niĹĽ jedno pytanie, chcesz spokojniej wejĹ›Ä‡ w rozmowÄ™ online albo potrzebujesz 30 minut na uporzÄ…dkowanie dwĂłch-trzech wÄ…tkĂłw.',
    nextStep: 'Od razu rezerwujesz 30-minutowy termin online i przechodzisz do formularza oraz pĹ‚atnoĹ›ci.',
    cardSummary: '30 min online, gdy temat ma kilka wÄ…tkĂłw. WiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.',
    heroSummary: '30 min online, gdy temat ma kilka wÄ…tkĂłw. WiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.',
    descriptions: [
      'To format dla sytuacji, w ktĂłrych potrzebujesz chwili wiÄ™cej na kontekst i pytania, ale nadal zaleĹĽy Ci na prostym starcie.',
      'Po rozmowie masz jaĹ›niejszy kierunek, pierwsze zalecenia, krĂłtkÄ… notatkÄ™ i decyzjÄ™, czy kolejny krok to juĹĽ peĹ‚na konsultacja behawioralna.',
    ],
    bestFor: ['spokojniejszy start online', 'dwa-trzy wÄ…tki naraz', 'gdy 15 min to za maĹ‚o'],
    outcomes: ['wiÄ™cej czasu na uporzÄ…dkowanie sytuacji', 'wstÄ™pne zalecenia i krĂłtka notatka po rozmowie', 'decyzja, czy potrzebna jest peĹ‚na konsultacja'],
    primaryCtaLabel: FUNNEL_CTA_LABELS.bridge,
    primaryHref: buildBookHref(null, 'konsultacja-30-min'),
    detailHref: '/cennik',
    secondaryCtaLabel: FUNNEL_CTA_LABELS.primary,
    secondaryHref: buildBookHref(),
    imageSrc: SPECIALIST_ONLINE_PHOTO.src,
    imageAlt: SPECIALIST_ONLINE_PHOTO.alt,
    imageWidth: SPECIALIST_ONLINE_PHOTO.width,
    imageHeight: SPECIALIST_ONLINE_PHOTO.height,
    note: 'Dobry wybĂłr, gdy 15 minut to za maĹ‚o, ale temat nie wymaga jeszcze okoĹ‚o 2h peĹ‚nej konsultacji i 14 dni komunikacji w pokoju klienta.',
  },
  {
    slug: 'konsultacja-behawioralna-online',
    title: 'PeĹ‚na konsultacja behawioralna',
    shortTitle: 'PeĹ‚na konsultacja',
    eyebrow: 'PeĹ‚na analiza',
    kind: 'booking',
    priceLabel: formatPricePln(470),
    priceAmount: 470,
    forWho: 'Dla spraw zĹ‚oĹĽonych, utrwalonych albo wielowÄ…tkowych, gdy od razu potrzebujesz szerokiego wejĹ›cia w temat.',
    whenToChoose: 'Gdy problem trwa dĹ‚uĹĽej, wraca albo obejmuje kilka obszarĂłw naraz i potrzebuje peĹ‚niejszej analizy.',
    nextStep: 'Umawiasz peĹ‚nÄ… konsultacjÄ™ online. Po rozmowie dostajesz analizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
    cardSummary: 'OkoĹ‚o 2h online: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
    heroSummary: 'OkoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
    descriptions: [
      'To format dla sytuacji, w ktĂłrych szybki start byĹ‚by zbyt pĹ‚ytki: problem wraca, narasta albo dotyka kilku rzeczy naraz.',
      'Po rozmowie dostajesz analizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
    ],
    bestFor: ['temat zĹ‚oĹĽony', 'kilka wÄ…tkĂłw naraz', 'gdy potrzebujesz analizy zachowania, moĹĽliwego tĹ‚a problemu i codziennego wsparcia wdroĹĽenia'],
    outcomes: ['analiza zachowania i prawdopodobna przyczyna problemu', 'plan dziaĹ‚ania po rozmowie', '14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„'],
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
    title: 'MateriaĹ‚y PDF',
    shortTitle: 'MateriaĹ‚y PDF',
    eyebrow: 'MateriaĹ‚y pomocnicze',
    kind: 'resource',
    priceLabel: null,
    priceAmount: null,
    forWho: 'Dla osĂłb, ktĂłre chcÄ… wracaÄ‡ do materiaĹ‚Ăłw i rekomendacji miÄ™dzy rozmowami.',
    whenToChoose: 'Gdy chcesz spokojnie wrĂłciÄ‡ do tematu, przygotowaÄ‡ siÄ™ do rozmowy albo sprawdziÄ‡, czy z czymĹ› da siÄ™ ruszyÄ‡ samodzielnie.',
    nextStep: 'Najpierw porzÄ…dkujesz temat, a potem Ĺ‚atwiej decydujesz, czy wystarczy materiaĹ‚, czy lepiej wejĹ›Ä‡ w rozmowÄ™.',
    cardSummary: 'MateriaĹ‚y do samodzielnej pracy jako drugi krok.',
    heroSummary: 'MateriaĹ‚y do samodzielnej pracy: wĹ‚asne przewodniki, ksiÄ…ĹĽki i narzÄ™dzia dobrane pod konkretne sytuacjÄ™.',
    descriptions: [
      'Znajdziesz tu materiaĹ‚y, do ktĂłrych moĹĽesz wrĂłciÄ‡ przed rozmowÄ…, po rozmowie albo miÄ™dzy kolejnymi krokami.',
      'To miejsce z przewodnikami i narzÄ™dziami dobranymi pod konkretne sytuacje.',
    ],
    bestFor: ['powrĂłt do zaleceĹ„', 'materiaĹ‚y pomocnicze', 'spokojne pogĹ‚Ä™bienie tematu'],
    outcomes: ['czytelny materiaĹ‚ na pĂłĹşniej', 'mniej chaosu miÄ™dzy krokami', 'Ĺ‚atwiejsza decyzja o kolejnym ruchu'],
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
    note: 'MateriaĹ‚y PDF pomagajÄ… przygotowaÄ‡ siÄ™ do rozmowy albo wrĂłciÄ‡ do zaleceĹ„ po konsultacji.',
  },
]

export const CAT_SUPPORT_AREAS = [
  'sika poza kuwetÄ…',
  'konflikt miÄ™dzy kotami',
  'ĹĽyje w napiÄ™ciu albo siÄ™ chowa',
  'Ĺşle znosi zmiany w domu',
  'budzi dom po nocy',
] as const

export const CAT_POPULAR_CATEGORIES = [
  {
    title: 'Kuweta i sikanie poza kuwetÄ…',
    summary: 'NajczÄ™stszy start: omijanie kuwety, napiÄ™cie przy kuwecie albo nagĹ‚a zmiana nawyku.',
  },
  {
    title: 'Konflikt miÄ™dzy kotami',
    summary: 'Gonitwy, blokowanie przejĹ›Ä‡, napiÄ™cie przy zasobach albo rozjazd relacji w domu.',
  },
  {
    title: 'Wycofanie i napiÄ™cie',
    summary: 'Wycofanie, stres po zmianie i trudnoĹ›Ä‡ z powrotem do codziennego spokoju.',
  },
  {
    title: 'Wokalizacja i pobudzenie',
    summary: 'Miauczenie, nocne pobudki i rytm dnia, ktĂłry rozsypuje spokĂłj w domu.',
  },
] as const

export const PDF_TOPICS: PdfTopic[] = [
  {
    id: 'pies-ciagnie-na-smyczy',
    animal: 'Pies',
    title: 'Pies ciÄ…gnie na smyczy',
    summary: 'Na pierwszy start ze spacerem i napiÄ™ciem.',
  },
  {
    id: 'pies-zostaje-sam',
    animal: 'Pies',
    title: 'Pies zostaje sam',
    summary: 'Na pierwszy porzÄ…dek przy wyciu, szczekaniu i chaosie po wyjĹ›ciu.',
  },
  {
    id: 'pies-rzuca-siÄ™-do-psĂłw',
    animal: 'Pies',
    title: 'Pies rzuca siÄ™ do innych psĂłw',
    summary: 'Na start przy trudnych spacerach i reaktywnoĹ›ci.',
  },
  {
    id: 'szczeniak-gryzie',
    animal: 'Pies',
    title: 'Szczeniak gryzie i nie umie siÄ™ wyciszyÄ‡',
    summary: 'Na start przy gryzieniu, skakaniu i chaosie w domu.',
  },
  {
    id: 'pies-boi-sie',
    animal: 'Pies',
    title: 'Pies boi siÄ™ ludzi albo dĹşwiÄ™kĂłw',
    summary: 'Na pierwszy porzÄ…dek przy lÄ™ku i przeciÄ…ĹĽeniu.',
  },
  {
    id: 'kot-poza-kuweta-plan',
    animal: 'Kot',
    title: 'Kot sika poza kuwetÄ…',
    summary: 'Na pierwszy porzÄ…dek przy kuwecie i stresie.',
  },
  {
    id: 'kot-kuweta-wet-czy-behawior',
    animal: 'Kot',
    title: 'Kuweta: wet czy zachowanie',
    summary: 'Na szybkie odrĂłĹĽnienie alarmu od stresu.',
  },
  {
    id: 'konflikt-miedzy-kotami-pdf',
    animal: 'Kot',
    title: 'Konflikt miÄ™dzy kotami',
    summary: 'Na start przy napiÄ™ciu i gonitwach w domu.',
  },
  {
    id: 'kot-wycofany',
    animal: 'Kot',
    title: 'Kot lÄ™kowy albo wycofany',
    summary: 'Na prosty start przy chowaniu siÄ™ i napiÄ™ciu.',
  },
  {
    id: 'kot-przy-dotyku',
    animal: 'Kot',
    title: 'Kot przy trudnym dotyku i pielÄ™gnacji',
    summary: 'Na start przy pielÄ™gnacji i trudnym kontakcie.',
  },
]

export function getOfferBySlug(slug: string) {
  return OFFERS.find((offer) => offer.slug === slug) ?? null
}

export function getOfferDetailHref(offer: Pick<Offer, 'slug' | 'detailHref'>) {
  return offer.detailHref ?? '/cennik'
}

export function getOfferDetailCtaLabel(offer: Pick<Offer, 'detailCtaLabel'>) {
  return offer.detailCtaLabel ?? 'Zobacz szczegĂłĹ‚y'
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


