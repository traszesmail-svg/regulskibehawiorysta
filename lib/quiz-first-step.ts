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
    price: '69 zĹ‚',
    duration: '15 min audio',
  },
  'dwa-kwadranse': {
    label: 'Konsultacja 30 min',
    price: '169 zĹ‚',
    duration: '30 min online',
  },
  'pelna-konsultacja': {
    label: 'PeĹ‚na konsultacja',
    price: '470 zĹ‚',
    duration: 'ok. 2h online',
  },
}

export const QUIZ_PROBLEM_CONTEXTS: Record<string, QuizProblemContext> = {
  'pies-szczeka-na-psy': {
    problemKey: 'pies-szczeka-na-psy',
    species: 'pies',
    topic: 'dog_walks',
    heroTitle: 'SprawdĹşmy pierwszy krok przy reakcjach na spacerze',
    heroCopy: 'Nie musisz rozstrzygaÄ‡, czy to lÄ™k, frustracja czy â€žagresjaâ€ť. Zobaczymy, co dzieje siÄ™ przed reakcjÄ… i jak dziĹ› obniĹĽyÄ‡ presjÄ™.',
  },
  'pies-ciagnie-na-smyczy': {
    problemKey: 'pies-ciagnie-na-smyczy',
    species: 'pies',
    topic: 'dog_walks',
    heroTitle: 'SprawdĹşmy pierwszy krok przy trudnym spacerze',
    heroCopy: 'Rozdzielimy tempo i pobudzenie od reakcji na bodĹşce, ĹĽeby nie dorabiaÄ‡ psu niepotrzebnej etykiety.',
  },
  'pies-nie-zostaje-sam': {
    problemKey: 'pies-nie-zostaje-sam',
    species: 'pies',
    topic: 'dog_alone',
    heroTitle: 'SprawdĹşmy pierwszy krok przy zostawaniu samemu',
    heroCopy: 'Zaczniemy od tego, co naprawdÄ™ dzieje siÄ™ po wyjĹ›ciu, a nie od zgadywania, czy pies siÄ™ â€žnudziâ€ť.',
  },
  'wakacje-opieka-zmiana-rytmu': {
    problemKey: 'wakacje-opieka-zmiana-rytmu',
    species: 'pies',
    topic: 'dog_change',
    heroTitle: 'UĹ‚ĂłĹĽmy spokojny plan na zmianÄ™ rytmu',
    heroCopy: 'Sprawdzimy, co zmieni siÄ™ w opiece i co warto przygotowaÄ‡, zanim zrobi siÄ™ z tego kryzys.',
  },
  'kot-sika-poza-kuweta': {
    problemKey: 'kot-sika-poza-kuweta',
    species: 'kot',
    topic: 'cat_litter',
    heroTitle: 'SprawdĹşmy pierwszy krok przy kuwecie',
    heroCopy: 'Przy kuwecie najpierw oddzielamy moĹĽliwe czerwone flagi zdrowotne od zmian w Ĺ›rodowisku i stresie.',
  },
  'kot-gryzie-przy-glaskaniu': {
    problemKey: 'kot-gryzie-przy-glaskaniu',
    species: 'kot',
    topic: 'cat_touch',
    heroTitle: 'SprawdĹşmy pierwszy krok przy gryzieniu podczas kontaktu',
    heroCopy: 'Skupimy siÄ™ na sygnaĹ‚ach napiÄ™cia i granicach kota â€” bez zakĹ‚adania, ĹĽe chodzi o konflikt z innym kotem.',
  },
  'konflikt-miedzy-kotami': {
    problemKey: 'konflikt-miedzy-kotami',
    species: 'kot',
    topic: 'cat_conflict',
    heroTitle: 'SprawdĹşmy pierwszy krok przy napiÄ™ciu miÄ™dzy kotami',
    heroCopy: 'Zobaczymy, czy problem dotyczy zasobĂłw, blokowania przestrzeni czy bezpieczeĹ„stwa codziennych sytuacji.',
  },
  'nagla-zmiana-zachowania': {
    problemKey: 'nagla-zmiana-zachowania',
    topic: 'other',
    heroTitle: 'Najpierw sprawdĹşmy, czy sytuacja jest bezpieczna',
    heroCopy: 'NagĹ‚a zmiana zachowania moĹĽe mieÄ‡ tĹ‚o zdrowotne. Ta krĂłtka mapa pomoĹĽe ustaliÄ‡ wĹ‚aĹ›ciwy pierwszy krok.',
  },
  'halas-burza-fajerwerki': {
    problemKey: 'halas-burza-fajerwerki',
    topic: 'noise',
    heroTitle: 'UĹ‚ĂłĹĽmy pierwszy krok przy haĹ‚asie i panice',
    heroCopy: 'Zaczniemy od bezpieczeĹ„stwa, miejsca odpoczynku i tego, co pomaga nie dokĹ‚adaÄ‡ presji.',
  },
}

