import { buildPdfOrderHref, getPdfBundleBySlug, getPdfGuideBySlug } from './pdf-guides'

export type ShopSpecies = 'koty' | 'psy'

export type ShopPdfCardKind = 'pdf' | 'pakiet'

export type ShopPdfCard = {
  slug: string
  species: ShopSpecies
  kind: ShopPdfCardKind
  kindLabel: string
  title: string
  forWho: string
  organizes: string
  enough: string
  consult: string
  href: string
  cta: string
}

export type ShopBookCard = {
  slug: string
  species?: ShopSpecies
  speciesCategory?: ShopSpecies
  title: string
  author: string
  note?: string
  shortDescription?: string
  coverSrc?: string
  image?: string
  coverAlt?: string
  imageAlt?: string
  amazonHref?: string
  amazonAffiliateUrl?: string
}

export type ShopRecommendationSpecies = ShopSpecies | 'mixed'

export type ShopAccessoryCard = {
  slug: string
  species: ShopRecommendationSpecies
  title: string
  summary: string
  helpsWith: string
  usage: string
  caution: string
  affiliateUrl: string
  cta: string
}

export type ShopEntranceCard = {
  slug: string
  eyebrow: string
  title: string
  summary: string
  href: string
  cta: string
}

export type ShopBundleShelfCard = {
  slug: string
  species: ShopSpecies
  title: string
  pricing: string
  audience: string
  promise: string
  guideTitles: string[]
  whenEnough: string
  whenConsult: string
  href: string
  cta: string
}

type PdfThemeSeed = {
  slug: string
  title: string
  problem: string
  organizes: string
  enough: string
  consult: string
}

type BookSeed = {
  title: string
  author: string
  note?: string
}

type PdfFunnelRole = 'lead_magnet' | 'starter' | 'starter-core' | 'core' | 'specialist'

