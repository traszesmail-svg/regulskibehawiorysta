import { formatPricePln } from '@/lib/pricing'

export const PUBLIC_ZAPYTAJ_OFFER = {
  id: 'zapytaj-behawioryste',
  name: 'Zapytaj behawiorystę',
  durationLabel: 'Do 15 minut',
  pricePln: 79,
  livePricePln: 104,
  technicalLimitMinutes: 17,
  summary:
    'Krótka, płatna rozmowa, w której porządkujesz problem i dostajesz pierwszy praktyczny kierunek: co możesz zrobić dalej.',
} as const

export const PUBLIC_FULL_CONSULTATION_OFFER = {
  id: 'konsultacja-behawioralna',
  name: 'Pełna konsultacja',
  durationLabel: 'około 90 minut',
  pricePln: 475,
  summary:
    'Pełny proces dla sytuacji, które wymagają szerszego kontekstu, planu działania i dalszego wsparcia.',
} as const

export const PUBLIC_THERAPY_OFFER = {
  id: 'terapia-behawioralna',
  name: 'Terapia behawioralna',
  summary:
    'Indywidualna ścieżka pracy ustalana po pełnej konsultacji. Zakres i terminy dobieramy do sytuacji.',
} as const

export function formatPublicOfferPrice(amount: number) {
  return formatPricePln(amount)
}
