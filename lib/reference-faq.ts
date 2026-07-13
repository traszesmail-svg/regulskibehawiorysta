export type ReferenceFaqCategory = 'wspolpraca' | 'konsultacje' | 'pies' | 'kot' | 'pĹ‚atnoĹ›ci' | 'techniczne'

export type ReferenceFaqItem = {
  id: string
  category: ReferenceFaqCategory
  question: string
  answer: string
}

export const referenceFaqCategories: Array<{
  id: ReferenceFaqCategory
  label: string
  countLabel: string
  icon: 'message' | 'calendar' | 'paw' | 'cat' | 'payment' | 'screen'
}> = [
  { id: 'wspolpraca', label: 'WspĂłĹ‚praca', countLabel: '5 pytaĹ„', icon: 'message' },
  { id: 'konsultacje', label: 'Konsultacje', countLabel: '5 pytaĹ„', icon: 'calendar' },
  { id: 'pies', label: 'Pies', countLabel: '5 pytaĹ„', icon: 'paw' },
  { id: 'kot', label: 'Kot', countLabel: '5 pytaĹ„', icon: 'cat' },
  { id: 'pĹ‚atnoĹ›ci', label: 'PĹ‚atnoĹ›ci', countLabel: '5 pytaĹ„', icon: 'payment' },
  { id: 'techniczne', label: 'Techniczne', countLabel: '5 pytaĹ„', icon: 'screen' },
]

