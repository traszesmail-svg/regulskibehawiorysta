export type QuizSpecies = 'pies' | 'kot'

export type QuizTopic =
  | 'dog_walks'
  | 'dog_alone'
  | 'dog_resources'
  | 'dog_noise'
  | 'dog_change'
  | 'cat_litter'
  | 'cat_touch'
  | 'cat_conflict'
  | 'cat_change'
  | 'noise'
  | 'other'

export type QuizQuestionId = 'species' | 'topic' | 'safety' | 'health' | 'detail' | 'impact'
export type QuizAnswers = Partial<Record<QuizQuestionId, string>>
export type QuizServiceKey = 'kwadrans' | 'dwa-kwadranse' | 'pelna-konsultacja'
export type QuizRoute = 'incomplete' | 'safety_first' | 'vet_first' | 'observe_first' | 'short_consultation' | 'full_consultation'

export type QuizOption = {
  id: string
  label: string
  helper?: string
}

export type QuizQuestion = {
  id: QuizQuestionId
  title: string
  helper?: string
  options: QuizOption[]
}

export type QuizProblemContext = {
  problemKey: string
  species?: QuizSpecies
  topic?: QuizTopic
  heroTitle: string
  heroCopy: string
}

export type QuizResult = {
  route: QuizRoute
  title: string
  summary: string
  firstStep: string
  avoid: string
  observe: string
  reasons: string[]
  note: string
  serviceKey?: QuizServiceKey
}

export const QUIZ_SERVICE_LABELS: Record<QuizServiceKey, { label: string; price: string; duration: string }> = {
  kwadrans: {
    label: 'Kwadrans',
    price: '69 zł',
    duration: '15 min audio',
  },
  'dwa-kwadranse': {
    label: 'Konsultacja 30 min',
    price: '169 zł',
    duration: '30 min online',
  },
  'pelna-konsultacja': {
    label: 'Pełna konsultacja',
    price: '470 zł',
    duration: 'ok. 2h online',
  },
}

export const QUIZ_PROBLEM_CONTEXTS: Record<string, QuizProblemContext> = {
  'pies-szczeka-na-psy': {
    problemKey: 'pies-szczeka-na-psy',
    species: 'pies',
    topic: 'dog_walks',
    heroTitle: 'Sprawdźmy pierwszy krok przy reakcjach na spacerze',
    heroCopy: 'Nie musisz rozstrzygać, czy to lęk, frustracja czy „agresjaâ€ť. Zobaczymy, co dzieje się przed reakcją i jak dziś obniżyć presję.',
  },
  'pies-ciagnie-na-smyczy': {
    problemKey: 'pies-ciagnie-na-smyczy',
    species: 'pies',
    topic: 'dog_walks',
    heroTitle: 'Sprawdźmy pierwszy krok przy trudnym spacerze',
    heroCopy: 'Rozdzielimy tempo i pobudzenie od reakcji na bodźce, żeby nie dorabiać psu niepotrzebnej etykiety.',
  },
  'pies-nie-zostaje-sam': {
    problemKey: 'pies-nie-zostaje-sam',
    species: 'pies',
    topic: 'dog_alone',
    heroTitle: 'Sprawdźmy pierwszy krok przy zostawaniu samemu',
    heroCopy: 'Zaczniemy od tego, co naprawdę dzieje się po wyjściu, a nie od zgadywania, czy pies się „nudziâ€ť.',
  },
  'wakacje-opieka-zmiana-rytmu': {
    problemKey: 'wakacje-opieka-zmiana-rytmu',
    species: 'pies',
    topic: 'dog_change',
    heroTitle: 'Ułóżmy spokojny plan na zmianę rytmu',
    heroCopy: 'Sprawdzimy, co zmieni się w opiece i co warto przygotować, zanim zrobi się z tego kryzys.',
  },
  'kot-sika-poza-kuweta': {
    problemKey: 'kot-sika-poza-kuweta',
    species: 'kot',
    topic: 'cat_litter',
    heroTitle: 'Sprawdźmy pierwszy krok przy kuwecie',
    heroCopy: 'Przy kuwecie najpierw oddzielamy możliwe czerwone flagi zdrowotne od zmian w środowisku i stresie.',
  },
  'kot-gryzie-przy-glaskaniu': {
    problemKey: 'kot-gryzie-przy-glaskaniu',
    species: 'kot',
    topic: 'cat_touch',
    heroTitle: 'Sprawdźmy pierwszy krok przy gryzieniu podczas kontaktu',
    heroCopy: 'Skupimy się na sygnałach napięcia i granicach kota — bez zakładania, że chodzi o konflikt z innym kotem.',
  },
  'konflikt-miedzy-kotami': {
    problemKey: 'konflikt-miedzy-kotami',
    species: 'kot',
    topic: 'cat_conflict',
    heroTitle: 'Sprawdźmy pierwszy krok przy napięciu między kotami',
    heroCopy: 'Zobaczymy, czy problem dotyczy zasobów, blokowania przestrzeni czy bezpieczeństwa codziennych sytuacji.',
  },
  'nagla-zmiana-zachowania': {
    problemKey: 'nagla-zmiana-zachowania',
    topic: 'other',
    heroTitle: 'Najpierw sprawdźmy, czy sytuacja jest bezpieczna',
    heroCopy: 'Nagła zmiana zachowania może mieć tło zdrowotne. Ta krótka mapa pomoże ustalić właściwy pierwszy krok.',
  },
  'halas-burza-fajerwerki': {
    problemKey: 'halas-burza-fajerwerki',
    topic: 'noise',
    heroTitle: 'Ułóżmy pierwszy krok przy hałasie i panice',
    heroCopy: 'Zaczniemy od bezpieczeństwa, miejsca odpoczynku i tego, co pomaga nie dokładać presji.',
  },
}