const PDF_THEME_SEEDS: Record<ShopSpecies, PdfThemeSeed[]> = {
  koty: [
    {
      slug: 'kot-kuweta-napiecie',
      title: 'Czy Twój kot żyje w napięciu? 6 cichych oznak, które łatwo przeoczyć',
      problem: 'omija kuwetę albo napina się przy toalecie',
      organizes: 'kuwetę, zapachy, dostęp i rytm sprzątania',
      enough: 'chcesz najpierw sprawdzić, czy problem siedzi w kuwecie, domu czy w obu miejscach',
      consult: 'w tle może być ból, nagła zmiana albo obraz jest mieszany',
    },
    {
      slug: 'kot-konflikt',
      title: 'Czy to jeszcze zabawa? 7 cichych oznak konfliktu między kotami',
      problem: 'blokuje przejścia, goni drugiego kota albo ustępuje z przestrzeni',
      organizes: 'relację, zasoby, przejścia i kolejność w domu',
      enough: 'potrzebujesz spokojnie odczytać relację, zanim zacznie się szersza reorganizacja',
      consult: 'trzeba sprawdzić, czy to jeszcze napięcie, czy już stały konflikt',
    },
    {
      slug: 'kot-dotyk',
      title: 'Koty: zabawa czy napięcie?',
      problem: 'napina się przy głaskaniu, noszeniu albo pielęgnacji',
      organizes: 'kontakt, granice, procedury i tempo pracy',
      enough: 'chcesz najpierw uporządkować sam kontakt bez siłowania się z kotem',
      consult: 'obrona wygląda szerzej niż sam dotyk albo dochodzi ból',
    },
    {
      slug: 'kot-stres',
      title: 'Kot boi się kuwety?',
      problem: 'chowa się, czujnie obserwuje dom albo wraca wolno do spokoju',
      organizes: 'bodźce, rytm dnia i bezpieczne miejsca w domu',
      enough: 'chcesz zacząć od prostego, spokojnego porządku środowiska',
      consult: 'wycofanie utrzymuje się, narasta albo łączy się z innymi objawami',
    },
    {
      slug: 'kot-noc',
      title: 'Problem poza kuwetą',
      problem: 'budzi dom nad ranem albo rozkręca się w nocy',
      organizes: 'rytm dnia, wieczorne bodźce i porządek nocny',
      enough: 'chcesz sprawdzić, co w codziennej rutynie napędza noc',
      consult: 'nocny wzorzec łączy się z napięciem, głodem albo bólem',
    },
    {
      slug: 'kot-adopcja',
      title: 'Kot chowa się po zmianach?',
      problem: 'dopiero układa się w nowym domu i potrzebuje przewidywalności',
      organizes: 'pierwsze dni, przestrzeń i kolejność wdrażania zmian',
      enough: 'chcesz zacząć spokojnie i nie przeciążyć początku',
      consult: 'adaptacja wygląda gorzej niż zwykłe oswojenie nowego miejsca',
    },
    {
      slug: 'kot-przeprowadzka',
      title: 'Kot budzi dom po nocy?',
      problem: 'po zmianie miejsca staje się bardziej czujny albo wycofany',
      organizes: 'zapachy, kryjówki, zasoby i przewidywalność',
      enough: 'potrzebujesz najpierw ustawić dom tak, by wrócił spokój',
      consult: 'zmiana miejsca uruchomiła szerszy problem niż zwykły stres przejściowy',
    },
    {
      slug: 'kot-nowy-domownik',
      title: 'Miauczenie o świcie',
      problem: 'reaguje napięciem na nowego kota albo psa',
      organizes: 'pierwszy kontakt, odległość i bezpieczny plan wejścia',
      enough: 'chcesz przeprowadzić spokojne wdrożenie bez chaosu',
      consult: 'pojawiają się sygnały konfliktu albo kot już zaczyna ustępować z przestrzeni',
    },
    {
      slug: 'kot-zasoby',
      title: 'Kot gryzie przy głaskaniu?',
      problem: 'napina się przy jedzeniu, przejściach albo zasobach',
      organizes: 'dostęp do misek, kuwet, punktów obserwacji i tras w domu',
      enough: 'chcesz najpierw uporządkować środowisko i dostęp',
      consult: 'problem zasobów łączy się z konfliktem albo wycofaniem',
    },
    {
      slug: 'kot-drapanie',
      title: 'Kot broni się przy pielęgnacji albo noszeniu?',
      problem: 'drapie meble albo szuka napięcia w otoczeniu',
      organizes: 'miejsca drapania, bodźce i domowe rytuały',
      enough: 'chcesz zrozumieć, co w domu napędza ten wzorzec',
      consult: 'drapanie wygląda jak część szerszego napięcia lub frustracji',
    },
    {
      slug: 'kot-jedzenie',
      title: 'Jedzenie i napięcie',
      problem: 'napina się przy misce, je łapczywie albo broni jedzenia',
      organizes: 'pory karmienia, dostęp i sygnały napięcia',
      enough: 'wystarczy Ci najpierw uporządkować jedzenie i otoczenie',
      consult: 'obraz wygląda szerzej niż sam rytm karmienia',
    },
    {
      slug: 'kot-goscie',
      title: 'Goście i hałas',
      problem: 'spina się, gdy w domu pojawiają się ludzie lub dźwięki',
      organizes: 'wejścia, strefy bezpieczeństwa i reakcje na bodźce',
      enough: 'chcesz najpierw obniżyć napięcie bez dużej interwencji',
      consult: 'reakcja jest silna, utrwalona albo dotyczy kilku bodźców naraz',
    },
    {
      slug: 'kot-okno',
      title: 'Okno i czujność',
      problem: 'siedzi przy oknie, napina się albo szybko reaguje na ruch',
      organizes: 'punkty obserwacji, bodźce zewnętrzne i odpoczynek',
      enough: 'potrzebujesz prostego porządku dnia i środowiska',
      consult: 'czujność przy oknie jest częścią szerszego napięcia lub lęku',
    },
    {
      slug: 'kot-mlody',
      title: 'Młody kot i energia',
      problem: 'ma dużo energii, trudno mu wyhamować albo sam reguluje się chaotycznie',
      organizes: 'zabawę, wyciszenie, odpoczynek i bodźce w domu',
      enough: 'chcesz zacząć od prostego planu rytmu i bodźców',
      consult: 'energia szybko przechodzi w frustrację, konflikt albo nadmierną czujność',
    },
    {
      slug: 'kot-senior',
      title: 'Senior i zmiana rytmu',
      problem: 'zmienia rytm, spokój albo zachowanie wraz z wiekiem',
      organizes: 'komfort, odpoczynek, obserwację i codzienną rutynę',
      enough: 'chcesz spokojnie uporządkować dom dla starszego kota',
      consult: 'zmiana rytmu może mieć też tło medyczne lub bólowe',
    },
    {
      slug: 'kot-transport',
      title: 'Weterynarz i transport',
      problem: 'spina się przy transporterze, wyjściu lub w drodze',
      organizes: 'sam transport, przygotowanie i napięcie przed wizytą',
      enough: 'chcesz przede wszystkim zmniejszyć napięcie wokół wyjścia',
      consult: 'reakcja jest silna albo łączy się z innymi trudnościami',
    },
    {
      slug: 'kot-samotnosc',
      title: 'Kot zostaje sam',
      problem: 'nie lubi zostawać sam albo źle znosi pusty dom',
      organizes: 'wyjścia opiekuna, rytm i sygnały samotności',
      enough: 'potrzebujesz spokojnie sprawdzić, co dzieje się po wyjściu',
      consult: 'samotność łączy się z silnym stresem albo innymi objawami',
    },
    {
      slug: 'kot-zapachy',
      title: 'Zmiana mebli i zapachów',
      problem: 'po przestawieniu domu robi się bardziej czujny',
      organizes: 'zapachy, miejsca odpoczynku i punkty kontroli',
      enough: 'wystarczy najpierw mądry reset otoczenia',
      consult: 'zmiana środowiska uruchamia dłuższy albo głębszy problem',
    },
    {
      slug: 'kot-zabawa-lowiecka',
      title: 'Zabawa łowiecka',
      problem: 'ma za dużo energii w zabawie albo szybko się nakręca',
      organizes: 'zabawę, przerwy i łagodne wygaszanie emocji',
      enough: 'chcesz uporządkować prosty, codzienny wzorzec zabawy',
      consult: 'zabawa przechodzi w frustrację, konflikt albo napięcie',
    },
    {
      slug: 'kot-poranne-pobudki',
      title: 'Poranne pobudki',
      problem: 'zaczyna dzień za wcześnie i budzi dom',
      organizes: 'wieczorny rytm, nocne bodźce i poranne nawyki',
      enough: 'chcesz przestawić sam poranny rytm bez dużej przebudowy',
      consult: 'poranne pobudki łączą się z lękiem, głodem albo bólem',
    },
    {
      slug: 'kot-obrona-terytorium',
      title: 'Obrona terytorium',
      problem: 'pilnuje przestrzeni albo reaguje ostro przy wejściach',
      organizes: 'przejścia, zasoby i miejsca kontroli w domu',
      enough: 'potrzebujesz najpierw obniżyć napięcie w miejscach spornych',
      consult: 'obrona wygląda jak część szerszego wzorca konfliktu',
    },
    {
      slug: 'kot-bol-komfort',
      title: 'Spadek komfortu i możliwy ból',
      problem: 'nagle zmienia zachowanie, unika kontaktu albo staje się bardziej czujny',
      organizes: 'obserwację, rytm dnia i sygnały alarmowe',
      enough: 'chcesz najpierw zebrać obraz przed kolejnym ruchem',
      consult: 'możliwy jest ból albo problem medyczny i warto to sprawdzić szybciej',
    },
    {
      slug: 'kot-rutyna',
      title: 'Codzienny spokój i rutyna',
      problem: 'dom jest niestabilny i kot nie ma przewidywalnego rytmu',
      organizes: 'rutynę, odpoczynek i domowe sygnały bezpieczeństwa',
      enough: 'szukasz prostego startu, który wycisza codzienność',
      consult: 'problem trwa długo lub wchodzi w kilka obszarów naraz',
    },
  ],
  psy: [
    {
      slug: 'pies-samotnosc',
      title: 'Samotność i wyjścia z domu',
      problem: 'źle znosi wyjście opiekuna albo długo się wycisza po rozstaniu',
      organizes: 'wyjścia, sygnały samotności i rytm dnia',
      enough: 'chcesz zacząć od spokojnego odczytu tego, co dzieje się po wyjściu',
      consult: 'samotność wygląda na głębszy lęk albo utrwalony wzorzec',
    },
    {
      slug: 'pies-spacer',
      title: 'Reaktywność na spacerze',
      problem: 'szczeka, ciągnie albo trudno mu minąć bodźce na spacerze',
      organizes: 'dystans, bodźce, tempo i reakcje na trasie',
      enough: 'potrzebujesz pierwszego spokojnego planu spacerowego',
      consult: 'reakcja jest silna, szeroka albo szybko narasta',
    },
    {
      slug: 'pies-smycz',
      title: 'Smycz, ciągnięcie i mijanie bodźców',
      problem: 'ciągnie, wyrywa się albo trudno mu przejść obok ludzi i psów',
      organizes: 'smycz, dystans i przewidywalność na trasie',
      enough: 'chcesz ułożyć prosty plan spacerów bez improwizacji',
      consult: 'ciągnięcie łączy się z pobudzeniem lub lękiem',
    },
    {
      slug: 'szczeniak-gryzienie',
      title: 'Szczeniak i gryzienie',
      problem: 'gryzie, skacze albo trudno mu wyhamować w domu',
      organizes: 'odpoczynek, zabawę i codzienny rytm szczeniaka',
      enough: 'chcesz zacząć od prostego porządku bez przeciążania malucha',
      consult: 'chaos szybko przechodzi w frustrację albo napięcie',
    },
    {
      slug: 'pies-pobudzenie',
      title: 'Pobudzenie i brak wyciszenia',
      problem: 'kręci się, nie potrafi odpocząć albo cały czas jest „na wysokich obrotach”',
      organizes: 'odpoczynek, bodźce i domowy rytm wyciszania',
      enough: 'potrzebujesz najpierw odjąć nadmiar bodźców z codzienności',
      consult: 'pobudzenie łączy się z lękiem, frustracją albo innym trudnym wzorcem',
    },
    {
      slug: 'pies-goscie-dzwieki',
      title: 'Goście i dźwięki',
      problem: 'szczeka albo napina się przy gościach, odkurzaczu czy dźwiękach z otoczenia',
      organizes: 'wejścia, dźwięki i bezpieczne strefy',
      enough: 'chcesz zacząć od prostego, spokojnego oswojenia bodźców',
      consult: 'reakcja jest silna albo dotyczy wielu bodźców naraz',
    },
    {
      slug: 'pies-psy',
      title: 'Napięcie wobec innych psów',
      problem: 'napina się przy mijaniu innych psów albo reaguje za szybko',
      organizes: 'dystans, sygnały ostrzegawcze i sposób mijania',
      enough: 'wystarczy Ci pierwszy plan, jak spokojniej przechodzić obok psów',
      consult: 'reaktywność wykracza poza pojedynczy spacerowy problem',
    },
    {
      slug: 'pies-zasoby',
      title: 'Obrona zasobów',
      problem: 'broni jedzenia, zabawek albo miejsca odpoczynku',
      organizes: 'dostęp do zasobów, sygnały napięcia i kolejność pracy',
      enough: 'chcesz najpierw uporządkować sam wzorzec obrony',
      consult: 'obrona jest silna, powtarzalna albo wiąże się z innymi sygnałami',
    },
    {
      slug: 'pies-adopcja',
      title: 'Pierwsze dni po adopcji',
      problem: 'dopiero uczy się domu i potrzebuje przewidywalności',
      organizes: 'pierwsze dni, rytm i kolejność zmian',
      enough: 'chcesz zacząć spokojnie i nie przeciążać początku',
      consult: 'adaptacja wygląda na szerszy problem niż zwykły stres',
    },
    {
      slug: 'pies-szczeniak-start',
      title: 'Trudny start z młodym psem',
      problem: 'młody pies rozkręca się szybciej, niż da się go wyciszyć',
      organizes: 'rytuały dnia, odpoczynek i małe kroki wychowawcze',
      enough: 'chcesz ustawić dzień tak, by mniej nakręcać emocje',
      consult: 'chaos młodego psa miesza się z lękiem albo frustracją',
    },
    {
      slug: 'pies-skakanie',
      title: 'Skakanie na ludzi',
      problem: 'skacze na opiekunów albo gości i trudno mu zatrzymać emocje',
      organizes: 'powitania, energię i jasny plan kontaktu',
      enough: 'wystarczy Ci spokojny porządek powitań i reakcji',
      consult: 'skakanie jest częścią szerszego pobudzenia lub lęku',
    },
    {
      slug: 'pies-szczekanie',
      title: 'Szczekanie w domu',
      problem: 'szczeka, gdy coś się dzieje albo gdy nie wie, co zrobić z napięciem',
      organizes: 'bodźce w domu, odpoczynek i rutynę',
      enough: 'chcesz najpierw sprawdzić, co nakręca szczekanie',
      consult: 'szczekanie szybko przechodzi w silniejsze pobudzenie',
    },
    {
      slug: 'pies-auto-wet',
      title: 'Auto i weterynarz',
      problem: 'napina się przy transporterze, w samochodzie albo przed wizytą',
      organizes: 'transport, przygotowanie i napięcie przed wyjściem',
      enough: 'chcesz przede wszystkim obniżyć napięcie wokół wyjść',
      consult: 'reakcja jest silna albo wiąże się z innym wzorcem lęku',
    },
    {
      slug: 'pies-odpoczynek',
      title: 'Uczenie odpoczynku',
      problem: 'nie umie przejść w spokój i cały czas pozostaje w ruchu',
      organizes: 'odpoczynek, wyciszenie i rytm dnia',
      enough: 'potrzebujesz prostego planu, jak uczyć domowego spokoju',
      consult: 'brak odpoczynku łączy się z lękiem albo frustracją',
    },
    {
      slug: 'pies-przeprowadzka',
      title: 'Pies po zmianie domu',
      problem: 'po zmianie miejsca robi się czujniejszy albo bardziej pobudzony',
      organizes: 'zapachy, przewidywalność i bezpieczne miejsca',
      enough: 'chcesz najpierw ustawić dom pod spokój i regularność',
      consult: 'zmiana uruchamia mocniejszy albo dłuższy problem adaptacyjny',
    },
    {
      slug: 'pies-bodzce',
      title: 'Przeciążenie bodźcami',
      problem: 'jest za długo „na pełnych obrotach” i trudno mu wrócić do równowagi',
      organizes: 'bodźce, aktywność i spokojne okna dnia',
      enough: 'chcesz zacząć od odjęcia nadmiaru i prostego rytmu',
      consult: 'przeciążenie łączy się z reakcją lękową albo konfliktową',
    },
    {
      slug: 'pies-frustracja',
      title: 'Frustracja i trudne emocje',
      problem: 'szybko się nakręca, bo nie potrafi jeszcze spokojnie przejść przez trudność',
      organizes: 'frustrację, bodźce i przechodzenie między stanami',
      enough: 'potrzebujesz pierwszego porządku emocji i otoczenia',
      consult: 'frustracja zderza się z lękiem albo ostrzejszą reakcją',
    },
    {
      slug: 'pies-lak-separacyjny',
      title: 'Lęk separacyjny',
      problem: 'silnie reaguje na samotność i rozstanie z opiekunem',
      organizes: 'samotność, wyjścia i reakcję po wyjściu',
      enough: 'chcesz spokojnie ocenić, czy to samotność czy coś szerszego',
      consult: 'reakcja jest silna, powtarzalna albo szybko narasta',
    },
    {
      slug: 'pies-senior',
      title: 'Starszy pies i zmiana rytmu',
      problem: 'wraz z wiekiem potrzebuje innego tempa i większego komfortu',
      organizes: 'rytm dnia, odpoczynek i prostszą rutynę',
      enough: 'chcesz ustawić spokojniejszy dom dla starszego psa',
      consult: 'zmiana rytmu może mieć też wyraźne tło zdrowotne',
    },
    {
      slug: 'pies-kot',
      title: 'Pies w domu z kotem',
      problem: 'ma napięcie wobec kota albo trudno mu się wyregulować w domu wielogatunkowym',
      organizes: 'przejścia, strefy i kontakt z kotem',
      enough: 'potrzebujesz najpierw uporządkować wspólne mieszkanie',
      consult: 'relacja z kotem wygląda na konflikt lub przewlekłe napięcie',
    },
    {
      slug: 'pies-dzieci',
      title: 'Pies i dzieci',
      problem: 'ma trudność z emocjami, gdy w domu są dzieci lub dużo ruchu',
      organizes: 'kontakt, dystans i przewidywalność w domu',
      enough: 'chcesz zbudować bezpieczniejszy, prosty plan kontaktu',
      consult: 'reakcje są silne albo dotykają kilku sytuacji jednocześnie',
    },
    {
      slug: 'pies-noc',
      title: 'Nocne pobudki',
      problem: 'budzi się w nocy albo trudno mu spać spokojnie',
      organizes: 'nocny rytm, wieczorne bodźce i odpoczynek',
      enough: 'chcesz najpierw uporządkować sam rytm nocy',
      consult: 'nocny wzorzec może łączyć się z bólem lub lękiem',
    },
    {
      slug: 'pies-rutyna',
      title: 'Pies i codzienna rutyna',
      problem: 'dom jest chaotyczny i trudno mu przewidywać, co będzie dalej',
      organizes: 'codzienną rutynę, granice i porządek bodźców',
      enough: 'szukasz spokojnego wejścia w codzienny plan',
      consult: 'problem dotyczy kilku obszarów naraz albo trwa zbyt długo',
    },
  ],
}

