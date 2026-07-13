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
      label: 'Behawiorysta psĂłw i kotĂłw online',
      copy: 'Kanoniczna strona usĹ‚ugi, jeĹ›li chcesz przejĹ›Ä‡ z treĹ›ci problemowej do gĹ‚Ăłwnego opisu pomocy.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: dlaczego mĂłj pies szczeka na inne psy',
        copy: 'Pomaga szybciej nazwaÄ‡ wzorzec spacerowy i zobaczyÄ‡, co realnie napÄ™dza reakcje psa.',
      },
      {
        href: '/blog',
        label: 'Blog: pies ciÄ…gnie na smyczy',
        copy: 'Praktyczny wpis o tym, dlaczego pies ciÄ…gnie i jak zaczÄ…Ä‡ to zmieniaÄ‡ na spacerze.',
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
      label: 'Behawiorysta psĂłw i kotĂłw online',
      copy: 'GĹ‚Ăłwna strona usĹ‚ugi, jeĹ›li chcesz przejĹ›Ä‡ od materiaĹ‚Ăłw o samotnoĹ›ci do rozmowy o swoim psie.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: pies wyje, kiedy zostaje sam',
        copy: 'Pomaga odrĂłĹĽniÄ‡ lÄ™k separacyjny od frustracji, nudy i innych scenariuszy zostawania samemu.',
      },
      {
        href: '/blog',
        label: 'Blog: jak nagraÄ‡ psa zostawionego samemu',
        copy: 'Pokazuje, jak zebraÄ‡ materiaĹ‚, ktĂłry realnie skraca drogÄ™ do dobrej analizy zachowania.',
      },
      {
        href: '/blog',
        label: 'Blog: rutyna wyjĹ›cia i oswajanie z samotnoĹ›ciÄ…',
        copy: 'Rozwija temat pierwszego planu treningowego bez skokow i bez przypadkowego przyspieszania.',
      },
    ],
  },
  {
    routePath: '/blog/kot-zalatwia-sie-poza-kuweta',
    serviceLink: {
      href: '/behawiorysta-online-polska',
      label: 'Behawiorysta psĂłw i kotĂłw online',
      copy: 'GĹ‚Ăłwna strona usĹ‚ugi, jeĹ›li po treĹ›ciach o kuwecie chcesz przejĹ›Ä‡ do spokojnego omĂłwienia swojego przypadku.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: kot zaĹ‚atwia siÄ™ poza kuwetÄ…',
        copy: 'Najszerszy punkt startu przed rozpisaniem zdrowia, kuwety i napiÄ™cia Ĺ›rodowiskowego.',
      },
      {
        href: '/blog',
        label: 'Blog: jak wybraÄ‡ kuwetÄ™ i ĹĽwirek',
        copy: 'PorzÄ…dkuje wybĂłr kuwety i ĹĽwirku, zanim zaczniesz zmieniaÄ‡ caĹ‚y dom naraz.',
      },
      {
        href: '/blog',
        label: 'Blog: stres kota a zachowania toaletowe',
        copy: 'Dopina warstwÄ™ Ĺ›rodowiskowÄ…, kiedy zdrowie i sama kuweta nie tĹ‚umaczÄ… juĹĽ problemu.',
      },
    ],
  },
  {
    routePath: '/blog/jak-zapoznac-dwa-koty',
    serviceLink: {
      href: '/behawiorysta-online-polska',
      label: 'Behawiorysta psĂłw i kotĂłw online',
      copy: 'GĹ‚Ăłwna strona usĹ‚ugi, jeĹ›li konflikt w domu wymaga juĹĽ uĹ‚oĹĽenia pierwszego planu zewnÄ™trznego wsparcia.',
    },
    blogLinks: [
      {
        href: '/blog',
        label: 'Blog: jak wprowadzic nowego kota',
        copy: 'Pomaga nie zepsuÄ‡ relacji juĹĽ na starcie, zanim napiÄ™cie zamieni siÄ™ w staĹ‚y konflikt.',
      },
      {
        href: '/blog',
        label: 'Blog: agresja przekierowana u kota',
        copy: 'WaĹĽny kontekst, gdy napiÄ™cie eksploduje nagle i wydaje siÄ™ nieadekwatne do sytuacji.',
      },
      {
        href: '/blog',
        label: 'Blog: jak zapoznac dwa koty',
        copy: 'Przechodzi krok po kroku przez spokojny proces zapoznania, zanim koty zacznÄ… mieszkaÄ‡ razem.',
      },
    ],
  },
]


