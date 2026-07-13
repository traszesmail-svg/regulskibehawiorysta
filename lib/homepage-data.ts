export type HomepageSelectorQuestionId = 'animal' | 'problem' | 'urgency'
export type HomepageSelectorAnimal = 'dog' | 'cat'
export type HomepageSelectorRecommendationKey = 'quarter' | 'double' | 'full'

export type HomepageSelectorAnswers = Partial<Record<HomepageSelectorQuestionId, string>>

export type HomepageSelectorOption = {
  id: string
  label: string
  helper?: string
}

export type HomepageSelectorQuestion = {
  id: HomepageSelectorQuestionId
  label: string
  title: string
  helper: string
  options: HomepageSelectorOption[]
}

export const homepageTrustBadges = [
  { title: 'COAPE / CAPBT', helper: 'certyfikowany behawiorysta' },
  { title: 'Technik weterynarii', helper: 'wiedza medyczna w praktyce' },
  { title: 'Psy i koty', helper: 'praca z oboma gatunkami' },
  { title: 'Bez kar i przymusu', helper: 'etyczne podejĹ›cie' },
  { title: 'Online', helper: 'wygodnie i bez stresu' },
] as const

export const homepageAnimalQuestion: HomepageSelectorQuestion = {
  id: 'animal',
  label: '1',
  title: 'Kogo dotyczy sytuacja?',
  helper: 'Wybierz zwierzÄ™, a potem temat najbliĹĽszy temu, co widzisz na co dzieĹ„.',
  options: [
    { id: 'dog', label: 'Pies', helper: 'Spacer, zostawanie samemu, szczeniak, napiÄ™cie, pobudzenie.' },
    { id: 'cat', label: 'Kot', helper: 'Kuweta, stres, drugi kot, nocna aktywnoĹ›Ä‡, zmiana w domu.' },
  ],
}

export const homepageProblemOptionsByAnimal: Record<HomepageSelectorAnimal, HomepageSelectorOption[]> = {
  dog: [
    { id: 'dog_walk', label: 'Spacery i reakcje na zewnÄ…trz', helper: 'Szczekanie, ciÄ…gniÄ™cie, spinanie siÄ™, trudne odwoĹ‚anie albo mocne emocje.' },
    { id: 'dog_separation', label: 'Pies sam w domu', helper: 'Wycie, niszczenie, napiÄ™cie albo panika przy wychodzeniu opiekuna.' },
    { id: 'puppy', label: 'Szczeniak i mĹ‚ody pies', helper: 'Gryzienie, skakanie, przeciÄ…ĹĽenie, nauka zasad i rytm dnia.' },
    { id: 'dog_aggression', label: 'NapiÄ™cie, warczenie, obrona zasobĂłw', helper: 'Najpierw sprawdzamy, co pies chroni, czego siÄ™ obawia i jak obniĹĽyÄ‡ ryzyko.' },
    { id: 'dog_barking_arousal', label: 'Kilka rzeczy naraz', helper: 'Zachowanie, emocje, zdrowie, dieta i codzienna rutyna zaczynajÄ… siÄ™ mieszaÄ‡.' },
    { id: 'dog_other', label: 'Nie wiem, jak to nazwaÄ‡', helper: 'Opisz sytuacjÄ™ wĹ‚asnymi sĹ‚owami, bez fachowej nazwy.' },
  ],
  cat: [
    { id: 'cat_litter', label: 'Kuweta i zaĹ‚atwianie poza kuwetÄ…', helper: 'Najpierw zdrowie, bĂłl, kuweta, miejsce, ĹĽwirek i napiÄ™cie w domu.' },
    { id: 'cat_stress', label: 'Stres, chowanie siÄ™, wycofanie', helper: 'Sprawdzamy, co mogĹ‚o zmieniÄ‡ poczucie bezpieczeĹ„stwa kota.' },
    { id: 'cat_conflict', label: 'NapiÄ™cie miÄ™dzy kotami', helper: 'Syczenie, gonitwy, blokowanie przejĹ›Ä‡ albo cicha presja.' },
    { id: 'cat_vocalization', label: 'Miauczenie, pobudzenie, nocne aktywnoĹ›ci', helper: 'Rytm dnia, potrzeby kota, jedzenie, Ĺ›rodowisko i moĹĽliwe napiÄ™cie.' },
    { id: 'cat_change', label: 'Zmiana w domu', helper: 'Przeprowadzka, nowy domownik, drugi kot albo zmiana rytmu dnia.' },
    { id: 'cat_other', label: 'Nie wiem, czy to zdrowie, stres czy relacja', helper: 'Nie musisz tego rozstrzygaÄ‡ przed rozmowÄ….' },
  ],
}