const speciesQuestion: QuizQuestion = {
  id: 'species',
  title: 'Kogo dotyczy sytuacja?',
  helper: 'Wybierz zwierzÄ™, od ktĂłrego zaczynamy.',
  options: [
    { id: 'pies', label: 'Pies', helper: 'Spacer, samotnoĹ›Ä‡, pobudzenie, zasoby, haĹ‚as lub nagĹ‚a zmiana.' },
    { id: 'kot', label: 'Kot', helper: 'Kuweta, kontakt, relacje miÄ™dzy kotami, stres lub zmiana w domu.' },
  ],
}

const safetyQuestion: QuizQuestion = {
  id: 'safety',
  title: 'Czy dziĹ› istnieje ryzyko urazu albo trudno bezpiecznie przerwaÄ‡ sytuacjÄ™?',
  helper: 'To nie jest ocena charakteru zwierzÄ™cia. Chodzi wyĹ‚Ä…cznie o bezpieczeĹ„stwo teraz.',
  options: [
    { id: 'yes', label: 'Tak', helper: 'ByĹ‚o ugryzienie, atak, realne zagroĹĽenie albo nie da siÄ™ bezpiecznie rozdzieliÄ‡ sytuacji.' },
    { id: 'unsure', label: 'Nie mam pewnoĹ›ci', helper: 'Obawiam siÄ™ eskalacji albo nie wiem, jak bezpiecznie zareagowaÄ‡.' },
    { id: 'no', label: 'Nie', helper: 'Sytuacja jest trudna, ale na dziĹ› potrafimy jÄ… bezpiecznie zatrzymaÄ‡.' },
  ],
}

const healthQuestion: QuizQuestion = {
  id: 'health',
  title: 'Czy zmiana byĹ‚a nagĹ‚a albo pojawiĹ‚y siÄ™ sygnaĹ‚y zdrowotne?',
  helper: 'BĂłl, apatia, zmiana apetytu, ruchu, snu lub kuwety wymagajÄ… najpierw ostroĹĽnoĹ›ci.',
  options: [
    { id: 'yes', label: 'Tak', helper: 'WidzÄ™ nagĹ‚Ä… zmianÄ™, bĂłl albo inne niepokojÄ…ce objawy.' },
    { id: 'unsure', label: 'Nie mam pewnoĹ›ci', helper: 'CoĹ› siÄ™ zmieniĹ‚o, ale trudno poĹ‚Ä…czyÄ‡ fakty.' },
    { id: 'no', label: 'Nie', helper: 'To raczej staĹ‚y obraz bez nowych objawĂłw zdrowotnych.' },
  ],
}

const impactQuestion: QuizQuestion = {
  id: 'impact',
  title: 'Jak mocno sytuacja wpĹ‚ywa teraz na codziennoĹ›Ä‡?',
  helper: 'To pomaga dobraÄ‡ zakres rozmowy â€” nie jest ocenÄ… Ciebie ani zwierzÄ™cia.',
  options: [
    { id: 'single', label: 'Dotyczy jednego, doĹ›Ä‡ czytelnego momentu', helper: 'Np. konkretnej trasy, pory dnia albo jednego rodzaju kontaktu.' },
    { id: 'recurring', label: 'Wraca regularnie i potrzebujÄ™ uporzÄ…dkowaÄ‡ kilka rzeczy', helper: 'Wiem, ĹĽe to waĹĽne, ale nie dominuje jeszcze caĹ‚ego dnia.' },
    { id: 'daily', label: 'Jest codziennie albo wyraĹşnie ogranicza ĹĽycie domu', helper: 'WpĹ‚ywa na odpoczynek, spacery, relacje lub podstawowe potrzeby.' },
    { id: 'wide', label: 'ĹÄ…czy kilka sytuacji, zwierzÄ…t lub domownikĂłw', helper: 'Trudno oddzieliÄ‡ jeden temat od reszty.' },
  ],
}

