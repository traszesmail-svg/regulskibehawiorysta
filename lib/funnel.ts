import { DEFAULT_PRICE_PLN, formatPricePln } from './pricing'
import type { ProblemOption } from './types'

export type FunnelSpecies = 'pies' | 'kot'
export type PublicBookingServiceType =
  | 'szybka-konsultacja-15-min'
  | 'kwadrans-na-juz'
  | 'konsultacja-30-min'
  | 'konsultacja-behawioralna-online'
export type LegacyBookingServiceType = 'konsultacja-30-min'
export type AnyBookingServiceType = PublicBookingServiceType | LegacyBookingServiceType

/** Public prices used by all customer-facing offer surfaces. */
export const PUBLIC_SERVICE_PRICE_AMOUNTS: Record<PublicBookingServiceType, number> = {
  'szybka-konsultacja-15-min': DEFAULT_PRICE_PLN,
  'kwadrans-na-juz': 104,
  'konsultacja-30-min': 174,
  'konsultacja-behawioralna-online': 475,
} as const

export const FUNNEL_CTA_LABELS = {
  primary: 'Umów spokojny pierwszy krok',
  bridge: 'Chcę spokojniej omówić temat',
  secondary: 'Zobacz materiały PDF',
  consultation: 'Chcę pełną konsultację',
  contact: 'Opisz krótko, co się dzieje',
} as const

export type FunnelServiceConfig = {
  id: AnyBookingServiceType
  isPublic: boolean
  title: string
  shortTitle: string
  durationMinutes: number
  durationLabel: string
  priceAmount: number
  pricePrefix: 'Od' | null
  mode: 'phone' | 'online'
  slotSpan: number
  slotSummary: string
  slotBadge: string
  roomSummary: string
  publicSummary: string
  bookingLead: string
  availabilityLabel: string
  noAvailabilityMessage: string
  limitedAvailabilityNote: string | null
}