const speciesQuestion: QuizQuestion = {
  id: 'species',
  title: 'Kogo dotyczy sytuacja?',
  helper: 'Wybierz zwierzę, od którego zaczynamy.',
  options: [
    { id: 'pies', label: 'Pies', helper: 'Spacer, samotność, pobudzenie, zasoby, hałas lub nagła zmiana.' },
    { id: 'kot', label: 'Kot', helper: 'Kuweta, kontakt, relacje między kotami, stres lub zmiana w domu.' },
  ],
}

const safetyQuestion: QuizQuestion = {
  id: 'safety',
  title: 'Czy dziś istnieje ryzyko urazu albo trudno bezpiecznie przerwać sytuację?',
  helper: 'To nie jest ocena charakteru zwierzęcia. Chodzi wyłącznie o bezpieczeństwo teraz.',
  options: [
    { id: 'yes', label: 'Tak', helper: 'Było ugryzienie, atak, realne zagrożenie albo nie da się bezpiecznie rozdzielić sytuacji.' },
    { id: 'unsure', label: 'Nie mam pewności', helper: 'Obawiam się eskalacji albo nie wiem, jak bezpiecznie zareagować.' },
    { id: 'no', label: 'Nie', helper: 'Sytuacja jest trudna, ale na dziś potrafimy ją bezpiecznie zatrzymać.' },
  ],
}

const healthQuestion: QuizQuestion = {
  id: 'health',
  title: 'Czy zmiana była nagła albo pojawiły się sygnały zdrowotne?',
  helper: 'Ból, apatia, zmiana apetytu, ruchu, snu lub kuwety wymagają najpierw ostrożności.',
  options: [
    { id: 'yes', label: 'Tak', helper: 'Widzę nagłą zmianę, ból albo inne niepokojące objawy.' },
    { id: 'unsure', label: 'Nie mam pewności', helper: 'Coś się zmieniło, ale trudno połączyć fakty.' },
    { id: 'no', label: 'Nie', helper: 'To raczej stały obraz bez nowych objawów zdrowotnych.' },
  ],
}

const impactQuestion: QuizQuestion = {
  id: 'impact',
  title: 'Jak mocno sytuacja wpływa teraz na codzienność?',
  helper: 'To pomaga dobrać zakres rozmowy — nie jest oceną Ciebie ani zwierzęcia.',
  options: [
    { id: 'single', label: 'Dotyczy jednego, dość czytelnego momentu', helper: 'Np. konkretnej trasy, pory dnia albo jednego rodzaju kontaktu.' },
    { id: 'recurring', label: 'Wraca regularnie i potrzebuję uporządkować kilka rzeczy', helper: 'Wiem, że to ważne, ale nie dominuje jeszcze całego dnia.' },
    { id: 'daily', label: 'Jest codziennie albo wyraźnie ogranicza życie domu', helper: 'Wpływa na odpoczynek, spacery, relacje lub podstawowe potrzeby.' },
    { id: 'wide', label: 'Ĺączy kilka sytuacji, zwierząt lub domowników', helper: 'Trudno oddzielić jeden temat od reszty.' },
  ],
}