const topicOptionsBySpecies: Record<QuizSpecies, QuizOption[]> = {
  pies: [
    { id: 'dog_walks', label: 'Spacer, ciÄ…gniÄ™cie lub reakcje na bodĹşce', helper: 'Psy, ludzie, dystans, tempo, pobudzenie albo trudne mijanki.' },
    { id: 'dog_alone', label: 'Zostawanie samemu', helper: 'Wycie, niszczenie, krÄ…ĹĽenie, napiÄ™cie po wyjĹ›ciu opiekuna.' },
    { id: 'dog_resources', label: 'NapiÄ™cie przy zasobach lub kontakcie', helper: 'Jedzenie, miejsce, przedmiot, dotyk albo zbliĹĽanie siÄ™ czĹ‚owieka.' },
    { id: 'dog_noise', label: 'HaĹ‚as, burza lub nagĹ‚e bodĹşce', helper: 'DĹşwiÄ™ki, goĹ›cie, ruch na zewnÄ…trz, zaskoczenie.' },
    { id: 'dog_change', label: 'Zmiana rytmu lub sytuacji w domu', helper: 'Wyjazd, nowy opiekun, przeprowadzka albo nowy plan dnia.' },
    { id: 'other', label: 'Inna sytuacja', helper: 'Nie musisz umieÄ‡ jej fachowo nazwaÄ‡.' },
  ],
  kot: [
    { id: 'cat_litter', label: 'Kuweta lub zmiana zaĹ‚atwiania siÄ™', helper: 'Miejsce, ĹĽwirek, czÄ™stotliwoĹ›Ä‡, napiÄ™cie albo nagĹ‚a zmiana.' },
    { id: 'cat_touch', label: 'Gryzienie, dotyk lub pielÄ™gnacja', helper: 'GĹ‚askanie, podnoszenie, czesanie albo prĂłba odsuniÄ™cia siÄ™.' },
    { id: 'cat_conflict', label: 'NapiÄ™cie miÄ™dzy kotami', helper: 'Gonitwy, blokowanie przejĹ›Ä‡, zasobĂłw albo cicha presja.' },
    { id: 'cat_change', label: 'Stres lub zmiana w domu', helper: 'Chowanie siÄ™, wycofanie, przeprowadzka, goĹ›cie albo nowy rytm.' },
    { id: 'noise', label: 'HaĹ‚as lub nagĹ‚y bodziec', helper: 'DĹşwiÄ™ki, remont, burza, ruch za oknem albo inne zaskoczenie.' },
    { id: 'other', label: 'Inna sytuacja', helper: 'Nie musisz rozstrzygaÄ‡, czy to zdrowie, stres czy relacja.' },
  ],
}