const BOOK_COVER_SOURCES: Record<ShopSpecies, string[]> = {
  koty: [
    '/images/book-covers/cat-cover-1.svg',
    '/images/book-covers/cat-cover-2.svg',
    '/images/book-covers/cat-cover-3.svg',
  ],
  psy: [
    '/images/book-covers/dog-cover-1.svg',
    '/images/book-covers/dog-cover-2.svg',
    '/images/book-covers/dog-cover-3.svg',
  ],
}

function getPdfFunnelLabel(role: string | undefined): string {
  switch (role as PdfFunnelRole | undefined) {
    case 'lead_magnet':
      return 'Darmowy start'
    case 'starter':
      return 'Starter PDF'
    case 'starter-core':
      return 'Starter-core PDF'
    case 'specialist':
      return 'Specjalistyczny PDF'
    case 'core':
    default:
      return 'Core PDF'
  }
}

function getPdfFunnelEnough(role: string | undefined): string {
  switch (role as PdfFunnelRole | undefined) {
    case 'lead_magnet':
      return 'Wystarcza, gdy chcesz najpierw sprawdzić, czy problem zaczyna się od pobudzenia i przeciążenia, a nie od samego braku ruchu.'
    case 'starter':
      return 'Wystarcza, gdy chcesz pierwszy spokojny plan wdrożenia i nie potrzebujesz jeszcze głębszej analizy zachowania.'
    case 'starter-core':
      return 'Wystarcza, gdy chcesz wejść krok dalej niż starter, ale nadal potrzebujesz prostego pierwszego planu.'
    case 'specialist':
      return 'Wystarcza, gdy chcesz ocenić predyspozycje i bezpieczeństwo, zanim podejmiesz bardziej specjalistyczną decyzję.'
    case 'core':
    default:
      return 'Wystarcza, gdy problem już się powtarza i chcesz zrozumieć jego mechanikę oraz pierwszy ruch.'
  }
}

