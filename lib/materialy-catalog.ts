// Source of truth for the public /materiały funnel.
// Keep this catalog aligned with the PDF files that are meant to be visible on the site.

export type MaterialyCategory = 'cat' | 'dog' | 'both'
export type MaterialyTier = 'free' | 'single' | 'bundle'
export type MaterialyPriceCode = 'free' | 'p19' | 'p29' | 'p39' | 'p49' | 'p59' | 'p69' | 'p79' | 'p89' | 'p99'

export type MaterialyGuide = {
  slug: string
  title: string
  subtitle: string
  category: MaterialyCategory
  tier: 'free' | 'single'
  priceCode: MaterialyPriceCode
  shortPromise: string
  forWhom: string
  pdfFile: string
  highlights: string[]
  previewPageCount: number
}

export type MaterialyBundle = {
  slug: string
  title: string
  subtitle: string
  category: Exclude<MaterialyCategory, 'both'>
  priceCode: MaterialyPriceCode
  guideSlugs: string[]
  shortPromise: string
}

export const PRICE_LABEL: Record<MaterialyPriceCode, string> = {
  free: 'Bezpłatne',
  p19: '19 zł',
  p29: '29 zł',
  p39: '39 zł',
  p49: '49 zł',
  p59: '59 zł',
  p69: '69 zł',
  p79: '79 zł',
  p89: '89 zł',
  p99: '99 zł',
}

export const PRICE_AMOUNT_PLN: Record<MaterialyPriceCode, number> = {
  free: 0,
  p19: 19,
  p29: 29,
  p39: 39,
  p49: 49,
  p59: 59,
  p69: 69,
  p79: 79,
  p89: 89,
  p99: 99,
}