const topicDetails: Record<QuizTopic, QuizQuestion> = {
  dog_walks: {
    id: 'detail',
    title: 'Co jest najbliĹĽsze temu, co widzisz na spacerze?',
    helper: 'Wybierz obserwacjÄ™, nie etykietÄ™ zachowania.',
    options: [
      { id: 'distance', label: 'Reakcja zaczyna siÄ™ juĹĽ z dystansu', helper: 'Pies napina siÄ™, wpatruje albo szczeka, zanim bodziec jest blisko.' },
      { id: 'close', label: 'Najtrudniej jest przy bliskim mijaniu', helper: 'Przy wiÄ™kszym dystansie zwykle jest spokojniej.' },
      { id: 'pulling', label: 'Najbardziej chodzi o tempo i ciÄ…gniÄ™cie', helper: 'Nie chcÄ™ zakĹ‚adaÄ‡, ĹĽe pies reaguje na inne psy lub ludzi.' },
      { id: 'mixed', label: 'To miesza siÄ™ albo nie wiem', helper: 'PotrzebujÄ™ najpierw spokojnie uporzÄ…dkowaÄ‡ obserwacje.' },
    ],
  },
  dog_alone: {
    id: 'detail',
    title: 'Co masz juĹĽ sprawdzone przy zostawaniu samemu?',
    helper: 'Nagranie jest bardziej pomocne niĹĽ zgadywanie po powrocie do domu.',
    options: [
      { id: 'recorded_panic', label: 'Na nagraniu widaÄ‡ silne napiÄ™cie lub panikÄ™', helper: 'Wokalizacja, krÄ…ĹĽenie, dyszenie, niszczenie albo brak moĹĽliwoĹ›ci odpoczynku.' },
      { id: 'unclear', label: 'Nie mam nagrania albo obraz jest niejasny', helper: 'Nie wiem, kiedy i jak szybko problem siÄ™ zaczyna.' },
      { id: 'short', label: 'TrudnoĹ›Ä‡ pojawia siÄ™ gĹ‚Ăłwnie przy dĹ‚uĹĽszej nieobecnoĹ›ci', helper: 'KrĂłtka rozĹ‚Ä…ka zwykle jest do opanowania.' },
      { id: 'other', label: 'To nie do koĹ„ca samotnoĹ›Ä‡', helper: 'WolÄ™ opisaÄ‡ sytuacjÄ™ pĂłĹşniej, bez wciskania jej w kategoriÄ™.' },
    ],
  },
  dog_resources: {
    id: 'detail',
    title: 'Przy czym najczÄ™Ĺ›ciej widaÄ‡ napiÄ™cie?',
    helper: 'JeĹ›li ĹĽadna odpowiedĹş nie pasuje, wybierz ostatniÄ… opcjÄ™.',
    options: [
      { id: 'food', label: 'Jedzenie, gryzak lub miska', helper: 'Zastyganie, odchodzenie, warczenie albo pilnowanie dostÄ™pu.' },
      { id: 'place', label: 'Miejsce, legowisko lub przedmiot', helper: 'Pies nie chce, by ktoĹ› zbliĹĽaĹ‚ siÄ™ do przestrzeni lub rzeczy.' },
      { id: 'touch', label: 'Dotyk albo zbliĹĽanie siÄ™ czĹ‚owieka', helper: 'NapiÄ™cie pojawia siÄ™ przy kontakcie lub prĂłbie przesuniÄ™cia psa.' },
      { id: 'other', label: 'CoĹ› innego lub nie wiem', helper: 'Nie chcÄ™ zakĹ‚adaÄ‡, czego pies â€žbroniâ€ť.' },
    ],
  },
  dog_noise: {
    id: 'detail',
    title: 'Co jest teraz najtrudniejszym bodĹşcem?',
    helper: 'To pomoĹĽe wybraÄ‡ bezpieczne zarzÄ…dzanie, nie â€žhartowanieâ€ť psa.',
    options: [
      { id: 'storm', label: 'Burza, fajerwerki lub gĹ‚oĹ›ne dĹşwiÄ™ki', helper: 'Reakcja jest zwiÄ…zana z haĹ‚asem albo zmianÄ… pogody.' },
      { id: 'home', label: 'GoĹ›cie, klatka schodowa lub dĹşwiÄ™ki w domu', helper: 'Najtrudniejszy jest ruch i dĹşwiÄ™k blisko mieszkania.' },
      { id: 'outside', label: 'NagĹ‚e bodĹşce na zewnÄ…trz', helper: 'Rower, czĹ‚owiek zza rogu, samochĂłd lub inny zaskakujÄ…cy ruch.' },
      { id: 'other', label: 'Mieszanka lub nie wiem', helper: 'Na start wystarczy wskazaÄ‡, ĹĽe sytuacja jest nieprzewidywalna.' },
    ],
  },
  dog_change: {
    id: 'detail',
    title: 'Co najbardziej zmieniĹ‚o siÄ™ w codziennym rytmie?',
    helper: 'Nie trzeba od razu wiedzieÄ‡, co byĹ‚o przyczynÄ….',
    options: [
      { id: 'care', label: 'Inny opiekun albo dĹ‚uĹĽsza rozĹ‚Ä…ka', helper: 'Zmienia siÄ™, kto i kiedy jest z psem.' },
      { id: 'place', label: 'Inne miejsce lub duĹĽo nowych bodĹşcĂłw', helper: 'Wyjazd, przeprowadzka, remont albo goĹ›cie.' },
      { id: 'routine', label: 'Zmiana godzin, spacerĂłw lub odpoczynku', helper: 'Pies ma mniej przewidywalny rytm dnia.' },
      { id: 'other', label: 'Trudno to rozdzieliÄ‡', helper: 'Kilka zmian wydarzyĹ‚o siÄ™ naraz.' },
    ],
  },
  cat_litter: {
    id: 'detail',
    title: 'Czy przy kuwecie widaÄ‡ ktĂłryĹ› z pilnych sygnaĹ‚Ăłw?',
    helper: 'Parcie, bĂłl, krew albo brak oddawania moczu to nie jest temat do przeczekania.',
    options: [
      { id: 'red_flag', label: 'Tak â€” jest bĂłl, parcie, krew lub trudnoĹ›Ä‡ z oddaniem moczu', helper: 'To wymaga szybkiego kontaktu z lekarzem weterynarii.' },
      { id: 'change', label: 'Jest zmiana miejsca lub czÄ™stotliwoĹ›ci, bez tych sygnaĹ‚Ăłw', helper: 'Warto spokojnie zebraÄ‡ informacje o kuwecie i Ĺ›rodowisku.' },
      { id: 'environment', label: 'Problem pojawia siÄ™ przy konkretnej kuwecie lub zmianie w domu', helper: 'WidzÄ™ moĹĽliwy zwiÄ…zek ze ĹĽwirkiem, miejscem, zasobami lub stresem.' },
      { id: 'other', label: 'Nie wiem albo dotyczy czegoĹ› innego', helper: 'Nie chcÄ™ zgadywaÄ‡ przyczyny.' },
    ],
  },
  cat_touch: {
    id: 'detail',
    title: 'Kiedy kot najczÄ™Ĺ›ciej pokazuje napiÄ™cie?',
    helper: 'Szukamy najwczeĹ›niejszych sygnaĹ‚Ăłw, nie winy kota.',
    options: [
      { id: 'petting', label: 'Przy gĹ‚askaniu po kilku sekundach', helper: 'Przed ugryzieniem mogÄ… pojawiaÄ‡ siÄ™ sygnaĹ‚y ogona, uszu lub skĂłry.' },
      { id: 'handling', label: 'Przy podnoszeniu, czesaniu lub pielÄ™gnacji', helper: 'Kontakt jest trudny przy okreĹ›lonej czynnoĹ›ci.' },
      { id: 'sudden', label: 'To nowa albo szybko nasilajÄ…ca siÄ™ sytuacja', helper: 'Warto szczegĂłlnie uwaĹĽnie sprawdziÄ‡ tĹ‚o zdrowotne.' },
      { id: 'other', label: 'Inaczej lub nie wiem', helper: 'Nie muszÄ™ trafnie nazwaÄ‡ wzorca na tym etapie.' },
    ],
  },
  cat_conflict: {
    id: 'detail',
    title: 'Co najczÄ™Ĺ›ciej widzisz miÄ™dzy kotami?',
    helper: 'Konflikt nie musi wyglÄ…daÄ‡ jak otwarta bĂłjka.',
    options: [
      { id: 'blocking', label: 'Blokowanie przejĹ›Ä‡, kuwety, jedzenia lub miejsc odpoczynku', helper: 'Jeden kot ogranicza drugiemu dostÄ™p do codziennych zasobĂłw.' },
      { id: 'chasing', label: 'Gonitwy, syczenie albo napiÄ™te spotkania', helper: 'TrudnoĹ›Ä‡ jest widoczna przy bezpoĹ›rednim kontakcie.' },
      { id: 'hiding', label: 'Jeden kot duĹĽo siÄ™ chowa lub unika podstawowych rzeczy', helper: 'NapiÄ™cie moĹĽe juĹĽ wpĹ‚ywaÄ‡ na poczucie bezpieczeĹ„stwa.' },
      { id: 'other', label: 'Nie jestem pewien, czy to konflikt', helper: 'PotrzebujÄ™ najpierw nazwaÄ‡ obserwacje.' },
    ],
  },
  cat_change: {
    id: 'detail',
    title: 'Co najbardziej zmieniĹ‚o siÄ™ w otoczeniu kota?',
    helper: 'Zmiana rytmu, miejsca lub ludzi moĹĽe mieÄ‡ znaczenie nawet bez â€žzĹ‚ego zachowaniaâ€ť.',
    options: [
      { id: 'place', label: 'Przeprowadzka, remont albo nowa przestrzeĹ„', helper: 'Kot ma mniej znanych, spokojnych miejsc.' },
      { id: 'people', label: 'Nowy domownik, goĹ›cie albo inna opieka', helper: 'ZmieniĹ‚a siÄ™ liczba osĂłb lub sposĂłb kontaktu.' },
      { id: 'routine', label: 'ZmieniĹ‚ siÄ™ rytm dnia, haĹ‚as lub dostÄ™p do zasobĂłw', helper: 'Jedzenie, sen, zabawa lub odpoczynek sÄ… mniej przewidywalne.' },
      { id: 'other', label: 'To nie pasuje do ĹĽadnej opcji', helper: 'Doprecyzujemy to pĂłĹşniej bez zgadywania.' },
    ],
  },
  noise: {
    id: 'detail',
    title: 'Jaki bodziec jest najtrudniejszy?',
    helper: 'Wybierz to, co najczÄ™Ĺ›ciej poprzedza napiÄ™cie.',
    options: [
      { id: 'storm', label: 'Burza, fajerwerki lub gĹ‚oĹ›ne dĹşwiÄ™ki', helper: 'Reakcja jest zwiÄ…zana z haĹ‚asem albo zmianÄ… pogody.' },
      { id: 'home', label: 'DĹşwiÄ™ki, goĹ›cie lub ruch w domu', helper: 'Najtrudniejszy jest bodziec blisko miejsca odpoczynku.' },
      { id: 'outside', label: 'NagĹ‚y bodziec na zewnÄ…trz', helper: 'Ruch, dĹşwiÄ™k lub widok pojawia siÄ™ niespodziewanie.' },
      { id: 'other', label: 'Mieszanka lub nie wiem', helper: 'Na start wystarczy, ĹĽe wiemy o nieprzewidywalnoĹ›ci.' },
    ],
  },
  other: {
    id: 'detail',
    title: 'Co najlepiej opisuje sytuacjÄ™?',
    helper: 'Nie musisz znaÄ‡ fachowej nazwy problemu.',
    options: [
      { id: 'clear', label: 'WidzÄ™ jeden doĹ›Ä‡ czytelny moment', helper: 'MogÄ™ wskazaÄ‡, kiedy zwykle zaczyna siÄ™ trudnoĹ›Ä‡.' },
      { id: 'mixed', label: 'Miesza siÄ™ kilka rzeczy', helper: 'Trudno rozdzieliÄ‡ emocje, Ĺ›rodowisko, zdrowie i rutynÄ™.' },
      { id: 'sudden', label: 'To pojawiĹ‚o siÄ™ nagle', helper: 'Nie chcÄ™ pomijaÄ‡ moĹĽliwego tĹ‚a zdrowotnego.' },
      { id: 'unclear', label: 'Nie wiem, od czego zaczÄ…Ä‡', helper: 'PotrzebujÄ™ spokojnego uporzÄ…dkowania sytuacji.' },
    ],
  },
}