function getPdfFunnelConsult(role: string | undefined, relatedService: string): string {
  switch (role as PdfFunnelRole | undefined) {
    case 'lead_magnet':
      return `Konsultacja bywa lepsza, gdy obraz jest mieszany albo problem łączy się z innymi obszarami. ${relatedService}.`
    case 'starter':
      return `Konsultacja bywa lepsza, gdy sytuacja jest szersza niż pojedynczy objaw albo szybciej narasta. ${relatedService}.`
    case 'starter-core':
      return `Konsultacja bywa lepsza, gdy chcesz od razu sprawdzić, czy temat wymaga głębszej oceny. ${relatedService}.`
    case 'specialist':
      return `Konsultacja bywa lepsza, gdy potrzebujesz szerszej oceny predyspozycji lub kontekstu. ${relatedService}.`
    case 'core':
    default:
      return `Konsultacja bywa lepsza, gdy reakcje są silne, powtarzalne albo mieszają kilka obszarów naraz. ${relatedService}.`
  }
}

export const SHOP_AFFILIATE_BOOKS = [
  {
    slug: 'koty-feline-behavioral-health',
    speciesCategory: 'koty' as const,
    title: 'Feline Behavioral Health',
    author: 'Sabine Schroll, Joël Dehasse',
    shortDescription: 'Dla osób, które chcą wejść szerzej w kocie zachowanie i tło zdrowotne.',
    image: BOOK_COVER_SOURCES.koty[0],
    amazonAffiliateUrl:
      'https://www.amazon.pl/s?k=Feline+Behavioral+Health+Sabine+Schroll+Jo%C3%ABl+Dehasse',
  },
  {
    slug: 'psy-dogs-a-new-understanding',
    speciesCategory: 'psy' as const,
    title: 'Dogs: A New Understanding of Canine Origin, Behavior, and Evolution',
    author: 'Raymond Coppinger, Lorna Coppinger',
    shortDescription: 'Dla osób, które chcą szerzej zrozumieć psa, jego pochodzenie i zachowanie.',
    image: BOOK_COVER_SOURCES.psy[0],
    amazonAffiliateUrl:
      'https://www.amazon.pl/s?k=Dogs+A+New+Understanding+of+Canine+Origin+Behavior+and+Evolution',
  },
] as const

