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
  '15-minutowa konsultacja behawioralna',
  'Dwa kwadranse',
  'Pełna konsultacja',
] as const

export const PUBLIC_OFFER_LEAD =
  `Masz do wyboru rozmowy: Kwadrans (${PUBLIC_OFFER_PRICE_LABELS.quick}), Kwadrans na już (${PUBLIC_OFFER_PRICE_LABELS.urgent}), Dwa kwadranse (${PUBLIC_OFFER_PRICE_LABELS.bridge}) albo Pełna konsultacja (${PUBLIC_OFFER_PRICE_LABELS.premium}). Wybierasz ten krok, który pasuje do sytuacji - bez presji na najdroższą opcję.`

export const PUBLIC_OFFER_DECISION_COPY = {
  quick:
    'Kwadrans to 15 min połączenia telefonicznego na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
  urgent:
    'Kwadrans na już ma ten sam zakres co Kwadrans, ale z priorytetową odpowiedzią i najbliższym realnym terminem telefonicznym. To wybór dla spraw pilnych, które nie wymagają dłuższej analizy.',
  bridge:
    'Dwa kwadranse to 30 min połączenia telefonicznego, gdy temat ma kilka wątków. Masz więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
  premium:
    'Pełna konsultacja to około 2h przez Jitsi dla spraw złożonych: analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.',
} as const

export const PUBLIC_OFFER_START_GUIDE = [
  'Najprostszy start to Kwadrans.',
  '15 minut to za mało? Wybierz Dwa kwadranse.',
  'Sytuacja trwa długo albo wpływa na życie domu? Sprawdź Pełną konsultację.',
] as const

export const PUBLIC_OFFER_PRIORITY_VARIANT_NOTE =
  `Jeśli zależy Ci na możliwie szybkim terminie, przy Kwadransie dostępny jest Kwadrans na już (${PUBLIC_OFFER_PRICE_LABELS.urgent}) - ten sam format, z priorytetową odpowiedzią i najbliższym realnym terminem telefonicznym.`

export const PUBLIC_OFFER_BOOKING_PRIORITY_PROMPT =
  'Potrzebujesz rozmowy szybciej? Kwadrans na już to ten sam 15-minutowy format telefoniczny, z priorytetową odpowiedzią i najbliższym realnym terminem.'

export const PUBLIC_OFFER_BOOKING_PRIORITY_NOTE =
  'Kwadrans na już ma identyczny zakres co zwykły Kwadrans. Różnica dotyczy priorytetu obsługi i terminu, nie długości ani treści rozmowy.'

export const PUBLIC_OFFER_BOOKING_LEAD =
  'Wybierasz zakres konsultacji, który pasuje do skali sytuacji. Kwadrans porządkuje jedno pytanie, Dwa kwadranse dają więcej czasu telefonicznie na kontekst, a Pełna konsultacja obejmuje około 2h przez Jitsi, plan działania i 14 dni komunikacji w pokoju klienta.'

export const PUBLIC_OFFER_BOOKING_REASSURANCE =
  'Nie musisz mieć gotowej nazwy tego, co się dzieje. Wystarczy krótki opis sytuacji i propozycja terminów. Analizę zachowania opieram na uzyskanych informacjach, a przy pełnej konsultacji dokładam prawdopodobną przyczynę problemu, plan działania i wsparcie wdrożenia.'

export const PUBLIC_OFFER_BOOKING_PROCESS = [
  '1. Wybierasz zakres konsultacji i wpisujesz krótki opis sytuacji.',
  '2. Wracam z potwierdzeniem terminu albo najbliższą sensowną alternatywą.',
  '3. Po potwierdzeniu dostajesz dalszy krok płatności i finalne potwierdzenie rozmowy.',
] as const

export const PUBLIC_OFFER_PAYMENT_METHODS = 'płatność online (Naffy) albo BLIK na telefon'

export const PUBLIC_OFFER_PAYMENT_EMAIL_STEP =
  'W mailu dostajesz link do płatności online (Naffy) lub instrukcję do przelewu BLIK na telefon.'

export const PUBLIC_OFFER_BOOKING_PAYMENT =
  `Najpierw uzgadniamy termin, dopiero potem wysyłam dane do płatności. Rezerwacje możesz opłacić przez ${PUBLIC_OFFER_PAYMENT_METHODS}. Po wpłacie wraca potwierdzenie i link do rozmowy.`

export const PUBLIC_OFFER_FULL_CONSULTATION_VALUE =
  'Pełna konsultacja nie jest dłuższą wersją Kwadransu. To osobny format dla sytuacji, które wymagają więcej czasu, szerszego tła i wsparcia po rozmowie. Obejmuje około 2h przez Jitsi, analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń.'

export const PUBLIC_OFFER_CANCELLATION_COPY =
  'Krótkie formaty mają 24 godziny na bezpłatną rezygnację po potwierdzeniu wpłaty. Zmianę terminu ustalamy w tym samym oknie. Pełna konsultacja ma osobny regulamin.'

export const PUBLIC_OFFER_PRICING_DECISION_COPY = [
  `Kwadrans za ${PUBLIC_OFFER_PRICE_LABELS.quick} to 15 min połączenia telefonicznego na jedno główne pytanie i pierwszy kierunek działania.`,
  `Dwa kwadranse za ${PUBLIC_OFFER_PRICE_LABELS.bridge} to 30 min połączenia telefonicznego na kilka wątków, spokojniejsze zalecenia i decyzję o kolejnym kroku.`,
  `Pełna konsultacja za ${PUBLIC_OFFER_PRICE_LABELS.premium} to około 2h przez Jitsi, analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.`,
] as const

export const PUBLIC_OFFER_FULL_VALUE_POINTS = [
  'Około 2h przez Jitsi (audio lub wideo)',
  'analiza zachowania i prawdopodobna przyczyna problemu',
  'plan działania po rozmowie',
  '14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń',
] as const