const topicOptionsBySpecies: Record<QuizSpecies, QuizOption[]> = {
  pies: [
    { id: 'dog_walks', label: 'Spacer, ciągnięcie lub reakcje na bodźce', helper: 'Psy, ludzie, dystans, tempo, pobudzenie albo trudne mijanki.' },
    { id: 'dog_alone', label: 'Zostawanie samemu', helper: 'Wycie, niszczenie, krążenie, napięcie po wyjściu opiekuna.' },
    { id: 'dog_resources', label: 'Napięcie przy zasobach lub kontakcie', helper: 'Jedzenie, miejsce, przedmiot, dotyk albo zbliżanie się człowieka.' },
    { id: 'dog_noise', label: 'Hałas, burza lub nagłe bodźce', helper: 'Dźwięki, goście, ruch na zewnątrz, zaskoczenie.' },
    { id: 'dog_change', label: 'Zmiana rytmu lub sytuacji w domu', helper: 'Wyjazd, nowy opiekun, przeprowadzka albo nowy plan dnia.' },
    { id: 'other', label: 'Inna sytuacja', helper: 'Nie musisz umieć jej fachowo nazwać.' },
  ],
  kot: [
    { id: 'cat_litter', label: 'Kuweta lub zmiana załatwiania się', helper: 'Miejsce, żwirek, częstotliwość, napięcie albo nagła zmiana.' },
    { id: 'cat_touch', label: 'Gryzienie, dotyk lub pielęgnacja', helper: 'Głaskanie, podnoszenie, czesanie albo próba odsunięcia się.' },
    { id: 'cat_conflict', label: 'Napięcie między kotami', helper: 'Gonitwy, blokowanie przejść, zasobów albo cicha presja.' },
    { id: 'cat_change', label: 'Stres lub zmiana w domu', helper: 'Chowanie się, wycofanie, przeprowadzka, goście albo nowy rytm.' },
    { id: 'noise', label: 'Hałas lub nagły bodziec', helper: 'Dźwięki, remont, burza, ruch za oknem albo inne zaskoczenie.' },
    { id: 'other', label: 'Inna sytuacja', helper: 'Nie musisz rozstrzygać, czy to zdrowie, stres czy relacja.' },
  ],
}

