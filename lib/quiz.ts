export type QuizAnswerValue = string
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
    heroCopy: 'Zaczynamy od spaceru i reakcji na psy. PominÄ…Ĺ‚em wybĂłr gatunku, ĹĽeby szybciej dojĹ›Ä‡ do ryzyka, zdrowia i skali problemu.',
    resultTitle: 'Pies reaguje na spacerze',
    resultSummary: 'Wynik odnosi siÄ™ do szczekania, napiÄ™cia i mijanek na spacerze.',
    firstStep: 'SprawdĹş dystans, przy ktĂłrym pies jeszcze moĹĽe wÄ™szyÄ‡, jeĹ›Ä‡ albo wrĂłciÄ‡ do kontaktu.',
    avoid: 'Nie zaczynaj od korekt w najtrudniejszym miejscu i nie skracaj dystansu na siĹ‚Ä™.',
    articleHref: '/blog/dlaczego-moj-pies-szczeka-na-inne-psy',
    articleLabel: 'Dlaczego pies szczeka na inne psy?',
    problemHref: '/problemy/pies-szczeka-na-psy',
    problemLabel: 'Strona problemowa: szczekanie na psy',
  },
  'pies-ciagnie-na-smyczy': {
    problemKey: 'pies-ciagnie-na-smyczy',
    species: 'pies',
    mainTopic: 'walks',
    heroTitle: 'Quiz: pies ciÄ…gnie na smyczy',
    heroCopy: 'Zaczynamy od spaceru, pobudzenia i tempa. Quiz pomoĹĽe odrĂłĹĽniÄ‡ prostÄ… korektÄ™ spaceru od szerszego problemu emocji.',
    resultTitle: 'Pies i spacer pod napiÄ™ciem',
    resultSummary: 'Wynik odnosi siÄ™ do ciÄ…gniÄ™cia, pobudzenia i trudnoĹ›ci z kontaktem na smyczy.',
    firstStep: 'Wybierz jeden krĂłtki odcinek spaceru, na ktĂłrym celem jest wolniejsze tempo i kontakt, nie przejĹ›cie jak najdalej.',
    avoid: 'Nie traktuj zmiany sprzÄ™tu jako jedynego rozwiÄ…zania i nie Ä‡wicz dĹ‚ugo, gdy pies jest juĹĽ ponad progiem.',
    articleHref: '/blog/pies-ciagnie-na-smyczy',
    articleLabel: 'Pies ciÄ…gnie na smyczy',
    problemHref: '/problemy/pies-ciagnie-na-smyczy',
    problemLabel: 'Strona problemowa: smycz',
  },
  'pies-nie-zostaje-sam': {
    problemKey: 'pies-nie-zostaje-sam',
    species: 'pies',
    mainTopic: 'fear_stress',
    heroTitle: 'Quiz: pies nie zostaje sam',
    heroCopy: 'Zaczynamy od rozĹ‚Ä…ki, nagrania i emocji po wyjĹ›ciu opiekuna. To waĹĽne, ĹĽeby nie pomyliÄ‡ nudy z panikÄ….',
    resultTitle: 'Pies zostawiany sam',
    resultSummary: 'Wynik odnosi siÄ™ do samotnoĹ›ci, wycia, niszczenia albo napiÄ™cia po wyjĹ›ciu opiekuna.',
    firstStep: 'Nagraj 20-30 minut po wyjĹ›ciu i sprawdĹş, kiedy pojawia siÄ™ pierwszy objaw.',
    avoid: 'Nie zostawiaj psa, ĹĽeby siÄ™ wypĹ‚akaĹ‚, jeĹ›li na nagraniu widaÄ‡ panikÄ™.',
    articleHref: '/blog/pies-wyje-kiedy-zostaje-sam',
    articleLabel: 'Pies wyje, kiedy zostaje sam',
    problemHref: '/problemy/pies-nie-zostaje-sam',
    problemLabel: 'Strona problemowa: samotnoĹ›Ä‡ psa',
  },
  'wakacje-opieka-zmiana-rytmu': {
    problemKey: 'wakacje-opieka-zmiana-rytmu',
    species: 'pies',
    mainTopic: 'fear_stress',
    heroTitle: 'Quiz: wakacje, opieka i zmiana rytmu',
    heroCopy:
      'Zaczynamy od tego, co zmieni siÄ™ podczas wyjazdu: opiekun, rytm dnia, zostawanie samemu, miejsce odpoczynku i poziom bodĹşcĂłw.',
    resultTitle: 'Wakacyjna zmiana rytmu',
    resultSummary: 'Wynik odnosi siÄ™ do wyjazdu, opieki innej osoby i ryzyka nasilenia samotnoĹ›ci albo napiÄ™cia.',
    firstStep: 'Spisz, co dokĹ‚adnie zmieni siÄ™ w opiece: godziny wyjĹ›Ä‡, miejsce snu, spacery, karmienie i osoby w domu.',
    avoid: 'Nie zostawiaj pierwszej dĹ‚ugiej rozĹ‚Ä…ki na dzieĹ„ wyjazdu i nie zakĹ‚adaj, ĹĽe pies sam dopasuje siÄ™ do nowego rytmu.',
    articleHref: '/blog/pies-wyje-kiedy-zostaje-sam',
    articleLabel: 'Pies wyje, kiedy zostaje sam',
    problemHref: '/problemy/pies-nie-zostaje-sam',
    problemLabel: 'Strona problemowa: samotnoĹ›Ä‡ psa',
  },
  'kot-sika-poza-kuweta': {
    problemKey: 'kot-sika-poza-kuweta',
    species: 'kot',
    mainTopic: 'home_behavior',
    heroTitle: 'Quiz: kot sika poza kuwetÄ…',
    heroCopy: 'Zaczynamy od kuwety, zdrowia i stresu. Przy nagĹ‚ej zmianie rĂłwnolegle warto braÄ‡ pod uwagÄ™ lekarza weterynarii.',
    resultTitle: 'Kot i kuweta',
    resultSummary: 'Wynik odnosi siÄ™ do zachowaĹ„ toaletowych, zasobĂłw, stresu i moĹĽliwego tĹ‚a zdrowotnego.',
    firstStep: 'Zacznij od kontroli zdrowia i spisu: liczba kuwet, miejsca zdarzeĹ„, ĹĽwirek, zmiany w domu.',
    avoid: 'Nie karz kota i nie zakĹ‚adaj zĹ‚oĹ›liwoĹ›ci. To moĹĽe byÄ‡ sygnaĹ‚ bĂłlu albo stresu.',
    articleHref: '/blog/kot-zalatwia-sie-poza-kuweta',
    articleLabel: 'Kot zaĹ‚atwia siÄ™ poza kuwetÄ…',
    problemHref: '/problemy/kot-sika-poza-kuweta',
    problemLabel: 'Strona problemowa: kuweta',
  },
  'kot-gryzie-przy-glaskaniu': {
    problemKey: 'kot-gryzie-przy-glaskaniu',
    species: 'kot',
    mainTopic: 'relationships',
    heroTitle: 'Quiz: kot gryzie przy gĹ‚askaniu',
    heroCopy: 'Zaczynamy od kontaktu, sygnaĹ‚Ăłw napiÄ™cia i moĹĽliwego bĂłlu. Quiz pomoĹĽe ustaliÄ‡, czy wystarczy protokĂłĹ‚ dotyku, czy trzeba szerzej sprawdziÄ‡ tĹ‚o.',
    resultTitle: 'Kot i kontakt z czĹ‚owiekiem',
    resultSummary: 'Wynik odnosi siÄ™ do gryzienia przy gĹ‚askaniu, przestymulowania i sygnaĹ‚Ăłw ostrzegawczych.',
    firstStep: 'SkrĂłÄ‡ gĹ‚askanie do kilku sekund i koĹ„cz kontakt zanim kot napnie ogon, uszy albo skĂłrÄ™ grzbietu.',
    avoid: 'Nie przytrzymuj kota i nie testuj granic, gdy juĹĽ pokazaĹ‚ napiÄ™cie.',
    articleHref: '/blog/stres-kota-a-zachowania-toaletowe',
    articleLabel: 'Stres kota i zachowanie',
    problemHref: '/problemy/kot-gryzie-przy-glaskaniu',
    problemLabel: 'Strona problemowa: gryzienie przy gĹ‚askaniu',
  },
  'konflikt-miedzy-kotami': {
    problemKey: 'konflikt-miedzy-kotami',
    species: 'kot',
    mainTopic: 'relationships',
    heroTitle: 'Quiz: koty ĹĽyjÄ… w napiÄ™ciu',
    heroCopy: 'Zaczynamy od relacji, zasobĂłw i cichego blokowania przestrzeni. Konflikt nie zawsze wyglÄ…da jak otwarta bĂłjka.',
    resultTitle: 'Koty i napiÄ™cie w domu',
    resultSummary: 'Wynik odnosi siÄ™ do relacji miÄ™dzy kotami, zasobĂłw, unikania i konfliktu.',
    firstStep: 'Zmapuj kuwety, miski, wodÄ™, kryjĂłwki i przejĹ›cia. SprawdĹş, czy jeden kot nie blokuje drugiego.',
    avoid: 'Nie zostawiaj kotĂłw, ĹĽeby same ustaliĹ‚y hierarchiÄ™, jeĹ›li napiÄ™cie narasta.',
    articleHref: '/blog/jak-zapoznac-dwa-koty',
    articleLabel: 'Jak zapoznaÄ‡ dwa koty',
    problemHref: '/problemy/konflikt-miedzy-kotami',
    problemLabel: 'Strona problemowa: konflikt kotĂłw',
  },
  'nagla-zmiana-zachowania': {
    problemKey: 'nagla-zmiana-zachowania',
    mainTopic: 'other',
    heroTitle: 'Quiz: nagĹ‚a zmiana zachowania',
    heroCopy: 'Zaczynamy od czerwonych flag. Przy nagĹ‚ej zmianie zachowania zdrowie i bĂłl trzeba traktowaÄ‡ powaĹĽnie.',
    resultTitle: 'NagĹ‚a zmiana zachowania',
    resultSummary: 'Wynik odnosi siÄ™ do sytuacji, w ktĂłrej najpierw trzeba uporzÄ…dkowaÄ‡ bezpieczeĹ„stwo i moĹĽliwe tĹ‚o zdrowotne.',
    firstStep: 'Spisz, co zmieniĹ‚o siÄ™ nagle: jedzenie, sen, ruch, kuweta, agresja, chowanie siÄ™ albo wokalizacja.',
    avoid: 'Nie zaczynaj od treningu, jeĹ›li pojawiĹ‚ siÄ™ bĂłl, apatia, nagĹ‚a agresja albo szybkie pogorszenie.',
    note: 'Przy czerwonych flagach zacznij rĂłwnolegle od lekarza weterynarii.',
  },
  'halas-burza-fajerwerki': {
    problemKey: 'halas-burza-fajerwerki',
    mainTopic: 'fear_stress',
    heroTitle: 'Quiz: haĹ‚as, burza, fajerwerki',
    heroCopy: 'Zaczynamy od bezpieczeĹ„stwa i skali lÄ™ku. Plan robi siÄ™ przed sezonem, ale pierwszy krok moĹĽna uporzÄ…dkowaÄ‡ juĹĽ teraz.',
    resultTitle: 'HaĹ‚as i panika',
    resultSummary: 'Wynik odnosi siÄ™ do reakcji na dĹşwiÄ™ki, burze, fajerwerki i silny stres.',
    firstStep: 'Zabezpiecz miejsce odpoczynku, ogranicz presjÄ™ i zanotuj, kiedy zaczyna siÄ™ reakcja.',
    avoid: 'Nie wystawiaj zwierzÄ™cia na haĹ‚as, ĹĽeby siÄ™ przyzwyczaiĹ‚o, jeĹ›li juĹĽ widaÄ‡ panikÄ™.',
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
    helper: 'Wybierz zwierzÄ™, od ktĂłrego zaczynamy.',
    options: [
      { id: 'pies', label: 'Pies', helper: 'Spacery, zostawanie samemu, pobudzenie, napiÄ™cie, szczeniak.' },
      { id: 'kot', label: 'Kot', helper: 'Kuweta, stres, relacje miÄ™dzy kotami, nocna aktywnoĹ›Ä‡.' },
    ],
    condition: (_, context) => !context?.species,
  },
  {
    id: 'main_topic',
    title: 'Jaki problem chcesz rozwiÄ…zaÄ‡?',
    helper: 'Wybierz obszar, ktĂłry najlepiej opisuje TwojÄ… sytuacjÄ™.',
    options: [
      { id: 'home_behavior', label: 'Zachowanie w domu', helper: 'Niszczenie, szczekanie, trudnoĹ›Ä‡ z odpoczynkiem, kuweta.' },
      { id: 'walks', label: 'Spacery i pobudzenie', helper: 'Reakcje na psy lub ludzi, ciÄ…gniÄ™cie, trudnoĹ›Ä‡ z wyciszeniem.' },
      { id: 'fear_stress', label: 'LÄ™k i stres', helper: 'Zostawanie samemu, dĹşwiÄ™ki, goĹ›cie, nowe sytuacje.' },
      { id: 'relationships', label: 'Relacje i konflikty', helper: 'NapiÄ™cie z ludĹşmi, zwierzÄ™tami albo wokĂłĹ‚ zasobĂłw.' },
      { id: 'other', label: 'Inny problem', helper: 'Nie musisz trafnie nazwaÄ‡ tematu. Doprecyzujemy go po drodze.' },
    ],
    condition: (_, context) => !context?.mainTopic,
  },
  {
    id: 'litter_medical',
    title: 'Czy kot miaĹ‚ badany mocz/krew w ciÄ…gu ostatniego miesiÄ…ca?',
    helper: 'To krytyczne przy problemach z kuwetÄ…, by wykluczyÄ‡ bĂłl lub zapalenie pÄ™cherza.',
    options: [
      { id: 'yes_good', label: 'Tak, wyniki w normie', helper: 'Znamy aktualny stan zdrowotny.' },
      { id: 'yes_bad', label: 'Tak, wyniki wskazaĹ‚y na chorobÄ™', helper: 'Wprowadzane jest leczenie medyczne.' },
      { id: 'no', label: 'Nie, nie byĹ‚ ostatnio badany', helper: 'Brak Ĺ›wieĹĽych wynikĂłw badaĹ„.' },
    ],
    condition: (answers, context) => 
      context?.problemKey === 'kot-sika-poza-kuweta' || (answers.species === 'kot' && answers.main_topic === 'home_behavior'),
  },
  {
    id: 'separation_symptoms',
    title: 'Jak pies zachowuje siÄ™ pod TwojÄ… nieobecnoĹ›Ä‡?',
    helper: 'Wybierz objaw, ktĂłry wystÄ™puje najsilniej.',
    options: [
      { id: 'vocalization', label: 'Wyje lub szczeka', helper: 'Bardzo gĹ‚oĹ›no wokalizuje, sĹ‚ychaÄ‡ go na zewnÄ…trz.' },
      { id: 'destruction', label: 'Niszczy rzeczy', helper: 'Gryzie framugi, niszczy meble lub buty.' },
      { id: 'elimination', label: 'ZaĹ‚atwia siÄ™ w domu', helper: 'Popuszcza mocz lub kaĹ‚ ze stresu.' },
      { id: 'pacing', label: 'KrÄ…ĹĽy i ziaje', helper: 'Nie potrafi usiedzieÄ‡ w miejscu i zasnÄ…Ä‡.' },
    ],
    condition: (answers, context) => 
      context?.problemKey === 'pies-nie-zostaje-sam' || (answers.species === 'pies' && answers.main_topic === 'fear_stress'),
  },
  {
    id: 'reactivity_trigger',
    title: 'Kiedy najczÄ™Ĺ›ciej pies zaczyna reagowaÄ‡ na spacerze?',
    helper: 'To pomoĹĽe oceniÄ‡ prĂłg pobudzenia.',
    options: [
      { id: 'far', label: 'Gdy tylko zobaczy psa/czĹ‚owieka z duĹĽej odlegĹ‚oĹ›ci', helper: 'Reakcja zaczyna siÄ™ bardzo wczeĹ›nie.' },
      { id: 'close', label: 'Dopiero przy mijaniu blisko', helper: 'Traci kontrolÄ™ dopiero przy maĹ‚ym dystansie.' },
      { id: 'surprise', label: 'Tylko przy nagĹ‚ym zaskoczeniu', helper: 'Gdy ktoĹ› wyjdzie zza rogu lub z klatki.' },
      { id: 'frustration', label: 'Gdy nie moĹĽe podejĹ›Ä‡', helper: 'CiÄ…gnie, piszczy i szczeka, bo smycz go blokuje.' }
    ],
    condition: (answers, context) =>
      context?.problemKey === 'pies-szczeka-na-psy' || (answers.species === 'pies' && answers.main_topic === 'walks'),
  },
  {
    id: 'resource_guarding',
    title: 'Wobec czego pies wykazuje najwiÄ™ksze napiÄ™cie lub broni dostÄ™pu?',
    helper: 'Wybierz najwaĹĽniejszy zasĂłb.',
    options: [
      { id: 'food', label: 'Miska, jedzenie lub gryzaki', helper: 'Warzy, zastyga lub ucieka z jedzeniem.' },
      { id: 'space', label: 'Kanapa, legowisko lub przestrzeĹ„', helper: 'Broni miejsca, w ktĂłrym odpoczywa.' },
      { id: 'person', label: 'Opiekun', helper: 'Odgania inne zwierzÄ™ta lub ludzi od Ciebie.' },
      { id: 'stolen', label: 'Kradzione przedmioty', helper: 'Skarpetki, chusteczki, Ĺ›mieci.' }
    ],
    condition: (answers, context) =>
      context?.problemKey === 'pies-obrona-zasobow' || (answers.species === 'pies' && answers.main_topic === 'home_behavior'),
  },
  {
    id: 'cat_conflict_victim',
    title: 'Jak w tej sytuacji zachowuje siÄ™ kot wycofany (ofiara konfliktu)?',
    helper: 'To pomoĹĽe oceniÄ‡, jak bardzo stres wpĹ‚ywa na jego ĹĽycie.',
    options: [
      { id: 'hiding_always', label: 'Chowa siÄ™ niemal caĹ‚y czas', helper: 'Wychodzi tylko w nocy lub gdy jest bezpiecznie.' },
      { id: 'avoiding_litter', label: 'Ma problemy z kuwetÄ… lub jedzeniem', helper: 'Konflikt wpĹ‚ywa na podstawowe potrzeby.' },
      { id: 'normal_but_tense', label: 'Funkcjonuje normalnie, ale ucieka przy spotkaniu', helper: 'Stres pojawia siÄ™ tylko przy bezpoĹ›rednim kontakcie.' }
    ],
    condition: (answers, context) =>
      context?.problemKey === 'konflikt-miedzy-kotami' || (answers.species === 'kot' && answers.main_topic === 'relationships'),
  },
  {
    id: 'safety',
    title: 'Czy ktoĹ› moĹĽe ucierpieÄ‡?',
    helper: 'To pomaga dobraÄ‡ bezpieczny zakres rozmowy.',
    options: [
      { id: 'none', label: 'Nie widzÄ™ takiego ryzyka', helper: 'Problem przeszkadza, ale nie wyglÄ…da groĹşnie.' },
      { id: 'tension', label: 'Jest napiÄ™cie, ale do opanowania', helper: 'Pojawia siÄ™ warczenie, ucieczka, szczekanie albo silne pobudzenie.' },
      { id: 'danger', label: 'ByĹ‚ atak lub realne zagroĹĽenie', helper: 'CzĹ‚owiek albo zwierzÄ™ mogĹ‚o ucierpieÄ‡.' },
    ],
  },
  {
    id: 'medical_change',
    title: 'Czy coĹ› zmieniĹ‚o siÄ™ nagle?',
    helper: 'NagĹ‚a zmiana zachowania bywa zwiÄ…zana ze zdrowiem.',
    options: [
      { id: 'no', label: 'Nie, to raczej staĹ‚y obraz', helper: 'Nie widzÄ™ nagĹ‚ej zmiany apetytu, ruchu, snu ani kuwety.' },
      { id: 'unclear', label: 'Nie mam pewnoĹ›ci', helper: 'CoĹ› siÄ™ zmieniĹ‚o, ale trudno powiedzieÄ‡, z czego to wynika.' },
      { id: 'yes', label: 'Tak, sÄ… czerwone flagi', helper: 'BĂłl, apatia, nagĹ‚a agresja, kuweta, senior albo szybkie pogorszenie.' },
    ],
  },
  {
    id: 'duration',
    title: 'Od kiedy to trwa?',
    helper: 'Im dĹ‚uĹĽej trwa problem, tym wiÄ™cej kontekstu warto spokojnie zebraÄ‡.',
    options: [
      { id: 'fresh', label: 'Od niedawna', helper: 'ChcÄ™ szybko sprawdziÄ‡, od czego zaczÄ…Ä‡.' },
      { id: 'returning', label: 'Wraca od kilku tygodni', helper: 'SÄ… lepsze i gorsze momenty, temat siÄ™ powtarza.' },
      { id: 'long', label: 'DĹ‚ugo albo coraz mocniej', helper: 'WpĹ‚ywa na codziennoĹ›Ä‡ domu, spacery, sen albo relacje.' },
    ],
  },
  {
    id: 'frequency',
    title: 'Jak czÄ™sto to wraca?',
    helper: 'CzÄ™stotliwoĹ›Ä‡ pokazuje, czy wystarczy krĂłtka rozmowa, czy potrzebny jest szerszy plan.',
    options: [
      { id: 'rare', label: 'Sporadycznie', helper: 'Raz na jakiĹ› czas albo w jednej konkretnej sytuacji.' },
      { id: 'weekly', label: 'Kilka razy w tygodniu', helper: 'Wraca regularnie, ale nie dominuje caĹ‚ego dnia.' },
      { id: 'daily', label: 'Codziennie lub prawie codziennie', helper: 'Mocno wpĹ‚ywa na rytm domu albo spacery.' },
    ],
  },
  {
    id: 'predictability',
    title: 'Czy wiesz, co to uruchamia?',
    helper: 'Nie trzeba mieÄ‡ pewnoĹ›ci. Chodzi o to, czy widaÄ‡ jakiĹ› schemat.',
    options: [
      { id: 'clear', label: 'Tak, wyzwalacz jest jasny', helper: 'Wiem, kiedy zachowanie zwykle siÄ™ zaczyna.' },
      { id: 'partial', label: 'TrochÄ™ tak, trochÄ™ nie', helper: 'WidzÄ™ czÄ™Ĺ›Ä‡ schematu, ale nie wszystko pasuje.' },
      { id: 'unclear', label: 'Nie, wyglÄ…da to chaotycznie', helper: 'Trudno poĹ‚Ä…czyÄ‡ fakty i przewidzieÄ‡ reakcjÄ™.' },
    ],
  },
  {
    id: 'resources',
    title: 'Ile rzeczy miesza siÄ™ w tle?',
    helper: 'PomyĹ›l o rutynie, przestrzeni, spacerach, jedzeniu, nudzie i relacjach.',
    options: [
      { id: 'simple', label: 'Raczej jeden element', helper: 'Np. smycz, kuweta, jedna pora dnia, jeden bodziec.' },
      { id: 'several', label: 'Kilka elementĂłw naraz', helper: 'Rutyna, emocje, reakcje ludzi i Ĺ›rodowisko siÄ™ Ĺ‚Ä…czÄ….' },
      { id: 'multi_pet', label: 'Kilka zwierzÄ…t lub domownikĂłw', helper: 'Potrzebna jest analiza relacji i zarzÄ…dzania sytuacjÄ….' },
    ],
  },
  {
    id: 'previous_attempts',
    title: 'Co juĹĽ prĂłbowaliĹ›cie?',
    helper: 'To pomaga nie powtarzaÄ‡ porad, ktĂłre juĹĽ nie zadziaĹ‚aĹ‚y.',
    options: [
      { id: 'none', label: 'Jeszcze nic systematycznie', helper: 'ChcÄ™ zaczÄ…Ä‡ spokojnie i bez zgadywania.' },
      { id: 'some', label: 'Kilka prostych zmian', helper: 'ByĹ‚y prĂłby, ale bez jasnego planu.' },
      { id: 'many', label: 'DuĹĽo prĂłb i nadal brak poprawy', helper: 'Problem wraca mimo porad, treningu albo zmian w domu.' },
    ],
  },
  {
    id: 'goal',
    title: 'Czego potrzebujesz po quizie?',
    helper: 'Wynik ma dobraÄ‡ pierwszy krok, a nie zamykaÄ‡ caĹ‚Ä… sprawÄ™.',
    options: [
      { id: 'priority', label: 'Pierwszy priorytet', helper: 'ChcÄ™ wiedzieÄ‡, co zrobiÄ‡ jako pierwsze.' },
      { id: 'check', label: 'Sprawdzenie zakresu', helper: 'ChcÄ™ wiedzieÄ‡, czy wystarczy krĂłtka konsultacja.' },
      { id: 'plan', label: 'Plan na kilka krokĂłw', helper: 'PotrzebujÄ™ wiÄ™cej kontekstu i konkretnego kierunku.' },
      { id: 'diagnosis', label: 'PeĹ‚niejsza analiza', helper: 'Sprawa jest zĹ‚oĹĽona, utrwalona albo dotyczy bezpieczeĹ„stwa.' },
    ],
  },
]

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
    reasons.push('pojawia siÄ™ realne ryzyko bezpieczeĹ„stwa')
  }
  if (medicalChange === 'yes' || medicalChange === 'unclear') {
    reasons.push('warto rĂłwnolegle sprawdziÄ‡ moĹĽliwe tĹ‚o zdrowotne')
  }
  if (mainTopic === 'relationships' || resources === 'several' || resources === 'multi_pet') {
    reasons.push('sytuacja Ĺ‚Ä…czy kilka obszarĂłw, nie jednÄ… prostÄ… wskazĂłwkÄ™')
  }
  if (duration === 'long' || frequency === 'daily') {
    reasons.push('problem jest utrwalony albo czÄ™sto wraca')
  }
  if (predictability === 'unclear' || previousAttempts === 'many') {
    reasons.push('najpierw trzeba uporzÄ…dkowaÄ‡ fakty i dotychczasowe prĂłby')
  }
  if (litterMedical === 'no') {
    reasons.push('warto pilnie wykonaÄ‡ profilaktyczne badanie moczu u lekarza weterynarii')
  }
  if (separationSymptoms) {
    reasons.push('na spotkaniu przeanalizujemy nagrania z nieobecnoĹ›ci')
  }
  if (reactivityTrigger === 'far') {
    reasons.push('prĂłg pobudzenia na spacerze wydaje siÄ™ bardzo niski')
  }
  if (resourceGuarding) {
    reasons.push('widaÄ‡ obronÄ™ zasobĂłw, co wymaga ostroĹĽnego zarzÄ…dzania przestrzeniÄ…')
  }
  if (catConflictVictim === 'hiding_always' || catConflictVictim === 'avoiding_litter') {
    reasons.push('konflikt miÄ™dzy kotami wpĹ‚ywa juĹĽ na podstawowe poczucie bezpieczeĹ„stwa')
  }

  let result: QuizResult

  if (score >= 8) {
    result = {
      serviceKey: 'pelna-konsultacja',
      title: 'Najlepszy pierwszy krok: peĹ‚na konsultacja',
      summary:
        'Ta Ĺ›cieĹĽka pasuje, gdy temat jest zĹ‚oĹĽony, trwa dĹ‚ugo albo dotyczy bezpieczeĹ„stwa. Najpierw spokojnie zbieramy kontekst, a dopiero potem ukĹ‚adamy plan dziaĹ‚ania.',
      reasons: reasons.length > 0 ? reasons.slice(0, 4) : ['sprawa wymaga spokojnego zebrania szerszego kontekstu'],
      note:
        medicalChange === 'yes'
          ? 'Przy nagĹ‚ej zmianie zachowania, bĂłlu albo objawach zdrowotnych zacznij rĂłwnolegle od lekarza weterynarii.'
          : 'Przed rozmowÄ… przydadzÄ… siÄ™ krĂłtkie nagrania, opis rutyny i lista rzeczy, ktĂłre byĹ‚y juĹĽ prĂłbowane.',
    }
  } else if (score >= 4) {
    result = {
      serviceKey: 'dwa-kwadranse',
      title: 'Najlepszy pierwszy krok: konsultacja 30 min',
      summary:
        'To dobry wybĂłr, gdy jest kilka wÄ…tkĂłw i 15 minut moĹĽe byÄ‡ za krĂłtkie. Wystarczy czasu, ĹĽeby dopytaÄ‡ o tĹ‚o sytuacji i ustaliÄ‡ najbliĹĽszy kierunek.',
      reasons:
        reasons.length > 0
          ? reasons.slice(0, 4)
          : ['jest kilka rzeczy do poĹ‚Ä…czenia', 'warto dopytaÄ‡ o rytm dnia, emocje i Ĺ›rodowisko'],
      note: 'JeĹ›li w trakcie rozmowy okaĹĽe siÄ™, ĹĽe temat jest szerszy, Ĺ‚atwiej bÄ™dzie zdecydowaÄ‡ o dalszym kroku.',
    }
  } else {
    result = {
      serviceKey: 'kwadrans',
      title: 'Najlepszy pierwszy krok: Kwadrans',
      summary:
        'To spokojny start, gdy chcesz ustaliÄ‡ pierwszy priorytet bez wchodzenia od razu w duĹĽÄ… konsultacjÄ™. Kwadrans pomaga sprawdziÄ‡, co zrobiÄ‡ najpierw.',
      reasons: [
        duration === 'fresh' ? 'sytuacja wyglÄ…da na Ĺ›wieĹĽÄ…' : 'nie trzeba od razu zaczynaÄ‡ od peĹ‚nej analizy',
        predictability === 'clear' ? 'wyzwalacz jest doĹ›Ä‡ czytelny' : 'najwaĹĽniejsze jest wybranie pierwszego priorytetu',
        'moĹĽna zaczÄ…Ä‡ od krĂłtkiej rozmowy audio bez kamery',
      ],
      note: 'Kwadrans nie musi zamykaÄ‡ sprawy. Ma pomĂłc wybraÄ‡ najprostszy nastÄ™pny krok.',
    }
  }

  return applyQuizProblemContext(result, answers.problem_context)
}