const RAW_GUIDES: MaterialyGuide[] = [
  {
    slug: 'pies-w-upal',
    title: 'Pies w upał',
    subtitle: 'Jak bezpiecznie przejść przez gorące dni i szybciej zauważyć przeciążenie',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Krótki plan spacerów, odpoczynku, chłodzenia i obserwacji psa podczas upału.',
    forWhom: 'Dla opiekuna psa, który chce spokojnie przygotować dom i codzienny rytm na wysokie temperatury.',
    pdfFile: 'pies-w-upal.pdf',
    highlights: ['bezpieczny spacer', 'chłodzenie i nawodnienie', 'sygnały alarmowe'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-burza-nagly-halas',
    title: 'Burza i nagły hałas',
    subtitle: 'Pierwsza pomoc dla psa przy grzmotach, fajerwerkach i niespodziewanych dźwiękach',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Prosty plan bezpiecznego miejsca, ograniczenia bodźców i reagowania bez presji.',
    forWhom: 'Dla opiekuna psa, który drży, dyszy, chowa się albo próbuje uciekać podczas nagłego hałasu.',
    pdfFile: 'pies-burza-nagly-halas.pdf',
    highlights: ['bezpieczne schronienie', 'mniej bodźców', 'co robić po hałasie'],
    previewPageCount: 3,
  },
  {
    slug: 'wakacyjna-opieka-nad-psem',
    title: 'Wakacyjna opieka nad psem',
    subtitle: 'Jak przygotować psa, opiekuna zastępczego i dom przed wyjazdem',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Lista informacji, próbnych spotkań i rzeczy, które pomagają psu spokojniej zostać pod opieką.',
    forWhom: 'Dla opiekuna planującego urlop bez psa albo zmianę osoby zajmującej się nim na co dzień.',
    pdfFile: 'wakacyjna-opieka-nad-psem.pdf',
    highlights: ['próbne spotkanie', 'instrukcja dla opiekuna', 'rytuały i bezpieczeństwo'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-powrot-do-rutyny',
    title: 'Powrót do rutyny po urlopie',
    subtitle: 'Jak łagodnie wrócić z psem do codziennego rytmu po wyjeździe',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Kilka dni spokojnego przejścia między wakacyjnym rytmem a zwykłym planem domu.',
    forWhom: 'Dla opiekuna psa, który po urlopie jest bardziej pobudzony, niespokojny albo trudniej odpoczywa.',
    pdfFile: 'pies-powrot-do-rutyny.pdf',
    highlights: ['spokojne przejście', 'sen i regeneracja', 'stopniowy powrót wymagań'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-warczal-lub-ugryzl',
    title: 'Pies warczał lub ugryzł',
    subtitle: 'Co zrobić po incydencie i jak zabezpieczyć kolejne godziny bez eskalacji',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Pierwsze kroki po ugryzieniu lub ostrzegawczym warczeniu: bezpieczeństwo, fakty i dalsza pomoc.',
    forWhom: 'Dla opiekuna psa po świeżym incydencie, który potrzebuje uporządkować sytuację bez karania ostrzeżeń.',
    pdfFile: 'pies-warczal-lub-ugryzl.pdf',
    highlights: ['bezpieczeństwo po incydencie', 'co zanotować', 'kiedy szukać pilnej pomocy'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-w-upal',
    title: 'Kot w upał',
    subtitle: 'Jak przygotować mieszkanie i zauważyć, że kot potrzebuje pomocy',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Praktyczny plan chłodniejszych miejsc, wody, obserwacji i bezpiecznego reagowania.',
    forWhom: 'Dla opiekuna kota domowego podczas wysokich temperatur.',
    pdfFile: 'kot-w-upal.pdf',
    highlights: ['chłodniejsze strefy', 'woda i mokra karma', 'sygnały alarmowe'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-opieka-podczas-urlopu',
    title: 'Kot zostaje w domu podczas urlopu',
    subtitle: 'Jak przygotować przestrzeń, opiekuna i rytm kota na czas wyjazdu',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Czytelna lista przygotowań, dzięki której kot zachowuje możliwie stały i bezpieczny rytm.',
    forWhom: 'Dla opiekuna kota planującego wyjazd i opiekę dochodzącą w domu.',
    pdfFile: 'kot-opieka-podczas-urlopu.pdf',
    highlights: ['instrukcja dla opiekuna', 'stały rytm', 'codzienna obserwacja'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-transporter-bez-paniki',
    title: 'Transporter bez paniki',
    subtitle: 'Jak oswoić transporter i przygotować spokojniejszą podróż z kotem',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Małe kroki, które zmieniają transporter z zapowiedzi stresu w neutralny element domu.',
    forWhom: 'Dla opiekuna kota, który ucieka na widok transportera albo bardzo źle znosi wkładanie i podróż.',
    pdfFile: 'kot-transporter-bez-paniki.pdf',
    highlights: ['transporter w domu', 'krótkie etapy', 'przygotowanie do wyjazdu'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-po-zmianie-w-domu',
    title: 'Kot po zmianie w domu',
    subtitle: 'Jak przywrócić przewidywalność po remoncie, przeprowadzce lub zmianie domowników',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Pierwszy plan bezpieczeństwa, zasobów i codziennych rytuałów po zmianie.',
    forWhom: 'Dla opiekuna kota, który po zmianie jest czujny, wycofany albo gorzej odpoczywa.',
    pdfFile: 'kot-po-zmianie-w-domu.pdf',
    highlights: ['przewidywalny rytm', 'bezpieczne zasoby', 'obserwacja bez presji'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-drapie-meble',
    title: 'Kot drapie meble',
    subtitle: 'Jak zrozumieć potrzebę drapania i przekierować ją bez karania kota',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Praktyczny plan ustawienia drapaków, ochrony mebli i wzmacniania właściwego miejsca.',
    forWhom: 'Dla opiekuna kota drapiącego kanapę, fotel, framugi albo inne domowe powierzchnie.',
    pdfFile: 'kot-drapie-meble.pdf',
    highlights: ['funkcja drapania', 'dobór i miejsce drapaka', 'ochrona mebli'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-sam-w-domu',
    title: 'Pies sam w domu',
    subtitle: 'Jak rozpoznać próg trudności i zacząć spokojne rozstania',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Plan obserwacji, nagrania i pierwszych prób, które nie przekraczają możliwości psa.',
    forWhom: 'Dla opiekuna psa, który szczeka, wyje, niszczy albo silnie się pobudza po wyjściu człowieka.',
    pdfFile: 'pies-sam-w-domu.pdf',
    highlights: ['próg trudności', 'co nagrywać', 'spokojne próby'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-reaktywny-na-spacerze',
    title: 'Pies reaktywny na spacerze',
    subtitle: 'Mapa dystansu, bodźców i pierwszych bezpiecznych prób',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Porządkuje dystans, sytuacje zapalne i przygotowanie spaceru bez dokładania napięcia.',
    forWhom: 'Dla opiekuna psa, który szczeka, rzuca się, zastyga albo traci kontakt podczas mijanek.',
    pdfFile: 'pies-reaktywny-na-spacerze.pdf',
    highlights: ['bezpieczny dystans', 'mapa bodźców', 'plan mijanek'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-broni-zasobow',
    title: 'Pies broni zasobów',
    subtitle: 'Bezpieczeństwo domu i plan bez odbierania na siłę',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga ograniczyć ryzyko i rozpocząć pracę bez prowokowania kolejnych incydentów.',
    forWhom: 'Dla opiekuna psa, który sztywnieje, warczy albo pilnuje jedzenia, przedmiotów, miejsca lub człowieka.',
    pdfFile: 'pies-broni-zasobow.pdf',
    highlights: ['bezpieczne zarządzanie', 'sygnały ostrzegawcze', 'bez odbierania siłą'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-szczeka-na-gosci',
    title: 'Pies szczeka na gości',
    subtitle: 'Plan wejścia, dystansu i spokojnej obsługi wizyty',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Gotowy schemat od dzwonka do zakończenia wizyty, z mniejszą liczbą punktów zapalnych.',
    forWhom: 'Dla opiekuna psa, który szczeka, blokuje wejście albo długo nie może się uspokoić przy gościach.',
    pdfFile: 'pies-szczeka-na-gosci.pdf',
    highlights: ['przygotowanie wejścia', 'dystans od gościa', 'spokojniejsza wizyta'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-niszczy-w-domu',
    title: 'Pies niszczy w domu',
    subtitle: 'Jak rozdzielić nudę, napięcie i trudność z samotnością',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga zebrać fakty o niszczeniu i dobrać pierwszy krok do rzeczywistej przyczyny.',
    forWhom: 'Dla opiekuna psa, który gryzie przedmioty, niszczy drzwi, legowisko albo wyposażenie domu.',
    pdfFile: 'pies-niszczy-w-domu.pdf',
    highlights: ['moment niszczenia', 'nuda czy napięcie', 'plan obserwacji'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-kuweta-pierwszy-plan',
    title: 'Kot i kuweta',
    subtitle: 'Pierwszy plan działania przy problemie poza kuwetą',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Porządkuje zdrowie, środowisko, kuwetę i obserwację bez chaotycznego zmieniania wszystkiego naraz.',
    forWhom: 'Dla opiekuna kota, który oddaje mocz lub kał poza kuwetą albo zaczął jej unikać.',
    pdfFile: 'kot-kuweta-pierwszy-plan.pdf',
    highlights: ['najpierw zdrowie', 'ustawienie kuwety', 'plan obserwacji'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-zyje-w-napieciu',
    title: 'Kot żyje w napięciu',
    subtitle: 'Jak czytać sygnały stresu i odciążyć środowisko',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Mapa subtelnych sygnałów stresu i zmian środowiska, które zwiększają poczucie bezpieczeństwa.',
    forWhom: 'Dla opiekuna kota czujnego, wycofanego, drażliwego albo stale kontrolującego otoczenie.',
    pdfFile: 'kot-zyje-w-napieciu.pdf',
    highlights: ['ciche sygnały stresu', 'zasoby i kryjówki', 'odciążenie środowiska'],
    previewPageCount: 3,
  },
  {
    slug: 'konflikt-miedzy-kotami',
    title: 'Konflikt między kotami',
    subtitle: 'Od napięcia w domu do pierwszych zmian w zasobach',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga zauważyć cichą presję, blokowanie przestrzeni i nierówny dostęp do zasobów.',
    forWhom: 'Dla opiekuna dwóch lub więcej kotów, gdy pojawiają się gonitwy, unikanie albo napięcie przy zasobach.',
    pdfFile: 'konflikt-miedzy-kotami.pdf',
    highlights: ['cicha presja', 'mapa zasobów', 'pierwsze zmiany w domu'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-gryzie-przy-glaskaniu',
    title: 'Kot gryzie przy głaskaniu',
    subtitle: 'Granice dotyku, sygnały ostrzegawcze i bezpieczna zmiana',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Uczy zauważać moment, w którym dotyk przestaje być komfortowy i jak kończyć kontakt wcześniej.',
    forWhom: 'Dla opiekuna kota, który podczas głaskania nagle łapie zębami, drapie albo odchodzi.',
    pdfFile: 'kot-gryzie-przy-glaskaniu.pdf',
    highlights: ['granice dotyku', 'sygnały stop', 'bezpieczny kontakt'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-chowa-sie-po-zmianach',
    title: 'Kot chowa się po zmianach',
    subtitle: 'Plan adaptacji po remoncie, przeprowadzce lub nowym domowniku',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Plan odbudowy poczucia bezpieczeństwa bez wyciągania kota z kryjówki i przyspieszania kontaktu.',
    forWhom: 'Dla opiekuna kota, który po zmianie chowa się, je mniej, unika kontaktu albo porusza się głównie nocą.',
    pdfFile: 'kot-chowa-sie-po-zmianach.pdf',
    highlights: ['bezpieczna kryjówka', 'tempo kota', 'sygnały poprawy'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-zostaje-sam-plan-pierwszych-krokow',
    title: 'Pies zostaje sam',
    subtitle: 'Plan pierwszych kroków przy szczekaniu, wyciu i napięciu po wyjściu opiekuna',
    category: 'dog',
    tier: 'single',
    priceCode: 'p49',
    shortPromise: 'Praktyczny poradnik dla opiekuna, który chce zacząć działać spokojnie, a nie losowo testować kolejne pomysły.',
    forWhom: 'Dla opiekuna, który chce zacząć działać spokojnie, a nie losowo testować kolejne pomysły.',
    pdfFile: 'pies-zostaje-sam-plan-pierwszych-krokow.pdf',
    highlights: ['plan działania', 'pierwsze kroki', 'analiza'],
    previewPageCount: 3,
  },
  {
    slug: 'szczeniak-pierwsze-30-dni',
    title: 'Szczeniak: pierwsze 30 dni',
    subtitle: 'Profilaktyka chaosu, gryzienia, przebodźcowania i złych nawyków od pierwszego tygodnia',
    category: 'dog',
    tier: 'single',
    priceCode: 'p59',
    shortPromise: 'Kompletny plan dla pierwszego miesiąca ze szczeniakiem: środowisko, sen, aktywność, nauka i pierwsze czerwone flagi.',
    forWhom: 'Dla nowego opiekuna szczeniaka.',
    pdfFile: 'szczeniak-pierwsze-30-dni.pdf',
    highlights: ['środowisko i sen', 'aktywność', 'nauka'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-stres-srodowisko-i-bledy-opiekuna',
    title: 'Kot: stres i środowisko',
    subtitle: 'Jak rozpoznać napięcie, poprawić dom i nie utrwalać problemów codziennymi błędami',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Przewodnik po najczęstszych źródłach kociego stresu, subtelnych sygnałach napięcia i prostych zmianach środowiskowych.',
    forWhom: 'Dla opiekuna kota żyjącego w napięciu środowiskowym.',
    pdfFile: 'kot-stres-srodowisko-i-bledy-opiekuna.pdf',
    highlights: ['sygnały stresu', 'zmiany w domu', 'częste błędy'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-i-kuweta-pierwszy-plan-dzialania',
    title: 'Kot i kuweta',
    subtitle: 'Pierwszy plan działania przy sikaniu lub załatwianiu się poza kuwetą',
    category: 'cat',
    tier: 'single',
    priceCode: 'p59',
    shortPromise: 'Szczegółowy poradnik porządkujący diagnozę wstępną, środowisko, kuwetę, lokalizacje i plan monitorowania.',
    forWhom: 'Dla opiekuna kota załatwiającego się poza kuwetą.',
    pdfFile: 'kot-i-kuweta-pierwszy-plan-dzialania.pdf',
    highlights: ['diagnoza', 'środowisko', 'kuweta i żwirek'],
    previewPageCount: 3,
  },
  {
    slug: 'domowy-enrichment-plan-na-14-dni',
    title: 'Domowy enrichment',
    subtitle: '14-dniowy plan aktywności i regulacji pobudzenia dla psa lub kota mieszkającego w domu',
    category: 'both',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Krótki, checklistowy materiał z gotowym planem aktywności, odpoczynku i notowania reakcji psa lub kota.',
    forWhom: 'Dla każdego opiekuna psa i kota.',
    pdfFile: 'domowy-enrichment-plan-na-14-dni.pdf',
    highlights: ['plan aktywności', 'regulacja', 'obserwacja'],
    previewPageCount: 3,
  },
  {
    slug: 'pierwsze-dni-po-adopcji-psa-lub-kota',
    title: 'Pierwsze dni po adopcji',
    subtitle: 'Bezpieczne wdrożenie psa lub kota do domu bez przeciążania, pośpiechu i złych interpretacji',
    category: 'both',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Krótki poradnik wdrożeniowy dla opiekunów po adopcji: pierwszy dzień, pierwszy tydzień i sygnały, które wymagają zmiany planu.',
    forWhom: 'Dla świeżo upieczonego opiekuna po adopcji.',
    pdfFile: 'pierwsze-dni-po-adopcji-psa-lub-kota.pdf',
    highlights: ['pierwszy dzień', 'adaptacja', 'reagowanie'],
    previewPageCount: 3,
  },
  {
    slug: 'pies-boi-sie-gosci-i-dzwiekow',
    title: 'Pies boi się gości i dźwięków',
    subtitle: 'Jak ustawić bezpieczny plan przy lęku domowym, dzwonku i trudnych wizytach',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Mini-poradnik dla opiekunów psów lękowych przy gościach, dźwiękach i codziennym ruchu.',
    forWhom: 'Dla opiekuna lękliwego psa.',
    pdfFile: 'pies-boi-sie-gosci-i-dzwiekow.pdf',
    highlights: ['dźwięki', 'goście', 'bezpieczna przestrzeń'],
    previewPageCount: 3,
  },
  {
    slug: 'konflikt-miedzy-kotami-w-domu',
    title: 'Konflikt między kotami',
    subtitle: 'Jak rozpoznać cichy konflikt, blokady i napięcie w domu wielokotowym',
    category: 'cat',
    tier: 'single',
    priceCode: 'p39',
    shortPromise: 'Praktyczny mini-poradnik o subtelnym konflikcie, zasobach i bezpieczeństwie w domu wielokotowym.',
    forWhom: 'Dla opiekunów więcej niż jednego kota.',
    pdfFile: 'konflikt-miedzy-kotami-w-domu.pdf',
    highlights: ['cichy konflikt', 'zasoby', 'bezpieczeństwo'],
    previewPageCount: 3,
  },
  {
    slug: 'kot-dotyk-pielegnacja-i-obrona',
    title: 'Kot: dotyk i pielęgnacja',
    subtitle: 'Pierwszy plan przy obronie, napięciu i trudnych procedurach codziennych',
    category: 'cat',
    tier: 'single',
    priceCode: 'p29',
    shortPromise: 'Krótki poradnik o sygnałach granicy kota i bezpieczniejszej pielęgnacji.',
    forWhom: 'Dla opiekuna kota wrażliwego na dotyk.',
    pdfFile: 'kot-dotyk-pielegnacja-i-obrona.pdf',
    highlights: ['pielęgnacja', 'stawianie granic', 'bezpieczeństwo'],
    previewPageCount: 3,
  },
]

const RAW_BUNDLES: MaterialyBundle[] = [
  {
    slug: 'pakiet-startowy-psa',
    title: 'Pakiet Startowy Psa',
    subtitle: 'Spokojny start, lepszy rytm dnia i mniej chaosu w pierwszych tygodniach.',
    category: 'dog',
    priceCode: 'p89',
    guideSlugs: ['szczeniak-pierwsze-30-dni', 'domowy-enrichment-plan-na-14-dni', 'pierwsze-dni-po-adopcji-psa-lub-kota'],
    shortPromise: 'Spokojny start, lepszy rytm dnia i mniej chaosu w pierwszych tygodniach.',
  },
  {
    slug: 'pakiet-spokojny-dom-pies',
    title: 'Pakiet Spokojny Dom: pies',
    subtitle: 'Mniej przeciążenia, lepszy plan domowy i niższy próg wejścia do konsultacji.',
    category: 'dog',
    priceCode: 'p99',
    guideSlugs: ['pies-zostaje-sam-plan-pierwszych-krokow', 'pies-boi-sie-gosci-i-dzwiekow', 'domowy-enrichment-plan-na-14-dni'],
    shortPromise: 'Mniej przeciążenia, lepszy plan domowy i niższy próg wejścia do konsultacji.',
  },
  {
    slug: 'pakiet-spacerowy-pies',
    title: 'Pakiet Spacery Bez Napięcia',
    subtitle: 'Pierwszy plan pracy na spacerze i lepsza kontrola bodźców codziennych.',
    category: 'dog',
    priceCode: 'p69',
    guideSlugs: ['pies-reaktywny-na-spacerze', 'pies-boi-sie-gosci-i-dzwiekow'],
    shortPromise: 'Pierwszy plan pracy na spacerze i lepsza kontrola bodźców codziennych.',
  },
  {
    slug: 'pakiet-kota-domowego',
    title: 'Pakiet Kota Domowego',
    subtitle: 'Środowisko, kuweta i relacje domowe spięte w jeden sensowny plan.',
    category: 'cat',
    priceCode: 'p99',
    guideSlugs: ['kot-stres-srodowisko-i-bledy-opiekuna', 'kot-i-kuweta-pierwszy-plan-dzialania', 'konflikt-miedzy-kotami-w-domu'],
    shortPromise: 'Środowisko, kuweta i relacje domowe spięte w jeden sensowny plan.',
  },
  {
    slug: 'pakiet-kot-bez-napiecia',
    title: 'Pakiet Kot Bez Napięcia',
    subtitle: 'Lepsze bezpieczeństwo kota, mniej obrony i czytelniejsza praca z domem.',
    category: 'cat',
    priceCode: 'p79',
    guideSlugs: ['kot-stres-srodowisko-i-bledy-opiekuna', 'kot-dotyk-pielegnacja-i-obrona', 'konflikt-miedzy-kotami-w-domu'],
    shortPromise: 'Lepsze bezpieczeństwo kota, mniej obrony i czytelniejsza praca z domem.',
  }
]

const guidesBySlug = new Map(RAW_GUIDES.map((guide) => [guide.slug, guide] as const))
const bundlesBySlug = new Map(RAW_BUNDLES.map((bundle) => [bundle.slug, bundle] as const))
const PUBLISHED_GUIDE_SLUGS = [
  'pies-w-upal',
  'pies-burza-nagly-halas',
  'wakacyjna-opieka-nad-psem',
  'pies-powrot-do-rutyny',
  'pies-warczal-lub-ugryzl',
  'kot-w-upal',
  'kot-opieka-podczas-urlopu',
  'kot-transporter-bez-paniki',
  'kot-po-zmianie-w-domu',
  'kot-drapie-meble',
  'pies-sam-w-domu',
  'pies-reaktywny-na-spacerze',
  'pies-broni-zasobow',
  'pies-szczeka-na-gosci',
  'pies-niszczy-w-domu',
  'kot-kuweta-pierwszy-plan',
  'kot-zyje-w-napieciu',
  'konflikt-miedzy-kotami',
  'kot-gryzie-przy-glaskaniu',
  'kot-chowa-sie-po-zmianach',
] as const

export function listMaterialyGuides(): MaterialyGuide[] {
  return RAW_GUIDES
}

export function listPublishedMaterialyGuides(): MaterialyGuide[] {
  return PUBLISHED_GUIDE_SLUGS
    .map((slug) => guidesBySlug.get(slug))
    .filter((guide): guide is MaterialyGuide => guide !== undefined)
}

export function listMaterialyBundles(): MaterialyBundle[] {
  return RAW_BUNDLES
}

export function getMaterialyGuideBySlug(slug: string): MaterialyGuide | null {
  return guidesBySlug.get(slug) ?? null
}

export function getPublishedMaterialyGuideBySlug(slug: string): MaterialyGuide | null {
  const guide = guidesBySlug.get(slug)
  return guide && PUBLISHED_GUIDE_SLUGS.includes(slug as (typeof PUBLISHED_GUIDE_SLUGS)[number]) ? guide : null
}

export function getMaterialyBundleBySlug(slug: string): MaterialyBundle | null {
  return bundlesBySlug.get(slug) ?? null
}

export function getMaterialyGuideCoverSrc(guide: Pick<MaterialyGuide, 'slug'>): string {
  return `/branding/pdf-covers/${guide.slug}.png`
}

export function getMaterialyGuidePreviewSrcs(guide: Pick<MaterialyGuide, 'slug' | 'previewPageCount'>, limit = 3): string[] {
  const count = Math.max(0, Math.min(limit, guide.previewPageCount))

  return Array.from({ length: count }, (_, index) => {
    const page = String(index + 1).padStart(2, '0')
    return `/branding/pdf-previews/${guide.slug}/page_${page}.png`
  })
}

export function listMaterialyByTier(tier: MaterialyTier): (MaterialyGuide | MaterialyBundle)[] {
  if (tier === 'bundle') return RAW_BUNDLES
  return RAW_GUIDES.filter((guide) => guide.tier === tier)
}

export function listMaterialyByCategory(category: MaterialyCategory): MaterialyGuide[] {
  return RAW_GUIDES.filter((guide) => guide.category === category)
}

export function bundleSavings(bundle: MaterialyBundle): number {
  const sum = bundle.guideSlugs
    .map((slug) => guidesBySlug.get(slug))
    .filter((guide): guide is MaterialyGuide => guide !== undefined)
    .reduce((acc, guide) => acc + PRICE_AMOUNT_PLN[guide.priceCode], 0)

  return Math.max(0, sum - PRICE_AMOUNT_PLN[bundle.priceCode])
}

export function categoryLabel(category: MaterialyCategory): string {
  if (category === 'cat') return 'Kot'
  if (category === 'dog') return 'Pies'
  return 'Pies i kot'
}