export const homepageUrgencyQuestion: HomepageSelectorQuestion = {
  id: 'urgency',
  label: '3',
  title: 'Jak bardzo potrzebujesz teraz uporzÄ…dkowania?',
  helper: 'To pomaga dobraÄ‡ zakres rozmowy bez zgadywania.',
  options: [
    { id: 'starter', label: 'ChcÄ™ tylko wiedzieÄ‡, od czego zaczÄ…Ä‡', helper: 'Potrzebujesz pierwszego kierunku i zatrzymania dziaĹ‚aĹ„ na Ĺ›lepo.' },
    { id: 'multi', label: 'To Ĺ‚Ä…czy siÄ™ z kilkoma rzeczami', helper: 'Dom, spacer, emocje, relacje albo rutyna zaczynajÄ… siÄ™ mieszaÄ‡.' },
    { id: 'complex', label: 'To trwa dĹ‚ugo albo wpĹ‚ywa na caĹ‚e ĹĽycie w domu', helper: 'Warto spokojniej zebraÄ‡ dane i uĹ‚oĹĽyÄ‡ plan dziaĹ‚ania.' },
  ],
}

export const homepageSelectorRecommendations: Record<
  HomepageSelectorRecommendationKey,
  {
    title: string
    summary: string
    ctaLabel: string
    service: string
    price: string
    duration: string
  }
> = {
  quarter: {
    title: 'Kwadrans',
    summary: 'Szybki pierwszy krok: na podstawie przekazanych informacji dostajesz wstÄ™pnÄ… analizÄ™ zachowania i kierunek dziaĹ‚ania.',
    ctaLabel: 'ChcÄ™ zaczÄ…Ä‡ od Kwadransa',
    service: 'szybka-konsultacja-15-min',
    price: '69 zĹ‚',
    duration: '15 min audio',
  },
  double: {
    title: 'Dwa kwadranse',
    summary: 'Dobry wybĂłr, gdy temat ma kilka wÄ…tkĂłw i potrzebuje szerszej analizy opartej na wiÄ™kszej iloĹ›ci danych.',
    ctaLabel: 'ChcÄ™ spokojniej omĂłwiÄ‡ temat',
    service: 'konsultacja-30-min',
    price: '169 zĹ‚',
    duration: '30 min online',
  },
  full: {
    title: 'PeĹ‚na konsultacja',
    summary: 'OkoĹ‚o 2h online dla spraw zĹ‚oĹĽonych: analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
    ctaLabel: 'ChcÄ™ peĹ‚nÄ… konsultacjÄ™',
    service: 'konsultacja-behawioralna-online',
    price: '470 zĹ‚',
    duration: 'ok. 2h online',
  },
}

export const homepageProcessSteps = [
  {
    step: '1',
    title: 'MĂłwisz, co naprawdÄ™ siÄ™ dzieje',
    copy: 'Wystarczy, ĹĽe powiesz, co robi pies albo kot, kiedy to siÄ™ dzieje, jak dĹ‚ugo trwa i co juĹĽ prĂłbowaliĹ›cie.',
  },
  {
    step: '2',
    title: 'PorzÄ…dkujemy informacje i szukamy przyczyny',
    copy: 'Na podstawie opisu, formularza, historii zachowania i nagraĹ„, jeĹ›li sÄ…, tworzÄ™ analizÄ™ zachowania opartÄ… na dostÄ™pnych danych.',
  },
  {
    step: '3',
    title: 'Wychodzisz z decyzjÄ…, nie z chaosem',
    copy: 'Wiesz, co zrobiÄ‡ jako pierwsze, czego na razie nie dokĹ‚adaÄ‡ i kiedy potrzebny jest szerszy plan pracy.',
  },
] as const

export function resolveHomepageSelectorRecommendation(answers: HomepageSelectorAnswers): HomepageSelectorRecommendationKey {
  const problem = answers.problem
  const urgency = answers.urgency

  if (urgency === 'complex') {
    return 'full'
  }

  if (problem === 'dog_aggression' && urgency !== 'starter') {
    return 'full'
  }

  if (problem === 'cat_conflict') {
    return urgency === 'starter' ? 'double' : 'full'
  }

  if (urgency === 'multi') {
    return 'double'
  }

  return 'quarter'
}

