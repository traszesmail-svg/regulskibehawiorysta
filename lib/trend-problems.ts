export type TrendProblemGroupId = 'pies' | 'kot' | 'bezpieczenstwo'

export type TrendProblemCard = {
  id: string
  group: TrendProblemGroupId
  eyebrow: string
  title: string
  copy: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  featuredOnHome?: boolean
}

export const TREND_PROBLEM_GROUPS: Array<{
  id: TrendProblemGroupId
  title: string
  copy: string
}> = [
  {
    id: 'pies',
    title: 'Pies',
    copy: 'Spacery, samotność, pobudzenie i pierwsze tygodnie w domu. Zacznij od sytuacji, którą widzisz najczęściej.',
  },
  {
    id: 'kot',
    title: 'Kot',
    copy: 'Kuweta, gryzienie, chowanie się i napięcie między kotami. Najpierw porządkujemy objawy, potem wybieramy krok.',
  },
  {
    id: 'bezpieczenstwo',
    title: 'Kiedy najpierw sprawdzić tło',
    copy: 'Nagła zmiana zachowania, panika, ból albo kilka objawów naraz wymagają spokojnego filtra przed poradą.',
  },
]

export const TREND_PROBLEM_CARDS: TrendProblemCard[] = [
  {
    id: 'pies-szczeka-na-psy',
    group: 'pies',
    eyebrow: 'Pies / spacer',
    title: 'Pies szczeka na inne psy',
    copy: 'To nie zawsze agresja. Często pod spodem jest dystans, napięcie, frustracja albo za trudne mijanie.',
    primaryHref: '/problemy/pies-szczeka-na-psy',
    primaryLabel: 'Zobacz pierwszy krok',
    secondaryHref: '/blog/dlaczego-moj-pies-szczeka-na-inne-psy',
    secondaryLabel: 'Czytaj artykuł',
    featuredOnHome: true,
  },
  {
    id: 'pies-ciagnie-na-smyczy',
    group: 'pies',
    eyebrow: 'Pies / smycz',
    title: 'Pies ciągnie na smyczy',
    copy: 'Sprzęt bywa pomocny, ale nie zastąpi sprawdzenia emocji, bodźców i tego, czy pies jest jeszcze w kontakcie.',
    primaryHref: '/problemy/pies-ciagnie-na-smyczy',
    primaryLabel: 'Zobacz pierwszy krok',
    secondaryHref: '/blog/pies-ciagnie-na-smyczy',
    secondaryLabel: 'Czytaj artykuł',
    featuredOnHome: true,
  },
  {
    id: 'pies-nie-zostaje-sam',
    group: 'pies',
    eyebrow: 'Pies / samotność',
    title: 'Pies nie zostaje sam',
    copy: 'Wycie, niszczenie albo panika po wyjściu opiekuna wymagają nagrania i planu, nie samego zmęczenia psa.',
    primaryHref: '/problemy/pies-nie-zostaje-sam',
    primaryLabel: 'Zobacz pierwszy krok',
    secondaryHref: '/blog/pies-wyje-kiedy-zostaje-sam',
    secondaryLabel: 'Czytaj artykuł',
    featuredOnHome: true,
  },
  {
    id: 'pies-niszczy-lub-nie-wycisza-sie',
    group: 'pies',
    eyebrow: 'Pies / pobudzenie',
    title: 'Pies niszczy albo trudno mu się wyciszyć',
    copy: 'To może być samotność, przeciążenie, brak odpoczynku albo zbyt szybkie dokładanie aktywności.',
    primaryHref: '/blog/jak-nauczyc-psa-zostawania-samemu',
    primaryLabel: 'Czytaj artykuł',
    secondaryHref: '/problemy/pies-nie-zostaje-sam',
    secondaryLabel: 'Sprawdź samotność',
    featuredOnHome: true,
  },
  {
    id: 'kot-sika-poza-kuweta',
    group: 'kot',
    eyebrow: 'Kot / kuweta',
    title: 'Kot sika poza kuwetą',
    copy: 'Najpierw trzeba wykluczyć zdrowie i sprawdzić kuwetę, zasoby, stres oraz napięcie w domu.',
    primaryHref: '/problemy/kot-sika-poza-kuweta',
    primaryLabel: 'Zobacz pierwszy krok',
    secondaryHref: '/blog/kot-zalatwia-sie-poza-kuweta',
    secondaryLabel: 'Czytaj artykuł',
    featuredOnHome: true,
  },
  {
    id: 'kot-gryzie-przy-glaskaniu',
    group: 'kot',
    eyebrow: 'Kot / kontakt',
    title: 'Kot gryzie przy głaskaniu',
    copy: 'Często wcześniej pokazuje drobne sygnały: napięcie ogona, skóry, uszu albo próbę odsunięcia się.',
    primaryHref: '/problemy/kot-gryzie-przy-glaskaniu',
    primaryLabel: 'Zobacz pierwszy krok',
    secondaryHref: '/mapa-sprawy?problem=kot-gryzie-przy-glaskaniu',
    secondaryLabel: 'Ułóż Mapę sprawy',
    featuredOnHome: true,
  },
  {
    id: 'konflikt-miedzy-kotami',
    group: 'kot',
    eyebrow: 'Kot / relacje',
    title: 'Koty żyją w napięciu',
    copy: 'Konflikt nie zawsze wygląda jak bójka. Czasem to blokowanie przejść, zasobów i ciche unikanie.',
    primaryHref: '/problemy/konflikt-miedzy-kotami',
    primaryLabel: 'Zobacz pierwszy krok',
    secondaryHref: '/blog/jak-zapoznac-dwa-koty',
    secondaryLabel: 'Czytaj artykuł',
    featuredOnHome: true,
  },
  {
    id: 'nagla-zmiana-zachowania',
    group: 'bezpieczenstwo',
    eyebrow: 'Pies lub kot / alarm',
    title: 'Nagła zmiana zachowania',
    copy: 'Jeśli zwierzę nagle sika, chowa się, warczy, gryzie albo traci rutynę, trzeba brać pod uwagę ból i zdrowie.',
    primaryHref: '/mapa-sprawy?problem=nagla-zmiana-zachowania',
    primaryLabel: 'Sprawdź pierwszy krok',
    featuredOnHome: true,
  },
  {
    id: 'nowy-pies-pierwsze-dni',
    group: 'pies',
    eyebrow: 'Pies / adopcja',
    title: 'Nowy pies w domu',
    copy: 'Pierwsze dni to mniej presji, więcej przewidywalności i spokojne budowanie rytmu zamiast testowania granic.',
    primaryHref: '/blog/nowy-pies-pierwsze-72-godziny',
    primaryLabel: 'Czytaj artykuł',
  },
  {
    id: 'kot-chowa-sie-lub-zyje-w-napieciu',
    group: 'kot',
    eyebrow: 'Kot / stres',
    title: 'Kot chowa się albo żyje w napięciu',
    copy: 'Wycofanie, nocna aktywność i zmiana korzystania z przestrzeni mogą być subtelnymi sygnałami stresu.',
    primaryHref: '/blog/stres-kota-a-zachowania-toaletowe',
    primaryLabel: 'Czytaj artykuł',
    secondaryHref: '/problemy/konflikt-miedzy-kotami',
    secondaryLabel: 'Sprawdź relacje kotów',
  },
  {
    id: 'halas-burza-fajerwerki',
    group: 'bezpieczenstwo',
    eyebrow: 'Sezon / hałas',
    title: 'Burza, fajerwerki i panika',
    copy: 'Przy silnym lęku plan robi się przed sezonem. W kryzysie najważniejsze są bezpieczeństwo, dystans i brak dokładania presji.',
    primaryHref: '/mapa-sprawy?problem=halas-burza-fajerwerki',
    primaryLabel: 'Dobierz pierwszy krok',
  },
]

export const HOME_TREND_PROBLEM_CARDS = TREND_PROBLEM_CARDS.filter((card) => card.featuredOnHome)