export const FUNNEL_SERVICE_CONFIG: Record<AnyBookingServiceType, FunnelServiceConfig> = {
  'szybka-konsultacja-15-min': {
    id: 'szybka-konsultacja-15-min',
    isPublic: true,
    title: '15-minutowa konsultacja behawioralna',
    shortTitle: '15-minutowa konsultacja behawioralna',
    durationMinutes: 15,
    durationLabel: '15 min telefonicznie',
    priceAmount: PUBLIC_SERVICE_PRICE_AMOUNTS['szybka-konsultacja-15-min'],
    pricePrefix: null,
    mode: 'phone',
    slotSpan: 1,
    slotSummary: 'Kwadrans: 15 min połączenia telefonicznego na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    slotBadge: '15 min telefonicznie',
    roomSummary: 'Kwadrans: 15 min połączenia telefonicznego na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    publicSummary: '15 min połączenia telefonicznego na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
    bookingLead: 'Wybierz gatunek i temat. Potem zobaczysz dostępne terminy 15-minutowej konsultacji.',
    availabilityLabel: 'Terminy pokażą się po wyborze tematu.',
    noAvailabilityMessage: 'Jeśli dziś nie ma terminu, sprawdź później albo napisz wiadomość.',
    limitedAvailabilityNote: null,
  },
  'kwadrans-na-juz': {
    id: 'kwadrans-na-juz',
    isPublic: true,
    title: 'Kwadrans na już',
    shortTitle: 'Kwadrans na już',
    durationMinutes: 15,
    durationLabel: '15 min telefonicznie',
    priceAmount: PUBLIC_SERVICE_PRICE_AMOUNTS['kwadrans-na-juz'],
    pricePrefix: null,
    mode: 'phone',
    slotSpan: 1,
    slotSummary: 'Kwadrans na już: ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem telefonicznym. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    slotBadge: 'teraz / 15 min telefonicznie',
    roomSummary: 'Kwadrans na już: ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem telefonicznym. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    publicSummary: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem telefonicznym. Dla spraw pilnych, które nie wymagają dłuższej analizy.',
    bookingLead: 'Wybierz najbliższy pasujący termin. Slot blokuje się w formularzu, a rezerwacja jest pewna po potwierdzeniu płatności.',
    availabilityLabel: 'Terminy telefoniczne pokażą się po wyborze tematu.',
    noAvailabilityMessage: 'Jeśli w tej chwili nie mam wolnego okienka, pokażę Ci najbliższy wolny Kwadrans.',
    limitedAvailabilityNote: 'Priorytetowa odpowiedź i najbliższy realny termin w godzinach dyżuru.',
  },
  'konsultacja-30-min': {
    id: 'konsultacja-30-min',
    isPublic: true,
    title: 'Dwa kwadranse z behawiorystą',
    shortTitle: 'Dwa kwadranse',
    durationMinutes: 30,
    durationLabel: '30 min telefonicznie',
    priceAmount: PUBLIC_SERVICE_PRICE_AMOUNTS['konsultacja-30-min'],
    pricePrefix: null,
    mode: 'phone',
    slotSpan: 2,
    slotSummary: 'Dwa kwadranse: 30 min połączenia telefonicznego, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    slotBadge: '30 min telefonicznie',
    roomSummary: 'Dwa kwadranse: 30 min połączenia telefonicznego, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    publicSummary: '30 min połączenia telefonicznego, gdy temat ma kilka wątków. Więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
    bookingLead: 'Najpierw wybierz gatunek i temat. Potem zobaczysz dostępne terminy Dwóch kwadransów z behawiorystą.',
    availabilityLabel: 'Terminy pokażą się po wyborze tematu.',
    noAvailabilityMessage: 'Jeśli teraz nie ma terminu Dwóch kwadransów, wróć później albo napisz wiadomość.',
    limitedAvailabilityNote: null,
  },
  'konsultacja-behawioralna-online': {
    id: 'konsultacja-behawioralna-online',
    isPublic: true,
    title: 'Pełna konsultacja behawioralna',
    shortTitle: 'Pełna konsultacja',
    durationMinutes: 120,
    durationLabel: 'ok. 2h przez Jitsi',
    priceAmount: PUBLIC_SERVICE_PRICE_AMOUNTS['konsultacja-behawioralna-online'],
    pricePrefix: null,
    mode: 'online',
    slotSpan: 6,
    slotSummary: 'Pełna konsultacja: około 2h przez Jitsi, analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
    slotBadge: 'ok. 2h przez Jitsi',
    roomSummary: 'Pełna konsultacja: około 2h przez Jitsi, analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
    publicSummary:
      'Około 2h przez Jitsi dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
    bookingLead: 'Wybierz gatunek i temat. Potem zobaczysz najbliższe dostępne terminy pełnej konsultacji behawioralnej.',
    availabilityLabel: 'Najbliższe dostępne terminy pokażą się po wyborze tematu.',
    noAvailabilityMessage:
      'Jeśli teraz nie ma terminu pełnej konsultacji behawioralnej, wybierz Kwadrans, Dwa kwadranse albo napisz wiadomość.',
    limitedAvailabilityNote: 'Mniej terminów niż przy Kwadransie i Dwóch kwadransach.',
  },
}

export const PUBLIC_FUNNEL_SERVICE_ORDER: PublicBookingServiceType[] = [
  'szybka-konsultacja-15-min',
  'kwadrans-na-juz',
  'konsultacja-30-min',
  'konsultacja-behawioralna-online',
] as const

const MISC_PROBLEM_OPTION: ProblemOption = {
  id: 'inne',
  icon: 'compass',
  title: 'Inny temat',
  desc: 'Jeśli temat łączy kilka wątków albo nie pasuje dokładnie do powyższych kategorii.',
  marketingTitle: 'Inny temat',
  marketingDesc: 'Wybierz to, jeśli chcesz opisać temat po swojemu przed rozmową.',
  examples: ['temat szerszy', 'kilka problemów naraz', 'chcę opisać to po swojemu'],
  visualLabel: 'Temat szerszy',
}

