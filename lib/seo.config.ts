import { PUBLIC_OFFER_PRICE_LABELS } from './public-offer-copy'

export const SITE = {
  name: 'Regulski Behawiorysta',
  fullName: 'Krzysztof Regulski — Behawiorysta zwierzęcy',
  url: 'https://regulskibehawiorysta.pl',
  locale: 'pl_PL',
  language: 'pl',
  defaultOgImage: '/og-default.png',
  twitterHandle: '',
  email: 'kontakt@regulskibehawiorysta.pl',
  author: {
    name: 'Krzysztof Regulski',
    role: 'Behawiorysta COAPE / CAPBT, technik weterynarii',
    bio: 'Behawiorysta zwierzęcy z certyfikatem COAPE/CAPBT. Pomagam opiekunom psów i kotów rozwiązać problemy bez kar i przymusu.',
  },
  business: {
    type: 'Person',
    priceRange: `${PUBLIC_OFFER_PRICE_LABELS.quick}–${PUBLIC_OFFER_PRICE_LABELS.premium}`,
    services: ['Konsultacje behawioralne', 'Konsultacje online', 'Praca z reaktywnością', 'Lęk separacyjny', 'Behawiorystyka kotów'],
  },
} as const