const topicDetails: Record<QuizTopic, QuizQuestion> = {
  dog_walks: {
    id: 'detail',
    title: 'Co jest najbliższe temu, co widzisz na spacerze?',
    helper: 'Wybierz obserwację, nie etykietę zachowania.',
    options: [
      { id: 'distance', label: 'Reakcja zaczyna się już z dystansu', helper: 'Pies napina się, wpatruje albo szczeka, zanim bodziec jest blisko.' },
      { id: 'close', label: 'Najtrudniej jest przy bliskim mijaniu', helper: 'Przy większym dystansie zwykle jest spokojniej.' },
      { id: 'pulling', label: 'Najbardziej chodzi o tempo i ciągnięcie', helper: 'Nie chcę zakładać, że pies reaguje na inne psy lub ludzi.' },
      { id: 'mixed', label: 'To miesza się albo nie wiem', helper: 'Potrzebuję najpierw spokojnie uporządkować obserwacje.' },
    ],
  },
  dog_alone: {
    id: 'detail',
    title: 'Co masz już sprawdzone przy zostawaniu samemu?',
    helper: 'Nagranie jest bardziej pomocne niż zgadywanie po powrocie do domu.',
    options: [
      { id: 'recorded_panic', label: 'Na nagraniu widać silne napięcie lub panikę', helper: 'Wokalizacja, krążenie, dyszenie, niszczenie albo brak możliwości odpoczynku.' },
      { id: 'unclear', label: 'Nie mam nagrania albo obraz jest niejasny', helper: 'Nie wiem, kiedy i jak szybko problem się zaczyna.' },
      { id: 'short', label: 'Trudność pojawia się głównie przy dłuższej nieobecności', helper: 'Krótka rozłąka zwykle jest do opanowania.' },
      { id: 'other', label: 'To nie do końca samotność', helper: 'Wolę opisać sytuację później, bez wciskania jej w kategorię.' },
    ],
  },
  dog_resources: {
    id: 'detail',
    title: 'Przy czym najczęściej widać napięcie?',
    helper: 'Jeśli żadna odpowiedź nie pasuje, wybierz ostatnią opcję.',
    options: [
      { id: 'food', label: 'Jedzenie, gryzak lub miska', helper: 'Zastyganie, odchodzenie, warczenie albo pilnowanie dostępu.' },
      { id: 'place', label: 'Miejsce, legowisko lub przedmiot', helper: 'Pies nie chce, by ktoś zbliżał się do przestrzeni lub rzeczy.' },
      { id: 'touch', label: 'Dotyk albo zbliżanie się człowieka', helper: 'Napięcie pojawia się przy kontakcie lub próbie przesunięcia psa.' },
      { id: 'other', label: 'Coś innego lub nie wiem', helper: 'Nie chcę zakładać, czego pies „broniâ€ť.' },
    ],
  },
  dog_noise: {
    id: 'detail',
    title: 'Co jest teraz najtrudniejszym bodźcem?',
    helper: 'To pomoże wybrać bezpieczne zarządzanie, nie „hartowanieâ€ť psa.',
    options: [
      { id: 'storm', label: 'Burza, fajerwerki lub głośne dźwięki', helper: 'Reakcja jest związana z hałasem albo zmianą pogody.' },
      { id: 'home', label: 'Goście, klatka schodowa lub dźwięki w domu', helper: 'Najtrudniejszy jest ruch i dźwięk blisko mieszkania.' },
      { id: 'outside', label: 'Nagłe bodźce na zewnątrz', helper: 'Rower, człowiek zza rogu, samochód lub inny zaskakujący ruch.' },
      { id: 'other', label: 'Mieszanka lub nie wiem', helper: 'Na start wystarczy wskazać, że sytuacja jest nieprzewidywalna.' },
    ],
  },
  dog_change: {
    id: 'detail',
    title: 'Co najbardziej zmieniło się w codziennym rytmie?',
    helper: 'Nie trzeba od razu wiedzieć, co było przyczyną.',
    options: [
      { id: 'care', label: 'Inny opiekun albo dłuższa rozłąka', helper: 'Zmienia się, kto i kiedy jest z psem.' },
      { id: 'place', label: 'Inne miejsce lub dużo nowych bodźców', helper: 'Wyjazd, przeprowadzka, remont albo goście.' },
      { id: 'routine', label: 'Zmiana godzin, spacerów lub odpoczynku', helper: 'Pies ma mniej przewidywalny rytm dnia.' },
      { id: 'other', label: 'Trudno to rozdzielić', helper: 'Kilka zmian wydarzyło się naraz.' },
    ],
  },
  cat_litter: {
    id: 'detail',
    title: 'Czy przy kuwecie widać któryś z pilnych sygnałów?',
    helper: 'Parcie, ból, krew albo brak oddawania moczu to nie jest temat do przeczekania.',
    options: [
      { id: 'red_flag', label: 'Tak — jest ból, parcie, krew lub trudność z oddaniem moczu', helper: 'To wymaga szybkiego kontaktu z lekarzem weterynarii.' },
      { id: 'change', label: 'Jest zmiana miejsca lub częstotliwości, bez tych sygnałów', helper: 'Warto spokojnie zebrać informacje o kuwecie i środowisku.' },
      { id: 'environment', label: 'Problem pojawia się przy konkretnej kuwecie lub zmianie w domu', helper: 'Widzę możliwy związek ze żwirkiem, miejscem, zasobami lub stresem.' },
      { id: 'other', label: 'Nie wiem albo dotyczy czegoś innego', helper: 'Nie chcę zgadywać przyczyny.' },
    ],
  },
  cat_touch: {
    id: 'detail',
    title: 'Kiedy kot najczęściej pokazuje napięcie?',
    helper: 'Szukamy najwcześniejszych sygnałów, nie winy kota.',
    options: [
      { id: 'petting', label: 'Przy głaskaniu po kilku sekundach', helper: 'Przed ugryzieniem mogą pojawiać się sygnały ogona, uszu lub skóry.' },
      { id: 'handling', label: 'Przy podnoszeniu, czesaniu lub pielęgnacji', helper: 'Kontakt jest trudny przy określonej czynności.' },
      { id: 'sudden', label: 'To nowa albo szybko nasilająca się sytuacja', helper: 'Warto szczególnie uważnie sprawdzić tło zdrowotne.' },
      { id: 'other', label: 'Inaczej lub nie wiem', helper: 'Nie muszę trafnie nazwać wzorca na tym etapie.' },
    ],
  },
  cat_conflict: {
    id: 'detail',
    title: 'Co najczęściej widzisz między kotami?',
    helper: 'Konflikt nie musi wyglądać jak otwarta bójka.',
    options: [
      { id: 'blocking', label: 'Blokowanie przejść, kuwety, jedzenia lub miejsc odpoczynku', helper: 'Jeden kot ogranicza drugiemu dostęp do codziennych zasobów.' },
      { id: 'chasing', label: 'Gonitwy, syczenie albo napięte spotkania', helper: 'Trudność jest widoczna przy bezpośrednim kontakcie.' },
      { id: 'hiding', label: 'Jeden kot dużo się chowa lub unika podstawowych rzeczy', helper: 'Napięcie może już wpływać na poczucie bezpieczeństwa.' },
      { id: 'other', label: 'Nie jestem pewien, czy to konflikt', helper: 'Potrzebuję najpierw nazwać obserwacje.' },
    ],
  },
  cat_change: {
    id: 'detail',
    title: 'Co najbardziej zmieniło się w otoczeniu kota?',
    helper: 'Zmiana rytmu, miejsca lub ludzi może mieć znaczenie nawet bez „złego zachowaniaâ€ť.',
    options: [
      { id: 'place', label: 'Przeprowadzka, remont albo nowa przestrzeń', helper: 'Kot ma mniej znanych, spokojnych miejsc.' },
      { id: 'people', label: 'Nowy domownik, goście albo inna opieka', helper: 'Zmieniła się liczba osób lub sposób kontaktu.' },
      { id: 'routine', label: 'Zmienił się rytm dnia, hałas lub dostęp do zasobów', helper: 'Jedzenie, sen, zabawa lub odpoczynek są mniej przewidywalne.' },
      { id: 'other', label: 'To nie pasuje do żadnej opcji', helper: 'Doprecyzujemy to później bez zgadywania.' },
    ],
  },
  noise: {
    id: 'detail',
    title: 'Jaki bodziec jest najtrudniejszy?',
    helper: 'Wybierz to, co najczęściej poprzedza napięcie.',
    options: [
      { id: 'storm', label: 'Burza, fajerwerki lub głośne dźwięki', helper: 'Reakcja jest związana z hałasem albo zmianą pogody.' },
      { id: 'home', label: 'Dźwięki, goście lub ruch w domu', helper: 'Najtrudniejszy jest bodziec blisko miejsca odpoczynku.' },
      { id: 'outside', label: 'Nagły bodziec na zewnątrz', helper: 'Ruch, dźwięk lub widok pojawia się niespodziewanie.' },
      { id: 'other', label: 'Mieszanka lub nie wiem', helper: 'Na start wystarczy, że wiemy o nieprzewidywalności.' },
    ],
  },
  other: {
    id: 'detail',
    title: 'Co najlepiej opisuje sytuację?',
    helper: 'Nie musisz znać fachowej nazwy problemu.',
    options: [
      { id: 'clear', label: 'Widzę jeden dość czytelny moment', helper: 'Mogę wskazać, kiedy zwykle zaczyna się trudność.' },
      { id: 'mixed', label: 'Miesza się kilka rzeczy', helper: 'Trudno rozdzielić emocje, środowisko, zdrowie i rutynę.' },
      { id: 'sudden', label: 'To pojawiło się nagle', helper: 'Nie chcę pomijać możliwego tła zdrowotnego.' },
      { id: 'unclear', label: 'Nie wiem, od czego zacząć', helper: 'Potrzebuję spokojnego uporządkowania sytuacji.' },
    ],
  },
}

