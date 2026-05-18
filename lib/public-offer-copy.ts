export const PUBLIC_OFFER_PRICES = {
  quick: 69,
  urgent: 99,
  bridge: 169,
  premium: 470,
} as const

export const PUBLIC_OFFER_SERVICE_ORDER = [
  '15-minutowa konsultacja behawioralna',
  'Dwa kwadranse',
  'Pełna konsultacja',
] as const

export const PUBLIC_OFFER_LEAD =
  'Masz do wyboru rozmowy w czterech cenach: Kwadrans (15 min, 69 zł), Kwadrans na już (99 zł), Dwa kwadranse (30 min, 169 zł) albo Pełna konsultacja (470 zł). Wybierasz ten krok, który pasuje do sytuacji - bez presji na najdroższą opcję.'

export const PUBLIC_OFFER_DECISION_COPY = {
  quick:
    'Kwadrans to 15 min audio bez kamery na jedno główne pytanie. Szybko porządkujesz sytuację i dostajesz pierwszy kierunek działania.',
  urgent:
    'Kwadrans na już ma ten sam zakres co Kwadrans, ale z najbliższym możliwym terminem. To wybór dla spraw pilnych, które nie wymagają dłuższej analizy.',
  bridge:
    'Dwa kwadranse to 30 min online, gdy temat ma kilka wątków. Masz więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.',
  premium:
    'Pełna konsultacja to około 2h online dla spraw złożonych: diagnoza, prawdopodobna przyczyna problemu, plan działania i 7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń.',
} as const

export const PUBLIC_OFFER_START_GUIDE = [
  'Najprostszy start to Kwadrans.',
  '15 minut to za mało? Wybierz Dwa kwadranse.',
  'Sytuacja trwa długo albo wpływa na życie domu? Sprawdź Pełną konsultację.',
] as const

export const PUBLIC_OFFER_PRIORITY_VARIANT_NOTE =
  'Jeśli zależy Ci na możliwie szybkim terminie, przy Kwadransie dostępny jest Kwadrans na już (99 zł) - ten sam format, termin potwierdzany do 15 minut.'

export const PUBLIC_OFFER_BOOKING_PRIORITY_PROMPT =
  'Potrzebujesz rozmowy szybciej? Kwadrans na już to ten sam 15-minutowy format audio, z terminem potwierdzanym do 15 minut od wpłaty.'

export const PUBLIC_OFFER_BOOKING_PRIORITY_NOTE =
  'Kwadrans na już ma identyczny zakres co zwykły Kwadrans. Różnica dotyczy tylko szybkości potwierdzenia terminu, nie długości ani treści rozmowy.'

export const PUBLIC_OFFER_BOOKING_LEAD =
  'Wybierasz zakres konsultacji, który pasuje do skali sytuacji. Kwadrans porządkuje jedno pytanie, Dwa kwadranse dają więcej czasu na kontekst, a Pełna konsultacja obejmuje około 2h online, plan działania i 7 dni wsparcia przez WhatsApp.'

export const PUBLIC_OFFER_BOOKING_REASSURANCE =
  'Nie musisz mieć gotowej nazwy tego, co się dzieje. Wystarczy krótki opis sytuacji i propozycja terminów. Diagnozę tworzę na podstawie uzyskanych informacji, a przy pełnej konsultacji dokładam prawdopodobną przyczynę problemu, plan działania i wsparcie wdrożenia.'

export const PUBLIC_OFFER_BOOKING_PROCESS = [
  '1. Wybierasz zakres konsultacji i wpisujesz krótki opis sytuacji.',
  '2. Wracam z potwierdzeniem terminu albo najbliższą sensowną alternatywą.',
  '3. Po potwierdzeniu dostajesz dalszy krok płatności i finalne potwierdzenie rozmowy.',
] as const

export const PUBLIC_OFFER_PAYMENT_METHODS = 'PayPal albo BLIK na telefon'

export const PUBLIC_OFFER_PAYMENT_EMAIL_STEP =
  'W mailu dostajesz przycisk do PayPal albo instrukcję BLIK na telefon.'

export const PUBLIC_OFFER_BOOKING_PAYMENT =
  `Najpierw uzgadniamy termin, dopiero potem wysyłam dane do płatności. Rezerwacje możesz opłacić przez ${PUBLIC_OFFER_PAYMENT_METHODS}. Po wpłacie wraca potwierdzenie i link do rozmowy.`

export const PUBLIC_OFFER_FULL_CONSULTATION_VALUE =
  'Pełna konsultacja nie jest dłuższą wersją Kwadransu. To osobny format dla sytuacji, które wymagają więcej czasu, szerszego tła i wsparcia po rozmowie. Obejmuje około 2h online, diagnozę, prawdopodobną przyczynę problemu, plan działania i 7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń.'

export const PUBLIC_OFFER_CANCELLATION_COPY =
  'Krótkie formaty mają 24 godziny na bezpłatną rezygnację po potwierdzeniu wpłaty. Zmianę terminu ustalamy w tym samym oknie. Pełna konsultacja ma osobny regulamin.'

export const PUBLIC_OFFER_PRICING_DECISION_COPY = [
  'Kwadrans za 69 zł to 15 min audio bez kamery na jedno główne pytanie i pierwszy kierunek działania.',
  'Dwa kwadranse za 169 zł to 30 min online na kilka wątków, spokojniejsze zalecenia i decyzję o kolejnym kroku.',
  'Pełna konsultacja za 470 zł to około 2h online, diagnoza, prawdopodobna przyczyna problemu, plan działania i 7 dni wsparcia przez WhatsApp.',
] as const

export const PUBLIC_OFFER_FULL_VALUE_POINTS = [
  'Około 2h online audio albo audio/video',
  'diagnoza i prawdopodobna przyczyna problemu',
  'plan działania po rozmowie',
  '7 dni wsparcia przez WhatsApp przy wdrażaniu zaleceń',
] as const