export const SHOP_AFFILIATE_ACCESSORIES: ReadonlyArray<ShopAccessoryCard> = [
  {
    slug: 'psy-linka-spacerowa',
    species: 'psy',
    title: 'Długa linka spacerowa 5-10 m',
    summary: 'Daje więcej bezpiecznego dystansu i pozwala pracować bez puszczania psa luzem tam, gdzie to nie ma sensu.',
    helpsWith: 'reaktywnością, mijankami, spokojniejszym powrotem do równowagi i pierwszą pracą na spacerze',
    usage: 'ma sens wtedy, gdy plan spacerowy opiera się na dystansie, czytaniu sygnałów i mniejszej presji na krótkiej smyczy',
    caution: 'nie zastępuje planu pracy i źle prowadzona potrafi dokładać chaosu zamiast go zmniejszać',
    affiliateUrl: 'https://www.amazon.pl/s?k=linka+treningowa+dla+psa+10m',
    cta: 'Zobacz przykłady',
  },
  {
    slug: 'mixed-lickmaty-i-maty',
    species: 'mixed',
    title: 'Licki maty i maty do spokojnego jedzenia',
    summary: 'Pomagają spowolnić tempo, wprowadzić prosty rytuał i dołożyć zwierzęciu czytelne zajęcie bez nakręcania.',
    helpsWith: 'wyciszeniem, spokojniejszym przejściem przez codzienną rutynę i prostymi rytuałami przed wyjściem albo odpoczynkiem',
    usage: 'traktuję je jako wsparcie planu, gdy trzeba dołożyć przewidywalny rytm albo bezpieczne zajęcie',
    caution: 'u części zwierząt sam gadżet nic nie zmienia, a czasem wręcz przykrywa głębszy problem',
    affiliateUrl: 'https://www.amazon.pl/s?k=lickmat+mata+dla+psa+kota',
    cta: 'Zobacz przykłady',
  },
  {
    slug: 'koty-transporter-gorne-otwieranie',
    species: 'koty',
    title: 'Transporter z górnym otwieraniem',
    summary: 'Ułatwia spokojniejsze wchodzenie, bezpieczne przenoszenie kota i sensowniejszą pracę przy wizytach oraz wyjściach z domu.',
    helpsWith: 'transportem, wizytami, powrotem z lecznicy i odbudową przewidywalności wokół wyjścia',
    usage: 'najbardziej pomaga wtedy, gdy transporter staje się częścią codzienności, a nie narzędziem wyciąganym tylko przed stresem',
    caution: 'sam transporter nie rozwiąże lęku; liczy się sposób wprowadzania i skojarzenia budowane w domu',
    affiliateUrl: 'https://www.amazon.pl/s?k=transporter+dla+kota+g%C3%B3rne+otwieranie',
    cta: 'Zobacz przykłady',
  },
  {
    slug: 'koty-drapak-pionowy',
    species: 'koty',
    title: 'Drapak pionowy i punkty obserwacji',
    summary: 'Dają kotu lepszą kontrolę nad otoczeniem i realne miejsce do rozładowania napięcia zamiast przypadkowego niszczenia domu.',
    helpsWith: 'napięciem środowiskowym, konfliktami, brakiem sensownych tras i potrzebą drapania w odpowiednim miejscu',
    usage: 'warto je dobierać wtedy, gdy problem dotyczy środowiska, pionu, obserwacji albo konfliktu o zasoby',
    caution: 'kupowanie „jakiegokolwiek drapaka” często nic nie daje, jeśli nie pasuje do układu mieszkania i zachowania kota',
    affiliateUrl: 'https://www.amazon.pl/s?k=drapak+pionowy+dla+kota',
    cta: 'Zobacz przykłady',
  },
] as const