const topicGuidance: Record<QuizTopic, Pick<QuizResult, 'firstStep' | 'avoid' | 'observe'>> = {
  dog_walks: {
    firstStep: 'Na najbliższym spacerze wybierz łatwiejszy dystans i krótszy odcinek. Celem jest zauważenie momentu przed napięciem, nie „zaliczenieâ€ť trudnego mijania.',
    avoid: 'Nie skracaj dystansu na siłę i nie zakładaj, że ciągnięcie oznacza agresję.',
    observe: 'Zanotuj: co pojawia się najpierw, z jakiego dystansu i po jakim czasie pies wraca do kontaktu.',
  },
  dog_alone: {
    firstStep: 'Nagraj pierwsze 20–30 minut po wyjściu, jeśli da się to zrobić bez dokładania stresu.',
    avoid: 'Nie zostawiaj psa „żeby się przyzwyczaiłâ€ť, jeśli nagranie pokazuje narastającą panikę.',
    observe: 'Zanotuj czas do pierwszego objawu, jego kolejność i to, czy pies potrafi wrócić do odpoczynku.',
  },
  dog_resources: {
    firstStep: 'Na razie zarządzaj odległością i przestrzenią: nie podchodź po przedmiot, gdy pies już jest napięty.',
    avoid: 'Nie zabieraj zasobu, nie karz za warczenie i nie testuj granic psa.',
    observe: 'Zanotuj, co dzieje się tuż przed napięciem oraz czy pies ma możliwość spokojnego odejścia.',
  },
  dog_noise: {
    firstStep: 'Przygotuj spokojne miejsce odpoczynku, ogranicz ekspozycję i pozwól psu wybrać dystans od bodźca.',
    avoid: 'Nie wystawiaj psa na hałas „dla przyzwyczajeniaâ€ť, gdy już widać silne napięcie.',
    observe: 'Zanotuj rodzaj bodźca, pierwsze sygnały ciała i czas potrzebny do wyciszenia.',
  },
  dog_change: {
    firstStep: 'Wybierz jedną stałą rzecz na najbliższe dni: porę spaceru, miejsce odpoczynku lub sposób rozłąki.',
    avoid: 'Nie dokładaj wielu zmian naraz i nie zostawiaj najtrudniejszej próby na dzień wyjazdu.',
    observe: 'Spisz, co dokładnie zmieniło się w opiece, miejscu, rytmie i poziomie bodźców.',
  },
  cat_litter: {
    firstStep: 'Spisz miejsca zdarzeń, liczbę kuwet, żwirek, lokalizację i wszystkie ostatnie zmiany w domu.',
    avoid: 'Nie karz kota i nie traktuj zachowania jako złośliwości.',
    observe: 'Zanotuj częstotliwość, wygląd oddawania moczu oraz to, czy kot unika konkretnej kuwety lub miejsca.',
  },
  cat_touch: {
    firstStep: 'Skróć kontakt do kilku sekund i kończ go, zanim pojawi się napięcie w ogonie, uszach lub skórze grzbietu.',
    avoid: 'Nie przytrzymuj kota i nie sprawdzaj, ile jeszcze „wytrzymaâ€ť.',
    observe: 'Zanotuj miejsce dotyku, liczbę sekund do pierwszego sygnału i to, jak kot próbuje przerwać kontakt.',
  },
  cat_conflict: {
    firstStep: 'Rozdziel zasoby i przejścia: sprawdź kuwety, miski, wodę, kryjówki oraz miejsca, w których koty się mijają.',
    avoid: 'Nie zmuszaj kotów do wspólnego kontaktu i nie zostawiaj ich, żeby „same ustaliły hierarchięâ€ť.',
    observe: 'Zanotuj, kto kogo blokuje, gdzie oraz czy któryś kot ogranicza jedzenie, kuwetę lub odpoczynek.',
  },
  cat_change: {
    firstStep: 'Przywróć przewidywalność: spokojne miejsca, stałe pory jedzenia i możliwość wycofania się.',
    avoid: 'Nie przyspieszaj adaptacji przez częste wyciąganie kota z kryjówek lub narzucanie kontaktu.',
    observe: 'Zanotuj, co zmieniło się przed początkiem trudności oraz kiedy kot czuje się najspokojniej.',
  },
  noise: {
    firstStep: 'Zabezpiecz miejsce odpoczynku, zmniejsz presję i pozwól zwierzęciu zwiększyć dystans od bodźca.',
    avoid: 'Nie testuj odwagi zwierzęcia przy kolejnym hałasie.',
    observe: 'Zanotuj rodzaj dźwięku, pierwsze sygnały napięcia i czas powrotu do równowagi.',
  },
  other: {
    firstStep: 'Przez najbliższe dni zbierz krótki obraz sytuacji: kiedy się zaczyna, co ją poprzedza i co pomaga ją przerwać.',
    avoid: 'Nie wprowadzaj kilku nowych metod naraz — wtedy trudniej zobaczyć, co naprawdę zmienia sytuację.',
    observe: 'Zanotuj rytm dnia, środowisko, pierwsze sygnały i to, co było już próbowane.',
  },
}

