import { PUBLIC_SERVICE_PRICE_AMOUNTS } from './funnel'
import { formatPricePln } from './pricing'

export const PUBLIC_OFFER_PRICES = {
  quick: PUBLIC_SERVICE_PRICE_AMOUNTS['szybka-konsultacja-15-min'],
  urgent: PUBLIC_SERVICE_PRICE_AMOUNTS['kwadrans-na-juz'],
  bridge: PUBLIC_SERVICE_PRICE_AMOUNTS['konsultacja-30-min'],
  premium: PUBLIC_SERVICE_PRICE_AMOUNTS['konsultacja-behawioralna-online'],
} as const

export const PUBLIC_OFFER_PRICE_LABELS = {
  quick: formatPricePln(PUBLIC_OFFER_PRICES.quick),
  urgent: formatPricePln(PUBLIC_OFFER_PRICES.urgent),
  bridge: formatPricePln(PUBLIC_OFFER_PRICES.bridge),
  premium: formatPricePln(PUBLIC_OFFER_PRICES.premium),
} as const

export const PUBLIC_OFFER_SERVICE_ORDER = [
  'Zapytaj behawiorystę',
  'Zapytaj teraz',
  'Pełna konsultacja',
] as const

export const PUBLIC_OFFER_LEAD =
  `Zaczynasz od prostego wyboru: Zapytaj behawiorystę (${PUBLIC_OFFER_PRICE_LABELS.quick}) w wybranym terminie albo Zapytaj teraz (${PUBLIC_OFFER_PRICE_LABELS.urgent}), gdy akurat jestem dostępny. Pełna konsultacja (${PUBLIC_OFFER_PRICE_LABELS.premium}) jest osobnym, kolejnym etapem dla osób, którym ją zarekomenduję.`

export const PUBLIC_OFFER_DECISION_COPY = {
  quick:
    'Zapytaj behawiorystę to rozmowa telefoniczna do 15 minut. Opowiadasz, co się dzieje, a dostajesz pierwszy kierunek i dwa pytania po rozmowie.',
  urgent:
    'Zapytaj teraz ma ten sam zakres co zwykłe Zapytaj behawiorystę, ale odbywa się w najbliższym dostępnym oknie. Opcja pojawia się tylko wtedy, gdy ręcznie włączę dostępność.',
  bridge:
    'Ten starszy wariant nie jest obecnie częścią oferty publicznej. Jego identyfikator pozostaje w systemie wyłącznie dla zgodności technicznej.',
  premium:
    'Pełna konsultacja to około 90 minut przez Jitsi dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń. Termin otrzymujesz indywidualnie po pierwszym kroku.',
} as const

export const PUBLIC_OFFER_START_GUIDE = [
  'Nie musisz znać nazwy problemu — zacznij od Zapytaj behawiorystę.',
  'Jeśli akurat jestem dostępny, możesz wybrać Zapytaj teraz.',
  'Jeśli po rozmowie okaże się, że potrzebny jest szerszy proces, otrzymasz dostęp do Pełnej konsultacji.',
] as const

export const PUBLIC_OFFER_PRIORITY_VARIANT_NOTE =
  `Jeśli akurat mam włączoną dostępność, możesz wybrać Zapytaj teraz (${PUBLIC_OFFER_PRICE_LABELS.urgent}) i wejść w najbliższe wolne okno. Gdy opcji nie ma, możesz zostawić kontakt do powiadomienia.`

export const PUBLIC_OFFER_BOOKING_PRIORITY_PROMPT =
  'Potrzebujesz rozmowy szybciej? Jeśli jestem dostępny, Zapytaj teraz pozwoli wejść w najbliższe wolne okno telefoniczne.'

export const PUBLIC_OFFER_BOOKING_PRIORITY_NOTE =
  'Zapytaj teraz ma ten sam zakres co Zapytaj behawiorystę. Różnica dotyczy dostępności i momentu rozmowy, nie obietnicy dłuższej analizy.'

export const PUBLIC_OFFER_BOOKING_LEAD =
  'Wybierasz sposób pierwszego kontaktu: zwykły termin Zapytaj behawiorystę za 79 zł albo Zapytaj teraz za 104 zł, gdy widzisz tę opcję. Pełna konsultacja za 475 zł pojawia się jako kolejny krok dopiero po rekomendacji.'

export const PUBLIC_OFFER_BOOKING_REASSURANCE =
  'Nie musisz mieć gotowej nazwy tego, co się dzieje. Wystarczy krótki opis sytuacji i propozycja terminów. Analizę zachowania opieram na uzyskanych informacjach, a przy pełnej konsultacji dokładam prawdopodobną przyczynę problemu, plan działania i wsparcie wdrożenia.'

export const PUBLIC_OFFER_BOOKING_PROCESS = [
  '1. Wybierasz Zapytaj behawiorystę w terminie albo Zapytaj teraz, jeśli opcja jest dostępna, i wpisujesz krótki opis sytuacji.',
  '2. Wybrany termin jest wstępnie blokowany na 5 minut, żeby nie doszło do podwójnej rezerwacji.',
  '3. Opłacasz ręcznie BLIK-iem na telefon. Potwierdzam albo odrzucam wpłatę maksymalnie w ciągu 24 godzin, a potem dostajesz link i instrukcję.',
] as const

export const PUBLIC_OFFER_PAYMENT_METHODS = 'ręczny BLIK na telefon'

export const PUBLIC_OFFER_PAYMENT_EMAIL_STEP =
  'W mailu dostajesz instrukcję ręcznej wpłaty BLIK na telefon oraz numer rezerwacji.'

export const PUBLIC_OFFER_BOOKING_PAYMENT =
  `Najpierw wybierasz termin, a system blokuje go na 5 minut. Następnie otrzymujesz instrukcję ${PUBLIC_OFFER_PAYMENT_METHODS}. Po ręcznym potwierdzeniu wpłaty, maksymalnie w ciągu 24 godzin, dostajesz potwierdzenie i link do rozmowy.`

export const PUBLIC_OFFER_FULL_CONSULTATION_VALUE =
  'Pełna konsultacja nie jest po prostu dłuższą rozmową. To osobny proces dla sytuacji, które wymagają więcej czasu, szerszego tła i wsparcia po rozmowie. Obejmuje około 90 minut przez Jitsi, analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń. Dostęp do terminu otrzymujesz indywidualnie po pierwszym kroku.'

export const PUBLIC_OFFER_CANCELLATION_COPY =
  'Krótkie formaty mają 24 godziny na bezpłatną rezygnację po potwierdzeniu wpłaty. Zmianę terminu ustalamy w tym samym oknie. Pełna konsultacja ma osobny regulamin.'

export const PUBLIC_OFFER_PRICING_DECISION_COPY = [
  `Zapytaj behawiorystę za ${PUBLIC_OFFER_PRICE_LABELS.quick} to rozmowa telefoniczna do 15 minut, pierwszy kierunek działania i dwa pytania po rozmowie.`,
  `Zapytaj teraz za ${PUBLIC_OFFER_PRICE_LABELS.urgent} to ten sam zakres w najbliższym dostępnym oknie, gdy ręcznie włączę dostępność.`,
  `Pełna konsultacja za ${PUBLIC_OFFER_PRICE_LABELS.premium} to około 90 minut przez Jitsi, analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.`,
] as const

export const PUBLIC_OFFER_FULL_VALUE_POINTS = [
  'Około 90 minut przez Jitsi (audio lub wideo)',
  'analiza zachowania i prawdopodobna przyczyna problemu',
  'plan działania po rozmowie',
  '14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń',
] as const