function buildCuratedBookCards(species: ShopSpecies): ShopBookCard[] {
  return SHOP_AFFILIATE_BOOKS.filter((book) => book.speciesCategory === species).map((book) => ({
    slug: book.slug,
    species: book.speciesCategory,
    speciesCategory: book.speciesCategory,
    title: book.title,
    author: book.author,
    shortDescription: book.shortDescription,
    image: book.image,
    imageAlt: `Okładka książki ${book.title}`,
    amazonAffiliateUrl: book.amazonAffiliateUrl,
  }))
}

const SHOP_ENTRANCES: ShopEntranceCard[] = [
  {
    slug: 'koty',
    eyebrow: 'PDF dla kotów',
    title: 'Koty',
    summary: 'Materiały PDF jako drugi krok, gdy chcesz wrócić do zaleceń we własnym tempie.',
    href: '/materialy#koty',
    cta: 'Zobacz materiały PDF',
  },
  {
    slug: 'psy',
    eyebrow: 'PDF dla psów',
    title: 'Psy',
    summary: 'Materiały PDF do spokojnego uporządkowania tematu między krokami.',
    href: '/materialy#psy',
    cta: 'Zobacz materiały PDF',
  },
  {
    slug: 'pakiety',
    eyebrow: 'Pakiety PDF',
    title: 'Pakiety PDF',
    summary: 'Gdy jeden materiał to za mało i chcesz szerzej uporządkować temat bez chaosu.',
    href: '/materialy',
    cta: 'Zobacz pakiety',
  },
  {
    slug: 'konsultacja-15-min',
    eyebrow: 'Konsultacja 15 min',
    title: 'Konsultacja 15 min',
    summary: 'Najprostszy pierwszy krok, gdy chcesz szybko sprawdzić kierunek i następny ruch.',
    href: '/book',
    cta: 'Umów 15 min',
  },
  {
    slug: 'kontakt',
    eyebrow: 'Inne formy kontaktu',
    title: 'Napisz o sytuacji',
    summary: 'Gdy temat jest szerszy, mieszany albo chcesz porównać 15 min, PDF i dalsze kroki.',
    href: '/kontakt',
    cta: 'Napisz o sytuacji',
  },
]