export function getQuizProblemContext(problemKey: string | null | undefined): QuizProblemContext | null {
  const normalizedKey = problemKey?.trim().toLowerCase()
  if (!normalizedKey) return null
  return QUIZ_PROBLEM_CONTEXTS[normalizedKey] ?? null
}

function getTopic(answers: QuizAnswers, context: QuizProblemContext | null): QuizTopic | null {
  const answerTopic = answers.topic as QuizTopic | undefined
  const species = getSpecies(answers, context)

  if (answerTopic && species && topicOptionsBySpecies[species].some((option) => option.id === answerTopic)) {
    return answerTopic
  }

  return context?.topic ?? null
}

function getSpecies(answers: QuizAnswers, context: QuizProblemContext | null): QuizSpecies | null {
  const answerSpecies = answers.species as QuizSpecies | undefined
  return answerSpecies ?? context?.species ?? null
}

function isSafetyRoute(answers: QuizAnswers) {
  return answers.safety === 'yes' || answers.safety === 'unsure'
}

function isVetRoute(answers: QuizAnswers, topic: QuizTopic | null) {
  return (
    answers.health === 'yes' ||
    answers.health === 'unsure' ||
    (topic === 'cat_litter' && answers.detail === 'red_flag') ||
    (topic === 'cat_touch' && answers.detail === 'sudden') ||
    (topic === 'other' && answers.detail === 'sudden')
  )
}

