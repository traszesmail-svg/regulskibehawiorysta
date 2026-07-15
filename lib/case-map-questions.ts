import type { CaseMapPath, CaseMapTopic } from '@/lib/case-map'

export type CaseMapQuestionKind = 'choice' | 'text' | 'scale'

export type CaseMapQuestionOption = {
  id: string
  label: string
  helper?: string
}

export type CaseMapQuestion = {
  id: string
  title: string
  helper?: string
  kind: CaseMapQuestionKind
  options?: CaseMapQuestionOption[]
  maxLength?: number
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
}

export type CaseMapQuestionSection = {
  id: string
  title: string
  helper: string
  questions: CaseMapQuestion[]
}

const unknown: CaseMapQuestionOption = {
  id: 'unknown',
  label: 'Nie wiem',
  helper: 'Na tym etapie możesz nie mieć jeszcze pewnej odpowiedzi.',
}

const yesNoUnknown = (yesLabel: string, noLabel: string): CaseMapQuestionOption[] => [
  { id: 'yes', label: yesLabel },
  { id: 'no', label: noLabel },
  unknown,
]

export const CASE_MAP_PATH_OPTIONS: CaseMapQuestionOption[] = [
  {
    id: 'fast',
    label: 'Szybka mapa · 5–7 minut',
    helper: 'Porządek w sytuacji, jeden bezpieczny krok i materiały do dalszego czytania.',
  },
  {
    id: 'long',
    label: 'Pełniejsza mapa · 20–30 minut',
    helper: 'Więcej kontekstu przed zakupem dłuższej konsultacji.',
  },
]

export const CASE_MAP_FOCUS_QUESTION: CaseMapQuestion = {
  id: 'case_focus',
  title: 'Czego dotyczy ta sprawa?',
  helper: 'Nie musisz od razu idealnie nazwać problemu.',
  kind: 'choice',
  options: [
    { id: 'one_pet', label: 'Jednego zwierzęcia' },
    { id: 'relationship', label: 'Relacji między zwierzętami lub z domownikiem' },
    { id: 'unknown', label: 'Nie wiem jeszcze' },
  ],
}

export const CASE_MAP_DESCRIPTION_QUESTION: CaseMapQuestion = {
  id: 'case_description',
  title: 'Jeśli chcesz, opisz krótko, co dziś najbardziej Cię martwi.',
  helper: 'To pole jest opcjonalne. Nie wpisuj tu danych wrażliwych ani pełnej historii.',
  kind: 'text',
  maxLength: 400,
}

export const CASE_MAP_TRIAGE_QUESTIONS: CaseMapQuestion[] = [
  {
    id: 'active_danger',
    title: 'Czy teraz trwa sytuacja, w której ktoś lub zwierzę może zostać zranione albo nie da się bezpiecznie rozdzielić sytuacji?',
    helper: 'Na przykład bieżąca bójka, ucieczka w ruch lub realne zagrożenie teraz.',
    kind: 'choice',
    options: yesNoUnknown('Tak, dzieje się teraz', 'Nie, teraz jest bezpiecznie'),
  },
  {
    id: 'injury',
    title: 'Czy doszło do ugryzienia albo zadrapania człowieka z przerwaniem skóry?',
    kind: 'choice',
    options: yesNoUnknown('Tak', 'Nie'),
  },
  {
    id: 'emergency_health',
    title: 'Czy widać pilne objawy zdrowotne?',
    helper: 'Omdlenie, drgawki, duszność, zatrucie, ciało obce, poważny uraz/silny ból albo parcie i brak moczu u kota.',
    kind: 'choice',
    options: yesNoUnknown('Tak', 'Nie'),
  },
  {
    id: 'health_change',
    title: 'Czy zachowanie zmieniło się nagle albo pojawił się ból, zmiana apetytu, picia, toalety, ruchu, snu lub nagła niechęć do dotyku?',
    kind: 'choice',
    options: yesNoUnknown('Tak', 'Nie'),
  },
  {
    id: 'escape_selfharm',
    title: 'Czy istnieje ryzyko ucieczki, samouszkodzenia albo silnej paniki?',
    kind: 'choice',
    options: yesNoUnknown('Tak', 'Nie'),
  },
  {
    id: 'vulnerable_context',
    title: 'Czy sytuacja dotyczy dziecka, innego zwierzęcia albo osoby, która nie może jej bezpiecznie przerwać?',
    kind: 'choice',
    options: yesNoUnknown('Tak', 'Nie'),
  },
  {
    id: 'vet_status',
    title: 'Czy weterynarz ocenił już tę nagłą zmianę lub objawy?',
    kind: 'choice',
    options: [
      { id: 'seen', label: 'Tak, temat był już oceniony przez weterynarza' },
      { id: 'not_seen', label: 'Nie, jeszcze nie' },
      unknown,
    ],
  },
]

