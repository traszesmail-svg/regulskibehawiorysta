export type SeasonalTrendEntry = {
  id: string
  months: number[]
  seasonLabel: string
  eyebrow: string
  title: string
  copy: string
  href: string
  instagramHref: string
  ctaLabel: string
  problemKey: string
  species?: 'pies' | 'kot'
}

export type SeasonalTrendRadar = {
  campaign: string
  month: number
  activeEntries: SeasonalTrendEntry[]
  nextEntries: SeasonalTrendEntry[]
}

export const SEASONAL_TREND_CAMPAIGN = 'trend_radar_seasonal'

function withUtm(path: string, params: Record<string, string>) {
  const [pathname, query = ''] = path.split('?')
  const searchParams = new URLSearchParams(query)

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value)
  }

  const queryString = searchParams.toString()

  return queryString ? `${pathname}?${queryString}` : pathname
}

function withSeasonalSiteUtm(path: string, content: string) {
  return withUtm(path, {
    utm_source: 'site',
    utm_medium: 'seasonal',
    utm_campaign: SEASONAL_TREND_CAMPAIGN,
    utm_content: content,
  })
}

function withSeasonalInstagramUtm(path: string, content: string) {
  return withUtm(path, {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: SEASONAL_TREND_CAMPAIGN,
    utm_content: content,
  })
}

function seasonalEntry(entry: Omit<SeasonalTrendEntry, 'href' | 'instagramHref'> & { path: string }): SeasonalTrendEntry {
  return {
    ...entry,
    href: withSeasonalSiteUtm(entry.path, entry.id),
    instagramHref: withSeasonalInstagramUtm(entry.path, entry.id),
  }
}

export const SEASONAL_TREND_ENTRIES: SeasonalTrendEntry[] = [
  seasonalEntry({
    id: 'burze-i-nagly-halas',
    months: [5, 6, 7, 8],
    seasonLabel: 'Maj-sierpień',
    eyebrow: 'Sezon / burze',
    title: 'Burze i nagły hałas',
    copy:
      'Przy panice nie testujemy odwagi. Najpierw zabezpieczamy miejsce odpoczynku, dystans i przewidywalny plan na najbliższe dni.',
    path: '/mapa-sprawy?problem=halas-burza-fajerwerki',
    ctaLabel: 'Ustal pierwszy krok',
    problemKey: 'halas-burza-fajerwerki',
  }),
  seasonalEntry({
    id: 'wakacje-opieka-i-zmiana-rytmu',
    months: [6, 7, 8],
    seasonLabel: 'Czerwiec-sierpień',
    eyebrow: 'Sezon / wyjazdy',
    title: 'Wakacje, opieka i zmiana rytmu',
    copy:
      'Wyjazd, inny opiekun albo nowy plan dnia potrafią nasilić samotność, napięcie i problemy z wyciszeniem. Tu liczy się przygotowanie przed zmianą.',
    path: '/mapa-sprawy?problem=wakacje-opieka-zmiana-rytmu',
    ctaLabel: 'Sprawdź przygotowanie',
    problemKey: 'wakacje-opieka-zmiana-rytmu',
    species: 'pies',
  }),
  seasonalEntry({
    id: 'powrot-do-pracy-i-szkoly',
    months: [9, 10],
    seasonLabel: 'Wrzesień-październik',
    eyebrow: 'Sezon / rutyna',
    title: 'Powrót do pracy i szkoły',
    copy:
      'Po wakacjach problem zostawania samemu często wraca mocniej. Zamiast nagłej próby warto sprawdzić nagranie i próg trudności.',
    path: '/problemy/pies-nie-zostaje-sam',
    ctaLabel: 'Zobacz plan samotności',
    problemKey: 'pies-nie-zostaje-sam',
    species: 'pies',
  }),
  seasonalEntry({
    id: 'sylwester-i-fajerwerki',
    months: [12, 1],
    seasonLabel: 'Grudzień-styczeń',
    eyebrow: 'Sezon / fajerwerki',
    title: 'Sylwester i fajerwerki',
    copy:
      'Najlepszy plan powstaje przed kulminacją hałasu. W kryzysie priorytetem jest bezpieczeństwo, nie trening na siłę.',
    path: '/mapa-sprawy?problem=halas-burza-fajerwerki',
    ctaLabel: 'Przygotuj bezpieczny plan',
    problemKey: 'halas-burza-fajerwerki',
  }),
  seasonalEntry({
    id: 'adopcja-i-pierwsze-tygodnie',
    months: [9, 10, 11],
    seasonLabel: 'Jesień',
    eyebrow: 'Sezon / adopcja',
    title: 'Nowy pies po wakacjach',
    copy:
      'Pierwsze tygodnie po adopcji to mniej presji i więcej przewidywalności. Dobre wejście zmniejsza ryzyko problemów później.',
    path: '/blog/nowy-pies-pierwsze-72-godziny',
    ctaLabel: 'Czytaj o pierwszych dniach',
    problemKey: 'nowy-pies-pierwsze-dni',
    species: 'pies',
  }),
]

export function getSeasonalTrendRadar(date = new Date()): SeasonalTrendRadar {
  const month = date.getMonth() + 1
  const activeEntries = SEASONAL_TREND_ENTRIES.filter((entry) => entry.months.includes(month))
  const nextEntries = SEASONAL_TREND_ENTRIES.filter((entry) => !entry.months.includes(month)).slice(0, 3)

  return {
    campaign: SEASONAL_TREND_CAMPAIGN,
    month,
    activeEntries: activeEntries.length > 0 ? activeEntries : SEASONAL_TREND_ENTRIES.slice(0, 2),
    nextEntries,
  }
}
