import type { LeadMagnet } from '@/lib/growth-layer'

export const LEAD_MAGNETS: LeadMagnet[] = [
  {
    slug: 'pies-ile-ruchu-potrzebuje',
    title: 'Czy Twój pies potrzebuje więcej ruchu - czy mniej pobudzenia?',
    shortTitle: 'Czy Twój pies potrzebuje więcej ruchu - czy mniej pobudzenia?',
    subtitle: 'Krótki PDF o tym, kiedy ruch pomaga, a kiedy tylko dokłada pobudzenia.',
    h1: 'Czy Twój pies potrzebuje więcej ruchu - czy mniej pobudzenia?',
    lead: 'Materiał pomaga odróżnić brak ruchu od przeciążenia i zacząć od bezpieczniejszego rytmu dnia.',
    bullets: ['jak rozpoznać przeciążenie', 'kiedy odpoczynek jest ważniejszy niż dłuższy spacer', 'co obserwować przez pierwsze dni'],
    benefitCards: [
      { title: 'Mniej zgadywania', copy: 'Zamiast dokładać kolejne aktywności, sprawdzasz, co naprawdę napędza pobudzenie.' },
      { title: 'Do użycia od razu', copy: 'Materiał daje proste kryteria obserwacji codziennego rytmu.' },
      { title: 'Dobry start przed rozmową', copy: 'Po lekturze łatwiej opisać problem i ustalić kolejny krok.' },
    ],
    faq: [
      { question: 'Czy ten PDF zastępuje konsultację?', answer: 'Nie. To materiał startowy do obserwacji i porządkowania rytmu dnia.' },
      { question: 'Czy nadaje się przy reaktywności?', answer: 'Tak, jeśli chcesz sprawdzić, czy pies jest przeciążony i potrzebuje regulacji.' },
      { question: 'Kiedy przejść do rozmowy?', answer: 'Gdy pobudzenie wraca mimo zmian albo łączy się z innymi objawami.' },
    ],
    ctaLabel: 'Pobierz bezpłatny PDF',
    note: 'Podaj e-mail, a po zapisie dostaniesz link do pobrania. Bez spamu.',
    thankYouTitle: 'PDF jest gotowy do pobrania',
    thankYouBody: 'Możesz pobrać materiał od razu. Link wysyłam też na e-mail, żeby dało się do niego wrócić.',
    thankYouHint: 'Jeśli wiadomość nie dotrze, sprawdź spam albo pobierz plik bezpośrednio z tej strony.',
    followUpTitle: 'Jak wygląda rytm dnia psa po obserwacji?',
    followUpBody: 'Jeśli po materiale nadal nie wiesz, czy problemem jest ruch, pobudzenie czy odpoczynek, Kwadrans pomoże ustalić priorytet.',
    nextStepCopy: 'Najbliższy kolejny krok prowadzi do strony o psach albo do krótkiej rozmowy.',
    nextStepHref: '/psy',
    categoryHref: '/psy',
    categoryLabel: 'Psy',
    relatedLinks: [
      { href: '/psy/reaktywnosc-na-smyczy', label: 'Reaktywność na smyczy' },
      { href: '/materialy#psy', label: 'PDF: Pies sam w domu: co sprawdzić, zanim zaczniesz trening zostawania' },
      { href: '/behawiorysta-online-polska', label: 'Behawiorysta psów i kotów online' },
    ],
    asset: {
      kind: 'pdf',
      relativeFilePath: 'content/guides/pdf/pies-ile-ruchu-potrzebuje.pdf',
      fileName: 'pies-ile-ruchu-potrzebuje.pdf',
      mimeType: 'application/pdf',
    },
  },
  {
    slug: 'kot-zyje-w-napieciu',
    title: 'Czy Twój kot żyje w napięciu? Ciche sygnały, które łatwo przegapić',
    shortTitle: 'Czy Twój kot żyje w napięciu?',
    subtitle: 'PDF o cichych sygnałach stresu i pierwszych zmianach w domu.',
    h1: 'Czy Twój kot żyje w napięciu? Ciche sygnały, które łatwo przegapić',
    lead: 'Materiał pomaga zauważyć sygnały, które łatwo pomylić z charakterem kota albo zwykłym humorem.',
    bullets: ['jak czytać ciche sygnały napięcia', 'co sprawdzić w środowisku', 'kiedy zacząć od zdrowia'],
    benefitCards: [
      { title: 'Ciche sygnały', copy: 'Zwracasz uwagę na rzeczy, które zwykle umykają w codzienności.' },
      { title: 'Pierwszy porządek', copy: 'Materiał prowadzi od obserwacji do prostych zmian w domu.' },
      { title: 'Bez mitu o złośliwości', copy: 'Patrzysz na stres, zasoby i bezpieczeństwo, a nie na etykiety.' },
    ],
    faq: [
      { question: 'Czy ten PDF jest tylko przy kuwecie?', answer: 'Nie. Dotyczy szerszego napięcia: wycofania, czujności, zmian w domu i relacji.' },
      { question: 'Czy zastępuje lekarza?', answer: 'Nie. Przy nagłej zmianie zachowania albo objawach somatycznych zdrowie jest pierwszym krokiem.' },
      { question: 'Kiedy przejść do rozmowy?', answer: 'Gdy napięcie trwa, wraca falami albo łączy się z innymi objawami.' },
    ],
    ctaLabel: 'Pobierz bezpłatny PDF',
    note: 'Podaj e-mail, a po zapisie dostaniesz link do pobrania. Bez spamu.',
    thankYouTitle: 'PDF jest gotowy do pobrania',
    thankYouBody: 'Możesz pobrać materiał od razu. Link wysyłam też na e-mail, żeby dało się do niego wrócić.',
    thankYouHint: 'Jeśli wiadomość nie dotrze, sprawdź spam albo pobierz plik bezpośrednio z tej strony.',
    followUpTitle: 'Co wyszło z obserwacji napięcia kota?',
    followUpBody: 'Jeśli po materiale nadal nie wiesz, co napędza zachowanie kota, Kwadrans pomoże ustalić kolejność zmian.',
    nextStepCopy: 'Najbliższy kolejny krok prowadzi do strony o kotach albo do krótkiej rozmowy.',
    nextStepHref: '/koty',
    categoryHref: '/koty',
    categoryLabel: 'Koty',
    relatedLinks: [
      { href: '/koty/zalatwianie-poza-kuweta', label: 'Załatwianie poza kuwetą' },
      { href: '/koty/konflikt-miedzy-kotami', label: 'Konflikt między kotami' },
      { href: '/behawiorysta-online-polska', label: 'Behawiorysta psów i kotów online' },
    ],
    asset: {
      kind: 'pdf',
      relativeFilePath: 'content/guides/pdf/kot-zyje-w-napieciu.pdf',
      fileName: 'kot-zyje-w-napieciu.pdf',
      mimeType: 'application/pdf',
    },
  },
  {
    slug: '30-zachowan',
    title: '30 sygnałów, które warto zauważyć, zanim problem urośnie',
    shortTitle: '30 sygnałów, które warto zauważyć',
    subtitle: 'Lista sygnałów u psa i kota, które warto zanotować przed decyzją o kolejnym kroku.',
    h1: '30 sygnałów, które warto zauważyć, zanim problem urośnie',
    lead: 'Materiał pomaga oddzielić pojedynczy incydent od wzorca, który warto omówić albo monitorować.',
    bullets: ['zachowania u psa i kota', 'co obserwować bez paniki', 'kiedy materiał nie wystarcza'],
    benefitCards: [
      { title: 'Szeroki start', copy: 'Działa jako pierwszy materiał, gdy jeszcze nie wiesz, do której kategorii przypisać temat.' },
      { title: 'Lepszy opis sytuacji', copy: 'Po lekturze łatwiej opisać, co naprawdę wraca w codzienności.' },
      { title: 'Prosty kolejny krok', copy: 'Materiał pokazuje, kiedy wystarczy obserwacja, a kiedy warto wejść w rozmowę.' },
    ],
    faq: [
      { question: 'Dla psa czy kota?', answer: 'Dla obu. To najszerszy materiał startowy w aktualnym katalogu.' },
      { question: 'Czy wymaga płatności?', answer: 'Nie. Jest dostępny po zapisie e-mail.' },
      { question: 'Co po pobraniu?', answer: 'Przejrzyj listę i zanotuj, które zachowania wracają najczęściej.' },
    ],
    ctaLabel: 'Pobierz bezpłatny PDF',
    note: 'Podaj e-mail, a po zapisie dostaniesz link do pobrania. Bez spamu.',
    thankYouTitle: 'PDF jest gotowy do pobrania',
    thankYouBody: 'Możesz pobrać materiał od razu. Link wysyłam też na e-mail, żeby dało się do niego wrócić.',
    thankYouHint: 'Jeśli wiadomość nie dotrze, sprawdź spam albo pobierz plik bezpośrednio z tej strony.',
    followUpTitle: 'Które zachowania powtarzają się najczęściej?',
    followUpBody: 'Jeśli lista pokazała kilka wątków naraz, Kwadrans pomoże ustalić pierwszy priorytet.',
    nextStepCopy: 'Najbliższy kolejny krok prowadzi do materiałów PDF albo do krótkiej rozmowy.',
    nextStepHref: '/materialy',
    categoryHref: '/materialy',
    categoryLabel: 'Materiały PDF',
    relatedLinks: [
      { href: '/materialy', label: 'Wszystkie aktualne materiały PDF' },
      { href: '/psy', label: 'Materiały dla psa' },
      { href: '/koty', label: 'Materiały dla kota' },
    ],
    asset: {
      kind: 'pdf',
      relativeFilePath: 'content/guides/pdf/30-zachowan.pdf',
      fileName: '30-zachowan.pdf',
      mimeType: 'application/pdf',
    },
  },
  {
    slug: 'pierwszy-tydzien-z-kotem',
    title: 'Pierwszy tydzień z kotem: spokojny start bez przyspieszania kontaktu',
    shortTitle: 'Pierwszy tydzień z kotem: spokojny start',
    subtitle: 'Plan spokojnego wejścia kota do domu i pierwszych dni bez presji.',
    h1: 'Pierwszy tydzień z kotem: spokojny start bez przyspieszania kontaktu',
    lead: 'Materiał porządkuje przestrzeń, rytm i kontakt w pierwszych dniach po adopcji albo zmianie domu.',
    bullets: ['pokój bezpieczny', 'pierwsze rytuały', 'czego nie przyspieszać'],
    benefitCards: [
      { title: 'Spokojny start', copy: 'Nie przyspieszasz kontaktu i dajesz kotu czytelne warunki.' },
      { title: 'Mniej chaosu', copy: 'Wiesz, co przygotować przed wpuszczeniem kota do reszty domu.' },
      { title: 'Pierwsze obserwacje', copy: 'Łatwiej zauważyć, czy adaptacja idzie w dobrą stronę.' },
    ],
    faq: [
      { question: 'Czy to tylko dla adopcji?', answer: 'Najbardziej pomaga przy adopcji, ale nadaje się też po przeprowadzce albo dużej zmianie.' },
      { question: 'Czy dotyczy dorosłych kotów?', answer: 'Tak. Pierwszy tydzień ma znaczenie niezależnie od wieku kota.' },
      { question: 'Kiedy potrzebna jest rozmowa?', answer: 'Gdy kot nie je, chowa się długo albo napięcie narasta.' },
    ],
    ctaLabel: 'Pobierz bezpłatny PDF',
    note: 'Podaj e-mail, a po zapisie dostaniesz link do pobrania. Bez spamu.',
    thankYouTitle: 'PDF jest gotowy do pobrania',
    thankYouBody: 'Możesz pobrać materiał od razu. Link wysyłam też na e-mail, żeby dało się do niego wrócić.',
    thankYouHint: 'Jeśli wiadomość nie dotrze, sprawdź spam albo pobierz plik bezpośrednio z tej strony.',
    followUpTitle: 'Jak wygląda pierwszy tydzień kota?',
    followUpBody: 'Jeśli adaptacja utknęła albo kot wycofuje się mocniej, Kwadrans pomoże ustalić bezpieczny kolejny krok.',
    nextStepCopy: 'Najbliższy kolejny krok prowadzi do strony o kotach albo do krótkiej rozmowy.',
    nextStepHref: '/koty',
    categoryHref: '/koty',
    categoryLabel: 'Koty',
    relatedLinks: [
      { href: '/materialy#koty', label: 'PDF: Czy Twój kot żyje w napięciu? Ciche sygnały, które łatwo przegapić' },
      { href: '/koty', label: 'Pomoc dla kotów' },
      { href: '/behawiorysta-online-polska', label: 'Behawiorysta psów i kotów online' },
    ],
    asset: {
      kind: 'pdf',
      relativeFilePath: 'content/guides/pdf/pierwszy-tydzien-z-kotem.pdf',
      fileName: 'pierwszy-tydzien-z-kotem.pdf',
      mimeType: 'application/pdf',
    },
  },
  {
    slug: 'pies-sam-w-domu',
    title: 'Pies sam w domu: co sprawdzić, zanim zaczniesz trening zostawania',
    shortTitle: 'Pies sam w domu: co sprawdzić przed treningiem',
    subtitle: 'Pierwsze kroki, gdy zostawanie samemu zaczyna wyglądać jak problem.',
    h1: 'Pies sam w domu: co sprawdzić, zanim zaczniesz trening zostawania',
    lead: 'Materiał pomaga zebrać kontekst, odróżnić możliwe scenariusze i nie pogłębiać napięcia przy wychodzeniu.',
    bullets: ['co nagrywać', 'pierwsze 72 godziny', 'czego nie robić na siłę'],
    benefitCards: [
      { title: 'Lepsza obserwacja', copy: 'Wiesz, co sprawdzić na nagraniu i w rytmie dnia.' },
      { title: 'Bez przyspieszania', copy: 'Nie dokładasz treningu, który może pogłębić panikę.' },
      { title: 'Kierunek dalszej pracy', copy: 'Materiał ułatwia decyzję, czy potrzebna jest rozmowa.' },
    ],
    faq: [
      { question: 'Czy to jest plan leczenia lęku separacyjnego?', answer: 'Nie. To materiał startowy do bezpiecznej obserwacji i pierwszego porządku.' },
      { question: 'Czy potrzebuję nagrania?', answer: 'Nagranie bardzo pomaga, ale materiał pokazuje też, co sprawdzić bez niego.' },
      { question: 'Kiedy przejść do konsultacji?', answer: 'Gdy pies wpada w panikę, niszczy, wyje albo problem szybko narasta.' },
    ],
    ctaLabel: 'Pobierz bezpłatny PDF',
    note: 'Podaj e-mail, a po zapisie dostaniesz link do pobrania. Bez spamu.',
    thankYouTitle: 'PDF jest gotowy do pobrania',
    thankYouBody: 'Możesz pobrać materiał od razu. Link wysyłam też na e-mail, żeby dało się do niego wrócić.',
    thankYouHint: 'Jeśli wiadomość nie dotrze, sprawdź spam albo pobierz plik bezpośrednio z tej strony.',
    followUpTitle: 'Co pokazało zostawanie psa samemu?',
    followUpBody: 'Jeśli po materiale nadal nie wiesz, czy to panika, frustracja czy przeciążenie, Kwadrans pomoże ustalić pierwszy bezpieczny krok.',
    nextStepCopy: 'Najbliższy kolejny krok prowadzi do strony o lęku separacyjnym albo do krótkiej rozmowy.',
    nextStepHref: '/psy/lek-separacyjny',
    categoryHref: '/psy',
    categoryLabel: 'Psy',
    relatedLinks: [
      { href: '/psy/lek-separacyjny', label: 'Lęk separacyjny u psa' },
      { href: '/materialy#psy', label: 'PDF: Czy Twój pies potrzebuje więcej ruchu - czy mniej pobudzenia?' },
      { href: '/behawiorysta-online-polska', label: 'Behawiorysta psów i kotów online' },
    ],
    asset: {
      kind: 'pdf',
      relativeFilePath: 'content/guides/pdf/pies-sam-w-domu.pdf',
      fileName: 'pies-sam-w-domu.pdf',
      mimeType: 'application/pdf',
    },
  },
]

const LEAD_MAGNET_BY_SLUG = new Map(LEAD_MAGNETS.map((item) => [item.slug, item] as const))

export function listLeadMagnetPaths() {
  return LEAD_MAGNETS.map((item) => `/bezplatne-materialy/${item.slug}`)
}

export function getLeadMagnetBySlug(slug: string) {
  return LEAD_MAGNET_BY_SLUG.get(slug) ?? null
}

export function getProblemLandingLeadMagnetSlug(routePath: string) {
  if (routePath === '/psy/lek-separacyjny') {
    return 'pies-sam-w-domu'
  }

  if (routePath === '/psy/reaktywnosc-na-smyczy') {
    return 'pies-ile-ruchu-potrzebuje'
  }

  if (routePath === '/koty/zalatwianie-poza-kuweta' || routePath === '/koty/konflikt-miedzy-kotami') {
    return 'kot-zyje-w-napieciu'
  }

  return '30-zachowan'
}