const fastCore: CaseMapQuestion[] = [
  {
    id: 'fast_age_stage',
    title: 'Na jakim etapie życia jest zwierzę?',
    kind: 'choice',
    options: [
      { id: 'young', label: 'Młode / w okresie intensywnych zmian' },
      { id: 'adult', label: 'Dorosłe' },
      { id: 'senior', label: 'Starsze' },
      unknown,
    ],
  },
  {
    id: 'fast_onset',
    title: 'Kiedy zauważyłeś tę trudność?',
    kind: 'choice',
    options: [
      { id: 'sudden', label: 'Pojawiła się nagle' },
      { id: 'recent', label: 'Narasta od dni lub tygodni' },
      { id: 'longer', label: 'Trwa od dawna' },
      unknown,
    ],
  },
  {
    id: 'fast_frequency',
    title: 'Jak często sytuacja wraca?',
    kind: 'choice',
    options: [
      { id: 'single', label: 'Pojedynczo lub rzadko' },
      { id: 'weekly', label: 'Kilka razy w tygodniu' },
      { id: 'daily', label: 'Codziennie lub prawie codziennie' },
      unknown,
    ],
  },
  {
    id: 'fast_predictability',
    title: 'Czy umiesz przewidzieć, co zwykle poprzedza trudność?',
    kind: 'choice',
    options: [
      { id: 'clear', label: 'Tak, wzorzec jest dość czytelny' },
      { id: 'partial', label: 'Tylko częściowo' },
      { id: 'unclear', label: 'Nie, pojawia się nieoczekiwanie' },
      unknown,
    ],
  },
  {
    id: 'fast_impact',
    title: 'Jak mocno wpływa to dziś na codzienne życie?',
    helper: '0 oznacza mały wpływ, 4 oznacza wyraźne ograniczenie życia domu.',
    kind: 'scale',
    min: 0,
    max: 4,
    minLabel: 'Mały wpływ',
    maxLabel: 'Bardzo duży wpływ',
  },
  {
    id: 'fast_recovery',
    title: 'Co dzieje się po trudnej sytuacji?',
    kind: 'choice',
    options: [
      { id: 'quick', label: 'Zwierzę dość szybko wraca do równowagi' },
      { id: 'slow', label: 'Potrzebuje dłuższego wyciszenia' },
      { id: 'escalates', label: 'Napięcie narasta lub przenosi się na inne sytuacje' },
      unknown,
    ],
  },
  {
    id: 'fast_current_management',
    title: 'Co już teraz pomaga choć trochę zarządzić sytuacją?',
    kind: 'text',
    maxLength: 600,
  },
  {
    id: 'fast_goal',
    title: 'Czego najbardziej potrzebujesz na start?',
    kind: 'choice',
    options: [
      { id: 'safety', label: 'Bezpieczeństwa i uspokojenia sytuacji' },
      { id: 'understanding', label: 'Zrozumienia, co obserwować' },
      { id: 'specific', label: 'Planu dla jednej konkretnej sytuacji' },
      { id: 'change', label: 'Przygotowania zmiany w domu lub rytmie' },
      { id: 'full_plan', label: 'Pełniejszego planu' },
      unknown,
    ],
  },
]