function buildPdfCardsForSpecies(species: ShopSpecies, seeds: PdfThemeSeed[]): ShopPdfCard[] {
  return seeds.flatMap((seed) => {
    const pdfHref = buildPdfOrderHref({ guideSlug: seed.slug })
    const bundleHref = buildPdfOrderHref({ bundleSlug: `${seed.slug}-pakiet` })

    return [
      {
        slug: `${seed.slug}-pdf`,
        species,
        kind: 'pdf',
        kindLabel: 'PDF',
        title: seed.title,
        forWho: `Dla zwierzęcia, które ${seed.problem}.`,
        organizes: `Porządkuje ${seed.organizes}.`,
        enough: `Wystarcza, gdy ${seed.enough}.`,
        consult: `Konsultacja bywa lepsza, gdy ${seed.consult}.`,
        href: pdfHref,
        cta: 'Zamów PDF',
      },
      {
        slug: `${seed.slug}-pakiet`,
        species,
        kind: 'pakiet',
        kindLabel: 'Pakiet PDF',
        title: `Pakiet: ${seed.title}`,
        forWho: `Dla domu, w którym ${seed.problem}.`,
        organizes: `Porządkuje ${seed.organizes} i daje szerszy start.`,
        enough: `Wystarcza, gdy chcesz wejść szerzej niż pojedynczy PDF.`,
        consult: `Konsultacja bywa lepsza, gdy ${seed.consult}.`,
        href: bundleHref,
        cta: 'Zamów pakiet',
      },
    ]
  })
}

function buildDogPdfCards(): ShopPdfCard[] {
  const dogGuideSlugs = [
    'pies-ile-ruchu-potrzebuje',
    'szczeniak-gryzienie-i-skakanie',
    'pies-reaktywny-na-spacerze',
    'pies-niszczy-w-domu',
    'pies-boi-sie-gosci-i-dzwiekow',
    'szczeniak-wyciszanie',
    'pies-zostaje-sam-plan-pierwszych-krokow',
    'pies-broni-zasobow',
    'pies-impulsy-i-hamulce',
    'pies-do-pracy-z-ludzmi',
  ]

  return dogGuideSlugs
    .map((slug) => getPdfGuideBySlug(slug))
    .filter((guide): guide is NonNullable<ReturnType<typeof getPdfGuideBySlug>> => guide !== null)
    .map((guide) => ({
    slug: guide.slug,
    species: 'psy',
    kind: 'pdf',
    kindLabel: getPdfFunnelLabel(guide.role_in_funnel),
    title: guide.title,
    forWho: guide.audience,
    organizes: guide.valuePromise,
    enough: getPdfFunnelEnough(guide.role_in_funnel),
    consult: getPdfFunnelConsult(guide.role_in_funnel, guide.relatedService),
    href: buildPdfOrderHref({ guideSlug: guide.slug }),
    cta: guide.website_card?.cta ?? (guide.accessType === 'lead magnet' ? 'Pobierz darmowy PDF' : 'Kup PDF'),
  }))
}

function buildBookCards(species: ShopSpecies, seeds: BookSeed[]): ShopBookCard[] {
  return seeds.map((seed, index) => {
    const coverSources = BOOK_COVER_SOURCES[species]
    const coverSrc = coverSources[index % coverSources.length] ?? coverSources[0]

    return {
      slug: `${species}-${index + 1}-${seed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      species,
      title: seed.title,
      author: seed.author,
      note: seed.note ?? 'Dla osób, które chcą wejść szerzej w temat i wolą papierową półkę obok PDF-ów.',
      coverSrc,
      coverAlt: `Okładka książki ${seed.title}`,
      amazonHref: `https://www.amazon.pl/s?k=${encodeURIComponent(seed.title)}`,
    }
  })
}

export const SHOP_PDF_CARDS = {
  koty: buildPdfCardsForSpecies('koty', PDF_THEME_SEEDS.koty),
  psy: buildDogPdfCards(),
} as const

export const SHOP_BOOK_CARDS = {
  koty: buildCuratedBookCards('koty'),
  psy: buildCuratedBookCards('psy'),
} as const

export function listShopAccessoryCards(): ShopAccessoryCard[] {
  return [...SHOP_AFFILIATE_ACCESSORIES]
}

export const SHOP_ENTRANCE_CARDS = SHOP_ENTRANCES

