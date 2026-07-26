export type ReferenceFaqCategory = 'wspolpraca' | 'konsultacje' | 'pies' | 'kot' | 'płatności' | 'techniczne'

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
  { id: 'wspolpraca', label: 'Współpraca', countLabel: '5 pytań', icon: 'message' },
  { id: 'konsultacje', label: 'Konsultacje', countLabel: '5 pytań', icon: 'calendar' },
  { id: 'pies', label: 'Pies', countLabel: '5 pytań', icon: 'paw' },
  { id: 'kot', label: 'Kot', countLabel: '5 pytań', icon: 'cat' },
  { id: 'płatności', label: 'Płatności', countLabel: '5 pytań', icon: 'payment' },
  { id: 'techniczne', label: 'Techniczne', countLabel: '5 pytań', icon: 'screen' },
]

export const referenceFaqItems: ReferenceFaqItem[] = [
  {
    id: 'krótka-wiadomość-zamiast-konsultacji',
    category: 'wspolpraca',
    question: 'Czy muszę już wiedzieć, co jest przyczyną?',
    answer:
      'Nie. To kluczowy etap naszej współpracy. Podczas konsultacji wspólnie poszukamy źródła trudności i ustalimy dalszy plan działania.',
  },
  {
    id: 'czy-wiadomość-zastepuje-konsultacje',
    category: 'wspolpraca',
    question: 'Czy w każdej usłudze dostaję analizę zachowania?',
    answer:
      'Tak. W każdej usłudze dostajesz analizę zachowania opartą na informacjach, które przekażesz: opisie sytuacji, formularzu, historii zachowania, kontekście domu lub spacerów i nagraniach, jeśli są. Zakres analizy zależy od ilości danych i długości rozmowy.',
  },
  {
    id: 'diagnoza-lub-weterynarz',
    category: 'konsultacje',
    question: 'Czy analiza zachowania zastępuje lekarza weterynarii?',
    answer:
      'Nie. Zachowanie może mieć związek ze zdrowiem, bólem, dietą albo środowiskiem. Jako technik weterynarii i dietetyk patrzę szerzej, ale jeśli coś wymaga konsultacji lekarskiej, powiem to jasno.',
  },
  {
    id: 'kwadrans',
    category: 'konsultacje',
    question: 'Co realnie da mi 15 minut rozmowy?',
    answer:
      'Nie rozwiążemy całej złożonej sprawy w 15 minut, ale możemy nazwać główny kierunek, ustalić priorytet i zatrzymać działania, które mogą pogarszać sytuację.',
  },
  {
    id: 'pelna-konsultacja',
    category: 'konsultacje',
    question: 'Kiedy pełna konsultacja ma więcej sensu niż szybka rozmowa?',
    answer:
      'Gdy zachowanie trwa długo, dotyczy kilku sytuacji albo mocno wpływa na życie domowników. Wtedy potrzebne jest około 2h online, analiza zachowania, prawdopodobna przyczyna problemu, plan działania i 14 dni komunikacji w pokoju klienta.',
  },
  {
    id: 'problemy-kot',
    category: 'kot',
    question: 'Dla jakich problemów mogę zgłosić się z kotem?',
    answer:
      'Najczęściej z kuwetą, stresem, wycofaniem, konfliktem między kotami, nadmierną wokalizacją, napięciem po zmianach w domu albo trudnością z dotykiem.',
  },
  {
    id: 'problemy-pies',
    category: 'pies',
    question: 'Dla jakich problemów mogę zgłosić się z psem?',
    answer:
      'Najczęściej ze spacerami, reaktywnością, rozłąką, pobudzeniem, szczeniakiem, niszczeniem w domu, obroną zasobów albo trudnym startem po adopcji.',
  },
  {
    id: 'czy-tylko-online',
    category: 'techniczne',
    question: 'Czy pracujesz tylko online?',
    answer:
      'Publiczna oferta serwisu jest online. Taki format wystarcza do wielu pierwszych decyzji i pozwala spokojnie omówić sytuację bez stresu dla zwierzęcia.',
  },
  {
    id: 'czas-odpowiedzi',
    category: 'techniczne',
    question: 'Jak szybko otrzymam odpowiedź?',
    answer:
      'Na wiadomość wysłaną bez rezerwacji odpowiadam zwykle w ciągu 1-2 dni roboczych. Po wyborze terminu i opłaceniu usługi dalsza komunikacja dotyczy konkretnej rezerwacji.',
  },
  {
    id: 'przygotowanie',
    category: 'konsultacje',
    question: 'Jak się przygotować do konsultacji?',
    answer:
      'Przygotuj krótki opis sytuacji, wiek zwierzęcia, czas trwania problemu i to, co już było próbowane. Nagrania są pomocne, ale nie są warunkiem rozpoczęcia konsultacji.',
  },
  {
    id: 'plan-pracy',
    category: 'wspolpraca',
    question: 'Czy dostanę plan pracy po konsultacji?',
    answer:
      'Po pełnej konsultacji otrzymujesz plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń. Po Kwadransie dostajesz przede wszystkim priorytet i najbliższy sensowny krok.',
  },
  {
    id: 'nie-zachowanie',
    category: 'wspolpraca',
    question: 'Co jeśli problem nie dotyczy zachowania?',
    answer:
      'Powiem to wprost. Jeśli sytuacja wygląda na zdrowotną, techniczną albo organizacyjną, wskażę, jaki specjalista lub jaki krok ma większy sens.',
  },
  {
    id: 'weterynarz',
    category: 'wspolpraca',
    question: 'Czy współpracujesz z weterynarzem?',
    answer:
      'Tak, gdy sprawa tego wymaga. Konsultacja behawioralna nie zastępuje diagnostyki weterynaryjnej, ale może pomóc uporządkować obserwacje i pytania.',
  },
  {
    id: 'nagrywanie',
    category: 'techniczne',
    question: 'Czy mogę nagrywać konsultację?',
    answer:
      'Nagrywanie wymaga wcześniejszego uzgodnienia. Możesz natomiast robić notatki i wracać do najważniejszych ustaleń w dalszej korespondencji.',
  },
  {
    id: 'metody-pracy',
    category: 'pies',
    question: 'Jakimi metodami pracujesz?',
    answer:
      'Bez przemocy, bez straszenia i bez dominowania. Najpierw szukam, co zwiększa napięcie, a potem dobieram takie kroki, które opiekun naprawdę może wdrożyć w swoim domu.',
  },
  {
    id: 'diagnoza-na-podstawie-informacji',
    category: 'konsultacje',
    question: 'Czy zakres analizy zależy od długości rozmowy?',
    answer:
      'Tak. W Kwadransie dostajesz pierwszy kierunek działania na podstawie informacji od opiekuna. Przy sprawach złożonych pełniejsza analiza wymaga około 2h online, formularza, historii zachowania i czasem nagrań.',
  },
  {
    id: 'pies-reaktywny-na-spacerze',
    category: 'pies',
    question: 'Czy konsultacja online ma sens przy psie reaktywnym na spacerze?',
    answer:
      'Tak, jeśli możesz opisać sytuacje, dystanse, wyzwalacze i reakcje psa. Nagranie spaceru pomaga, ale nie jest obowiązkowe na pierwszy kontakt.',
  },
  {
    id: 'pies-lek-separacyjny',
    category: 'pies',
    question: 'Czy pomagasz przy lęku separacyjnym?',
    answer:
      'Tak. Najpierw porządkujemy objawy, rytm dnia i warunki zostawania psa. Potem ustalamy bezpieczny pierwszy etap pracy bez forsowania samotności.',
  },
  {
    id: 'pies-szczeniak',
    category: 'pies',
    question: 'Czy mogę zgłosić szczeniaka?',
    answer:
      'Tak. Przy szczeniaku najczęściej omawiam gryzienie, pobudzenie, odpoczynek, naukę samotności, spacery i zasady w domu.',
  },
  {
    id: 'kot-kuweta',
    category: 'kot',
    question: 'Czy konsultacja obejmuje problemy z kuwetą?',
    answer:
      'Tak. Przy kuwecie trzeba uporządkować zdrowie, żwirek, liczbę kuwet, lokalizację, stres i ostatnie zmiany w domu. Nie zaczynam od losowych porad.',
  },
  {
    id: 'kot-konflikt',
    category: 'kot',
    question: 'Czy pomagasz przy konflikcie między kotami?',
    answer:
      'Tak. Analizuję zasoby, przestrzeń, historię relacji, napięcia i momenty eskalacji. Celem jest plan, który zmniejsza presję między kotami.',
  },
  {
    id: 'kot-stres-po-zmianach',
    category: 'kot',
    question: 'Czy mogę zgłosić kota po przeprowadzce albo zmianach w domu?',
    answer:
      'Tak. Zmiany środowiska często nasilają chowanie się, wokalizację, napięcie albo problemy kuwetowe. W konsultacji ustalamy, co stabilizować najpierw.',
  },
  {
    id: 'kot-nocna-aktywnosc',
    category: 'kot',
    question: 'Czy zajmujesz się nocną aktywnością kota?',
    answer:
      'Tak. Sprawdzamy rytm dnia, karmienie, zabawę, frustrację, zdrowie i środowisko. Dopiero potem dobieramy zmiany, które nie nasilą napięcia.',
  },
  {
    id: 'platnosc-jakie-metody',
    category: 'płatności',
    question: 'Jak mogę zapłacić za konsultację?',
    answer:
      'Opłaty możesz dokonać przez płatność online (Naffy: karta, Apple/Google Pay, szybki przelew) lub wybierając BLIK na telefon. Po rezerwacji dostajesz dalszy krok i potwierdzenie.',
  },
  {
    id: 'platnosc-kiedy-potwierdzenie',
    category: 'płatności',
    question: 'Kiedy termin jest potwierdzony?',
    answer:
      'Termin jest potwierdzony po rezerwacji i sprawdzeniu płatności. Jeśli coś wymaga doprecyzowania, kontaktuję się mailowo.',
  },
  {
    id: 'platnosc-potwierdzenie',
    category: 'płatności',
    question: 'Czy mogę poprosić o potwierdzenie płatności?',
    answer:
      'Tak. Jeśli potrzebujesz potwierdzenia, napisz to w wiadomości albo odpowiedz na mail dotyczący rezerwacji.',
  },
  {
    id: 'platnosc-brak-przejscia',
    category: 'płatności',
    question: 'Co jeśli płatność albo strona płatności się nie otworzy?',
    answer:
      'Wróć do wyboru terminu albo napisz przez formularz kontaktowy. Nie ponawiaj kilku prób na ślepo, jeśli nie masz pewności, czy zamówienie powstało.',
  },
  {
    id: 'platnosc-anulowanie',
    category: 'płatności',
    question: 'Czy mogę zmienić termin po opłaceniu?',
    answer:
      'Jeśli potrzebujesz zmiany, napisz jak najszybciej. Możliwość przełożenia zależy od czasu do konsultacji i dostępnych terminów.',
  },
  {
    id: 'techniczne-kamera',
    category: 'techniczne',
    question: 'Czy muszę mieć włączoną kamerę?',
    answer:
      'Nie zawsze. Kwadrans jest rozmową audio. Przy pełnej konsultacji kamera lub nagrania mogą pomóc, ale forma zależy od sytuacji i możliwości opiekuna.',
  },
  {
    id: 'techniczne-nagrania',
    category: 'techniczne',
    question: 'Czy mogę wysłać nagrania zachowania?',
    answer:
      'Tak, jeśli są krótkie i pokazują realną sytuację. Nagrania traktuję jako materiał pomocniczy, a nie obowiązkowy warunek rozmowy.',
  },
]

