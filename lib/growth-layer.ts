export type GrowthSpecies = 'pies' | 'kot' | 'oba'
export type LeadMagnetAsset =
  | {
      kind: 'pdf'
      relativeFilePath: string
      fileName: string
      mimeType: 'application/pdf'
    }
  | {
      kind: 'text'
      fileName: string
      mimeType: 'text/plain; charset=utf-8'
      body: string
    }

export type LeadMagnet = {
  slug: string
  title: string
  shortTitle: string
  subtitle: string
  h1: string
  lead: string
  bullets: string[]
  benefitCards: Array<{ title: string; copy: string }>
  faq: Array<{ question: string; answer: string }>
  ctaLabel: string
  note: string
  thankYouTitle: string
  thankYouBody: string
  thankYouHint: string
  followUpTitle: string
  followUpBody: string
  nextStepCopy: string
  nextStepHref: string
  categoryHref: string
  categoryLabel: string
  relatedLinks: Array<{ href: string; label: string }>
  asset: LeadMagnetAsset
}

export type LocalSeoFaqItem = {
  question: string
  answer: string
}

export type LocalSeoPage = {
  path: string
  title: string
  description: string
  h1: string
  intro: string[]
  problemCards: Array<{ title: string; copy: string; href?: string }>
  supportTitle: string
  supportBody: string[]
  firstStepCards: Array<{ title: string; copy: string }>
  faq: LocalSeoFaqItem[]
  relatedLinks: Array<{ href: string; label: string; copy: string }>
}

export type TopicalClusterLink = {
  href: string
  label: string
  copy: string
}

export type TopicalCluster = {
  routePath: string
  serviceLink: TopicalClusterLink
  blogLinks: TopicalClusterLink[]
}

const TOPICAL_CLUSTERS: TopicalCluster[] = [
  {
    routePath: '/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy',
    serviceLink: {
      href: '/behawiorysta-online-polska',
      label: 'Behawiorysta psów i kotów online',
      copy: 'Kanoniczna strona usługi, jeśli chcesz przejść z treści problemowej do głównego opisu pomocy.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: dlaczego mój pies szczeka na inne psy',
        copy: 'Pomaga szybciej nazwać wzorzec spacerowy i zobaczyć, co realnie napędza reakcje psa.',
      },
      {
        href: '/blog',
        label: 'Blog: pies ciągnie na smyczy',
        copy: 'Praktyczny wpis o tym, dlaczego pies ciągnie i jak zacząć to zmieniać na spacerze.',
      },
      {
        href: '/blog',
        label: 'Blog: luzna smycz z reaktywnym psem',
        copy: 'Przechodzi z rozumienia problemu do pierwszej praktyki spacerowej bez szarpania.',
      },
    ],
  },
  {
    routePath: '/blog/pies-wyje-kiedy-zostaje-sam',
    serviceLink: {
      href: '/behawiorysta-online-polska',
      label: 'Behawiorysta psów i kotów online',
      copy: 'Główna strona usługi, jeśli chcesz przejść od materiałów o samotności do rozmowy o swoim psie.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: pies wyje, kiedy zostaje sam',
        copy: 'Pomaga odróżnić lęk separacyjny od frustracji, nudy i innych scenariuszy zostawania samemu.',
      },
      {
        href: '/blog',
        label: 'Blog: jak nagrać psa zostawionego samemu',
        copy: 'Pokazuje, jak zebrać materiał, który realnie skraca drogę do dobrej analizy zachowania.',
      },
      {
        href: '/blog',
        label: 'Blog: rutyna wyjścia i oswajanie z samotnością',
        copy: 'Rozwija temat pierwszego planu treningowego bez skokow i bez przypadkowego przyspieszania.',
      },
    ],
  },
  {
    routePath: '/blog/kot-zalatwia-sie-poza-kuweta',
    serviceLink: {
      href: '/behawiorysta-online-polska',
      label: 'Behawiorysta psów i kotów online',
      copy: 'Główna strona usługi, jeśli po treściach o kuwecie chcesz przejść do spokojnego omówienia swojego przypadku.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: kot załatwia się poza kuwetą',
        copy: 'Najszerszy punkt startu przed rozpisaniem zdrowia, kuwety i napięcia środowiskowego.',
      },
      {
        href: '/blog',
        label: 'Blog: jak wybrać kuwetę i żwirek',
        copy: 'Porządkuje wybór kuwety i żwirku, zanim zaczniesz zmieniać cały dom naraz.',
      },
      {
        href: '/blog',
        label: 'Blog: stres kota a zachowania toaletowe',
        copy: 'Dopina warstwę środowiskową, kiedy zdrowie i sama kuweta nie tłumaczą już problemu.',
      },
    ],
  },
  {
    routePath: '/blog/jak-zapoznac-dwa-koty',
    serviceLink: {
      href: '/behawiorysta-online-polska',
      label: 'Behawiorysta psów i kotów online',
      copy: 'Główna strona usługi, jeśli konflikt w domu wymaga już ułożenia pierwszego planu zewnętrznego wsparcia.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: jak wprowadzic nowego kota',
        copy: 'Pomaga nie zepsuć relacji już na starcie, zanim napięcie zamieni się w stały konflikt.',
      },
      {
        href: '/blog',
        label: 'Blog: agresja przekierowana u kota',
        copy: 'Ważny kontekst, gdy napięcie eksploduje nagle i wydaje się nieadekwatne do sytuacji.',
      },
      {
        href: '/blog',
        label: 'Blog: jak zapoznac dwa koty',
        copy: 'Przechodzi krok po kroku przez spokojny proces zapoznania, zanim koty zaczną mieszkać razem.',
      },
    ],
  },
]


