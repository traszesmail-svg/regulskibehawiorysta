import type { CaseMapAnswers, CaseMapPath, CaseMapSpecies, CaseMapTopic, CaseMapTriageState } from '@/lib/case-map'

export type CaseMapReport = {
  title: string
  summary: string
  firstStep: string
  observe: string
  avoid: string
  practitionerBrief: string
}

const TOPIC_LABELS: Record<CaseMapTopic, string> = {
  dog_walks: 'spacer i reakcje na bodźce',
  dog_alone: 'zostawanie samemu',
  dog_resources: 'zasoby',
  dog_noise: 'hałas i panika',
  dog_change: 'zmiana w domu lub rytmie',
  cat_litter: 'kuweta',
  cat_touch: 'dotyk, głaskanie lub gryzienie',
  cat_conflict: 'napięcie między kotami',
  cat_change: 'zmiana w domu lub rytmie',
  noise: 'hałas i nagłe bodźce',
  other: 'inna sytuacja',
}

const FIRST_STEPS: Record<CaseMapTopic, string> = {
  dog_walks: 'Na dziś wybierz trasę i dystans, przy których zwierzę może zauważyć bodziec bez dokładania presji.',
  dog_alone: 'Na dziś nie wydłużaj samotnego zostawania „na próbę”; zbierz spokojne obserwacje z krótkiego, znanego odcinka.',
  dog_resources: 'Na dziś ogranicz sytuacje przy zasobach i nie próbuj odbierać jedzenia ani przedmiotów, żeby sprawdzić reakcję.',
  dog_noise: 'Na dziś przygotuj spokojne miejsce i nie wystawiaj zwierzęcia celowo na hałas w ramach testu.',
  dog_change: 'Na dziś uprość rytm dnia i zapisz, co się zmieniło bezpośrednio przed nasileniem trudności.',
  cat_litter: 'Na dziś nie karz kota ani nie ograniczaj dostępu do kuwety; zadbaj o spokojne warunki korzystania z niej i obserwuj powtarzalny wzorzec.',
  cat_touch: 'Na dziś pozwól kotu inicjować kontakt i przerwij go przy pierwszych sygnałach napięcia.',
  cat_conflict: 'Na dziś zwiększ dostęp do zasobów i przejść, bez zmuszania kotów do wspólnego kontaktu.',
  cat_change: 'Na dziś przywróć przewidywalność w domu i ogranicz nowe bodźce, jeśli to możliwe.',
  noise: 'Na dziś przygotuj spokojne miejsce i nie wystawiaj zwierzęcia celowo na hałas w ramach testu.',
  other: 'Na dziś wybierz jeden mały krok, który zmniejsza presję i pozwala obserwować sytuację bez testowania granic.',
}

function getFocusLabel(value: unknown) {
  if (value === 'one_animal' || value === 'one_pet') return 'jednego zwierzęcia'
  if (value === 'relationship') return 'relacji między zwierzętami lub osobami'
  if (value === 'unsure' || value === 'unknown') return 'sytuacji, której nie da się jeszcze jasno przypisać'
  return 'opisanej sytuacji'
}

function getTriageFirstStep(triageState: CaseMapTriageState, fallback: string) {
  if (triageState === 'SAFETY_NOW') return 'Najpierw przerwij ryzyko, zwiększ dystans i bezpiecznie rozdziel uczestników. Nie kontynuuj teraz ćwiczeń ani formularza.'
  if (triageState === 'HUMAN_MEDICAL') return 'Po urazie człowieka najpierw potrzebna jest właściwa pomoc medyczna i zabezpieczenie sytuacji.'
  if (triageState === 'VET_URGENT') return 'Najpierw skontaktuj się pilnie z lecznicą lub całodobową pomocą weterynaryjną.'
  if (triageState === 'VET_FIRST') return 'Najpierw umów konsultację weterynaryjną; ból i nagła zmiana zdrowia mogą wpływać na zachowanie.'
  if (triageState === 'SAFETY_PRIORITY') return 'Najpierw zarządzaj bezpieczeństwem i nie testuj granic zwierzęcia; zbieraj obserwacje tylko w bezpiecznych warunkach.'
  return fallback
}

export function buildCaseMapReport({
  species,
  topic,
  path,
  triageState,
  answers,
}: {
  species: CaseMapSpecies
  topic: CaseMapTopic
  path: CaseMapPath
  triageState: CaseMapTriageState
  answers: CaseMapAnswers
}): CaseMapReport {
  const animal = species === 'kot' ? 'kota' : 'psa'
  const topicLabel = TOPIC_LABELS[topic]
  const description = typeof answers.case_description === 'string' ? answers.case_description.trim() : ''
  const scope = path === 'long' ? 'pełny wywiad' : 'krótką mapę'
  const summary = description
    ? `Mapa dotyczy ${getFocusLabel(answers.case_focus)}: ${topicLabel}. Opiekun opisał ją tak: „${description}”`
    : `Mapa dotyczy ${getFocusLabel(answers.case_focus)}: ${topicLabel}. Wybrano ${scope}.`

  return {
    title: `Mapa zachowania ${animal}: ${topicLabel}`,
    summary,
    firstStep: getTriageFirstStep(triageState, FIRST_STEPS[topic]),
    observe: 'Zapisz kontekst, pierwsze sygnały napięcia, czas powrotu do spokoju oraz to, co realnie pomaga bez zwiększania presji.',
    avoid: 'Nie diagnozuj po jednym zdarzeniu, nie testuj granic zwierzęcia i nie dokładaj trudności tylko po to, by sprawdzić reakcję.',
    practitionerBrief: `Temat: ${topicLabel}. Zakres: ${scope}. Triage: ${triageState}. ${description ? `Opis opiekuna: ${description}` : 'Brak dodatkowego opisu.'}`,
  }
}
