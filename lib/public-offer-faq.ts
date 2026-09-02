import type { TrustFaqItem } from '@/lib/trust-layer'

import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'

export const PUBLIC_OFFER_FAQ_ITEMS: TrustFaqItem[] = [
  {
    question: `Czym różni się Zapytaj behawiorystę za ${PUBLIC_OFFER_PRICE_LABELS.quick} od Zapytaj teraz za ${PUBLIC_OFFER_PRICE_LABELS.urgent}?`,
    answer:
      'Forma połączenia telefonicznego jest ta sama. Przy wyższej cenie płacisz za priorytet i możliwie szybki termin, a nie za dłuższą konsultację.',
  },
  {
    question: 'Co dostaję po Zapytaj behawiorystę?',
    answer:
      'Po rozmowie dostajesz pierwszy kierunek działania i dwa pytania uzupełniające. Jeśli temat wymaga szerszego procesu, otrzymasz rekomendację pełnej konsultacji.',
  },
  {
    question: `Co obejmuje Pełna konsultacja ${PUBLIC_OFFER_PRICE_LABELS.premium}?`,
    answer:
      'Około 90 minut przez Jitsi, analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta przy wdrażaniu zaleceń. W tym czasie można zadawać pytania, wysyłać filmy i konsultować kolejne kroki.',
  },
  {
    question: 'Kiedy nie warto zaczynać od Zapytaj behawiorystę?',
    answer:
      'Jeśli wiesz już, że temat wymaga szerokiego wywiadu i dłuższej pracy, możesz zapoznać się z pełną konsultacją. Jej termin jest udostępniany indywidualnie po pierwszym kroku.',
  },
  {
    question: 'Co jeśli nie wiem, co robić dalej?',
    answer:
      'Właśnie po to jest Zapytaj behawiorystę. Opisujesz sytuację, a po rozmowie dostajesz pierwszy klucz i jasną rekomendację dalszego kroku albo materiału PDF.',
  },
  {
    question: 'Jak działa Zapytaj teraz?',
    answer:
      'To ten sam zakres co Zapytaj behawiorystę, ale dostępny tylko wtedy, gdy ręcznie włączę najbliższe okno. Cena wynosi 104 zł i dotyczy szybszego wejścia, nie dłuższej analizy.',
  },
  {
    question: 'Co jeśli nie wiem, od czego zacząć?',
    answer:
      `Najprostszy start to Zapytaj behawiorystę za ${PUBLIC_OFFER_PRICE_LABELS.quick}. Jeśli akurat jestem dostępny, możesz wybrać Zapytaj teraz za ${PUBLIC_OFFER_PRICE_LABELS.urgent}. Pełna konsultacja za ${PUBLIC_OFFER_PRICE_LABELS.premium} jest kolejnym krokiem udostępnianym indywidualnie po rozmowie.`,
  },
]