function getTopicQuestion(species: QuizSpecies | null): QuizQuestion | null {
  if (!species) return null

  return {
    id: 'topic',
    title: 'Co jest dziś najbliższe temu, co widzisz?',
    helper: 'Wybierz opis, nie musisz używać fachowej nazwy zachowania.',
    options: topicOptionsBySpecies[species],
  }
}

export function getQuizQuestions(answers: QuizAnswers, context: QuizProblemContext | null): QuizQuestion[] {
  const species = getSpecies(answers, context)
  const topic = getTopic(answers, context)
  const questions: QuizQuestion[] = []

  if (!context?.species) questions.push(speciesQuestion)
  if (!context?.topic) {
    const topicQuestion = getTopicQuestion(species)
    if (topicQuestion) questions.push(topicQuestion)
  }

  questions.push(safetyQuestion)
  if (isSafetyRoute(answers)) return questions

  questions.push(healthQuestion)
  if (isVetRoute(answers, topic)) return questions

  if (topic) {
    const detailQuestion = topicDetails[topic]
    questions.push({
      ...detailQuestion,
      options: [
        ...detailQuestion.options,
        {
          id: 'not_applicable',
          label: 'To nie opisuje naszej sytuacji',
          helper: 'Wybierz tę opcję, jeśli żaden opis nie pasuje — nie musisz dopasowywać odpowiedzi na siłę.',
        },
      ],
    })
  }
  if (isVetRoute(answers, topic)) return questions

  questions.push(impactQuestion)
  return questions
}

export function isQuizComplete(answers: QuizAnswers, context: QuizProblemContext | null = null) {
  return getQuizQuestions(answers, context).every((question) => Boolean(answers[question.id]))
}

function resultForIncomplete(): QuizResult {
  return {
    route: 'incomplete',
    title: 'Dokończmy jeszcze kilka pytań',
    summary: 'Żeby uczciwie wskazać pierwszy krok, potrzebuję pełnej ścieżki odpowiedzi.',
    firstStep: 'Wróć do pytań i wybierz odpowiedź, która jest najbliższa sytuacji.',
    avoid: 'Nie wybieraj formatu konsultacji wyłącznie na podstawie niepełnego opisu.',
    observe: 'Jeśli czegoś nie wiesz, wybierz odpowiedź „nie mam pewnościâ€ť lub „to nie opisuje naszej sytuacjiâ€ť.',
    reasons: ['nie wszystkie pytania potrzebne do bezpiecznego pierwszego kroku mają odpowiedź'],
    note: 'Quiz nie pokazuje rekomendacji usługi, dopóki ścieżka nie jest kompletna.',
  }
}

function getGuidance(topic: QuizTopic | null) {
  return topicGuidance[topic ?? 'other']
}

function resultForSafety(topic: QuizTopic | null): QuizResult {
  const guidance = getGuidance(topic)
  return {
    route: 'safety_first',
    title: 'Najpierw zabezpiecz sytuację',
    summary: 'Z opisu wynika, że na dziś najważniejsze jest ograniczenie ryzyka. To nie jest moment na testowanie zachowania ani wybór formatu konsultacji.',
    firstStep: 'Zwiększ dystans, oddziel zwierzęta lub ludzi bez eskalowania sytuacji i nie zmuszaj do kontaktu.',
    avoid: guidance.avoid,
    observe: 'Zanotuj, kto był w sytuacji, co wydarzyło się bezpośrednio wcześniej i czy doszło do urazu. Jeśli ktoś został ranny, skorzystaj z odpowiedniej pomocy medycznej.',
    reasons: ['wskazujesz ryzyko urazu albo brak pewnego sposobu przerwania sytuacji'],
    note: 'Ta mapa nie zastępuje indywidualnej oceny. Po zabezpieczeniu sytuacji warto przygotować krótki opis i nagranie tylko wtedy, gdy da się je zrobić bez ryzyka.',
  }
}

