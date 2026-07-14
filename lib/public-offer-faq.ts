import type { TrustFaqItem } from '@/lib/trust-layer'

import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'

export const PUBLIC_OFFER_FAQ_ITEMS: TrustFaqItem[] = [
  {
    question: `Czym różni się Kwadrans za ${PUBLIC_OFFER_PRICE_LABELS.quick} od Kwadransu na już za ${PUBLIC_OFFER_PRICE_LABELS.urgent}?`,
    answer:
      'Forma połączenia telefonicznego jest ta sama. Przy wyższej cenie płacisz za priorytet i możliwie szybki termin, a nie za dłuższą konsultację.',
  },
  {
    question: `Kiedy wybrać Dwa kwadranse za ${PUBLIC_OFFER_PRICE_LABELS.bridge}?`,
    answer:
      'Wtedy, gdy 15 minut to za mało, temat ma 2-3 wątki albo chcesz spokojniej uporządkować sytuację przed decyzja o Pełnej konsultacji.',
  },
  {
    question: `Co obejmuje Pełna konsultacja ${PUBLIC_OFFER_PRICE_LABELS.premium}?`,
    answer:
      'Około 2h przez Jitsi, analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń. W tym czasie można zadawać pytania, wysyłać filmy i konsultować kolejne kroki.',
  },
  {
    question: 'Kiedy nie warto zaczynac od Kwadransu?',
    answer:
      'Nie wtedy, gdy od razu widzisz, że temat jest złożony, trwa długo albo dotyczy kilku obszarów naraz. W takiej sytuacji lepiej od razu wejść w Dwa kwadranse albo Pełną konsultację.',
  },
  {
    question: 'Co jeśli wybiore za maly format?',
    answer:
      'W trakcie wyboru i po pierwszym opisie sytuacji powiem wprost, czy wystarczy Kwadrans, czy lepiej od razu przejść do Dwóch kwadransów albo Pełnej konsultacji.',
  },
  {
    question: 'Jak działa Kwadrans na już?',
    answer:
      'To ten sam 15-minutowy format co zwykły Kwadrans, ale z priorytetem i możliwie szybkim terminem. Różnica dotyczy czasu wejścia, nie zakresu rozmowy.',
  },
  {
    question: 'Co jeśli nie wiem, od czego zacząć?',
    answer:
      `Najprostszy start to zwykły Kwadrans za ${PUBLIC_OFFER_PRICE_LABELS.quick}. Jeśli potrzebujesz tego samego formatu szybciej, wybierz Kwadrans na już. Jeśli temat jest szerszy, wejdź w Dwa kwadranse. Jeśli sprawa jest złożona albo przewlekła, wybierz Pełną konsultację.`,
  },
]