export const LOCAL_SEO_PAGES: LocalSeoPage[] = [
  {
    path: '/behawiorysta-online-polska',
    title: 'Behawiorysta psĂłw i kotĂłw online - caĹ‚a Polska',
    description: 'Behawiorysta psĂłw i kotĂłw online dla opiekunĂłw z caĹ‚ej Polski. 15 min audio na start, peĹ‚na konsultacja okoĹ‚o 2h przy sprawach szerszych.',
    h1: 'Behawiorysta psĂłw i kotĂłw online',
    intro: [
      'PracujÄ™ online z opiekunami psĂłw i kotĂłw z caĹ‚ej Polski.',
      'Nie prowadzÄ™ wizyt domowych ani konsultacji stacjonarnych. Pracujemy zdalnie, na podstawie opisu sytuacji, historii problemu i tego, jak wyglÄ…da codziennoĹ›Ä‡ zwierzÄ™cia.',
      'Ta strona jest gĹ‚Ăłwnym punktem wejĹ›cia dla usĹ‚ugi. JeĹ›li temat dotyczy konkretnego problemu psa albo kota, niĹĽej znajdziesz przejĹ›cie do odpowiedniej kategorii.',
    ],
    problemCards: [
      { title: 'Problem dotyczy psa', copy: 'Spacery, reaktywnoĹ›Ä‡, rozĹ‚Ä…ka, pobudzenie albo trudne zachowania w domu.', href: '/psy' },
      { title: 'Problem dotyczy kota', copy: 'Kuweta, stres, wycofanie, napiÄ™cie w domu albo relacje miÄ™dzy kotami.', href: '/koty' },
      { title: 'Chcesz ustaliÄ‡ pierwszy krok', copy: 'Masz jedno pytanie albo potrzebujesz spokojnie uporzÄ…dkowaÄ‡ temat przed dalszym dziaĹ‚aniem.' },
      { title: 'Sprawa jest szersza', copy: 'Problem trwa dĹ‚uĹĽej, wraca albo obejmuje kilka wÄ…tkĂłw naraz i wymaga dĹ‚uĹĽszej rozmowy.' },
    ],
    supportTitle: 'Jak wyglÄ…da taka pomoc online',
    supportBody: [
      'W pracy behawioralnej najwaĹĽniejsze sÄ… kontekst, historia problemu, Ĺ›rodowisko i codzienne sytuacje, w ktĂłrych zachowanie wraca. To wĹ‚aĹ›nie porzÄ…dkujemy na rozmowie.',
      'Do startu wystarczy krĂłtki opis. Nagrania bywajÄ… pomocne, ale nie sÄ… warunkiem, a kamera nie jest potrzebna przy 15 min audio.',
      'Opis procesu peĹ‚nej konsultacji znajduje siÄ™ na osobnej stronie usĹ‚ugi. Tutaj najpierw ustalasz, czy pracujemy o psie, o kocie, czy od razu potrzebujesz szerszej rozmowy online.',
    ],
    firstStepCards: [
      { title: '15 min audio', copy: 'KrĂłtka rozmowa gĹ‚osowa bez kamery. Dobra na jedno pytanie, pierwszy oglÄ…d sytuacji i ustalenie priorytetu.' },
      { title: 'MateriaĹ‚y PDF', copy: 'MateriaĹ‚y startowe, jeĹ›li chcesz najpierw coĹ› spokojnie przeczytaÄ‡ i uporzÄ…dkowaÄ‡ obserwacje.' },
      { title: 'PeĹ‚na konsultacja', copy: 'OkoĹ‚o 2h online, analiza zachowania, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy sprawach zĹ‚oĹĽonych.' },
    ],
    faq: [
      { question: 'Czy konsultacja online jest dostÄ™pna dla caĹ‚ej Polski?', answer: 'Tak. PracujÄ™ online z opiekunami z caĹ‚ej Polski, w tej samej formule niezaleĹĽnie od miejsca.' },
      { question: 'Czy potrzebujÄ™ kamery albo specjalnego sprzÄ™tu?', answer: 'Nie. Przy 15 min audio wystarcza rozmowa gĹ‚osowa. Przy peĹ‚nej konsultacji wideo moĹĽe pomĂłc, ale nie jest obowiÄ…zkowe.' },
      { question: 'Czy mogÄ™ zgĹ‚osiÄ‡ temat przed adopcjÄ… albo przed zmianÄ… w domu?', answer: 'Tak. MoĹĽesz omĂłwiÄ‡ przygotowanie domu, plan dziaĹ‚ania i rzeczy, ktĂłre warto sprawdziÄ‡ wczeĹ›niej.' },
      { question: 'Od czego najlepiej zaczÄ…Ä‡?', answer: 'JeĹ›li nie wiesz jeszcze, jak duĹĽy jest temat, zacznij od 15 min audio. JeĹ›li problem jest zĹ‚oĹĽony i trwa od dawna, wybierz peĹ‚nÄ… konsultacjÄ™.' },
      { question: 'Gdzie sprawdziÄ‡ dostÄ™pne terminy?', answer: 'AktualnÄ… dostÄ™pnoĹ›Ä‡ najĹ‚atwiej sprawdziÄ‡ w kalendarzu przy rezerwacji.' },
    ],
    relatedLinks: [
      { href: '/psy', label: 'Pomoc dla opiekunĂłw psĂłw', copy: 'JeĹ›li problem dotyczy psa, tutaj znajdziesz szerszy opis najczÄ™stszych tematĂłw i problemĂłw.' },
      { href: '/koty', label: 'Pomoc dla opiekunĂłw kotĂłw', copy: 'JeĹ›li problem dotyczy kota, tutaj znajdziesz szerszy opis najczÄ™stszych tematĂłw i problemĂłw.' },
      { href: '/konsultacja-behawioralna-online', label: 'Jak wyglÄ…da peĹ‚na konsultacja', copy: 'Osobna strona procesu i przebiegu dĹ‚uĹĽszej konsultacji online.' },
      { href: '/cennik', label: 'Cennik', copy: 'Porownanie 15 min audio i peĹ‚nej konsultacji.' },
      { href: '/kontakt', label: 'Kontakt', copy: 'KrĂłtka wiadomoĹ›Ä‡, jeĹ›li chcesz coĹ› doprecyzowaÄ‡ przed rezerwacja.' },
    ],
  },
] as const

