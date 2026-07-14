export type QuizAnswerValue = string
import { PUBLIC_OFFER_PRICE_LABELS } from './public-offer-copy'

export type QuizAnswers = Record<string, QuizAnswerValue>
export type QuizSpecies = 'pies' | 'kot'
export type QuizServiceKey = 'kwadrans' | 'dwa-kwadranse' | 'pelna-konsultacja'

export type QuizOption = {
  id: string
  label: string
  helper?: string
}

export type QuizQuestion = {
  id: string
  title: string
  helper?: string
  options: QuizOption[]
  condition?: (answers: QuizAnswers, context: QuizProblemContext | null) => boolean
}

export type QuizResult = {
  serviceKey: QuizServiceKey
  title: string
  summary: string
  reasons: string[]
  note: string
  problemTitle?: string
  firstStep?: string
  avoid?: string
  articleHref?: string
  articleLabel?: string
  problemHref?: string
  problemLabel?: string
}

export type QuizProblemContext = {
  problemKey: string
  species?: QuizSpecies
  mainTopic: string
  heroTitle: string
  heroCopy: string
  resultTitle: string
  resultSummary: string
  firstStep: string
  avoid: string
  articleHref?: string
  articleLabel?: string
  problemHref?: string
  problemLabel?: string
  note?: string
}