export const PUBLIC_DOG_PROBLEM_OPTIONS: ProblemOption[] = [
  {
    id: 'szczeniak',
    icon: 'puppy',
    title: 'Szczeniak / młody pies',
    desc: 'Gryzienie, skakanie, pobudzenie i trudność z wyciszeniem.',
    marketingTitle: 'Szczeniak / młody pies',
    marketingDesc: 'Dobry start, gdy w domu zrobiło się za głośno i trudno wrócić do spokoju.',
    examples: ['szczeniak gryzie ręce', 'młody pies łapie za nogawki', 'młody pies nie umie odpuścić'],
    visualLabel: 'Szczeniak',
  },
  {
    id: 'spacer',
    icon: 'walking',
    title: 'Spacer i reaktywność',
    desc: 'Ciągnięcie, szczekanie, rzucanie się i trudne mijanki.',
    marketingTitle: 'Spacer i reaktywność',
    marketingDesc: 'Dla reaktywności spacerowej i trudnych spotkań z psami, ludźmi, ruchem albo bodźcami.',
    examples: ['pies ciągnie na smyczy', 'pies szczeka na mijane psy', 'pies rzuca się na rowery'],
    visualLabel: 'Spacer',
  },
  {
    id: 'separacja',
    icon: 'home',
    title: 'Separacja',
    desc: 'Wycie, niszczenie, napięcie przy wyjściu i trudność z zostawaniem samemu.',
    marketingTitle: 'Separacja',
    marketingDesc: 'Pomaga uporządkować, co jest napięciem, co rutyną, a co wygląda już jak problem separacyjny.',
    examples: ['pies szczeka, gdy zostaje sam', 'pies drapie drzwi po wyjściu', 'nie mogę wyjść bez stresu psa'],
    visualLabel: 'Separacja',
  },
  {
    id: 'pobudzenie',
    icon: 'spark',
    title: 'Pobudzenie / wyciszenie',
    desc: 'Nakręcanie się, pogoń za ruchem i trudność z wyhamowaniem.',
    marketingTitle: 'Pobudzenie / wyciszenie',
    marketingDesc: 'Dobry wybór, gdy problemem jest pobudzenie, frustracja albo brak spokojnego wyhamowania.',
    examples: ['pies demoluje dom z pobudzenia', 'pies goni wszystko', 'pies nie umie wyhamować'],
    visualLabel: 'Wyciszenie',
  },
  {
    id: 'agresja',
    icon: 'shield',
    title: 'Agresja / zasoby',
    desc: 'Warknięcia, obrona jedzenia, legowiska, zabawek albo przestrzeni.',
    marketingTitle: 'Agresja / zasoby',
    marketingDesc: 'Kategoria dla reakcji obronnych i ochrony zasobów, gdy trzeba odróżnić napięcie od samego zachowania.',
    examples: ['pies warczy przy misce', 'pies broni kanapy', 'pies reaguje obronnie przy dotyku'],
    visualLabel: 'Zasoby',
  },
  MISC_PROBLEM_OPTION,
] as const