const topicGuidance: Record<QuizTopic, Pick<QuizResult, 'firstStep' | 'avoid' | 'observe'>> = {
  dog_walks: {
    firstStep: 'Na najbliĹĽszym spacerze wybierz Ĺ‚atwiejszy dystans i krĂłtszy odcinek. Celem jest zauwaĹĽenie momentu przed napiÄ™ciem, nie â€žzaliczenieâ€ť trudnego mijania.',
    avoid: 'Nie skracaj dystansu na siĹ‚Ä™ i nie zakĹ‚adaj, ĹĽe ciÄ…gniÄ™cie oznacza agresjÄ™.',
    observe: 'Zanotuj: co pojawia siÄ™ najpierw, z jakiego dystansu i po jakim czasie pies wraca do kontaktu.',
  },
  dog_alone: {
    firstStep: 'Nagraj pierwsze 20â€“30 minut po wyjĹ›ciu, jeĹ›li da siÄ™ to zrobiÄ‡ bez dokĹ‚adania stresu.',
    avoid: 'Nie zostawiaj psa â€žĹĽeby siÄ™ przyzwyczaiĹ‚â€ť, jeĹ›li nagranie pokazuje narastajÄ…cÄ… panikÄ™.',
    observe: 'Zanotuj czas do pierwszego objawu, jego kolejnoĹ›Ä‡ i to, czy pies potrafi wrĂłciÄ‡ do odpoczynku.',
  },
  dog_resources: {
    firstStep: 'Na razie zarzÄ…dzaj odlegĹ‚oĹ›ciÄ… i przestrzeniÄ…: nie podchodĹş po przedmiot, gdy pies juĹĽ jest napiÄ™ty.',
    avoid: 'Nie zabieraj zasobu, nie karz za warczenie i nie testuj granic psa.',
    observe: 'Zanotuj, co dzieje siÄ™ tuĹĽ przed napiÄ™ciem oraz czy pies ma moĹĽliwoĹ›Ä‡ spokojnego odejĹ›cia.',
  },
  dog_noise: {
    firstStep: 'Przygotuj spokojne miejsce odpoczynku, ogranicz ekspozycjÄ™ i pozwĂłl psu wybraÄ‡ dystans od bodĹşca.',
    avoid: 'Nie wystawiaj psa na haĹ‚as â€ždla przyzwyczajeniaâ€ť, gdy juĹĽ widaÄ‡ silne napiÄ™cie.',
    observe: 'Zanotuj rodzaj bodĹşca, pierwsze sygnaĹ‚y ciaĹ‚a i czas potrzebny do wyciszenia.',
  },
  dog_change: {
    firstStep: 'Wybierz jednÄ… staĹ‚Ä… rzecz na najbliĹĽsze dni: porÄ™ spaceru, miejsce odpoczynku lub sposĂłb rozĹ‚Ä…ki.',
    avoid: 'Nie dokĹ‚adaj wielu zmian naraz i nie zostawiaj najtrudniejszej prĂłby na dzieĹ„ wyjazdu.',
    observe: 'Spisz, co dokĹ‚adnie zmieniĹ‚o siÄ™ w opiece, miejscu, rytmie i poziomie bodĹşcĂłw.',
  },
  cat_litter: {
    firstStep: 'Spisz miejsca zdarzeĹ„, liczbÄ™ kuwet, ĹĽwirek, lokalizacjÄ™ i wszystkie ostatnie zmiany w domu.',
    avoid: 'Nie karz kota i nie traktuj zachowania jako zĹ‚oĹ›liwoĹ›ci.',
    observe: 'Zanotuj czÄ™stotliwoĹ›Ä‡, wyglÄ…d oddawania moczu oraz to, czy kot unika konkretnej kuwety lub miejsca.',
  },
  cat_touch: {
    firstStep: 'SkrĂłÄ‡ kontakt do kilku sekund i koĹ„cz go, zanim pojawi siÄ™ napiÄ™cie w ogonie, uszach lub skĂłrze grzbietu.',
    avoid: 'Nie przytrzymuj kota i nie sprawdzaj, ile jeszcze â€žwytrzymaâ€ť.',
    observe: 'Zanotuj miejsce dotyku, liczbÄ™ sekund do pierwszego sygnaĹ‚u i to, jak kot prĂłbuje przerwaÄ‡ kontakt.',
  },
  cat_conflict: {
    firstStep: 'Rozdziel zasoby i przejĹ›cia: sprawdĹş kuwety, miski, wodÄ™, kryjĂłwki oraz miejsca, w ktĂłrych koty siÄ™ mijajÄ….',
    avoid: 'Nie zmuszaj kotĂłw do wspĂłlnego kontaktu i nie zostawiaj ich, ĹĽeby â€žsame ustaliĹ‚y hierarchiÄ™â€ť.',
    observe: 'Zanotuj, kto kogo blokuje, gdzie oraz czy ktĂłryĹ› kot ogranicza jedzenie, kuwetÄ™ lub odpoczynek.',
  },
  cat_change: {
    firstStep: 'PrzywrĂłÄ‡ przewidywalnoĹ›Ä‡: spokojne miejsca, staĹ‚e pory jedzenia i moĹĽliwoĹ›Ä‡ wycofania siÄ™.',
    avoid: 'Nie przyspieszaj adaptacji przez czÄ™ste wyciÄ…ganie kota z kryjĂłwek lub narzucanie kontaktu.',
    observe: 'Zanotuj, co zmieniĹ‚o siÄ™ przed poczÄ…tkiem trudnoĹ›ci oraz kiedy kot czuje siÄ™ najspokojniej.',
  },
  noise: {
    firstStep: 'Zabezpiecz miejsce odpoczynku, zmniejsz presjÄ™ i pozwĂłl zwierzÄ™ciu zwiÄ™kszyÄ‡ dystans od bodĹşca.',
    avoid: 'Nie testuj odwagi zwierzÄ™cia przy kolejnym haĹ‚asie.',
    observe: 'Zanotuj rodzaj dĹşwiÄ™ku, pierwsze sygnaĹ‚y napiÄ™cia i czas powrotu do rĂłwnowagi.',
  },
  other: {
    firstStep: 'Przez najbliĹĽsze dni zbierz krĂłtki obraz sytuacji: kiedy siÄ™ zaczyna, co jÄ… poprzedza i co pomaga jÄ… przerwaÄ‡.',
    avoid: 'Nie wprowadzaj kilku nowych metod naraz â€” wtedy trudniej zobaczyÄ‡, co naprawdÄ™ zmienia sytuacjÄ™.',
    observe: 'Zanotuj rytm dnia, Ĺ›rodowisko, pierwsze sygnaĹ‚y i to, co byĹ‚o juĹĽ prĂłbowane.',
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
    title: 'Co jest dziĹ› najbliĹĽsze temu, co widzisz?',
    helper: 'Wybierz opis, nie musisz uĹĽywaÄ‡ fachowej nazwy zachowania.',
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
          helper: 'Wybierz tÄ™ opcjÄ™, jeĹ›li ĹĽaden opis nie pasuje â€” nie musisz dopasowywaÄ‡ odpowiedzi na siĹ‚Ä™.',
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
    title: 'DokoĹ„czmy jeszcze kilka pytaĹ„',
    summary: 'Ĺ»eby uczciwie wskazaÄ‡ pierwszy krok, potrzebujÄ™ peĹ‚nej Ĺ›cieĹĽki odpowiedzi.',
    firstStep: 'WrĂłÄ‡ do pytaĹ„ i wybierz odpowiedĹş, ktĂłra jest najbliĹĽsza sytuacji.',
    avoid: 'Nie wybieraj formatu konsultacji wyĹ‚Ä…cznie na podstawie niepeĹ‚nego opisu.',
    observe: 'JeĹ›li czegoĹ› nie wiesz, wybierz odpowiedĹş â€žnie mam pewnoĹ›ciâ€ť lub â€žto nie opisuje naszej sytuacjiâ€ť.',
    reasons: ['nie wszystkie pytania potrzebne do bezpiecznego pierwszego kroku majÄ… odpowiedĹş'],
    note: 'Quiz nie pokazuje rekomendacji usĹ‚ugi, dopĂłki Ĺ›cieĹĽka nie jest kompletna.',
  }
}

