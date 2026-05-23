export type RealCaseImage = {
  src: string
  remoteSrc?: string
  alt: string
}

export type RealCaseProof = {
  problemType: string
  serviceFormat: string
  cooperationStage: string
  timeHorizon: string
  sourceContext: string
  outcomeSnapshot: string
}

export type RealCaseStudy = {
  id: string
  slug: string
  species: 'pies' | 'kot'
  breed: string
  age: string
  eyebrow: string
  headline: string
  summary: string
  firstStepLabel: string
  firstStepText: string
  nextStepLabel: string
  nextStepText: string
  metaDescription: string
  proof: RealCaseProof
  images: RealCaseImage[]
}

export const REAL_CASE_STUDIES = [
  {
    id: 'case-01',
    slug: 'reaktywnosc-na-spacerze-pies',
    species: 'pies',
    breed: 'mieszaniec',
    age: '3 lata',
    eyebrow: 'Reaktywność na spacerze',
    headline: 'Spacery, które przestały być przewidywalne',
    summary:
      'Pies reagował na inne psy szczekaniem, szarpaniem smyczy i długim pobudzeniem po mijance. Opiekun miał za sobą kilka prób treningowych, ale bez jasności, czy chodzi o lęk, frustrację czy przeciążenie spaceru.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Najpierw nazwaliśmy wyzwalacze, dystans i próg reakcji. To pozwoliło odsunąć przypadkowe techniki i ustalić, czego nie dokładać psu na spacerze.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Dalsza praca opiera się na przewidywalnym rytmie spaceru, zarządzaniu odległością i obserwacji momentu, w którym pies jeszcze może wrócić do kontaktu.',
    metaDescription:
      'Anonimowa sytuacja startowa psa reagującego na spacerze: wyzwalacze, próg reakcji, pierwszy krok i dalszy kierunek konsultacji.',
    proof: {
      problemType: 'reaktywność na smyczy i pobudzenie spacerowe',
      serviceFormat: 'Kwadrans + pełna konsultacja online',
      cooperationStage: 'po uporządkowaniu pierwszego etapu',
      timeHorizon: 'pierwsze decyzje po rozmowie, dalsza praca w kolejnych tygodniach',
      sourceContext: 'anonimizowany opis sytuacji startowej opiekuna',
      outcomeSnapshot: 'mniej chaosu przy mijankach i jaśniejszy plan spacerów',
    },
    images: [
      {
        src: '/branding/case-studies/Border_Collie.jpg',
        alt: 'Pies stojący na zewnątrz i obserwujący otoczenie.',
      },
      {
        src: '/branding/topic-cards/french-bulldog-leash.jpg',
        alt: 'Pies na smyczy podczas spaceru w miejskim otoczeniu.',
      },
    ],
  },
  {
    id: 'case-02',
    slug: 'problemy-separacyjne-pies',
    species: 'pies',
    breed: 'mieszaniec',
    age: '4 lata',
    eyebrow: 'Problemy separacyjne',
    headline: 'Pies, który nie dawał rady zostać sam',
    summary:
      'Po zmianie rytmu dnia pies zaczął wyć po wyjściu opiekuna, chodził za nim po mieszkaniu i napinał się już przy szykowaniu do wyjścia. Proste rady typu ignorowanie lub włączony telewizor nie porządkowały tematu.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Oddzieliliśmy zwykły protest od realnego napięcia przy rozstaniu. Pierwszym zadaniem było sprawdzić rytuał wyjścia i to, czy pies potrafi odpocząć bez opiekuna obok.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Plan pracy zaczyna się od bardzo krótkich prób, monitoringu i budowania spokojnej bazy. Celem pierwszego etapu jest mniej paniki, nie szybkie zostawianie psa na wiele godzin.',
    metaDescription:
      'Anonimowa sytuacja startowa psa z problemami separacyjnymi: napięcie przy wyjściu, zostawanie samemu i pierwszy bezpieczny krok.',
    proof: {
      problemType: 'problemy separacyjne i napięcie przy rozstaniu',
      serviceFormat: 'Kwadrans + pełna konsultacja online',
      cooperationStage: 'po rozróżnieniu protestu i realnego napięcia',
      timeHorizon: 'pierwszy etap rozpisany na kolejne tygodnie spokojnej pracy',
      sourceContext: 'anonimizowany opis po zmianie trybu pracy opiekuna',
      outcomeSnapshot: 'stabilniejsza baza i mniej chaosu przy wychodzeniu',
    },
    images: [
      {
        src: '/branding/topic-cards/dog-window-alone.jpg',
        alt: 'Pies wyglądający przez okno podczas pozostania w domu.',
      },
      {
        src: '/images/cutover/dog-separation.png',
        alt: 'Pies szukający spokojnego miejsca po wyjściu opiekuna.',
      },
    ],
  },
  {
    id: 'case-03',
    slug: 'pies-ciagnie-na-smyczy',
    species: 'pies',
    breed: 'labrador',
    age: '2 lata',
    eyebrow: 'Luźna smycz',
    headline: 'Spacer zamieniał się w holowanie',
    summary:
      'Pies ciągnął od szczeniaka. Opiekunka próbowała zatrzymywania, zmiany kierunku i nagradzania kontaktu, ale każda metoda działała tylko chwilowo. Pod spodem było dużo pobudzenia jeszcze przed wyjściem.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Najpierw oddzieliliśmy nawyk od pobudzenia. Praca miała zacząć się przed drzwiami, a nie dopiero wtedy, gdy smycz była już napięta.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Opiekunka dostała jeden punkt startu, prostszy rytm wyjścia i kryterium, kiedy temat wymaga dłuższej konsultacji zamiast kolejnej metody z internetu.',
    metaDescription:
      'Anonimowa sytuacja startowa psa ciągnącego na smyczy: pobudzenie, rytm spaceru i pierwszy kierunek pracy.',
    proof: {
      problemType: 'ciągnięcie na smyczy i wysokie pobudzenie',
      serviceFormat: 'start od Kwadransa',
      cooperationStage: 'po pierwszym ustawieniu ćwiczenia i kryteriów dalszej pracy',
      timeHorizon: 'pierwszy ruch od razu, dalsze decyzje po obserwacji',
      sourceContext: 'anonimizowany opis po wielu krótkotrwałych próbach treningowych',
      outcomeSnapshot: 'jeden punkt startu zamiast kolejnych desperackich prób',
    },
    images: [
      {
        src: '/branding/case-studies/labrador_luksi01.jpg',
        alt: 'Labrador w portretowym kadrze na zewnątrz.',
      },
      {
        src: '/branding/topic-cards/dog-resting-home.jpg',
        alt: 'Pies odpoczywający w spokojnym domowym wnętrzu.',
      },
    ],
  },
  {
    id: 'case-04',
    slug: 'start-po-adopcji-psa',
    species: 'pies',
    breed: 'suczka mix',
    age: '2-3 lata',
    eyebrow: 'Start po adopcji',
    headline: 'Nowy pies, nowy dom, dużo pytań',
    summary:
      'Suczka po adopcji w pierwszych dniach mało jadła, chowała się i nie reagowała na wołanie. Opiekunka nie wiedziała, czy to typowa adaptacja, czy sygnał większego problemu.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Ustaliliśmy, co mieści się w spokojnej adaptacji, a co byłoby sygnałem alarmowym. Najważniejsze były pierwsze 72 godziny, nie szybkie oswajanie.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Plan obejmował mniej stymulacji, bezpieczną przestrzeń i obserwacje apetytu, snu oraz reakcji na kontakt. Pierwsze dni dostały jasne ramy.',
    metaDescription:
      'Anonimowa sytuacja startowa po adopcji psa: pierwsze dni, bezpieczna przestrzeń i sygnały do obserwacji.',
    proof: {
      problemType: 'start po adopcji i trudna adaptacja',
      serviceFormat: 'start od Kwadransa',
      cooperationStage: 'po ustawieniu pierwszych 72 godzin',
      timeHorizon: 'najważniejsze decyzje podjęte na początku adaptacji',
      sourceContext: 'anonimizowany opis pierwszych dni po adopcji',
      outcomeSnapshot: 'mniej presji i jasne ramy pierwszego etapu',
    },
    images: [
      {
        src: '/branding/topic-cards/dog-resting-home.jpg',
        alt: 'Pies odpoczywający na kanapie w spokojnym świetle.',
      },
      {
        src: '/images/cutover/dog-puppy-home.png',
        alt: 'Pies w domowym wnętrzu blisko opiekuna.',
      },
    ],
  },
  {
    id: 'case-05',
    slug: 'kot-poza-kuweta',
    species: 'kot',
    breed: 'kot kastrowany',
    age: '4 lata',
    eyebrow: 'Kuweta po zmianie',
    headline: 'Kot, który zaczął omijać kuwetę',
    summary:
      'Po przeprowadzce kot zaczął załatwiać się na dywanie mimo wcześniejszego korzystania z kuwety. Najpierw trzeba było oddzielić zdrowie, stres, ustawienie kuwety i nowe bodźce w mieszkaniu.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Pierwsza rozmowa uporządkowała, czego nie zmieniać losowo i jakie informacje przygotować do dalszej analizy: zdrowie, mapa kuwet, rytm dnia i miejsca napięcia.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Dalsza praca skupia się na środowisku i zasobach. Przy nagłej zmianie zachowania temat zdrowotny zostaje traktowany jako równoległy priorytet.',
    metaDescription:
      'Anonimowa sytuacja startowa kota załatwiającego się poza kuwetą: zdrowie, stres, kuweta i środowisko.',
    proof: {
      problemType: 'załatwianie poza kuwetą po zmianie w domu',
      serviceFormat: 'Kwadrans + pełna konsultacja online',
      cooperationStage: 'po uporządkowaniu tła i wejściu w analizę środowiska',
      timeHorizon: 'pierwsze decyzje po rozmowie, korekty po obserwacji',
      sourceContext: 'anonimizowany opis po zmianach żwirku i ustawienia kuwety',
      outcomeSnapshot: 'mniej losowych zmian i jaśniejsza kolejność sprawdzania',
    },
    images: [
      {
        src: '/branding/case-cat-sofa.jpg',
        alt: 'Kot odpoczywający na sofie w domowym wnętrzu.',
      },
      {
        src: '/branding/topic-cards/cats/cat-litter-box.jpg',
        alt: 'Kot w pobliżu kuwety w mieszkaniu.',
      },
    ],
  },
  {
    id: 'case-06',
    slug: 'konflikt-miedzy-kotami',
    species: 'kot',
    breed: 'dwa koty',
    age: '3 i 5 lat',
    eyebrow: 'Relacje w domu',
    headline: 'Dwa koty, jedno mieszkanie, dużo napięcia',
    summary:
      'Po zmianie w domu jeden kot zaczął blokować dostęp do miski i kuwety, a drugi wycofał się do jednego pokoju. Opiekunowie próbowali przeczekać sytuację albo rozdzielać koty dopiero po incydentach.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Najpierw nazwaliśmy, że to nie jest temat "same się dogadają", tylko układ terytorialny i zasoby, które trzeba zabezpieczyć.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Plan opiera się na rozdzieleniu zasobów, spokojniejszych strefach i reintrodukcji przez zapach. Celem jest spadek napięcia, nie wymuszenie przyjaźni.',
    metaDescription:
      'Anonimowa sytuacja startowa konfliktu między kotami: zasoby, przestrzeń i spokojny plan pierwszego etapu.',
    proof: {
      problemType: 'konflikt między kotami i blokowanie zasobów',
      serviceFormat: 'pełna konsultacja online',
      cooperationStage: 'po pierwszej analizie przestrzeni i zasad kontaktu',
      timeHorizon: 'pierwszy etap rozpisany na tygodnie spokojnej pracy',
      sourceContext: 'anonimizowany opis konfliktu przy misce, kuwecie i przejściach',
      outcomeSnapshot: 'jaśniejsze zasady przestrzeni i mniej eskalacji w domu',
    },
    images: [
      {
        src: '/branding/topic-cards/cats/cat-intercat-conflict.jpg',
        alt: 'Dwa koty spotykające się w napiętej domowej sytuacji.',
      },
      {
        src: '/branding/case-cat-snow.jpg',
        alt: 'Kot w zimowym świetle w portretowym ujęciu.',
      },
    ],
  },
  {
    id: 'case-07',
    slug: 'kot-boi-sie-gosci',
    species: 'kot',
    breed: 'kotka',
    age: '5 lat',
    eyebrow: 'Lęk i goście',
    headline: 'Kot, który chował się przez całe wizyty',
    summary:
      'Kotka po przeprowadzce przy każdej wizycie chowała się na wiele godzin. Próby oswajania przez zapraszanie gości do jej pokoju zwiększały napięcie zamiast je zmniejszać.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Ustaliliśmy, że pierwszym celem nie jest kontakt z gośćmi, tylko bezpieczna strefa i zmiana oczekiwań wobec kota oraz ludzi.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Dalsza praca polega na kontroli bodźców, przewidywalnym rytmie wizyt i możliwości wyjścia z ukrycia bez presji na interakcje.',
    metaDescription:
      'Anonimowa sytuacja startowa kota chowającego się przed gośćmi: bezpieczna strefa, stres i spokojny plan.',
    proof: {
      problemType: 'lęk kota przy gościach i po przeprowadzce',
      serviceFormat: 'start od Kwadransa',
      cooperationStage: 'po ustawieniu bezpiecznej strefy',
      timeHorizon: 'pierwsze decyzje po rozmowie, obserwacja przy kolejnych wizytach',
      sourceContext: 'anonimizowany opis nieudanych prób oswajania z gośćmi',
      outcomeSnapshot: 'mniej presji na kontakt i bezpieczniejszy rytm wizyt',
    },
    images: [
      {
        src: '/branding/topic-cards/cats/cat-anxious-hiding.jpg',
        alt: 'Kot obserwujący otoczenie z bezpiecznej kryjówki.',
      },
      {
        src: '/branding/case-cat-sofa.jpg',
        alt: 'Kot odpoczywający w spokojnym domowym otoczeniu.',
      },
    ],
  },
  {
    id: 'case-08',
    slug: 'kot-budzi-w-nocy',
    species: 'kot',
    breed: 'kocur',
    age: '1,5 roku',
    eyebrow: 'Nocna aktywność',
    headline: 'Kot, który budził dom w środku nocy',
    summary:
      'Młody kot biegał po mieszkaniu, atakował nogi i domagał się uwagi w nocy. Problem wyglądał jak złośliwość albo agresja, ale wymagał sprawdzenia rytmu dnia, zabawy, jedzenia, stresu i zdrowia.',
    firstStepLabel: 'Pierwszy krok',
    firstStepText:
      'Zaczęliśmy od mapy dnia: kiedy kot śpi, kiedy je, jak wygląda zabawa i co dzieje się wieczorem. To pokazało, gdzie powstaje napięcie.',
    nextStepLabel: 'Dalszy kierunek',
    nextStepText:
      'Dalsza praca porządkuje wieczorny rytm, wzbogacenie środowiska i bezpieczne ujście energii. Nie chodzi o karanie kota, tylko o zmianę układu dnia.',
    metaDescription:
      'Anonimowa sytuacja startowa kota budzącego w nocy: aktywność, rytm dnia, zabawa i pierwszy kierunek pracy.',
    proof: {
      problemType: 'nocne pobudzenie i atakowanie opiekuna',
      serviceFormat: 'pełna konsultacja online',
      cooperationStage: 'po analizie środowiska i rytmu dnia',
      timeHorizon: 'pierwsze zmiany po uporządkowaniu wieczoru',
      sourceContext: 'anonimizowany opis nocnych pobudek i codziennego rytmu kota',
      outcomeSnapshot: 'bardziej przewidywalny wieczór i mniej chaosu w nocy',
    },
    images: [
      {
        src: '/branding/topic-cards/cats/cat-night-meowing.jpg',
        alt: 'Kot aktywny nocą w mieszkaniu.',
      },
      {
        src: '/branding/case-cat-sofa.jpg',
        alt: 'Kot leżący na sofie w domowym wnętrzu.',
      },
    ],
  },
] satisfies RealCaseStudy[]

export function getRealCaseProofPills(caseStudy: RealCaseStudy) {
  return [
    caseStudy.proof.problemType,
    caseStudy.proof.serviceFormat,
    caseStudy.proof.cooperationStage,
    caseStudy.proof.timeHorizon,
  ]
}

export function getRealCaseStudyPath(caseStudy: RealCaseStudy) {
  return `/opinie#${caseStudy.slug}`
}

export function getRealCaseStudyBySlug(slug: string) {
  return REAL_CASE_STUDIES.find((caseStudy) => caseStudy.slug === slug) ?? null
}

export function listRealCaseStudyPaths() {
  return ['/opinie']
}

export function getRealCaseSpeciesLabel(species: RealCaseStudy['species']) {
  return species === 'pies' ? 'Pies' : 'Kot'
}
