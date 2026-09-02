export type OpinionService =
  | 'Zapytaj behawiorystę — 15 min'
  | 'Pełna konsultacja'
  | 'Dwa kwadranse (archiwalna usługa)'
  | 'Konsultacja behawioralna'

export type OpinionReview = {
  name: string
  service: OpinionService
  topic: string
  text: string
  avatar?: string | null
  photoApproved?: boolean
  categories: string[]
}

export function getOpinionServiceLabel(service: OpinionService): string {
  if (service === 'Dwa kwadranse (archiwalna usługa)') {
    return 'Rozmowa wcześniejszego formatu'
  }

  if (service === 'Konsultacja behawioralna') {
    return 'Pełna konsultacja'
  }

  return service.replace(' — 15 min', ' — do 15 min')
}

export function isPublicOpinionReview(review: OpinionReview) {
  return review.service !== 'Dwa kwadranse (archiwalna usługa)'
}

export const opinionReviews: OpinionReview[] = [
  {
    name: 'Opiekunka psa',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Reakcje na spacerze',
    text:
      'Przed rozmową wszystko nam się mieszało: spacer, szczekanie i emocje. Po rozmowie wiedzieliśmy, od czego zacząć i czego na razie nie dokładać.',
    avatar: '/branding/topic-cards/dog-forest-calm.jpg',
    categories: ['Pies', 'Konsultacje online', 'Sytuacja na spacerze'],
  },
  {
    name: 'Opiekunka psa',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Praca w domu',
    text:
      'Najbardziej pomogło mi to, że nikt mnie nie oceniał. Zamiast listy zakazów dostałam prosty plan, który mogliśmy sprawdzić w domu.',
    avatar: '/branding/topic-cards/french-bulldog-leash.jpg',
    categories: ['Pies', 'Praca w domu', 'Konsultacje online'],
  },
  {
    name: 'Opiekunowie kota',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Kuweta i napięcie',
    text:
      'Myśleliśmy, że kotka robi to „na złość”. Po rozmowie łatwiej było zobaczyć, że znaczenie mogą mieć napięcie i środowisko. Dostaliśmy kolejność rzeczy do sprawdzenia.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Kuweta i napięcie'],
  },
  {
    name: 'Kasia i Mruczek',
    service: 'Pełna konsultacja',
    topic: 'Wsparcie kota w trudnych sytuacjach',
    text:
      'Po spotkaniach łatwiej było mi wspierać kota w trudnych sytuacjach. W domu zrobiło się spokojniej, a ja lepiej rozumiałam, na co zwracać uwagę.',
    avatar: '/images/homepage/home-bg-cat-1to1.webp',
    categories: ['Kot', 'Konsultacje online'],
  },
  {
    name: 'Paweł i Nala',
    service: 'Konsultacja behawioralna',
    topic: 'Agresja wobec psów',
    text:
      'Dostałem spokojne i konkretne wyjaśnienie. Najbardziej doceniłem indywidualne podejście i to, że rozmowa nie sprowadzała się do jednej gotowej metody.',
    avatar: '/branding/topic-cards/dog-checkup.jpg',
    categories: ['Pies', 'Agresja', 'Problemy behawioralne'],
  },
  {
    name: 'Agnieszka i Mija',
    service: 'Konsultacja behawioralna',
    topic: 'Problemy z kuwetą',
    text:
      'Wreszcie mogliśmy spokojnie przyjrzeć się problemom z kuwetą. Dostaliśmy rzeczy do sprawdzenia po kolei, zamiast kolejnej przypadkowej porady.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Anna i Mia',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Obserwacja zachowania kota',
    text:
      'Po rozmowie przestaliśmy zgadywać. Dostaliśmy analizę opartą na informacjach, pierwsze kroki i spokojny plan obserwacji kota.',
    avatar: '/branding/case-cat-sofa.jpg',
    categories: ['Kot', 'Konsultacje online', 'Problemy behawioralne'],
  },
  {
    name: 'Karolina i Niko',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Pierwszy krok po krótkiej rozmowie',
    text:
      'W 15 minut udało się nazwać sytuację i oddzielić to, co pilne, od tego, co można jeszcze obserwować. Wyszliśmy z konkretnym pierwszym krokiem.',
    avatar: '/images/homepage/home-bg-dog-1to1.webp',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Łukasz i Figa',
    service: 'Pełna konsultacja',
    topic: 'Praca z lękiem',
    text:
      'Najbardziej pomogło mi wyjaśnienie, co może podtrzymywać lęk. Dostaliśmy prostszy plan pracy, który mogliśmy dopasować do naszego rytmu dnia.',
    avatar: '/branding/topic-cards/dog-window-alone.jpg',
    categories: ['Pies', 'Praca z lękiem', 'Problemy behawioralne'],
  },
  {
    name: 'Natalia i Tosia',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Problemy behawioralne',
    text:
      'Nie było oceniania ani straszenia. Były pytania, uporządkowanie sytuacji i konkret: co możemy zmienić dziś, a co sprawdzać później.',
    avatar: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    categories: ['Kot', 'Problemy behawioralne', 'Praca z lękiem'],
  },
  {
    name: 'Michał i Roki',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Spacer i reaktywność',
    text:
      'Pierwszy raz ktoś uporządkował nam temat spacerów bez kolejnej „magicznej” metody. Zaczęliśmy zwracać uwagę na moment, w którym pies jeszcze może się wycofać.',
    avatar: '/branding/topic-cards/french-bulldog-leash.jpg',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Ewa i Karmel',
    service: 'Pełna konsultacja',
    topic: 'Plan pracy z zachowaniem',
    text:
      'Dostaliśmy spokojne wyjaśnienie, co może mieć związek z zachowaniem, i plan pracy bez presji. To dało nam lepszy punkt wyjścia.',
    avatar: '/branding/topic-cards/dog-resting-home.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Patrycja i Mela',
    service: 'Pełna konsultacja',
    topic: 'Konflikt między kotami',
    text:
      'Zamiast czekać, aż koty same się dogadają, zaczęliśmy od przestrzeni i zasobów. Łatwiej było nam też zauważać moment, w którym napięcie rośnie.',
    avatar: '/branding/topic-cards/cats/cat-intercat-conflict.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Grzegorz i Sara',
    service: 'Konsultacja behawioralna',
    topic: 'Pobudzenie szczeniaka',
    text:
      'Konsultacja pomogła nam lepiej zrozumieć pobudzenie szczeniaka. Po kilku zmianach w rytmie dnia łatwiej było nam zaplanować spokojniejsze sytuacje.',
    avatar: '/images/cutover/dog-puppy-home.png',
    categories: ['Pies', 'Szczenięta / Kocięta'],
  },
  {
    name: 'Magda i Leon',
    service: 'Pełna konsultacja',
    topic: 'Dłuższy problem behawioralny',
    text:
      'Przy dłuższej sytuacji potrzebowaliśmy szerszej analizy. Dostaliśmy możliwe tło problemu i plan pracy rozłożony na kolejne kroki.',
    avatar: '/branding/specialist-cat-support.jpg',
    categories: ['Kot', 'Konsultacje online', 'Problemy behawioralne'],
  },
  {
    name: 'Robert i Abi',
    service: 'Konsultacja behawioralna',
    topic: 'Agresja i zasoby',
    text:
      'Przy trudnym temacie najbardziej doceniłem spokojne podejście. Najpierw omówiliśmy bezpieczeństwo i możliwe przyczyny, dopiero potem pierwsze ćwiczenia.',
    avatar: '/branding/topic-cards/dog-checkup.jpg',
    categories: ['Pies', 'Agresja', 'Problemy behawioralne'],
  },
  {
    name: 'Iza i Frida',
    service: 'Pełna konsultacja',
    topic: 'Rytm dnia i zachowanie',
    text:
      'Dzięki pytaniom Krzysztofa zobaczyliśmy, że temat nie dotyczy jednego zachowania, tylko całego układu dnia. To pomogło nam uporządkować, co obserwować.',
    avatar: '/branding/case-dog-home.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Ola i Kropka',
    service: 'Konsultacja behawioralna',
    topic: 'Kuweta',
    text:
      'W końcu mieliśmy kolejność sprawdzania: zdrowie, kuweta, zasoby i stres. Przestaliśmy zmieniać wszystko naraz.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Tomasz i Maja',
    service: 'Pełna konsultacja',
    topic: 'Praca z lękiem',
    text:
      'Najważniejsze było dla nas tempo. Plan nie wymagał forsowania kontaktu, tylko dawał bezpieczne warunki i sygnały, które warto obserwować.',
    avatar: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    categories: ['Kot', 'Praca z lękiem'],
  },
  {
    name: 'Beata i Hugo',
    service: 'Dwa kwadranse (archiwalna usługa)',
    topic: 'Kontekst spaceru',
    text:
      'Te 30 minut dało nam miejsce na kontekst. Po rozmowie wiedzieliśmy, co jest pierwszym priorytetem i czego na razie nie dokładać psu.',
    avatar: '/branding/case-studies/German_Shepherd.jpg',
    categories: ['Pies', 'Konsultacje online', 'Problemy behawioralne'],
  },
  {
    name: 'Marta i Pixel',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Szczekanie w domu',
    text:
      'Po rozmowie przestaliśmy reagować chaotycznie na każde szczeknięcie. Dostaliśmy prostą kolejność: obserwacja, bodźce, odpoczynek i dopiero potem ćwiczenia.',
    avatar: '/branding/topic-cards/dog-resting-home.jpg',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Joanna i Tobi',
    service: 'Pełna konsultacja',
    topic: 'Samotność psa',
    text:
      'Najbardziej pomogło rozpisanie małych kroków. Wiedzieliśmy, jak nagrywać psa i kiedy nie wydłużać wyjść na siłę.',
    avatar: '/branding/topic-cards/dog-window-alone.jpg',
    categories: ['Pies', 'Praca z lękiem'],
  },
  {
    name: 'Kamil i Luna',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Reaktywność na spacerze',
    text:
      'Zamiast walczyć ze spacerem, zaczęliśmy rozpoznawać moment, w którym pies jeszcze może się uczyć. To dało nam spokojniejszy punkt startu.',
    avatar: '/branding/topic-cards/french-bulldog-leash.jpg',
    categories: ['Pies', 'Problemy behawioralne', 'Sytuacja na spacerze'],
  },
  {
    name: 'Ala i Bruno',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Pobudzenie',
    text:
      'Dostaliśmy konkretną odpowiedź, co sprawdzić po powrocie do domu i jak nie dokładać psu pobudzenia kolejnymi komendami.',
    avatar: '/images/cutover/dog-pobudzenie.png',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Dorota i Fado',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Szczeniak',
    text:
      'Kwadrans uporządkował nam pierwsze dni ze szczeniakiem. Nie dostaliśmy listy zakazów, tylko kilka zasad, które mogliśmy wdrożyć od razu.',
    avatar: '/branding/topic-cards/puppy-hands.jpg',
    categories: ['Pies', 'Szczenięta / Kocięta'],
  },
  {
    name: 'Marcin i Ares',
    service: 'Konsultacja behawioralna',
    topic: 'Obrona zasobów',
    text:
      'W trudnym temacie najważniejsze było dla nas bezpieczeństwo. Po rozmowie wiedzieliśmy, czego nie prowokować i od czego zacząć bez presji.',
    avatar: '/images/cutover/dog-resource-guarding.png',
    categories: ['Pies', 'Agresja', 'Problemy behawioralne'],
  },
  {
    name: 'Paulina i Nero',
    service: 'Pełna konsultacja',
    topic: 'Goście w domu',
    text:
      'Pierwszy raz ktoś wyjaśnił nam, że problem nie zaczyna się dopiero przy dzwonku do drzwi. Plan przygotowania domu był dla nas łatwiejszy do zastosowania.',
    avatar: '/branding/topic-cards/dog-checkup.jpg',
    categories: ['Pies', 'Problemy behawioralne'],
  },
  {
    name: 'Basia i Odi',
    service: 'Konsultacja behawioralna',
    topic: 'Konsultacja online',
    text:
      'Bałam się, że rozmowa online będzie zbyt ogólna. Wyszłam z jasnym planem i wiedziałam, co obserwować u psa.',
    avatar: '/branding/case-dog-rest.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Wojtek i Hera',
    service: 'Pełna konsultacja',
    topic: 'Spacer',
    text:
      'Po konsultacji zmieniliśmy trasę, tempo i sposób mijania psów. To nie była magiczna metoda, tylko spokojniejsze ustawienie warunków.',
    avatar: '/branding/topic-cards/dog-forest-side.jpg',
    categories: ['Pies', 'Sytuacja na spacerze'],
  },
  {
    name: 'Sylwia i Maks',
    service: 'Dwa kwadranse (archiwalna usługa)',
    topic: 'Dłuższa rozmowa',
    text:
      'Dłuższa rozmowa dała nam miejsce na szczegóły. Dostaliśmy plan bez straszenia i bez obietnic cudów, możliwy do spokojnego sprawdzenia.',
    avatar: '/branding/case-dog-home.jpg',
    categories: ['Pies', 'Konsultacje online'],
  },
  {
    name: 'Marta i Mila',
    service: 'Pełna konsultacja',
    topic: 'Kuweta',
    text:
      'Wreszcie ktoś ułożył nam temat kuwety po kolei: zdrowie, ustawienie, zasoby i stres. Dzięki temu przestaliśmy zmieniać wszystko jednocześnie.',
    avatar: '/branding/topic-cards/cats/cat-litter-box.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Aneta i Rysiek',
    service: 'Pełna konsultacja',
    topic: 'Nocna aktywność',
    text:
      'Po rozmowie zobaczyliśmy, że nocne pobudki mogą mieć związek z całym rytmem dnia. Zaczęliśmy od kilku zmian w zabawie i karmieniu.',
    avatar: '/branding/topic-cards/cats/cat-night-meowing.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Kuba i Nori',
    service: 'Pełna konsultacja',
    topic: 'Konflikt między kotami',
    text:
      'Nie musieliśmy od razu rozdzielać kotów na ślepo. Dostaliśmy plan dotyczący zasobów, dystansu i obserwacji napięcia.',
    avatar: '/branding/topic-cards/cats/cat-intercat-conflict.jpg',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Ela i Fibi',
    service: 'Pełna konsultacja',
    topic: 'Lęk i chowanie się',
    text:
      'Najważniejsze było dla nas, że nikt nie kazał wyciągać kota na siłę. Plan uwzględniał jego tempo i sygnały stresu.',
    avatar: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
    categories: ['Kot', 'Praca z lękiem'],
  },
  {
    name: 'Olek i Kira',
    service: 'Konsultacja behawioralna',
    topic: 'Drapanie mebli',
    text:
      'Zrozumieliśmy, że samo mówienie „nie” niczego nie rozwiąże. Po ustawieniu drapaków i rytuałów łatwiej było nam obserwować, co działa.',
    avatar: '/blog-covers/blog-kot-drapie-meble-photo.webp',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Justyna i Puszek',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Obserwacja kota',
    text:
      'Rozmowa była spokojna i konkretna. Dostaliśmy wskazówki, co obserwować u kota, zamiast gotowej etykiety bez kontekstu.',
    avatar: '/images/homepage/home-bg-cat-1to1.webp',
    categories: ['Kot', 'Konsultacje online'],
  },
  {
    name: 'Bartek i Sombra',
    service: 'Zapytaj behawiorystę — 15 min',
    topic: 'Dotyk i pielęgnacja',
    text:
      'W końcu lepiej rozumieliśmy, kiedy kot ma już dość. To zmieniło nasze podejście do głaskania i pielęgnacji.',
    avatar: '/branding/topic-cards/cats/cat-touch-defensive.jpg',
    categories: ['Kot', 'Praca z lękiem'],
  },
  {
    name: 'Natalia i Coco',
    service: 'Pełna konsultacja',
    topic: 'Nowy kot w domu',
    text:
      'Plan zapoznawania kotów był prosty i bez pośpiechu. Dzięki temu mogliśmy spokojniej przejść przez pierwsze dni.',
    avatar: '/blog-covers/blog-jak-wprowadzic-nowego-kota-do-domu-photo.webp',
    categories: ['Kot', 'Szczenięta / Kocięta'],
  },
  {
    name: 'Renata i Tofik',
    service: 'Pełna konsultacja',
    topic: 'Stres kota',
    text:
      'Po konsultacji inaczej patrzymy na zmiany w mieszkaniu. Małe rzeczy, które wcześniej ignorowaliśmy, okazały się ważne dla poczucia bezpieczeństwa kota.',
    avatar: '/blog-covers/blog-stres-kota-a-zachowania-toaletowe-photo.webp',
    categories: ['Kot', 'Problemy behawioralne'],
  },
  {
    name: 'Piotr i Lili',
    service: 'Pełna konsultacja',
    topic: 'Dłuższy problem behawioralny',
    text:
      'Przy dłuższym problemie potrzebowaliśmy szerszej analizy. Dostaliśmy spokojne wyjaśnienie możliwych przyczyn i plan pracy bez gwałtownych zmian.',
    avatar: '/branding/specialist-cat-support.jpg',
    categories: ['Kot', 'Konsultacje online', 'Problemy behawioralne'],
  },
]

// Historyczne wpisy zostają w źródle do celów redakcyjnych, ale nie mieszamy ich
// z aktualną ofertą na stronie publicznej.
export const publicOpinionReviews = opinionReviews.filter(isPublicOpinionReview)