export const QUIZ_PROBLEM_CONTEXTS: Record<string, QuizProblemContext> = {
  'pies-szczeka-na-psy': {
    problemKey: 'pies-szczeka-na-psy',
    species: 'pies',
    mainTopic: 'walks',
    heroTitle: 'Quiz: pies szczeka na inne psy',
    heroCopy: 'Zaczynamy od spaceru i reakcji na psy. Pominąłem wybór gatunku, żeby szybciej dojść do ryzyka, zdrowia i skali problemu.',
    resultTitle: 'Pies reaguje na spacerze',
    resultSummary: 'Wynik odnosi się do szczekania, napięcia i mijanek na spacerze.',
    firstStep: 'Sprawdź dystans, przy którym pies jeszcze może węszyć, jeść albo wrócić do kontaktu.',
    avoid: 'Nie zaczynaj od korekt w najtrudniejszym miejscu i nie skracaj dystansu na siłę.',
    articleHref: '/blog/dlaczego-moj-pies-szczeka-na-inne-psy',
    articleLabel: 'Dlaczego pies szczeka na inne psy?',
    problemHref: '/problemy/pies-szczeka-na-psy',
    problemLabel: 'Strona problemowa: szczekanie na psy',
  },
  'pies-ciagnie-na-smyczy': {
    problemKey: 'pies-ciagnie-na-smyczy',
    species: 'pies',
    mainTopic: 'walks',
    heroTitle: 'Quiz: pies ciągnie na smyczy',
    heroCopy: 'Zaczynamy od spaceru, pobudzenia i tempa. Quiz pomoże odróżnić prostą korektę spaceru od szerszego problemu emocji.',
    resultTitle: 'Pies i spacer pod napięciem',
    resultSummary: 'Wynik odnosi się do ciągnięcia, pobudzenia i trudności z kontaktem na smyczy.',
    firstStep: 'Wybierz jeden krótki odcinek spaceru, na którym celem jest wolniejsze tempo i kontakt, nie przejście jak najdalej.',
    avoid: 'Nie traktuj zmiany sprzętu jako jedynego rozwiązania i nie ćwicz długo, gdy pies jest już ponad progiem.',
    articleHref: '/blog/pies-ciagnie-na-smyczy',
    articleLabel: 'Pies ciągnie na smyczy',
    problemHref: '/problemy/pies-ciagnie-na-smyczy',
    problemLabel: 'Strona problemowa: smycz',
  },
  'pies-nie-zostaje-sam': {
    problemKey: 'pies-nie-zostaje-sam',
    species: 'pies',
    mainTopic: 'fear_stress',
    heroTitle: 'Quiz: pies nie zostaje sam',
    heroCopy: 'Zaczynamy od rozłąki, nagrania i emocji po wyjściu opiekuna. To ważne, żeby nie pomylić nudy z paniką.',
    resultTitle: 'Pies zostawiany sam',
    resultSummary: 'Wynik odnosi się do samotności, wycia, niszczenia albo napięcia po wyjściu opiekuna.',
    firstStep: 'Nagraj 20-30 minut po wyjściu i sprawdź, kiedy pojawia się pierwszy objaw.',
    avoid: 'Nie zostawiaj psa, żeby się wypłakał, jeśli na nagraniu widać panikę.',
    articleHref: '/blog/pies-wyje-kiedy-zostaje-sam',
    articleLabel: 'Pies wyje, kiedy zostaje sam',
    problemHref: '/problemy/pies-nie-zostaje-sam',
    problemLabel: 'Strona problemowa: samotność psa',
  },
  'wakacje-opieka-zmiana-rytmu': {
    problemKey: 'wakacje-opieka-zmiana-rytmu',
    species: 'pies',
    mainTopic: 'fear_stress',
    heroTitle: 'Quiz: wakacje, opieka i zmiana rytmu',
    heroCopy:
      'Zaczynamy od tego, co zmieni się podczas wyjazdu: opiekun, rytm dnia, zostawanie samemu, miejsce odpoczynku i poziom bodźców.',
    resultTitle: 'Wakacyjna zmiana rytmu',
    resultSummary: 'Wynik odnosi się do wyjazdu, opieki innej osoby i ryzyka nasilenia samotności albo napięcia.',
    firstStep: 'Spisz, co dokładnie zmieni się w opiece: godziny wyjść, miejsce snu, spacery, karmienie i osoby w domu.',
    avoid: 'Nie zostawiaj pierwszej długiej rozłąki na dzień wyjazdu i nie zakładaj, że pies sam dopasuje się do nowego rytmu.',
    articleHref: '/blog/pies-wyje-kiedy-zostaje-sam',
    articleLabel: 'Pies wyje, kiedy zostaje sam',
    problemHref: '/problemy/pies-nie-zostaje-sam',
    problemLabel: 'Strona problemowa: samotność psa',
  },
  'kot-sika-poza-kuweta': {
    problemKey: 'kot-sika-poza-kuweta',
    species: 'kot',
    mainTopic: 'home_behavior',
    heroTitle: 'Quiz: kot sika poza kuwetą',
    heroCopy: 'Zaczynamy od kuwety, zdrowia i stresu. Przy nagłej zmianie równolegle warto brać pod uwagę lekarza weterynarii.',
    resultTitle: 'Kot i kuweta',
    resultSummary: 'Wynik odnosi się do zachowań toaletowych, zasobów, stresu i możliwego tła zdrowotnego.',
    firstStep: 'Zacznij od kontroli zdrowia i spisu: liczba kuwet, miejsca zdarzeń, żwirek, zmiany w domu.',
    avoid: 'Nie karz kota i nie zakładaj złośliwości. To może być sygnał bólu albo stresu.',
    articleHref: '/blog/kot-zalatwia-sie-poza-kuweta',
    articleLabel: 'Kot załatwia się poza kuwetą',
    problemHref: '/problemy/kot-sika-poza-kuweta',
    problemLabel: 'Strona problemowa: kuweta',
  },
  'kot-gryzie-przy-glaskaniu': {
    problemKey: 'kot-gryzie-przy-glaskaniu',
    species: 'kot',
    mainTopic: 'relationships',
    heroTitle: 'Quiz: kot gryzie przy głaskaniu',
    heroCopy: 'Zaczynamy od kontaktu, sygnałów napięcia i możliwego bólu. Quiz pomoże ustalić, czy wystarczy protokół dotyku, czy trzeba szerzej sprawdzić tło.',
    resultTitle: 'Kot i kontakt z człowiekiem',
    resultSummary: 'Wynik odnosi się do gryzienia przy głaskaniu, przestymulowania i sygnałów ostrzegawczych.',
    firstStep: 'Skróć głaskanie do kilku sekund i kończ kontakt zanim kot napnie ogon, uszy albo skórę grzbietu.',
    avoid: 'Nie przytrzymuj kota i nie testuj granic, gdy już pokazał napięcie.',
    articleHref: '/blog/stres-kota-a-zachowania-toaletowe',
    articleLabel: 'Stres kota i zachowanie',
    problemHref: '/problemy/kot-gryzie-przy-glaskaniu',
    problemLabel: 'Strona problemowa: gryzienie przy głaskaniu',
  },
  'konflikt-miedzy-kotami': {
    problemKey: 'konflikt-miedzy-kotami',
    species: 'kot',
    mainTopic: 'relationships',
    heroTitle: 'Quiz: koty żyją w napięciu',
    heroCopy: 'Zaczynamy od relacji, zasobów i cichego blokowania przestrzeni. Konflikt nie zawsze wygląda jak otwarta bójka.',
    resultTitle: 'Koty i napięcie w domu',
    resultSummary: 'Wynik odnosi się do relacji między kotami, zasobów, unikania i konfliktu.',
    firstStep: 'Zmapuj kuwety, miski, wodę, kryjówki i przejścia. Sprawdź, czy jeden kot nie blokuje drugiego.',
    avoid: 'Nie zostawiaj kotów, żeby same ustaliły hierarchię, jeśli napięcie narasta.',
    articleHref: '/blog/jak-zapoznac-dwa-koty',
    articleLabel: 'Jak zapoznać dwa koty',
    problemHref: '/problemy/konflikt-miedzy-kotami',
    problemLabel: 'Strona problemowa: konflikt kotów',
  },
  'nagla-zmiana-zachowania': {
    problemKey: 'nagla-zmiana-zachowania',
    mainTopic: 'other',
    heroTitle: 'Quiz: nagła zmiana zachowania',
    heroCopy: 'Zaczynamy od czerwonych flag. Przy nagłej zmianie zachowania zdrowie i ból trzeba traktować poważnie.',
    resultTitle: 'Nagła zmiana zachowania',
    resultSummary: 'Wynik odnosi się do sytuacji, w której najpierw trzeba uporządkować bezpieczeństwo i możliwe tło zdrowotne.',
    firstStep: 'Spisz, co zmieniło się nagle: jedzenie, sen, ruch, kuweta, agresja, chowanie się albo wokalizacja.',
    avoid: 'Nie zaczynaj od treningu, jeśli pojawił się ból, apatia, nagła agresja albo szybkie pogorszenie.',
    note: 'Przy czerwonych flagach zacznij równolegle od lekarza weterynarii.',
  },
  'halas-burza-fajerwerki': {
    problemKey: 'halas-burza-fajerwerki',
    mainTopic: 'fear_stress',
    heroTitle: 'Quiz: hałas, burza, fajerwerki',
    heroCopy: 'Zaczynamy od bezpieczeństwa i skali lęku. Plan robi się przed sezonem, ale pierwszy krok można uporządkować już teraz.',
    resultTitle: 'Hałas i panika',
    resultSummary: 'Wynik odnosi się do reakcji na dźwięki, burze, fajerwerki i silny stres.',
    firstStep: 'Zabezpiecz miejsce odpoczynku, ogranicz presję i zanotuj, kiedy zaczyna się reakcja.',
    avoid: 'Nie wystawiaj zwierzęcia na hałas, żeby się przyzwyczaiło, jeśli już widać panikę.',
  },
}