function getGuidance(topic: QuizTopic | null) {
  return topicGuidance[topic ?? 'other']
}

function resultForSafety(topic: QuizTopic | null): QuizResult {
  const guidance = getGuidance(topic)
  return {
    route: 'safety_first',
    title: 'Najpierw zabezpiecz sytuacjÄ™',
    summary: 'Z opisu wynika, ĹĽe na dziĹ› najwaĹĽniejsze jest ograniczenie ryzyka. To nie jest moment na testowanie zachowania ani wybĂłr formatu konsultacji.',
    firstStep: 'ZwiÄ™ksz dystans, oddziel zwierzÄ™ta lub ludzi bez eskalowania sytuacji i nie zmuszaj do kontaktu.',
    avoid: guidance.avoid,
    observe: 'Zanotuj, kto byĹ‚ w sytuacji, co wydarzyĹ‚o siÄ™ bezpoĹ›rednio wczeĹ›niej i czy doszĹ‚o do urazu. JeĹ›li ktoĹ› zostaĹ‚ ranny, skorzystaj z odpowiedniej pomocy medycznej.',
    reasons: ['wskazujesz ryzyko urazu albo brak pewnego sposobu przerwania sytuacji'],
    note: 'Ta mapa nie zastÄ™puje indywidualnej oceny. Po zabezpieczeniu sytuacji warto przygotowaÄ‡ krĂłtki opis i nagranie tylko wtedy, gdy da siÄ™ je zrobiÄ‡ bez ryzyka.',
  }
}