const LOCAL_SEO_PAGE_BY_PATH = new Map(LOCAL_SEO_PAGES.map((page) => [page.path, page] as const))
const TOPICAL_CLUSTER_BY_ROUTE_PATH = new Map(TOPICAL_CLUSTERS.map((cluster) => [cluster.routePath, cluster] as const))

export const NEWSLETTER_SIGNUP_COPY = {
  title: 'Newsletter dla opiekunĂłw psĂłw i kotĂłw',
  lead: 'PiszÄ™ raz na jakiĹ› czas, tylko kiedy mam coĹ› konkretnego. GĹ‚Ăłwnie o tym, co napÄ™dza zachowanie zwierzÄ…t i co z tym zrobiÄ‡ bez nadmiaru teorii.',
  buttonLabel: 'Zapisz siÄ™',
  note: 'Raz w miesiÄ…cu spokojna porcja wiedzy o psach, kotach i pierwszych krokach w trudnych sytuacjach. MoĹĽesz wypisaÄ‡ siÄ™ jednym klikniÄ™ciem.',
  successTitle: 'DziÄ™kujÄ™ za zapis',
  successBody: 'Na liĹ›cie zostajesz po to, ĹĽeby dostawaÄ‡ praktyczne treĹ›ci, a nie czÄ™ste kampanie sprzedaĹĽowe.',
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