export function getQuizProblemContext(problemKey: string | null | undefined): QuizProblemContext | null {
  if (!problemKey) {
    return null
  }

  return QUIZ_PROBLEM_CONTEXTS[problemKey.trim().toLowerCase()] ?? null
}

function applyQuizProblemContext(result: QuizResult, problemKey: string | null | undefined): QuizResult {
  const context = getQuizProblemContext(problemKey)

  if (!context) {
    return result
  }

  return {
    ...result,
    title: context.resultTitle,
    summary: `${context.resultSummary} ${result.summary}`,
    reasons: [context.firstStep, ...result.reasons].slice(0, 4),
    note: context.note ?? result.note,
    problemTitle: context.resultTitle,
    firstStep: context.firstStep,
    avoid: context.avoid,
    articleHref: context.articleHref,
    articleLabel: context.articleLabel,
    problemHref: context.problemHref,
    problemLabel: context.problemLabel,
  }
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'species',
    title: 'Kogo dotyczy sytuacja?',
    helper: 'Wybierz zwierzę, od którego zaczynamy.',
    options: [
      { id: 'pies', label: 'Pies', helper: 'Spacery, zostawanie samemu, pobudzenie, napięcie, szczeniak.' },
      { id: 'kot', label: 'Kot', helper: 'Kuweta, stres, relacje między kotami, nocna aktywność.' },
    ],
    condition: (_, context) => !context?.species,
  },
  {
    id: 'main_topic',
    title: 'Jaki problem chcesz rozwiązać?',
    helper: 'Wybierz obszar, który najlepiej opisuje Twoją sytuację.',
    options: [
      { id: 'home_behavior', label: 'Zachowanie w domu', helper: 'Niszczenie, szczekanie, trudność z odpoczynkiem, kuweta.' },
      { id: 'walks', label: 'Spacery i pobudzenie', helper: 'Reakcje na psy lub ludzi, ciągnięcie, trudność z wyciszeniem.' },
      { id: 'fear_stress', label: 'Lęk i stres', helper: 'Zostawanie samemu, dźwięki, goście, nowe sytuacje.' },
      { id: 'relationships', label: 'Relacje i konflikty', helper: 'Napięcie z ludźmi, zwierzętami albo wokół zasobów.' },
      { id: 'other', label: 'Inny problem', helper: 'Nie musisz trafnie nazwać tematu. Doprecyzujemy go po drodze.' },
    ],
    condition: (_, context) => !context?.mainTopic,
  },
  {
    id: 'litter_medical',
    title: 'Czy kot miał badany mocz/krew w ciągu ostatniego miesiąca?',
    helper: 'To krytyczne przy problemach z kuwetą, by wykluczyć ból lub zapalenie pęcherza.',
    options: [
      { id: 'yes_good', label: 'Tak, wyniki w normie', helper: 'Znamy aktualny stan zdrowotny.' },
      { id: 'yes_bad', label: 'Tak, wyniki wskazały na chorobę', helper: 'Wprowadzane jest leczenie medyczne.' },
      { id: 'no', label: 'Nie, nie był ostatnio badany', helper: 'Brak świeżych wyników badań.' },
    ],
    condition: (answers, context) => 
      context?.problemKey === 'kot-sika-poza-kuweta' || (answers.species === 'kot' && answers.main_topic === 'home_behavior'),
  },
  {
    id: 'separation_symptoms',
    title: 'Jak pies zachowuje się pod Twoją nieobecność?',
    helper: 'Wybierz objaw, który występuje najsilniej.',
    options: [
      { id: 'vocalization', label: 'Wyje lub szczeka', helper: 'Bardzo głośno wokalizuje, słychać go na zewnątrz.' },
      { id: 'destruction', label: 'Niszczy rzeczy', helper: 'Gryzie framugi, niszczy meble lub buty.' },
      { id: 'elimination', label: 'Załatwia się w domu', helper: 'Popuszcza mocz lub kał ze stresu.' },
      { id: 'pacing', label: 'Krąży i ziaje', helper: 'Nie potrafi usiedzieć w miejscu i zasnąć.' },
    ],
    condition: (answers, context) => 
      context?.problemKey === 'pies-nie-zostaje-sam' || (answers.species === 'pies' && answers.main_topic === 'fear_stress'),
  },
  {
    id: 'reactivity_trigger',
    title: 'Kiedy najczęściej pies zaczyna reagować na spacerze?',
    helper: 'To pomoże ocenić próg pobudzenia.',
    options: [
      { id: 'far', label: 'Gdy tylko zobaczy psa/człowieka z dużej odległości', helper: 'Reakcja zaczyna się bardzo wcześnie.' },
      { id: 'close', label: 'Dopiero przy mijaniu blisko', helper: 'Traci kontrolę dopiero przy małym dystansie.' },
      { id: 'surprise', label: 'Tylko przy nagłym zaskoczeniu', helper: 'Gdy ktoś wyjdzie zza rogu lub z klatki.' },
      { id: 'frustration', label: 'Gdy nie może podejść', helper: 'Ciągnie, piszczy i szczeka, bo smycz go blokuje.' }
    ],
    condition: (answers, context) =>
      context?.problemKey === 'pies-szczeka-na-psy' || (answers.species === 'pies' && answers.main_topic === 'walks'),
  },
  {
    id: 'resource_guarding',
    title: 'Wobec czego pies wykazuje największe napięcie lub broni dostępu?',
    helper: 'Wybierz najważniejszy zasób.',
    options: [
      { id: 'food', label: 'Miska, jedzenie lub gryzaki', helper: 'Warzy, zastyga lub ucieka z jedzeniem.' },
      { id: 'space', label: 'Kanapa, legowisko lub przestrzeń', helper: 'Broni miejsca, w którym odpoczywa.' },
      { id: 'person', label: 'Opiekun', helper: 'Odgania inne zwierzęta lub ludzi od Ciebie.' },
      { id: 'stolen', label: 'Kradzione przedmioty', helper: 'Skarpetki, chusteczki, śmieci.' }
    ],
    condition: (answers, context) =>
      context?.problemKey === 'pies-obrona-zasobow' || (answers.species === 'pies' && answers.main_topic === 'home_behavior'),
  },
  {
    id: 'cat_conflict_victim',
    title: 'Jak w tej sytuacji zachowuje się kot wycofany (ofiara konfliktu)?',
    helper: 'To pomoże ocenić, jak bardzo stres wpływa na jego życie.',
    options: [
      { id: 'hiding_always', label: 'Chowa się niemal cały czas', helper: 'Wychodzi tylko w nocy lub gdy jest bezpiecznie.' },
      { id: 'avoiding_litter', label: 'Ma problemy z kuwetą lub jedzeniem', helper: 'Konflikt wpływa na podstawowe potrzeby.' },
      { id: 'normal_but_tense', label: 'Funkcjonuje normalnie, ale ucieka przy spotkaniu', helper: 'Stres pojawia się tylko przy bezpośrednim kontakcie.' }
    ],
    condition: (answers, context) =>
      context?.problemKey === 'konflikt-miedzy-kotami' || (answers.species === 'kot' && answers.main_topic === 'relationships'),
  },
  {
    id: 'safety',
    title: 'Czy ktoś może ucierpieć?',
    helper: 'To pomaga dobrać bezpieczny zakres rozmowy.',
    options: [
      { id: 'none', label: 'Nie widzę takiego ryzyka', helper: 'Problem przeszkadza, ale nie wygląda groźnie.' },
      { id: 'tension', label: 'Jest napięcie, ale do opanowania', helper: 'Pojawia się warczenie, ucieczka, szczekanie albo silne pobudzenie.' },
      { id: 'danger', label: 'Był atak lub realne zagrożenie', helper: 'Człowiek albo zwierzę mogło ucierpieć.' },
    ],
  },
  {
    id: 'medical_change',
    title: 'Czy coś zmieniło się nagle?',
    helper: 'Nagła zmiana zachowania bywa związana ze zdrowiem.',
    options: [
      { id: 'no', label: 'Nie, to raczej stały obraz', helper: 'Nie widzę nagłej zmiany apetytu, ruchu, snu ani kuwety.' },
      { id: 'unclear', label: 'Nie mam pewności', helper: 'Coś się zmieniło, ale trudno powiedzieć, z czego to wynika.' },
      { id: 'yes', label: 'Tak, są czerwone flagi', helper: 'Ból, apatia, nagła agresja, kuweta, senior albo szybkie pogorszenie.' },
    ],
  },
  {
    id: 'duration',
    title: 'Od kiedy to trwa?',
    helper: 'Im dłużej trwa problem, tym więcej kontekstu warto spokojnie zebrać.',
    options: [
      { id: 'fresh', label: 'Od niedawna', helper: 'Chcę szybko sprawdzić, od czego zacząć.' },
      { id: 'returning', label: 'Wraca od kilku tygodni', helper: 'Są lepsze i gorsze momenty, temat się powtarza.' },
      { id: 'long', label: 'Długo albo coraz mocniej', helper: 'Wpływa na codzienność domu, spacery, sen albo relacje.' },
    ],
  },
  {
    id: 'frequency',
    title: 'Jak często to wraca?',
    helper: 'Częstotliwość pokazuje, czy wystarczy krótka rozmowa, czy potrzebny jest szerszy plan.',
    options: [
      { id: 'rare', label: 'Sporadycznie', helper: 'Raz na jakiś czas albo w jednej konkretnej sytuacji.' },
      { id: 'weekly', label: 'Kilka razy w tygodniu', helper: 'Wraca regularnie, ale nie dominuje całego dnia.' },
      { id: 'daily', label: 'Codziennie lub prawie codziennie', helper: 'Mocno wpływa na rytm domu albo spacery.' },
    ],
  },
  {
    id: 'predictability',
    title: 'Czy wiesz, co to uruchamia?',
    helper: 'Nie trzeba mieć pewności. Chodzi o to, czy widać jakiś schemat.',
    options: [
      { id: 'clear', label: 'Tak, wyzwalacz jest jasny', helper: 'Wiem, kiedy zachowanie zwykle się zaczyna.' },
      { id: 'partial', label: 'Trochę tak, trochę nie', helper: 'Widzę część schematu, ale nie wszystko pasuje.' },
      { id: 'unclear', label: 'Nie, wygląda to chaotycznie', helper: 'Trudno połączyć fakty i przewidzieć reakcję.' },
    ],
  },
  {
    id: 'resources',
    title: 'Ile rzeczy miesza się w tle?',
    helper: 'Pomyśl o rutynie, przestrzeni, spacerach, jedzeniu, nudzie i relacjach.',
    options: [
      { id: 'simple', label: 'Raczej jeden element', helper: 'Np. smycz, kuweta, jedna pora dnia, jeden bodziec.' },
      { id: 'several', label: 'Kilka elementów naraz', helper: 'Rutyna, emocje, reakcje ludzi i środowisko się łączą.' },
      { id: 'multi_pet', label: 'Kilka zwierząt lub domowników', helper: 'Potrzebna jest analiza relacji i zarządzania sytuacją.' },
    ],
  },
  {
    id: 'previous_attempts',
    title: 'Co już próbowaliście?',
    helper: 'To pomaga nie powtarzać porad, które już nie zadziałały.',
    options: [
      { id: 'none', label: 'Jeszcze nic systematycznie', helper: 'Chcę zacząć spokojnie i bez zgadywania.' },
      { id: 'some', label: 'Kilka prostych zmian', helper: 'Były próby, ale bez jasnego planu.' },
      { id: 'many', label: 'Dużo prób i nadal brak poprawy', helper: 'Problem wraca mimo porad, treningu albo zmian w domu.' },
    ],
  },
  {
    id: 'goal',
    title: 'Czego potrzebujesz po quizie?',
    helper: 'Wynik ma dobrać pierwszy krok, a nie zamykać całą sprawę.',
    options: [
      { id: 'priority', label: 'Pierwszy priorytet', helper: 'Chcę wiedzieć, co zrobić jako pierwsze.' },
      { id: 'check', label: 'Sprawdzenie zakresu', helper: 'Chcę wiedzieć, czy wystarczy krótka konsultacja.' },
      { id: 'plan', label: 'Plan na kilka kroków', helper: 'Potrzebuję więcej kontekstu i konkretnego kierunku.' },
      { id: 'diagnosis', label: 'Pełniejsza analiza', helper: 'Sprawa jest złożona, utrwalona albo dotyczy bezpieczeństwa.' },
    ],
  },
]