function resultForVet(topic: QuizTopic | null): QuizResult {
  const guidance = getGuidance(topic)
  return {
    route: 'vet_first',
    title: 'Najpierw skonsultuj tło zdrowotne',
    summary: 'Nagła zmiana albo niepokojące objawy mogą mieć związek ze zdrowiem lub bólem. Najuczciwszym pierwszym krokiem jest kontakt z lekarzem weterynarii.',
    firstStep: 'Skontaktuj się z lekarzem weterynarii i przygotuj krótki opis: kiedy zaczęła się zmiana, co dokładnie się zmieniło oraz jakie objawy widzisz.',
    avoid: guidance.avoid,
    observe: guidance.observe,
    reasons: ['wskazujesz nagłą zmianę, niepewność zdrowotną albo objaw wymagający ostrożności'],
    note: 'Po wykluczeniu lub równoległym prowadzeniu kwestii zdrowotnej można spokojnie ułożyć plan behawioralny.',
  }
}

function resultForService(topic: QuizTopic | null, impact: string | undefined): QuizResult {
  const guidance = getGuidance(topic)

  if (impact === 'daily' || impact === 'wide') {
    return {
      route: 'full_consultation',
      serviceKey: 'pelna-konsultacja',
      title: 'Warto zebrać pełniejszy obraz sytuacji',
      summary: 'Temat wpływa na codzienność albo łączy kilka wątków. Pełniejszy wywiad daje przestrzeń na spokojne rozdzielenie zdrowia, środowiska, emocji i dotychczasowych prób.',
      firstStep: guidance.firstStep,
      avoid: guidance.avoid,
      observe: guidance.observe,
      reasons: [
        impact === 'daily' ? 'sytuacja wraca codziennie lub wyraźnie ogranicza życie domu' : 'sytuacja łączy kilka kontekstów, zwierząt albo domowników',
        'warto oprzeć dalszy plan na szerszym opisie i obserwacjach, nie na jednej etykiecie',
      ],
      note: 'To propozycja zakresu rozmowy, nie diagnoza i nie ostateczna ocena problemu.',
    }
  }

  if (impact === 'recurring') {
    return {
      route: 'observe_first',
      serviceKey: 'dwa-kwadranse',
      title: 'Najpierw uporządkujmy kilka ważnych wątków',
      summary: 'Sytuacja wraca regularnie. Dłuższa krótka rozmowa pozwoli połączyć obserwacje i wybrać bezpieczny kierunek bez zaczynania od pełnej analizy.',
      firstStep: guidance.firstStep,
      avoid: guidance.avoid,
      observe: guidance.observe,
      reasons: ['temat wraca i potrzebuje uporządkowania kilku informacji', 'warto najpierw zebrać konkretny obraz sytuacji'],
      note: 'Jeśli w rozmowie wyjdzie szerszy problem, dalszy krok będzie można dobrać na podstawie realnego kontekstu.',
    }
  }

  return {
    route: 'short_consultation',
    serviceKey: 'kwadrans',
    title: 'Masz dobry punkt, by zacząć od jednego pierwszego kroku',
    summary: 'Opisujesz jeden dość czytelny moment. Krótka rozmowa może pomóc wybrać priorytet, zanim temat urośnie lub dostanie przypadkową etykietę.',
    firstStep: guidance.firstStep,
    avoid: guidance.avoid,
    observe: guidance.observe,
    reasons: ['sytuacja ma na razie jeden, dość czytelny kontekst', 'nie ma wskazanej czerwonej flagi bezpieczeństwa ani zdrowia'],
    note: 'To propozycja pierwszego kroku, nie diagnoza. Możesz wrócić i zmienić odpowiedzi, jeśli coś pominąłeś.',
  }
}

export function resolveQuizResult(answers: QuizAnswers, context: QuizProblemContext | null = null): QuizResult {
  if (!isQuizComplete(answers, context)) return resultForIncomplete()

  const topic = getTopic(answers, context)

  if (isSafetyRoute(answers)) return resultForSafety(topic)
  if (isVetRoute(answers, topic)) return resultForVet(topic)
  return resultForService(topic, answers.impact)
}

export function getQuizTopicLabel(topic: QuizTopic | null) {
  if (!topic) return 'sytuacja opisana w quizie'
  const labels: Record<QuizTopic, string> = {
    dog_walks: 'spacer i reakcje na bodźce',
    dog_alone: 'zostawanie samemu',
    dog_resources: 'napięcie przy zasobach lub kontakcie',
    dog_noise: 'hałas i nagłe bodźce',
    dog_change: 'zmiana rytmu lub sytuacji',
    cat_litter: 'kuweta',
    cat_touch: 'dotyk i kontakt',
    cat_conflict: 'napięcie między kotami',
    cat_change: 'stres lub zmiana w domu',
    noise: 'hałas lub nagły bodziec',
    other: 'sytuacja do spokojnego uporządkowania',
  }
  return labels[topic]
}

