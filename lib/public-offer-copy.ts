export const PUBLIC_OFFER_PRICES = {
  quick: 69,
  urgent: 99,
  bridge: 169,
  premium: 470,
} as const

export const PUBLIC_OFFER_SERVICE_ORDER = [
  '15-minutowa konsultacja behawioralna',
  'Dwa kwadranse',
  'PeĹ‚na konsultacja',
] as const

export const PUBLIC_OFFER_LEAD =
  'Masz do wyboru rozmowy w czterech cenach: Kwadrans (15 min, 69 zĹ‚), Kwadrans na juĹĽ (99 zĹ‚), Dwa kwadranse (30 min, 169 zĹ‚) albo PeĹ‚na konsultacja (470 zĹ‚). Wybierasz ten krok, ktĂłry pasuje do sytuacji - bez presji na najdroĹĽszÄ… opcjÄ™.'

export const PUBLIC_OFFER_DECISION_COPY = {
  quick:
    'Kwadrans to 15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie. Szybko porzÄ…dkujesz sytuacjÄ™ i dostajesz pierwszy kierunek dziaĹ‚ania.',
  urgent:
    'Kwadrans na juĹĽ ma ten sam zakres co Kwadrans, ale z priorytetowÄ… odpowiedziÄ… i najbliĹĽszym realnym terminem. To wybĂłr dla spraw pilnych, ktĂłre nie wymagajÄ… dĹ‚uĹĽszej analizy.',
  bridge:
    'Dwa kwadranse to 30 min online, gdy temat ma kilka wÄ…tkĂłw. Masz wiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.',
  premium:
    'PeĹ‚na konsultacja to okoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.',
} as const

export const PUBLIC_OFFER_START_GUIDE = [
  'Najprostszy start to Kwadrans.',
  '15 minut to za maĹ‚o? Wybierz Dwa kwadranse.',
  'Sytuacja trwa dĹ‚ugo albo wpĹ‚ywa na ĹĽycie domu? SprawdĹş PeĹ‚nÄ… konsultacjÄ™.',
] as const

export const PUBLIC_OFFER_PRIORITY_VARIANT_NOTE =
  'JeĹ›li zaleĹĽy Ci na moĹĽliwie szybkim terminie, przy Kwadransie dostÄ™pny jest Kwadrans na juĹĽ (99 zĹ‚) - ten sam format, z priorytetowÄ… odpowiedziÄ… i najbliĹĽszym realnym terminem.'

export const PUBLIC_OFFER_BOOKING_PRIORITY_PROMPT =
  'Potrzebujesz rozmowy szybciej? Kwadrans na juĹĽ to ten sam 15-minutowy format audio, z priorytetowÄ… odpowiedziÄ… i najbliĹĽszym realnym terminem.'

export const PUBLIC_OFFER_BOOKING_PRIORITY_NOTE =
  'Kwadrans na juĹĽ ma identyczny zakres co zwykĹ‚y Kwadrans. RĂłĹĽnica dotyczy priorytetu obsĹ‚ugi i terminu, nie dĹ‚ugoĹ›ci ani treĹ›ci rozmowy.'

export const PUBLIC_OFFER_BOOKING_LEAD =
  'Wybierasz zakres konsultacji, ktĂłry pasuje do skali sytuacji. Kwadrans porzÄ…dkuje jedno pytanie, Dwa kwadranse dajÄ… wiÄ™cej czasu na kontekst, a PeĹ‚na konsultacja obejmuje okoĹ‚o 2h online, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.'

export const PUBLIC_OFFER_BOOKING_REASSURANCE =
  'Nie musisz mieÄ‡ gotowej nazwy tego, co siÄ™ dzieje. Wystarczy krĂłtki opis sytuacji i propozycja terminĂłw. AnalizÄ™ zachowania opieram na uzyskanych informacjach, a przy peĹ‚nej konsultacji dokĹ‚adam prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i wsparcie wdroĹĽenia.'

export const PUBLIC_OFFER_BOOKING_PROCESS = [
  '1. Wybierasz zakres konsultacji i wpisujesz krĂłtki opis sytuacji.',
  '2. Wracam z potwierdzeniem terminu albo najbliĹĽszÄ… sensownÄ… alternatywÄ….',
  '3. Po potwierdzeniu dostajesz dalszy krok pĹ‚atnoĹ›ci i finalne potwierdzenie rozmowy.',
] as const

export const PUBLIC_OFFER_PAYMENT_METHODS = 'pĹ‚atnoĹ›Ä‡ online (Naffy) albo BLIK na telefon'

export const PUBLIC_OFFER_PAYMENT_EMAIL_STEP =
  'W mailu dostajesz link do pĹ‚atnoĹ›ci online (Naffy) lub instrukcjÄ™ do przelewu BLIK na telefon.'

export const PUBLIC_OFFER_BOOKING_PAYMENT =
  `Najpierw uzgadniamy termin, dopiero potem wysyĹ‚am dane do pĹ‚atnoĹ›ci. Rezerwacje moĹĽesz opĹ‚aciÄ‡ przez ${PUBLIC_OFFER_PAYMENT_METHODS}. Po wpĹ‚acie wraca potwierdzenie i link do rozmowy.`

export const PUBLIC_OFFER_FULL_CONSULTATION_VALUE =
  'PeĹ‚na konsultacja nie jest dĹ‚uĹĽszÄ… wersjÄ… Kwadransu. To osobny format dla sytuacji, ktĂłre wymagajÄ… wiÄ™cej czasu, szerszego tĹ‚a i wsparcia po rozmowie. Obejmuje okoĹ‚o 2h online, analizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„.'

export const PUBLIC_OFFER_CANCELLATION_COPY =
  'KrĂłtkie formaty majÄ… 24 godziny na bezpĹ‚atnÄ… rezygnacjÄ™ po potwierdzeniu wpĹ‚aty. ZmianÄ™ terminu ustalamy w tym samym oknie. PeĹ‚na konsultacja ma osobny regulamin.'

export const PUBLIC_OFFER_PRICING_DECISION_COPY = [
  'Kwadrans za 69 zĹ‚ to 15 min audio bez kamery na jedno gĹ‚Ăłwne pytanie i pierwszy kierunek dziaĹ‚ania.',
  'Dwa kwadranse za 169 zĹ‚ to 30 min online na kilka wÄ…tkĂłw, spokojniejsze zalecenia i decyzjÄ™ o kolejnym kroku.',
  'PeĹ‚na konsultacja za 470 zĹ‚ to okoĹ‚o 2h online, analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
] as const

export const PUBLIC_OFFER_FULL_VALUE_POINTS = [
  'OkoĹ‚o 2h online audio albo audio/video',
  'analiza zachowania i prawdopodobna przyczyna problemu',
  'plan dziaĹ‚ania po rozmowie',
  '14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„',
] as const