export const QUIZ_SERVICE_LABELS: Record<QuizServiceKey, { label: string; price: string; duration: string }> = {
  kwadrans: {
    label: 'Kwadrans',
    price: PUBLIC_OFFER_PRICE_LABELS.quick,
    duration: '15 min telefonicznie',
  },
  'dwa-kwadranse': {
    label: 'Konsultacja 30 min',
    price: PUBLIC_OFFER_PRICE_LABELS.bridge,
    duration: '30 min telefonicznie',
  },
  'pelna-konsultacja': {
    label: 'Pełna konsultacja',
    price: PUBLIC_OFFER_PRICE_LABELS.premium,
    duration: 'ok. 2h przez Jitsi',
  },
}

export function resolveQuizResult(answers: QuizAnswers): QuizResult {
  const mainTopic = answers.main_topic
  const safety = answers.safety
  const medicalChange = answers.medical_change
  const duration = answers.duration
  const frequency = answers.frequency
  const predictability = answers.predictability
  const resources = answers.resources
  const previousAttempts = answers.previous_attempts
  const goal = answers.goal
  const litterMedical = answers.litter_medical
  const separationSymptoms = answers.separation_symptoms
  const reactivityTrigger = answers.reactivity_trigger
  const resourceGuarding = answers.resource_guarding
  const catConflictVictim = answers.cat_conflict_victim

  let score = 0
  const reasons: string[] = []

  if (mainTopic === 'relationships') score += 2
  if (mainTopic === 'other') score += 1
  if (safety === 'tension') score += 2
  if (safety === 'danger') score += 6
  if (medicalChange === 'unclear') score += 2
  if (medicalChange === 'yes') score += 5
  if (duration === 'returning') score += 1
  if (duration === 'long') score += 2
  if (frequency === 'weekly') score += 1
  if (frequency === 'daily') score += 2
  if (predictability === 'partial') score += 1
  if (predictability === 'unclear') score += 2
  if (resources === 'several') score += 2
  if (resources === 'multi_pet') score += 3
  if (previousAttempts === 'some') score += 1
  if (previousAttempts === 'many') score += 2
  if (goal === 'plan') score += 2
  if (goal === 'diagnosis') score += 4
  if (litterMedical === 'no') score += 2
  if (separationSymptoms === 'destruction' || separationSymptoms === 'elimination') score += 2
  if (reactivityTrigger === 'far' || reactivityTrigger === 'surprise') score += 2
  if (resourceGuarding === 'food' || resourceGuarding === 'space' || resourceGuarding === 'person') score += 2
  if (catConflictVictim === 'hiding_always' || catConflictVictim === 'avoiding_litter') score += 3

  if (safety === 'danger') {
    reasons.push('pojawia się realne ryzyko bezpieczeństwa')
  }
  if (medicalChange === 'yes' || medicalChange === 'unclear') {
    reasons.push('warto równolegle sprawdzić możliwe tło zdrowotne')
  }
  if (mainTopic === 'relationships' || resources === 'several' || resources === 'multi_pet') {
    reasons.push('sytuacja łączy kilka obszarów, nie jedną prostą wskazówkę')
  }
  if (duration === 'long' || frequency === 'daily') {
    reasons.push('problem jest utrwalony albo często wraca')
  }
  if (predictability === 'unclear' || previousAttempts === 'many') {
    reasons.push('najpierw trzeba uporządkować fakty i dotychczasowe próby')
  }
  if (litterMedical === 'no') {
    reasons.push('warto pilnie wykonać profilaktyczne badanie moczu u lekarza weterynarii')
  }
  if (separationSymptoms) {
    reasons.push('na spotkaniu przeanalizujemy nagrania z nieobecności')
  }
  if (reactivityTrigger === 'far') {
    reasons.push('próg pobudzenia na spacerze wydaje się bardzo niski')
  }
  if (resourceGuarding) {
    reasons.push('widać obronę zasobów, co wymaga ostrożnego zarządzania przestrzenią')
  }
  if (catConflictVictim === 'hiding_always' || catConflictVictim === 'avoiding_litter') {
    reasons.push('konflikt między kotami wpływa już na podstawowe poczucie bezpieczeństwa')
  }

  let result: QuizResult

  if (score >= 8) {
    result = {
      serviceKey: 'pelna-konsultacja',
      title: 'Najlepszy pierwszy krok: pełna konsultacja',
      summary:
        'Ta ścieżka pasuje, gdy temat jest złożony, trwa długo albo dotyczy bezpieczeństwa. Najpierw spokojnie zbieramy kontekst, a dopiero potem układamy plan działania.',
      reasons: reasons.length > 0 ? reasons.slice(0, 4) : ['sprawa wymaga spokojnego zebrania szerszego kontekstu'],
      note:
        medicalChange === 'yes'
          ? 'Przy nagłej zmianie zachowania, bólu albo objawach zdrowotnych zacznij równolegle od lekarza weterynarii.'
          : 'Przed rozmową przydadzą się krótkie nagrania, opis rutyny i lista rzeczy, które były już próbowane.',
    }
  } else if (score >= 4) {
    result = {
      serviceKey: 'dwa-kwadranse',
      title: 'Najlepszy pierwszy krok: konsultacja 30 min',
      summary:
        'To dobry wybór, gdy jest kilka wątków i 15 minut może być za krótkie. Wystarczy czasu, żeby dopytać o tło sytuacji i ustalić najbliższy kierunek.',
      reasons:
        reasons.length > 0
          ? reasons.slice(0, 4)
          : ['jest kilka rzeczy do połączenia', 'warto dopytać o rytm dnia, emocje i środowisko'],
      note: 'Jeśli w trakcie rozmowy okaże się, że temat jest szerszy, łatwiej będzie zdecydować o dalszym kroku.',
    }
  } else {
    result = {
      serviceKey: 'kwadrans',
      title: 'Najlepszy pierwszy krok: Kwadrans',
      summary:
        'To spokojny start, gdy chcesz ustalić pierwszy priorytet bez wchodzenia od razu w dużą konsultację. Kwadrans pomaga sprawdzić, co zrobić najpierw.',
      reasons: [
        duration === 'fresh' ? 'sytuacja wygląda na świeżą' : 'nie trzeba od razu zaczynać od pełnej analizy',
        predictability === 'clear' ? 'wyzwalacz jest dość czytelny' : 'najważniejsze jest wybranie pierwszego priorytetu',
        'można zacząć od krótkiego połączenia telefonicznego',
      ],
      note: 'Kwadrans nie musi zamykać sprawy. Ma pomóc wybrać najprostszy następny krok.',
    }
  }

  return applyQuizProblemContext(result, answers.problem_context)
}