function resultForVet(topic: QuizTopic | null): QuizResult {
  const guidance = getGuidance(topic)
  return {
    route: 'vet_first',
    title: 'Najpierw skonsultuj tĹ‚o zdrowotne',
    summary: 'NagĹ‚a zmiana albo niepokojÄ…ce objawy mogÄ… mieÄ‡ zwiÄ…zek ze zdrowiem lub bĂłlem. Najuczciwszym pierwszym krokiem jest kontakt z lekarzem weterynarii.',
    firstStep: 'Skontaktuj siÄ™ z lekarzem weterynarii i przygotuj krĂłtki opis: kiedy zaczÄ™Ĺ‚a siÄ™ zmiana, co dokĹ‚adnie siÄ™ zmieniĹ‚o oraz jakie objawy widzisz.',
    avoid: guidance.avoid,
    observe: guidance.observe,
    reasons: ['wskazujesz nagĹ‚Ä… zmianÄ™, niepewnoĹ›Ä‡ zdrowotnÄ… albo objaw wymagajÄ…cy ostroĹĽnoĹ›ci'],
    note: 'Po wykluczeniu lub rĂłwnolegĹ‚ym prowadzeniu kwestii zdrowotnej moĹĽna spokojnie uĹ‚oĹĽyÄ‡ plan behawioralny.',
  }
}