export const LOCAL_SEO_PAGES: LocalSeoPage[] = [
  {
    path: '/behawiorysta-online-polska',
    title: 'Behawiorysta psów i kotów online - cała Polska',
    description: 'Behawiorysta psów i kotów online dla opiekunów z całej Polski. 15 min audio na start, pełna konsultacja około 2h przy sprawach szerszych.',
    h1: 'Behawiorysta psów i kotów online',
    intro: [
      'Pracuję online z opiekunami psów i kotów z całej Polski.',
      'Nie prowadzę wizyt domowych ani konsultacji stacjonarnych. Pracujemy zdalnie, na podstawie opisu sytuacji, historii problemu i tego, jak wygląda codzienność zwierzęcia.',
      'Ta strona jest głównym punktem wejścia dla usługi. Jeśli temat dotyczy konkretnego problemu psa albo kota, niżej znajdziesz przejście do odpowiedniej kategorii.',
    ],
    problemCards: [
      { title: 'Problem dotyczy psa', copy: 'Spacery, reaktywność, rozłąka, pobudzenie albo trudne zachowania w domu.', href: '/psy' },
      { title: 'Problem dotyczy kota', copy: 'Kuweta, stres, wycofanie, napięcie w domu albo relacje między kotami.', href: '/koty' },
      { title: 'Chcesz ustalić pierwszy krok', copy: 'Masz jedno pytanie albo potrzebujesz spokojnie uporządkować temat przed dalszym działaniem.' },
      { title: 'Sprawa jest szersza', copy: 'Problem trwa dłużej, wraca albo obejmuje kilka wątków naraz i wymaga dłuższej rozmowy.' },
    ],
    supportTitle: 'Jak wygląda taka pomoc online',
    supportBody: [
      'W pracy behawioralnej najważniejsze są kontekst, historia problemu, środowisko i codzienne sytuacje, w których zachowanie wraca. To właśnie porządkujemy na rozmowie.',
      'Do startu wystarczy krótki opis. Nagrania bywają pomocne, ale nie są warunkiem, a kamera nie jest potrzebna przy 15 min audio.',
      'Opis procesu pełnej konsultacji znajduje się na osobnej stronie usługi. Tutaj najpierw ustalasz, czy pracujemy o psie, o kocie, czy od razu potrzebujesz szerszej rozmowy online.',
    ],
    firstStepCards: [
      { title: '15 min audio', copy: 'Krótka rozmowa głosowa bez kamery. Dobra na jedno pytanie, pierwszy ogląd sytuacji i ustalenie priorytetu.' },
      { title: 'Materiały PDF', copy: 'Materiały startowe, jeśli chcesz najpierw coś spokojnie przeczytać i uporządkować obserwacje.' },
      { title: 'Pełna konsultacja', copy: 'Około 2h online, analiza zachowania, plan działania i 7 dni wsparcia przez WhatsApp przy sprawach złożonych.' },
    ],
    faq: [
      { question: 'Czy konsultacja online jest dostępna dla całej Polski?', answer: 'Tak. Pracuję online z opiekunami z całej Polski, w tej samej formule niezależnie od miejsca.' },
      { question: 'Czy potrzebuję kamery albo specjalnego sprzętu?', answer: 'Nie. Przy 15 min audio wystarcza rozmowa głosowa. Przy pełnej konsultacji wideo może pomóc, ale nie jest obowiązkowe.' },
      { question: 'Czy mogę zgłosić temat przed adopcją albo przed zmianą w domu?', answer: 'Tak. Możesz omówić przygotowanie domu, plan działania i rzeczy, które warto sprawdzić wcześniej.' },
      { question: 'Od czego najlepiej zacząć?', answer: 'Jeśli nie wiesz jeszcze, jak duży jest temat, zacznij od 15 min audio. Jeśli problem jest złożony i trwa od dawna, wybierz pełną konsultację.' },
      { question: 'Gdzie sprawdzić dostępne terminy?', answer: 'Aktualną dostępność najłatwiej sprawdzić w kalendarzu przy rezerwacji.' },
    ],
    relatedLinks: [
      { href: '/psy', label: 'Pomoc dla opiekunów psów', copy: 'Jeśli problem dotyczy psa, tutaj znajdziesz szerszy opis najczęstszych tematów i problemów.' },
      { href: '/koty', label: 'Pomoc dla opiekunów kotów', copy: 'Jeśli problem dotyczy kota, tutaj znajdziesz szerszy opis najczęstszych tematów i problemów.' },
      { href: '/konsultacja-behawioralna-online', label: 'Jak wygląda pełna konsultacja', copy: 'Osobna strona procesu i przebiegu dłuższej konsultacji online.' },
      { href: '/cennik', label: 'Cennik', copy: 'Porownanie 15 min audio i pełnej konsultacji.' },
      { href: '/kontakt', label: 'Kontakt', copy: 'Krótka wiadomość, jeśli chcesz coś doprecyzować przed rezerwacja.' },
    ],
  },
] as const