export const referenceFaqItems: ReferenceFaqItem[] = [
  {
    id: 'krĂłtka-wiadomoĹ›Ä‡-zamiast-konsultacji',
    category: 'wspolpraca',
    question: 'Czy muszÄ™ juĹĽ wiedzieÄ‡, co jest przyczynÄ…?',
    answer:
      'Nie. To kluczowy etap naszej wspĂłĹ‚pracy. Podczas konsultacji wspĂłlnie poszukamy ĹşrĂłdĹ‚a trudnoĹ›ci i ustalimy dalszy plan dziaĹ‚ania.',
  },
  {
    id: 'czy-wiadomoĹ›Ä‡-zastepuje-konsultacje',
    category: 'wspolpraca',
    question: 'Czy w kaĹĽdej usĹ‚udze dostajÄ™ analizÄ™ zachowania?',
    answer:
      'Tak. W kaĹĽdej usĹ‚udze dostajesz analizÄ™ zachowania opartÄ… na informacjach, ktĂłre przekaĹĽesz: opisie sytuacji, formularzu, historii zachowania, kontekĹ›cie domu lub spacerĂłw i nagraniach, jeĹ›li sÄ…. Zakres analizy zaleĹĽy od iloĹ›ci danych i dĹ‚ugoĹ›ci rozmowy.',
  },
  {
    id: 'diagnoza-lub-weterynarz',
    category: 'konsultacje',
    question: 'Czy analiza zachowania zastÄ™puje lekarza weterynarii?',
    answer:
      'Nie. Zachowanie moĹĽe mieÄ‡ zwiÄ…zek ze zdrowiem, bĂłlem, dietÄ… albo Ĺ›rodowiskiem. Jako technik weterynarii i dietetyk patrzÄ™ szerzej, ale jeĹ›li coĹ› wymaga konsultacji lekarskiej, powiem to jasno.',
  },
  {
    id: 'kwadrans',
    category: 'konsultacje',
    question: 'Co realnie da mi 15 minut rozmowy?',
    answer:
      'Nie rozwiÄ…ĹĽemy caĹ‚ej zĹ‚oĹĽonej sprawy w 15 minut, ale moĹĽemy nazwaÄ‡ gĹ‚Ăłwny kierunek, ustaliÄ‡ priorytet i zatrzymaÄ‡ dziaĹ‚ania, ktĂłre mogÄ… pogarszaÄ‡ sytuacjÄ™.',
  },
  {
    id: 'pelna-konsultacja',
    category: 'konsultacje',
    question: 'Kiedy peĹ‚na konsultacja ma wiÄ™cej sensu niĹĽ szybka rozmowa?',
    answer:
      'Gdy zachowanie trwa dĹ‚ugo, dotyczy kilku sytuacji albo mocno wpĹ‚ywa na ĹĽycie domownikĂłw. Wtedy potrzebne jest okoĹ‚o 2h online, analiza zachowania, prawdopodobna przyczyna problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
  },
  {
    id: 'problemy-kot',
    category: 'kot',
    question: 'Dla jakich problemĂłw mogÄ™ zgĹ‚osiÄ‡ siÄ™ z kotem?',
    answer:
      'NajczÄ™Ĺ›ciej z kuwetÄ…, stresem, wycofaniem, konfliktem miÄ™dzy kotami, nadmiernÄ… wokalizacjÄ…, napiÄ™ciem po zmianach w domu albo trudnoĹ›ciÄ… z dotykiem.',
  },
  {
    id: 'problemy-pies',
    category: 'pies',
    question: 'Dla jakich problemĂłw mogÄ™ zgĹ‚osiÄ‡ siÄ™ z psem?',
    answer:
      'NajczÄ™Ĺ›ciej ze spacerami, reaktywnoĹ›ciÄ…, rozĹ‚Ä…kÄ…, pobudzeniem, szczeniakiem, niszczeniem w domu, obronÄ… zasobĂłw albo trudnym startem po adopcji.',
  },
  {
    id: 'czy-tylko-online',
    category: 'techniczne',
    question: 'Czy pracujesz tylko online?',
    answer:
      'Publiczna oferta serwisu jest online. Taki format wystarcza do wielu pierwszych decyzji i pozwala spokojnie omĂłwiÄ‡ sytuacjÄ™ bez stresu dla zwierzÄ™cia.',
  },
  {
    id: 'czas-odpowiedzi',
    category: 'techniczne',
    question: 'Jak szybko otrzymam odpowiedĹş?',
    answer:
      'Na zwykĹ‚Ä… wiadomoĹ›Ä‡ odpowiadam zwykle w ciÄ…gu 1-2 dni roboczych. Przy wybranym terminie i pĹ‚atnoĹ›ci komunikacja dotyczy juĹĽ konkretnej rezerwacji.',
  },
  {
    id: 'przygotowanie',
    category: 'konsultacje',
    question: 'Jak siÄ™ przygotowaÄ‡ do konsultacji?',
    answer:
      'Przygotuj krĂłtki opis sytuacji, wiek zwierzÄ™cia, czas trwania problemu i to, co juĹĽ byĹ‚o prĂłbowane. Nagrania sÄ… pomocne, ale nie sÄ… warunkiem rozpoczÄ™cia.',
  },
  {
    id: 'plan-pracy',
    category: 'wspolpraca',
    question: 'Czy dostanÄ™ plan pracy po konsultacji?',
    answer:
      'Po peĹ‚nej konsultacji otrzymujesz plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta przy wdraĹĽaniu zaleceĹ„. Po Kwadransie dostajesz przede wszystkim priorytet i najbliĹĽszy sensowny krok.',
  },
  {
    id: 'nie-zachowanie',
    category: 'wspolpraca',
    question: 'Co jeĹ›li problem nie dotyczy zachowania?',
    answer:
      'Powiem to wprost. JeĹ›li sytuacja wyglÄ…da na zdrowotnÄ…, technicznÄ… albo organizacyjnÄ…, wskaĹĽÄ™, jaki specjalista lub jaki krok ma wiÄ™kszy sens.',
  },
  {
    id: 'weterynarz',
    category: 'wspolpraca',
    question: 'Czy wspĂłĹ‚pracujesz z weterynarzem?',
    answer:
      'Tak, gdy sprawa tego wymaga. Konsultacja behawioralna nie zastÄ™puje diagnostyki weterynaryjnej, ale moĹĽe pomĂłc uporzÄ…dkowaÄ‡ obserwacje i pytania.',
  },
  {
    id: 'nagrywanie',
    category: 'techniczne',
    question: 'Czy mogÄ™ nagrywaÄ‡ konsultacjÄ™?',
    answer:
      'Nagrywanie wymaga wczeĹ›niejszego uzgodnienia. MoĹĽesz natomiast robiÄ‡ notatki i wracaÄ‡ do najwaĹĽniejszych ustaleĹ„ w dalszej korespondencji.',
  },
  {
    id: 'metody-pracy',
    category: 'pies',
    question: 'Jakimi metodami pracujesz?',
    answer:
      'Bez przemocy, bez straszenia i bez dominowania. Najpierw szukam, co zwiÄ™ksza napiÄ™cie, a potem dobieram takie kroki, ktĂłre opiekun naprawdÄ™ moĹĽe wdroĹĽyÄ‡ w swoim domu.',
  },
  {
    id: 'diagnoza-na-podstawie-informacji',
    category: 'konsultacje',
    question: 'Czy zakres analizy zaleĹĽy od dĹ‚ugoĹ›ci rozmowy?',
    answer:
      'Tak. W Kwadransie dostajesz pierwszy kierunek dziaĹ‚ania na podstawie informacji od opiekuna. Przy sprawach zĹ‚oĹĽonych peĹ‚niejsza analiza wymaga okoĹ‚o 2h online, formularza, historii zachowania i czasem nagraĹ„.',
  },
  {
    id: 'pies-reaktywny-na-spacerze',
    category: 'pies',
    question: 'Czy konsultacja online ma sens przy psie reaktywnym na spacerze?',
    answer:
      'Tak, jeĹ›li moĹĽesz opisaÄ‡ sytuacje, dystanse, wyzwalacze i reakcje psa. Nagranie spaceru pomaga, ale nie jest obowiÄ…zkowe na pierwszy kontakt.',
  },
  {
    id: 'pies-lek-separacyjny',
    category: 'pies',
    question: 'Czy pomagasz przy lÄ™ku separacyjnym?',
    answer:
      'Tak. Najpierw porzÄ…dkujemy objawy, rytm dnia i warunki zostawania psa. Potem ustalamy bezpieczny pierwszy etap pracy bez forsowania samotnoĹ›ci.',
  },
  {
    id: 'pies-szczeniak',
    category: 'pies',
    question: 'Czy mogÄ™ zgĹ‚osiÄ‡ szczeniaka?',
    answer:
      'Tak. Przy szczeniaku najczÄ™Ĺ›ciej omawiam gryzienie, pobudzenie, odpoczynek, naukÄ™ samotnoĹ›ci, spacery i zasady w domu.',
  },
  {
    id: 'kot-kuweta',
    category: 'kot',
    question: 'Czy konsultacja obejmuje problemy z kuwetÄ…?',
    answer:
      'Tak. Przy kuwecie trzeba uporzÄ…dkowaÄ‡ zdrowie, ĹĽwirek, liczbÄ™ kuwet, lokalizacjÄ™, stres i ostatnie zmiany w domu. Nie zaczynam od losowych porad.',
  },
  {
    id: 'kot-konflikt',
    category: 'kot',
    question: 'Czy pomagasz przy konflikcie miÄ™dzy kotami?',
    answer:
      'Tak. AnalizujÄ™ zasoby, przestrzeĹ„, historiÄ™ relacji, napiÄ™cia i momenty eskalacji. Celem jest plan, ktĂłry zmniejsza presjÄ™ miÄ™dzy kotami.',
  },
  {
    id: 'kot-stres-po-zmianach',
    category: 'kot',
    question: 'Czy mogÄ™ zgĹ‚osiÄ‡ kota po przeprowadzce albo zmianach w domu?',
    answer:
      'Tak. Zmiany Ĺ›rodowiska czÄ™sto nasilajÄ… chowanie siÄ™, wokalizacjÄ™, napiÄ™cie albo problemy kuwetowe. W konsultacji ustalamy, co stabilizowaÄ‡ najpierw.',
  },
  {
    id: 'kot-nocna-aktywnosc',
    category: 'kot',
    question: 'Czy zajmujesz siÄ™ nocnÄ… aktywnoĹ›ciÄ… kota?',
    answer:
      'Tak. Sprawdzamy rytm dnia, karmienie, zabawÄ™, frustracjÄ™, zdrowie i Ĺ›rodowisko. Dopiero potem dobieramy zmiany, ktĂłre nie nasilÄ… napiÄ™cia.',
  },
  {
    id: 'platnosc-jakie-metody',
    category: 'pĹ‚atnoĹ›ci',
    question: 'Jak mogÄ™ zapĹ‚aciÄ‡ za konsultacjÄ™?',
    answer:
      'OpĹ‚aty moĹĽesz dokonaÄ‡ przez pĹ‚atnoĹ›Ä‡ online (Naffy: karta, Apple/Google Pay, szybki przelew) lub wybierajÄ…c BLIK na telefon. Po rezerwacji dostajesz dalszy krok i potwierdzenie.',
  },
  {
    id: 'platnosc-kiedy-potwierdzenie',
    category: 'pĹ‚atnoĹ›ci',
    question: 'Kiedy termin jest potwierdzony?',
    answer:
      'Termin jest potwierdzony po rezerwacji i sprawdzeniu pĹ‚atnoĹ›ci. JeĹ›li coĹ› wymaga doprecyzowania, kontaktujÄ™ siÄ™ mailowo.',
  },
  {
    id: 'platnosc-potwierdzenie',
    category: 'pĹ‚atnoĹ›ci',
    question: 'Czy mogÄ™ poprosiÄ‡ o potwierdzenie pĹ‚atnoĹ›ci?',
    answer:
      'Tak. JeĹ›li potrzebujesz potwierdzenia, napisz to w wiadomoĹ›ci albo odpowiedz na mail dotyczÄ…cy rezerwacji.',
  },
  {
    id: 'platnosc-brak-przejscia',
    category: 'pĹ‚atnoĹ›ci',
    question: 'Co jeĹ›li pĹ‚atnoĹ›Ä‡ albo strona pĹ‚atnoĹ›ci siÄ™ nie otworzy?',
    answer:
      'WrĂłÄ‡ do wyboru terminu albo napisz przez formularz kontaktowy. Nie ponawiaj kilku prĂłb na Ĺ›lepo, jeĹ›li nie masz pewnoĹ›ci, czy zamĂłwienie powstaĹ‚o.',
  },
  {
    id: 'platnosc-anulowanie',
    category: 'pĹ‚atnoĹ›ci',
    question: 'Czy mogÄ™ zmieniÄ‡ termin po opĹ‚aceniu?',
    answer:
      'JeĹ›li potrzebujesz zmiany, napisz jak najszybciej. MoĹĽliwoĹ›Ä‡ przeĹ‚oĹĽenia zaleĹĽy od czasu do konsultacji i dostÄ™pnych terminĂłw.',
  },
  {
    id: 'techniczne-kamera',
    category: 'techniczne',
    question: 'Czy muszÄ™ mieÄ‡ wĹ‚Ä…czonÄ… kamerÄ™?',
    answer:
      'Nie zawsze. Kwadrans jest rozmowÄ… audio. Przy peĹ‚nej konsultacji kamera lub nagrania mogÄ… pomĂłc, ale forma zaleĹĽy od sytuacji i moĹĽliwoĹ›ci opiekuna.',
  },
  {
    id: 'techniczne-nagrania',
    category: 'techniczne',
    question: 'Czy mogÄ™ wysĹ‚aÄ‡ nagrania zachowania?',
    answer:
      'Tak, jeĹ›li sÄ… krĂłtkie i pokazujÄ… realnÄ… sytuacjÄ™. Nagrania traktujÄ™ jako materiaĹ‚ pomocniczy, a nie obowiÄ…zkowy warunek rozmowy.',
  },
]

