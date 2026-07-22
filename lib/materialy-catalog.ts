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
    slug: 'kot-zyje-w-napieciu',
    title: 'Czy Twój kot żyje w napięciu? Ciche sygnały, które łatwo przegapić',
    subtitle: 'Jak rozpoznać kota w długim stresie i co naprawdę ma znaczenie',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Mapa codziennych sygnałów napięcia i pierwszych reakcji środowiskowych.',
    forWhom: 'Dla opiekuna kota, który widzi wycofanie, czujność albo drobne sygnały stresu i chce zacząć od spokojnej obserwacji.',
    pdfFile: 'kot-zyje-w-napieciu.pdf',
    highlights: ['sygnały napięcia', 'pierwsze zmiany w domu', 'kiedy sprawdzić zdrowie'],
    previewPageCount: 9,
  },
  {
    slug: 'pies-ile-ruchu-potrzebuje',
    title: 'Czy Twój pies potrzebuje więcej ruchu - czy mniej pobudzenia?',
    subtitle: 'Kiedy dokładanie aktywności pogarsza sprawę i jak to rozpoznać',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Prosty filtr: czy psu brakuje ruchu, czy odpoczynku i regulacji.',
    forWhom: 'Dla opiekuna psa, który słyszy "dodaj ruchu", ale widzi, że po spacerach pies jest bardziej pobudzony, a nie spokojniejszy.',
    pdfFile: 'pies-ile-ruchu-potrzebuje.pdf',
    highlights: ['ruch kontra odpoczynek', 'sygnały przeciążenia', 'bezpieczniejszy rytm dnia'],
    previewPageCount: 8,
  },
  {
    slug: 'kwadrans-podstawy-kota',
    title: 'Przed Kwadransem: co przygotować, żeby 15 minut naprawdę pomogło',
    subtitle: 'Krótki materiał porządkujący pierwszą rozmowę o kocie',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Co warto zauważyć przed Kwadransem, żeby rozmowa szybciej zeszła do konkretu.',
    forWhom: 'Dla opiekuna kota, który chce przygotować najważniejsze informacje przed krótką konsultacją.',
    pdfFile: 'kwadrans-podstawy-kota.pdf',
    highlights: ['opis problemu', 'rytm dnia', 'co przygotować przed rozmową'],
    previewPageCount: 11,
  },
  {
    slug: 'kwadrans-podstawy-psa',
    title: 'Przed Kwadransem: co przygotować, żeby 15 minut naprawdę pomogło',
    subtitle: 'Krótki materiał porządkujący pierwszą rozmowę o psie',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Najważniejsze informacje przed Kwadransem, bez rozpisywania całej historii od zera.',
    forWhom: 'Dla opiekuna psa, który chce szybko zebrać kontekst do krótkiej konsultacji.',
    pdfFile: 'kwadrans-podstawy-psa.pdf',
    highlights: ['jedno główne pytanie', 'krótka historia sytuacji', 'co pomaga w analizie zachowania'],
    previewPageCount: 11,
  },
  {
    slug: '30-zachowan',
    title: '30 sygnałów, które warto zauważyć, zanim problem urośnie',
    subtitle: 'Sygnały u psa i kota, które warto zanotować przed decyzją o kolejnym kroku',
    category: 'both',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Lista zachowań i sygnałów, które pomagają oddzielić incydent od wzorca.',
    forWhom: 'Dla opiekuna psa albo kota, który chce spokojnie sprawdzić, co właściwie wraca w codzienności.',
    pdfFile: '30-zachowan.pdf',
    highlights: ['sygnały ciała', 'kiedy obserwować', 'kiedy przejść do rozmowy'],
    previewPageCount: 11,
  },
  {
    slug: 'pierwszy-tydzien-z-kotem',
    title: 'Pierwszy tydzień z kotem: spokojny start bez przyspieszania kontaktu',
    subtitle: 'Plan spokojnego wejścia kota do domu i pierwszych dni bez presji',
    category: 'cat',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Praktyczny plan pierwszych dni: przestrzeń, rytm, kontakt i obserwacja.',
    forWhom: 'Dla opiekuna, który przyjmuje kota do domu albo chce naprawić zbyt szybki start po adopcji.',
    pdfFile: 'pierwszy-tydzien-z-kotem.pdf',
    highlights: ['pokój bezpieczny', 'pierwsze rytuały', 'czego nie przyspieszać'],
    previewPageCount: 11,
  },
  {
    slug: 'pies-sam-w-domu',
    title: 'Pies sam w domu: co sprawdzić, zanim zaczniesz trening zostawania',
    subtitle: 'Pierwsze kroki, gdy zostawanie samemu zaczyna wyglądać jak problem',
    category: 'dog',
    tier: 'free',
    priceCode: 'free',
    shortPromise: 'Jak zebrać kontekst, odróżnić scenariusze i nie pogłębiać napięcia.',
    forWhom: 'Dla opiekuna psa, który widzi wycie, niszczenie, pobudzenie albo trudny powrót po wyjściu z domu.',
    pdfFile: 'pies-sam-w-domu.pdf',
    highlights: ['co nagrywać', 'pierwsze 72 godziny', 'czego nie robić na siłę'],
    previewPageCount: 11,
  },
  {
    slug: 'konflikt-miedzy-kotami',
    title: 'Konflikt między kotami',
    subtitle: 'Jak rozpoznać cichą presję, napięcie i rywalizację w domu',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga zobaczyć, czy koty naprawdę się bawią, czy tylko unikają otwartego konfliktu.',
    forWhom: 'Dla opiekuna dwóch lub więcej kotów, gdy w domu pojawia się blokowanie przejść, gonitwy, napięcie przy miskach albo kuweta staje się problemem.',
    pdfFile: 'konflikt-miedzy-kotami.pdf',
    highlights: ['sygnały presji', 'zasoby i przestrzeń', 'plan na 14 dni'],
    previewPageCount: 12,
  },
  {
    slug: 'kot-boi-sie-kuwety',
    title: 'Kot boi się kuwety',
    subtitle: 'Pierwszy plan działania, gdy kuweta kojarzy się z napięciem',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Porządkuje możliwe przyczyny lęku kuwetowego i pierwsze zmiany bez nacisku na kota.',
    forWhom: 'Dla opiekuna kota, który unika kuwety, podchodzi do niej ostrożnie albo wybiera inne miejsca mimo sprzątania i prób zmiany żwirku.',
    pdfFile: 'kot-boi-sie-kuwety.pdf',
    highlights: ['kuweta i otoczenie', 'lęk kontra nawyk', 'bezpieczne testy'],
    previewPageCount: 12,
  },
  {
    slug: 'kot-budzi-dom-po-nocy',
    title: 'Kot budzi dom po nocy',
    subtitle: 'Rytm dnia, nocna aktywność i pierwsze kroki do spokojniejszego poranka',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga odróżnić głód, rytuał, nudę i napięcie od problemu zdrowotnego lub środowiskowego.',
    forWhom: 'Dla opiekuna kota, który miauczy nad ranem, chodzi po mieszkaniu, domaga się jedzenia albo budzi dom mimo prób ignorowania.',
    pdfFile: 'kot-budzi-dom-po-nocy.pdf',
    highlights: ['nocny rytm', 'obserwacja 7 dni', 'plan poranka'],
    previewPageCount: 12,
  },
  {
    slug: 'kot-chowa-sie-po-zmianach',
    title: 'Kot chowa się po zmianach',
    subtitle: 'Jak pomóc kotu wrócić do bezpieczeństwa bez przyspieszania kontaktu',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pokazuje, jak czytać wycofanie po zmianie domu, remoncie, gościach albo nowym zwierzęciu.',
    forWhom: 'Dla opiekuna kota, który po zmianach siedzi pod łóżkiem, je mniej, unika kontaktu albo porusza się tylko nocą.',
    pdfFile: 'kot-chowa-sie-po-zmianach.pdf',
    highlights: ['bezpieczna przestrzeń', 'tempo adaptacji', 'kiedy szukać pomocy'],
    previewPageCount: 11,
  },
  {
    slug: 'kot-gryzie-przy-glaskaniu',
    title: 'Kot gryzie przy głaskaniu',
    subtitle: 'Sygnał stop, dotyk i granice kontaktu z kotem',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Uczy rozpoznawać moment, w którym głaskanie przestaje być dla kota komfortowe.',
    forWhom: 'Dla opiekuna kota, który po chwili kontaktu łapie zębami, drapie, odwraca głowę albo nagle kończy bliskość.',
    pdfFile: 'kot-gryzie-przy-glaskaniu.pdf',
    highlights: ['kontakt społeczny', 'mapa dotyku', 'sygnały ostrzegawcze'],
    previewPageCount: 11,
  },
  {
    slug: 'koty-zabawa-czy-napiecie',
    title: 'Koty: zabawa czy napięcie?',
    subtitle: 'Jak odróżnić gonitwę od presji i kiedy przerwać interakcję',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Daje prosty filtr do oceny codziennych gonitw, zapasów i blokowania przestrzeni.',
    forWhom: 'Dla opiekuna kotów, który nie jest pewien, czy widzi dobrą zabawę, rywalizację czy narastający konflikt.',
    pdfFile: 'koty-zabawa-czy-napiecie.pdf',
    highlights: ['gonitwa i pauzy', 'rola przestrzeni', 'plan porządkowania'],
    previewPageCount: 11,
  },
  {
    slug: 'miauczenie-o-swicie',
    title: 'Miauczenie o świcie',
    subtitle: 'Poranny rytm, potrzeby kota i plan zmiany bez walki o sen',
    category: 'cat',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga sprawdzić, co wzmacnia poranne miauczenie i jak zmienić rytm bez przypadkowych kar.',
    forWhom: 'Dla opiekuna kota, który budzi dom o świcie, prosi o jedzenie, chodzi po łóżku albo utrwala poranny schemat.',
    pdfFile: 'miauczenie-o-swicie.pdf',
    highlights: ['poranna wokalizacja', 'obserwacja 7 dni', 'zmiana rytmu'],
    previewPageCount: 11,
  },
  {
    slug: 'pies-broni-zasobow',
    title: 'Pies broni zasobów',
    subtitle: 'Miska, kość, kanapa i pierwszy bezpieczny plan pracy',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga zrozumieć obronę zasobów bez prowokowania kolejnych incydentów.',
    forWhom: 'Dla opiekuna psa, który warczy, sztywnieje, ucieka z przedmiotem albo pilnuje jedzenia, miejsca, zabawek lub człowieka.',
    pdfFile: 'pies-broni-zasobow.pdf',
    highlights: ['mowa ciała', 'bezpieczeństwo w domu', 'plan 14 dni'],
    previewPageCount: 11,
  },
  {
    slug: 'pies-do-pracy-z-ludzmi',
    title: 'Pies do pracy z ludźmi',
    subtitle: 'Predyspozycje, dotyk, otoczenie i spokojna ocena profilu psa',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Porządkuje, kiedy pies może dobrze znosić pracę z ludźmi, a kiedy potrzebuje innego tempa.',
    forWhom: 'Dla opiekuna, który myśli o pracy psa przy ludziach, odwiedzinach, edukacji lub kontakcie z osobami spoza domu.',
    pdfFile: 'pies-do-pracy-z-ludzmi.pdf',
    highlights: ['profil psa', 'bezpieczeństwo opiekuna', 'obserwacja zachowań'],
    previewPageCount: 12,
  },
  {
    slug: 'pies-glupieje-na-smyczy',
    title: 'Pies głupieje na smyczy',
    subtitle: 'Bariera, dystans i praca nad spacerem bez dokładania napięcia',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pokazuje, co naprawdę dzieje się na smyczy i jak przestać utrwalać pobudzenie.',
    forWhom: 'Dla opiekuna psa, który ciągnie, szczeka, skacze, zastyga albo traci kontakt w mijankach i przy bodźcach.',
    pdfFile: 'pies-glupieje-na-smyczy.pdf',
    highlights: ['dystans i bariera', 'sygnały ciała', 'plan spaceru'],
    previewPageCount: 12,
  },
  {
    slug: 'pies-niszczy-w-domu',
    title: 'Pies niszczy w domu',
    subtitle: 'Jak odróżnić nudę, stres, samotność i brak regulacji',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga zebrać fakty o niszczeniu i dobrać pierwszy krok bez zgadywania.',
    forWhom: 'Dla opiekuna psa, który gryzie przedmioty, niszczy drzwi, legowisko albo podłogę, szczególnie po wyjściu człowieka.',
    pdfFile: 'pies-niszczy-w-domu.pdf',
    highlights: ['moment niszczenia', 'samotność i ból', 'plan dzienny'],
    previewPageCount: 10,
  },
  {
    slug: 'pies-pogon-i-hamulce',
    title: 'Pies: pogoń i brak hamulców',
    subtitle: 'Regulacja pobudzenia, pogoń i odzyskiwanie kontroli w codzienności',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga zrozumieć pogoń, ekscytację i trudność z zatrzymaniem zachowania.',
    forWhom: 'Dla opiekuna psa, który odpala się na ruch, goni, demoluje po pobudzeniu albo długo nie wraca do równowagi.',
    pdfFile: 'pies-pogon-i-hamulce.pdf',
    highlights: ['pogoń i pobudzenie', 'sen i regeneracja', 'więcej regulacji'],
    previewPageCount: 12,
  },
  {
    slug: 'pies-szczeka-na-gosci',
    title: 'Pies szczeka na gości',
    subtitle: 'Próg, dzwonek, wejście gościa i plan mniejszego chaosu',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Porządkuje, co dzieje się przy wejściu gości i jak zmniejszyć eskalację.',
    forWhom: 'Dla opiekuna psa, który szczeka przy dzwonku, blokuje próg, skacze, wycofuje się albo długo nie umie odpuścić po wejściu gościa.',
    pdfFile: 'pies-szczeka-na-gosci.pdf',
    highlights: ['próg i dzwonek', 'mniej chaosu', 'rytm wizyty'],
    previewPageCount: 10,
  },
  {
    slug: 'szczeniak-gryzie-i-skacze',
    title: 'Szczeniak gryzie i skacze',
    subtitle: 'Ekscytacja, sen i środowisko zamiast walki z normalnym zachowaniem',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pokazuje, kiedy gryzienie i skakanie jest etapem rozwoju, a kiedy sygnałem przeciążenia.',
    forWhom: 'Dla opiekuna szczeniaka, który gryzie ręce, skacze, nakręca się wieczorem albo ma trudność z odpoczynkiem.',
    pdfFile: 'szczeniak-gryzie-i-skacze.pdf',
    highlights: ['sen i pobudzenie', 'gryzienie rąk', 'plan domowy'],
    previewPageCount: 12,
  },
  {
    slug: 'szczeniak-wyciszanie',
    title: 'Szczeniak: wyciszanie',
    subtitle: 'Rytm, sen i samoregulacja bez dokładania kolejnych bodźców',
    category: 'dog',
    tier: 'single',
    priceCode: 'p19',
    shortPromise: 'Pomaga ułożyć dzień szczeniaka tak, żeby odpoczynek stał się częścią planu, a nie przypadkiem.',
    forWhom: 'Dla opiekuna szczeniaka, który nie umie odpoczywać, łatwo się nakręca albo po aktywności staje się trudniejszy, nie spokojniejszy.',
    pdfFile: 'szczeniak-wyciszanie.pdf',
    highlights: ['sen i rytm dnia', 'samoregulacja', 'mniej bodźców'],
    previewPageCount: 10,
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
    slug: 'pies-reaktywny-na-spacerze',
    title: 'Pies reaktywny na spacerze',
    subtitle: 'Pierwszy plan pracy przy szczekaniu, spinaniu się i trudnych mijankach',
    category: 'dog',
    tier: 'single',
    priceCode: 'p39',
    shortPromise: 'Krótki poradnik porządkujący pierwsze decyzje przy reaktywności spacerowej.',
    forWhom: 'Dla opiekuna psa reaktywnego na spacerze.',
    pdfFile: 'pies-reaktywny-na-spacerze.pdf',
    highlights: ['trudne mijanki', 'szczekanie', 'plan pracy'],
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

export function listMaterialyGuides(): MaterialyGuide[] {
  return RAW_GUIDES
}

export function listMaterialyBundles(): MaterialyBundle[] {
  return RAW_BUNDLES
}

export function getMaterialyGuideBySlug(slug: string): MaterialyGuide | null {
  return guidesBySlug.get(slug) ?? null
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