const LOCAL_SEO_PAGE_BY_PATH = new Map(LOCAL_SEO_PAGES.map((page) => [page.path, page] as const))
const TOPICAL_CLUSTER_BY_ROUTE_PATH = new Map(TOPICAL_CLUSTERS.map((cluster) => [cluster.routePath, cluster] as const))

export const NEWSLETTER_SIGNUP_COPY = {
  title: 'Newsletter dla opiekunów psów i kotów',
  lead: 'Piszę raz na jakiś czas, tylko kiedy mam coś konkretnego. Głównie o tym, co napędza zachowanie zwierząt i co z tym zrobić bez nadmiaru teorii.',
  buttonLabel: 'Zapisz się',
  note: 'Raz w miesiącu spokojna porcja wiedzy o psach, kotach i pierwszych krokach w trudnych sytuacjach. Możesz wypisać się jednym kliknięciem.',
  successTitle: 'Dziękuję za zapis',
  successBody: 'Na liście zostajesz po to, żeby dostawać praktyczne treści, a nie częste kampanie sprzedażowe.',
} as const


export function listLocalSeoPaths() {
  return LOCAL_SEO_PAGES.map((page) => page.path)
}

export function getLocalSeoPageByPath(pathname: string) {
  return LOCAL_SEO_PAGE_BY_PATH.get(pathname) ?? null
}

export function getTopicalClusterByRoutePath(routePath: string) {
  return TOPICAL_CLUSTER_BY_ROUTE_PATH.get(routePath) ?? null
}