export const PUBLIC_CAT_PROBLEM_OPTIONS: ProblemOption[] = [
  {
    id: 'kot-kuweta',
    icon: 'cat',
    title: 'Kuweta',
    desc: 'Sikanie poza kuwetą, omijanie kuwety albo napięcie wokół toalety.',
    marketingTitle: 'Kuweta',
    marketingDesc: 'Najczęstszy start przy kuwecie: omijanie, napięcie przy zasobach albo nagła zmiana nawyku.',
    examples: ['kot sika poza kuwetą', 'kot omija kuwetę', 'nagła zmiana korzystania z kuwety'],
    visualLabel: 'Kuweta',
  },
  {
    id: 'kot-wycofanie',
    icon: 'cat',
    title: 'Wycofanie / napięcie',
    desc: 'Chowanie się, czujność i trudność z powrotem do spokoju.',
    marketingTitle: 'Wycofanie / napięcie',
    marketingDesc: 'Dla kota, który dużo się chowa, żyje w napięciu albo po zmianie nie wraca do codziennej równowagi.',
    examples: ['kot chowa się cały dzień', 'kot jest bardzo czujny', 'kot po zmianie nie wraca do równowagi'],
    visualLabel: 'Napięcie',
  },
  {
    id: 'kot-konflikt',
    icon: 'cat',
    title: 'Konflikt między kotami',
    desc: 'Gonitwy, blokowanie przejść, napięcie przy zasobach i trudna relacja.',
    marketingTitle: 'Konflikt między kotami',
    marketingDesc: 'Dla napięcia między kotami, blokowania przejść, gonitw i rozjazdu relacji w domu.',
    examples: ['kot atakuje drugiego kota', 'gonitwy po domu', 'blokowanie kuwety lub miski'],
    visualLabel: 'Konflikt',
  },
  {
    id: 'kot-zmiany-w-domu',
    icon: 'cat',
    title: 'Zmiany w domu',
    desc: 'Napięcie po przeprowadzce, nowym domowniku albo zmianie codziennego rytmu.',
    marketingTitle: 'Zmiany w domu',
    marketingDesc: 'Dla sytuacji, w których po zmianach w domu wyraźnie rozsypał się codzienny spokój kota.',
    examples: ['kot źle znosi przeprowadzkę', 'po nowym domowniku kot się wycofał', 'zmiana domu nasiliła napięcie'],
    visualLabel: 'Zmiany',
  },
  {
    id: 'kot-wokalizacja',
    icon: 'cat',
    title: 'Wokalizacja / pobudzenie',
    desc: 'Miauczenie, nocne pobudki i trudność z wyciszeniem w domu.',
    marketingTitle: 'Wokalizacja / pobudzenie',
    marketingDesc: 'Dla wokalizacji, pobudzenia i rytmu dnia, który rozsypuje spokój w domu.',
    examples: ['kot miauczy po nocy', 'kot budzi dom o świcie', 'kot mocno się nakręca'],
    visualLabel: 'Wokalizacja',
  },
  MISC_PROBLEM_OPTION,
] as const

export const PUBLIC_PROBLEM_OPTIONS_BY_SPECIES: Record<FunnelSpecies, ProblemOption[]> = {
  pies: [...PUBLIC_DOG_PROBLEM_OPTIONS],
  kot: [...PUBLIC_CAT_PROBLEM_OPTIONS],
}

export function getFunnelServiceConfig(serviceType: AnyBookingServiceType) {
  return FUNNEL_SERVICE_CONFIG[serviceType]
}

export function getPublicServicePriceAmount(serviceType: PublicBookingServiceType, quickConsultationPrice = DEFAULT_PRICE_PLN) {
  return serviceType === 'szybka-konsultacja-15-min' ? quickConsultationPrice : FUNNEL_SERVICE_CONFIG[serviceType].priceAmount
}

export function getPublicServicePriceLabel(serviceType: PublicBookingServiceType, quickConsultationPrice = DEFAULT_PRICE_PLN) {
  return formatPricePln(getPublicServicePriceAmount(serviceType, quickConsultationPrice))
}

export function getProblemOptionsForSpecies(species: FunnelSpecies) {
  return PUBLIC_PROBLEM_OPTIONS_BY_SPECIES[species]
}

export function getPublicProblemOptionById(species: FunnelSpecies, topicId: string | null | undefined) {
  if (!topicId) {
    return null
  }

  return getProblemOptionsForSpecies(species).find((option) => option.id === topicId) ?? null
}