function resultForService(topic: QuizTopic | null, impact: string | undefined): QuizResult {
  const guidance = getGuidance(topic)

  if (impact === 'daily' || impact === 'wide') {
    return {
      route: 'full_consultation',
      serviceKey: 'pelna-konsultacja',
      title: 'Warto zebraÄ‡ peĹ‚niejszy obraz sytuacji',
      summary: 'Temat wpĹ‚ywa na codziennoĹ›Ä‡ albo Ĺ‚Ä…czy kilka wÄ…tkĂłw. PeĹ‚niejszy wywiad daje przestrzeĹ„ na spokojne rozdzielenie zdrowia, Ĺ›rodowiska, emocji i dotychczasowych prĂłb.',
      firstStep: guidance.firstStep,
      avoid: guidance.avoid,
      observe: guidance.observe,
      reasons: [
        impact === 'daily' ? 'sytuacja wraca codziennie lub wyraĹşnie ogranicza ĹĽycie domu' : 'sytuacja Ĺ‚Ä…czy kilka kontekstĂłw, zwierzÄ…t albo domownikĂłw',
        'warto oprzeÄ‡ dalszy plan na szerszym opisie i obserwacjach, nie na jednej etykiecie',
      ],
      note: 'To propozycja zakresu rozmowy, nie diagnoza i nie ostateczna ocena problemu.',
    }
  }

  if (impact === 'recurring') {
    return {
      route: 'observe_first',
      serviceKey: 'dwa-kwadranse',
      title: 'Najpierw uporzÄ…dkujmy kilka waĹĽnych wÄ…tkĂłw',
      summary: 'Sytuacja wraca regularnie. DĹ‚uĹĽsza krĂłtka rozmowa pozwoli poĹ‚Ä…czyÄ‡ obserwacje i wybraÄ‡ bezpieczny kierunek bez zaczynania od peĹ‚nej analizy.',
      firstStep: guidance.firstStep,
      avoid: guidance.avoid,
      observe: guidance.observe,
      reasons: ['temat wraca i potrzebuje uporzÄ…dkowania kilku informacji', 'warto najpierw zebraÄ‡ konkretny obraz sytuacji'],
      note: 'JeĹ›li w rozmowie wyjdzie szerszy problem, dalszy krok bÄ™dzie moĹĽna dobraÄ‡ na podstawie realnego kontekstu.',
    }
  }

  return {
    route: 'short_consultation',
    serviceKey: 'kwadrans',
    title: 'Masz dobry punkt, by zaczÄ…Ä‡ od jednego pierwszego kroku',
    summary: 'Opisujesz jeden doĹ›Ä‡ czytelny moment. KrĂłtka rozmowa moĹĽe pomĂłc wybraÄ‡ priorytet, zanim temat uroĹ›nie lub dostanie przypadkowÄ… etykietÄ™.',
    firstStep: guidance.firstStep,
    avoid: guidance.avoid,
    observe: guidance.observe,
    reasons: ['sytuacja ma na razie jeden, doĹ›Ä‡ czytelny kontekst', 'nie ma wskazanej czerwonej flagi bezpieczeĹ„stwa ani zdrowia'],
    note: 'To propozycja pierwszego kroku, nie diagnoza. MoĹĽesz wrĂłciÄ‡ i zmieniÄ‡ odpowiedzi, jeĹ›li coĹ› pominÄ…Ĺ‚eĹ›.',
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
    dog_walks: 'spacer i reakcje na bodĹşce',
    dog_alone: 'zostawanie samemu',
    dog_resources: 'napiÄ™cie przy zasobach lub kontakcie',
    dog_noise: 'haĹ‚as i nagĹ‚e bodĹşce',
    dog_change: 'zmiana rytmu lub sytuacji',
    cat_litter: 'kuweta',
    cat_touch: 'dotyk i kontakt',
    cat_conflict: 'napiÄ™cie miÄ™dzy kotami',
    cat_change: 'stres lub zmiana w domu',
    noise: 'haĹ‚as lub nagĹ‚y bodziec',
    other: 'sytuacja do spokojnego uporzÄ…dkowania',
  }
  return labels[topic]
}