const moduleByTopic: Record<CaseMapTopic, CaseMapQuestion[]> = {
  dog_walks: [
    {
      id: 'walk_goal',
      title: 'Co jest najważniejsze na spacerze?',
      kind: 'choice',
      options: [
        { id: 'passing', label: 'Mijanie bodźców' },
        { id: 'distance', label: 'Zwiększenie dystansu i spokoju' },
        { id: 'pace', label: 'Tempo i ciągnięcie' },
        unknown,
      ],
    },
    {
      id: 'walk_pattern',
      title: 'Jaki wzorzec widzisz najczęściej?',
      kind: 'choice',
      options: [
        { id: 'staring', label: 'Wpatrywanie, sztywnienie lub napięcie' },
        { id: 'barking', label: 'Szczekanie, rzucanie się lub odskakiwanie' },
        { id: 'pulling', label: 'Głównie ciągnięcie i tempo' },
        unknown,
      ],
    },
    {
      id: 'walk_distance',
      title: 'Z jakiego dystansu zaczyna się trudność?',
      kind: 'choice',
      options: [
        { id: 'far', label: 'Już z daleka' },
        { id: 'close', label: 'Dopiero przy bliskim mijaniu' },
        { id: 'variable', label: 'To bardzo zmienne' },
        unknown,
      ],
    },
    {
      id: 'walk_contact_history',
      title: 'Czy jest historia trudnego kontaktu albo urazu w podobnej sytuacji?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  dog_alone: [
    {
      id: 'alone_evidence',
      title: 'Na czym opierasz obserwację zostawania samemu?',
      kind: 'choice',
      options: [
        { id: 'recording', label: 'Mam nagranie' },
        { id: 'neighbor_report', label: 'Mam relację sąsiadów lub domowników' },
        { id: 'after_return', label: 'Widzę tylko sytuację po powrocie' },
        unknown,
      ],
    },
    {
      id: 'alone_first_signal',
      title: 'Jaki jest pierwszy sygnał po wyjściu opiekuna?',
      kind: 'choice',
      options: [
        { id: 'vocalization', label: 'Wokalizacja' },
        { id: 'pacing', label: 'Krążenie, dyszenie lub pobudzenie' },
        { id: 'destruction', label: 'Niszczenie lub próby wyjścia' },
        unknown,
      ],
    },
    {
      id: 'alone_symptoms',
      title: 'Czy zwierzę potrafi wrócić do odpoczynku bez człowieka?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'alone_recovery',
      title: 'Jak wygląda wyciszanie po powrocie opiekuna?',
      kind: 'choice',
      options: [
        { id: 'quick', label: 'Dość szybko' },
        { id: 'slow', label: 'Długo pozostaje pobudzone' },
        unknown,
      ],
    },
  ],
  dog_resources: [
    {
      id: 'resource_item',
      title: 'Czego dotyczy napięcie?',
      kind: 'choice',
      options: [
        { id: 'food', label: 'Jedzenia lub gryzaka' },
        { id: 'place', label: 'Miejsca, legowiska lub przedmiotu' },
        { id: 'touch', label: 'Dotyku lub zbliżania się człowieka' },
        unknown,
      ],
    },
    {
      id: 'resource_approach',
      title: 'Kto najczęściej zbliża się w tej sytuacji?',
      kind: 'choice',
      options: [
        { id: 'adult', label: 'Dorosły domownik' },
        { id: 'child', label: 'Dziecko' },
        { id: 'animal', label: 'Inne zwierzę' },
        unknown,
      ],
    },
    {
      id: 'resource_signals',
      title: 'Jakie sygnały widzisz najwcześniej?',
      kind: 'choice',
      options: [
        { id: 'freeze', label: 'Zastyganie lub odchodzenie' },
        { id: 'growl', label: 'Warczenie, kłapanie lub sztywnienie' },
        { id: 'bite', label: 'Próba ugryzienia' },
        unknown,
      ],
    },
    {
      id: 'resource_injury',
      title: 'Czy doszło wcześniej do urazu?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  dog_noise: [
    {
      id: 'noise_source',
      title: 'Jaki bodziec jest najtrudniejszy?',
      kind: 'choice',
      options: [
        { id: 'storm', label: 'Burza, fajerwerki lub głośny dźwięk' },
        { id: 'home', label: 'Hałas w domu lub na klatce' },
        { id: 'outside', label: 'Nagły bodziec na zewnątrz' },
        unknown,
      ],
    },
    {
      id: 'noise_signals',
      title: 'Jak wygląda pierwsza reakcja?',
      kind: 'choice',
      options: [
        { id: 'hide', label: 'Chowanie się lub wycofanie' },
        { id: 'panic', label: 'Panika, próba ucieczki lub silne pobudzenie' },
        { id: 'vocal', label: 'Szczekanie, miauczenie lub wokalizacja' },
        unknown,
      ],
    },
    {
      id: 'noise_recovery',
      title: 'Ile trwa powrót do spokojniejszego stanu?',
      kind: 'choice',
      options: [
        { id: 'minutes', label: 'Kilka minut' },
        { id: 'hours', label: 'Długo po bodźcu' },
        { id: 'until_next', label: 'Napięcie praktycznie nie schodzi' },
        unknown,
      ],
    },
    {
      id: 'noise_escape',
      title: 'Czy istnieje ryzyko ucieczki lub samouszkodzenia przy hałasie?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  dog_change: [
    {
      id: 'change_type',
      title: 'Jaka zmiana wydarzyła się w otoczeniu?',
      kind: 'choice',
      options: [
        { id: 'move', label: 'Przeprowadzka, wyjazd lub remont' },
        { id: 'care', label: 'Zmiana opiekuna lub rozłąka' },
        { id: 'routine', label: 'Zmiana rytmu dnia' },
        unknown,
      ],
    },
    {
      id: 'change_relationship',
      title: 'Czy zmiana dotyczy relacji z człowiekiem lub innym zwierzęciem?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'change_symptoms',
      title: 'Co jest najbardziej widoczne po zmianie?',
      kind: 'choice',
      options: [
        { id: 'withdrawal', label: 'Wycofanie lub chowanie się' },
        { id: 'reactivity', label: 'Większa reaktywność lub pobudzenie' },
        { id: 'routine', label: 'Trudność z odpoczynkiem lub rutyną' },
        unknown,
      ],
    },
    {
      id: 'change_stability',
      title: 'Czy w najbliższych dniach można przywrócić choć jedną stałą rzecz?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  cat_litter: [
    {
      id: 'litter_problem',
      title: 'Co jest dziś najbliższe obserwacji?',
      kind: 'choice',
      options: [
        { id: 'outside', label: 'Załatwianie poza kuwetą' },
        { id: 'avoidance', label: 'Unikanie konkretnej kuwety' },
        { id: 'frequency', label: 'Zmiana częstotliwości' },
        unknown,
      ],
    },
    {
      id: 'litter_urinary_symptoms',
      title: 'Czy są objawy moczowe, parcie, ból, krew lub brak moczu?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'litter_cat_count',
      title: 'Czy znasz liczbę kotów i dostępnych kuwet?',
      kind: 'choice',
      options: [
        { id: 'clear', label: 'Tak, sytuacja jest jasna' },
        { id: 'partial', label: 'Tylko częściowo' },
        unknown,
      ],
    },
    {
      id: 'litter_change',
      title: 'Czy przed zmianą wydarzyła się zmiana żwirku, miejsca lub sytuacji w domu?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  cat_touch: [
    {
      id: 'touch_context',
      title: 'W jakiej sytuacji najczęściej pojawia się napięcie?',
      kind: 'choice',
      options: [
        { id: 'petting', label: 'Przy głaskaniu' },
        { id: 'handling', label: 'Przy podnoszeniu, czesaniu lub pielęgnacji' },
        { id: 'approach', label: 'Już przy zbliżaniu się człowieka' },
        unknown,
      ],
    },
    {
      id: 'touch_area',
      title: 'Czy jest obszar ciała szczególnie trudny w kontakcie?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'touch_signals',
      title: 'Jakie sygnały pojawiają się najwcześniej?',
      kind: 'choice',
      options: [
        { id: 'tail', label: 'Ogon, uszy lub napięcie skóry' },
        { id: 'leave', label: 'Próba odejścia lub odsunięcia się' },
        { id: 'bite', label: 'Ugryzienie lub machnięcie łapą' },
        unknown,
      ],
    },
    {
      id: 'touch_sudden_or_injury',
      title: 'Czy sytuacja jest nagła albo może wiązać się z urazem?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  cat_conflict: [
    {
      id: 'conflict_pattern',
      title: 'Jaki wzorzec widzisz najczęściej?',
      kind: 'choice',
      options: [
        { id: 'blocking', label: 'Blokowanie przejść lub zasobów' },
        { id: 'chasing', label: 'Gonitwy, syczenie lub napięte spotkania' },
        { id: 'hiding', label: 'Chowanie się i unikanie' },
        unknown,
      ],
    },
    {
      id: 'conflict_locations',
      title: 'Czy są konkretne miejsca, w których napięcie wraca?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'conflict_access_loss',
      title: 'Czy któryś kot traci dostęp do jedzenia, kuwety, wody lub odpoczynku?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'conflict_injury',
      title: 'Czy doszło do urazu?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  cat_change: [
    {
      id: 'change_type',
      title: 'Jaka zmiana wydarzyła się w otoczeniu kota?',
      kind: 'choice',
      options: [
        { id: 'move', label: 'Przeprowadzka, remont lub nowa przestrzeń' },
        { id: 'people', label: 'Nowy domownik, goście lub inna opieka' },
        { id: 'routine', label: 'Zmiana rytmu, hałasu lub zasobów' },
        unknown,
      ],
    },
    {
      id: 'change_relationship',
      title: 'Czy zmiana dotyczy relacji z człowiekiem lub innym kotem?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'change_symptoms',
      title: 'Co jest najbardziej widoczne po zmianie?',
      kind: 'choice',
      options: [
        { id: 'withdrawal', label: 'Wycofanie lub chowanie się' },
        { id: 'litter', label: 'Zmiana przy kuwecie' },
        { id: 'reactivity', label: 'Napięcie lub reaktywność' },
        unknown,
      ],
    },
    {
      id: 'change_stability',
      title: 'Czy można dziś przywrócić spokojne miejsce lub stałą porę dnia?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  noise: [
    {
      id: 'noise_source',
      title: 'Jaki bodziec jest najtrudniejszy?',
      kind: 'choice',
      options: [
        { id: 'storm', label: 'Burza, fajerwerki lub głośny dźwięk' },
        { id: 'home', label: 'Hałas w domu lub na klatce' },
        { id: 'outside', label: 'Nagły bodziec na zewnątrz' },
        unknown,
      ],
    },
    {
      id: 'noise_signals',
      title: 'Jak wygląda pierwsza reakcja?',
      kind: 'choice',
      options: [
        { id: 'hide', label: 'Chowanie się lub wycofanie' },
        { id: 'panic', label: 'Panika, próba ucieczki lub silne pobudzenie' },
        { id: 'vocal', label: 'Wokalizacja lub pobudzenie' },
        unknown,
      ],
    },
    {
      id: 'noise_recovery',
      title: 'Ile trwa powrót do spokojniejszego stanu?',
      kind: 'choice',
      options: [
        { id: 'minutes', label: 'Kilka minut' },
        { id: 'hours', label: 'Długo po bodźcu' },
        { id: 'until_next', label: 'Napięcie praktycznie nie schodzi' },
        unknown,
      ],
    },
    {
      id: 'noise_escape',
      title: 'Czy istnieje ryzyko ucieczki lub samouszkodzenia?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
  ],
  other: [
    {
      id: 'other_observable_behavior',
      title: 'Co jest najbardziej możliwe do zauważenia?',
      kind: 'text',
      maxLength: 600,
    },
    {
      id: 'other_context',
      title: 'W jakim kontekście najczęściej to się dzieje?',
      kind: 'text',
      maxLength: 600,
    },
    {
      id: 'other_pattern',
      title: 'Czy widzisz powtarzalny wzorzec?',
      kind: 'choice',
      options: yesNoUnknown('Tak', 'Nie'),
    },
    {
      id: 'other_main_concern',
      title: 'Jaka jest Twoja główna obawa?',
      kind: 'text',
      maxLength: 600,
    },
  ],
}

const longCoreSections: CaseMapQuestionSection[] = [
  {
    id: 'animal-and-home',
    title: 'A. Zwierzę i dom',
    helper: 'Zbieramy tylko tło potrzebne do zrozumienia tej sprawy.',
    questions: [
      { id: 'intake_pet_name', title: 'Jak ma na imię zwierzę?', kind: 'text', maxLength: 80 },
      { id: 'intake_pet_age', title: 'Ile ma lat lub na jakim jest etapie życia?', kind: 'text', maxLength: 120 },
      { id: 'intake_household', title: 'Kto mieszka ze zwierzęciem i jak wygląda dom?', kind: 'text', maxLength: 600 },
    ],
  },
  {
    id: 'health-and-history',
    title: 'B. Zdrowie i historia',
    helper: 'To nie zastępuje konsultacji weterynaryjnej.',
    questions: [
      { id: 'intake_health_history', title: 'Co warto wiedzieć o zdrowiu i dotychczasowej historii?', kind: 'text', maxLength: 900 },
      { id: 'intake_medication', title: 'Czy zwierzę przyjmuje leki lub jest pod opieką weterynarza?', kind: 'text', maxLength: 600 },
    ],
  },
  {
    id: 'problem-course',
    title: 'C. Przebieg problemu',
    helper: 'Szukamy początku, wyzwalaczy i rytmu dnia.',
    questions: [
      { id: 'intake_problem_start', title: 'Kiedy i jak zaczęła się trudność?', kind: 'text', maxLength: 900 },
      { id: 'intake_triggers', title: 'Co najczęściej poprzedza sytuację?', kind: 'text', maxLength: 900 },
      { id: 'intake_daily_routine', title: 'Jak wygląda typowy dzień i odpoczynek zwierzęcia?', kind: 'text', maxLength: 900 },
      { id: 'intake_environment', title: 'Co w środowisku może mieć znaczenie?', kind: 'text', maxLength: 900 },
      { id: 'intake_relationships', title: 'Jak wyglądają ważne relacje w domu?', kind: 'text', maxLength: 900 },
    ],
  },
  {
    id: 'one-event',
    title: 'D. Jedno konkretne zdarzenie',
    helper: 'Opisz jedną sytuację od początku do końca, bez szukania winy.',
    questions: [
      { id: 'intake_event_before', title: 'Co było tuż przed zdarzeniem?', kind: 'text', maxLength: 900 },
      { id: 'intake_event_behavior', title: 'Co dokładnie zrobiło zwierzę i inni uczestnicy?', kind: 'text', maxLength: 900 },
      { id: 'intake_event_after', title: 'Co wydarzyło się potem i jak sytuacja się zakończyła?', kind: 'text', maxLength: 900 },
    ],
  },
  {
    id: 'previous-actions-and-goal',
    title: 'E. Dotychczasowe działania i cel',
    helper: 'Dzięki temu nie zaczynamy od zgadywania ani powtarzania tego, co nie pomogło.',
    questions: [
      { id: 'intake_previous_steps', title: 'Co było już próbowane i z jakim skutkiem?', kind: 'text', maxLength: 900 },
      { id: 'intake_goal', title: 'Co ma się zmienić po konsultacji?', kind: 'text', maxLength: 600 },
      {
        id: 'intake_media_permission',
        title: 'Czy możesz później dołączyć zdjęcia lub nagranie, jeśli będzie to pomocne?',
        kind: 'choice',
        options: [
          { id: 'yes', label: 'Tak' },
          { id: 'later', label: 'Może później' },
          { id: 'no', label: 'Nie' },
        ],
      },
      { id: 'intake_notes', title: 'Czy jest coś ważnego, czego nie było w pytaniach?', kind: 'text', maxLength: 1200 },
    ],
  },
]

export function getCaseMapFastQuestions(topic: CaseMapTopic): CaseMapQuestion[] {
  return [...fastCore, ...moduleByTopic[topic]]
}

/**
 * The public quick map is intentionally much shorter than the consultant
 * interview. It has five observation questions and no health, injury or
 * emergency fields; those are for a real conversation when they matter.
 */
const SHORT_TOPIC_QUESTION_ID: Record<CaseMapTopic, string> = {
  dog_walks: 'walk_pattern',
  dog_alone: 'alone_first_signal',
  dog_resources: 'resource_signals',
  dog_noise: 'noise_recovery',
  dog_change: 'change_symptoms',
  cat_litter: 'litter_problem',
  cat_touch: 'touch_context',
  cat_conflict: 'conflict_pattern',
  cat_change: 'change_symptoms',
  noise: 'noise_recovery',
  other: 'other_observable_behavior',
}

const SHORT_CORE_QUESTION_IDS = ['fast_onset', 'fast_frequency', 'fast_impact', 'fast_goal'] as const

export function getCaseMapShortFlowQuestions(topic: CaseMapTopic): CaseMapQuestion[] {
  const questions = getCaseMapFastQuestions(topic)
  const ids = [
    ...SHORT_CORE_QUESTION_IDS.slice(0, 3),
    SHORT_TOPIC_QUESTION_ID[topic],
    SHORT_CORE_QUESTION_IDS[3],
  ]

  return ids.flatMap((id) => {
    const question = questions.find((candidate) => candidate.id === id)
    return question ? [question] : []
  })
}

export function getCaseMapLongSections(topic: CaseMapTopic): CaseMapQuestionSection[] {
  return [
    ...longCoreSections,
    {
      id: 'topic-details',
      title: 'Szczegóły tej sytuacji',
      helper: 'Te pytania pomagają uporządkować temat przed konsultacją.',
      questions: moduleByTopic[topic],
    },
  ]
}

/**
 * Publiczna Pełniejsza mapa nie zmienia się w ankietę o zdrowiu ani formularz
 * bezpieczeństwa. Te szczegóły zostają wyłącznie w prywatnym wywiadzie, gdzie
 * specjalista może nadać im właściwy kontekst.
 */
const PUBLIC_LONG_OMITTED_SECTION_IDS = new Set(['health-and-history'])
const PUBLIC_LONG_OMITTED_QUESTION_IDS = new Set([
  'walk_contact_history',
  'resource_injury',
  'noise_escape',
  'litter_urinary_symptoms',
  'touch_sudden_or_injury',
  'conflict_injury',
])

export function getCaseMapPublicLongSections(topic: CaseMapTopic): CaseMapQuestionSection[] {
  return getCaseMapLongSections(topic).flatMap((section) => {
    if (PUBLIC_LONG_OMITTED_SECTION_IDS.has(section.id)) return []

    const questions = section.questions.filter((question) => !PUBLIC_LONG_OMITTED_QUESTION_IDS.has(question.id))
    return questions.length > 0 ? [{ ...section, questions }] : []
  })
}

export function getCaseMapQuestionCount(path: CaseMapPath, topic: CaseMapTopic) {
  if (path === 'fast') {
    return 3 + getCaseMapShortFlowQuestions(topic).length
  }

  return 2 + CASE_MAP_TRIAGE_QUESTIONS.length + getCaseMapLongSections(topic)
    .reduce((count, section) => count + section.questions.length, 0)
}
