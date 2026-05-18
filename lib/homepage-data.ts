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
  { title: 'Bez kar i przymusu', helper: 'etyczne podejście' },
  { title: 'Online', helper: 'wygodnie i bez stresu' },
] as const

export const homepageAnimalQuestion: HomepageSelectorQuestion = {
  id: 'animal',
  label: '1',
  title: 'Kogo dotyczy sytuacja?',
  helper: 'Wybierz zwierzę, a potem temat najbliższy temu, co widzisz na co dzień.',
  options: [
    { id: 'dog', label: 'Pies', helper: 'Spacer, zostawanie samemu, szczeniak, napięcie, pobudzenie.' },
    { id: 'cat', label: 'Kot', helper: 'Kuweta, stres, drugi kot, nocna aktywność, zmiana w domu.' },
  ],
}

export const homepageProblemOptionsByAnimal: Record<HomepageSelectorAnimal, HomepageSelectorOption[]> = {
  dog: [
    { id: 'dog_walk', label: 'Spacery i reakcje na zewnątrz', helper: 'Szczekanie, ciągnięcie, spinanie się, trudne odwołanie albo mocne emocje.' },
    { id: 'dog_separation', label: 'Pies sam w domu', helper: 'Wycie, niszczenie, napięcie albo panika przy wychodzeniu opiekuna.' },
    { id: 'puppy', label: 'Szczeniak i młody pies', helper: 'Gryzienie, skakanie, przeciążenie, nauka zasad i rytm dnia.' },
    { id: 'dog_aggression', label: 'Napięcie, warczenie, obrona zasobów', helper: 'Najpierw sprawdzamy, co pies chroni, czego się obawia i jak obniżyć ryzyko.' },
    { id: 'dog_barking_arousal', label: 'Kilka rzeczy naraz', helper: 'Zachowanie, emocje, zdrowie, dieta i codzienna rutyna zaczynają się mieszać.' },
    { id: 'dog_other', label: 'Nie wiem, jak to nazwać', helper: 'Opisz sytuację własnymi słowami, bez fachowej nazwy.' },
  ],
  cat: [
    { id: 'cat_litter', label: 'Kuweta i załatwianie poza kuwetą', helper: 'Najpierw zdrowie, ból, kuweta, miejsce, żwirek i napięcie w domu.' },
    { id: 'cat_stress', label: 'Stres, chowanie się, wycofanie', helper: 'Sprawdzamy, co mogło zmienić poczucie bezpieczeństwa kota.' },
    { id: 'cat_conflict', label: 'Napięcie między kotami', helper: 'Syczenie, gonitwy, blokowanie przejść albo cicha presja.' },
    { id: 'cat_vocalization', label: 'Miauczenie, pobudzenie, nocne aktywności', helper: 'Rytm dnia, potrzeby kota, jedzenie, środowisko i możliwe napięcie.' },
    { id: 'cat_change', label: 'Zmiana w domu', helper: 'Przeprowadzka, nowy domownik, drugi kot albo zmiana rytmu dnia.' },
    { id: 'cat_other', label: 'Nie wiem, czy to zdrowie, stres czy relacja', helper: 'Nie musisz tego rozstrzygać przed rozmową.' },
  ],
}

export const homepageUrgencyQuestion: HomepageSelectorQuestion = {
  id: 'urgency',
  label: '3',
  title: 'Jak bardzo potrzebujesz teraz uporządkowania?',
  helper: 'To pomaga dobrać zakres rozmowy bez zgadywania.',
  options: [
    { id: 'starter', label: 'Chcę tylko wiedzieć, od czego zacząć', helper: 'Potrzebujesz pierwszego kierunku i zatrzymania działań na ślepo.' },
    { id: 'multi', label: 'To łączy się z kilkoma rzeczami', helper: 'Dom, spacer, emocje, relacje albo rutyna zaczynają się mieszać.' },
    { id: 'complex', label: 'To trwa długo albo wpływa na całe życie w domu', helper: 'Warto spokojniej zebrać dane i ułożyć plan działania.' },
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
    summary: 'Szybki pierwszy krok: na podstawie przekazanych informacji dostajesz wstępną diagnozę behawioralną i kierunek działania.',
    ctaLabel: 'Chcę zacząć od Kwadransa',
    service: 'szybka-konsultacja-15-min',
    price: '69 zł',
    duration: '15 min audio',
  },
  double: {
    title: 'Dwa kwadranse',
    summary: 'Dobry wybór, gdy temat ma kilka wątków i potrzebuje diagnozy behawioralnej opartej na większej ilości danych.',
    ctaLabel: 'Chcę spokojniej omówić temat',
    service: 'konsultacja-30-min',
    price: '169 zł',
    duration: '30 min online',
  },
  full: {
    title: 'Pełna konsultacja',
    summary: 'Około 2h online dla spraw złożonych: diagnoza, prawdopodobna przyczyna problemu, plan działania i 7 dni wsparcia przez WhatsApp.',
    ctaLabel: 'Chcę pełną konsultację',
    service: 'konsultacja-behawioralna-online',
    price: '470 zł',
    duration: 'ok. 2h online',
  },
}

export const homepageProcessSteps = [
  {
    step: '1',
    title: 'Mówisz, co naprawdę się dzieje',
    copy: 'Wystarczy, że powiesz, co robi pies albo kot, kiedy to się dzieje, jak długo trwa i co już próbowaliście.',
  },
  {
    step: '2',
    title: 'Porządkujemy informacje i szukamy przyczyny',
    copy: 'Na podstawie opisu, formularza, historii zachowania i nagrań, jeśli są, tworzę diagnozę behawioralną opartą na dostępnych danych.',
  },
  {
    step: '3',
    title: 'Wychodzisz z decyzją, nie z chaosem',
    copy: 'Wiesz, co zrobić jako pierwsze, czego na razie nie dokładać i kiedy potrzebny jest szerszy plan pracy.',
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