const SHOP_BUNDLE_SHELF_SEEDS: Record<ShopSpecies, ShopBundleShelfCard[]> = {
  koty: [
    {
      slug: 'pakiet-kuweta',
      species: 'koty',
      title: 'Pakiet Kuweta',
      pricing: '129 zł',
      audience: 'Dla opiekunów kotów, którzy chcą najpierw uporządkować kuwetę, zapach i rytm domu.',
      promise: 'Spokojny start wokół toalety, domu i pierwszych decyzji bez zgadywania.',
      guideTitles: [
        'Czy Twój kot żyje w napięciu? 6 cichych oznak, które łatwo przeoczyć',
        'Kot boi się kuwety?',
        'Problem poza kuwetą',
      ],
      whenEnough: 'Wystarcza, gdy chcesz najpierw uporządkować jedną domową oś problemu.',
      whenConsult: 'Konsultacja będzie lepsza, gdy pojawia się ból, silny lęk albo kilka objawów naraz.',
      href: buildPdfOrderHref({ bundleSlug: 'pakiet-kuweta' }),
      cta: 'Zamów pakiet',
    },
    {
      slug: 'pakiet-relacje',
      species: 'koty',
      title: 'Pakiet Relacje',
      pricing: '99 zł',
      audience: 'Dla domów, w których relacja między kotami nie jest już spokojna.',
      promise: 'Pierwszy plan porządkowania zasobów, przestrzeni i napięcia między kotami.',
      guideTitles: [
        'Czy to jeszcze zabawa? 7 cichych oznak konfliktu między kotami',
        'Koty: zabawa czy napięcie?',
      ],
      whenEnough: 'Wystarcza, gdy chcesz zobaczyć relację, zanim wejdziesz w szerszą przebudowę domu.',
      whenConsult: 'Konsultacja będzie lepsza, gdy konflikt jest stały albo jeden kot mocno ustępuje.',
      href: buildPdfOrderHref({ bundleSlug: 'pakiet-relacje' }),
      cta: 'Zamów pakiet',
    },
    {
      slug: 'pakiet-noc',
      species: 'koty',
      title: 'Pakiet Noc',
      pricing: '79 zł',
      audience: 'Dla opiekunów, których kot rozkręca dom o świcie albo w nocy.',
      promise: 'Mniej chaosu wieczorem, w nocy i rano oraz prostszy rytm dnia.',
      guideTitles: ['Kot budzi dom po nocy?', 'Miauczenie o świcie'],
      whenEnough: 'Wystarcza, gdy potrzebujesz spokojnie ułożyć rytm nocy i poranka.',
      whenConsult: 'Konsultacja będzie lepsza, gdy nocne pobudki łączą się z bólem, głodem albo lękiem.',
      href: buildPdfOrderHref({ bundleSlug: 'pakiet-noc' }),
      cta: 'Zamów pakiet',
    },
    {
      slug: 'pakiet-dotyk',
      species: 'koty',
      title: 'Pakiet Dotyk',
      pricing: '89 zł',
      audience: 'Dla kotów, które bronią się przy głaskaniu, pielęgnacji albo noszeniu.',
      promise: 'Spokojniejszy kontakt, prostsze granice i mniej siłowych prób.',
      guideTitles: ['Kot gryzie przy głaskaniu?', 'Kot broni się przy pielęgnacji albo noszeniu?'],
      whenEnough: 'Wystarcza, gdy chcesz najpierw uporządkować sam kontakt i tempo pracy.',
      whenConsult: 'Konsultacja będzie lepsza, gdy reakcja wygląda na ból albo silną obronę szerzej niż sam dotyk.',
      href: buildPdfOrderHref({ bundleSlug: 'pakiet-dotyk' }),
      cta: 'Zamów pakiet',
    },
  ],
  psy: [
    'pakiet-spokojny-szczeniak',
    'pakiet-spacer-bez-wybuchu',
    'pakiet-sam-w-domu',
    'pakiet-pobudzenie-i-hamulce',
    'pakiet-dom-i-bezpieczenstwo',
  ]
    .map((slug) => getPdfBundleBySlug(slug))
    .filter((bundle): bundle is NonNullable<ReturnType<typeof getPdfBundleBySlug>> => bundle !== null)
    .map((bundle) => ({
      slug: bundle.slug,
      species: 'psy',
      title: bundle.title,
      pricing: bundle.pricing,
      audience: bundle.audience,
      promise: bundle.promise,
      guideTitles: bundle.guides.map((guide) => guide.title),
      whenEnough:
        bundle.guideSlugs.length === 5
          ? 'Wystarcza, gdy chcesz wejść szerzej niż pojedynczy PDF i od razu zobaczyć spójny zestaw materiałów.'
          : 'Wystarcza, gdy chcesz połączyć kilka powiązanych PDF-ów w jeden prostszy start.',
      whenConsult: bundle.consult.length > 0 ? `Konsultacja bywa lepsza, gdy ${bundle.consult.join(', ')}.` : 'Konsultacja bywa lepsza, gdy temat jest szerszy niż ten pakiet.',
      href: bundle.pageHref,
      cta: 'Zobacz pakiet',
    })),
}

export function listShopBundleShelfCards(species: ShopSpecies): ShopBundleShelfCard[] {
  return SHOP_BUNDLE_SHELF_SEEDS[species]
}

export const SHOP_BUNDLE_SHELF_CARDS = {
  koty: listShopBundleShelfCards('koty'),
  psy: listShopBundleShelfCards('psy'),
} as const

export const SHOP_PDF_ANCHORS = [
  { href: '#koty-pdf', label: 'PDF dla kotów' },
  { href: '#psy-pdf', label: 'PDF dla psów' },
  { href: '#pakiety-pdf', label: 'Pakiety PDF' },
  { href: '#ksiazki', label: 'Książki' },
] as const

export function getShopHeroEyebrow(species: ShopSpecies) {
  return species === 'koty' ? 'Spokojny pierwszy krok przy problemach kota' : 'Spokojny pierwszy krok przy problemach psa'
}

export function getShopBookShelfTitle(species: ShopSpecies) {
  return species === 'koty' ? 'Wolisz papier? Zobacz polecane książki o kotach' : 'Wolisz papier? Zobacz polecane książki o psach'
}

export function getShopHeroTitle(species: ShopSpecies) {
  return species === 'koty'
    ? 'Zacznij od krótkiej konsultacji i sprawdź, co będzie najlepszym kolejnym krokiem'
    : 'Zacznij od krótkiej konsultacji i sprawdź, co będzie najlepszym kolejnym krokiem'
}

export function getShopHeroLead() {
  return 'Podczas 15 minut pomogę uporządkować temat i ocenić, czy wystarczy prosty kierunek, materiał PDF, czy lepiej od razu przejść do szerszej konsultacji.'
}

export function getShopHeroSecondaryNote() {
  return 'Materiały PDF pomagają porządkować temat i wracać do zaleceń we własnym tempie. Książki są osobną, dodatkową półką.'
}
