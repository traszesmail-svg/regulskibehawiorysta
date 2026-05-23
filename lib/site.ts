import { ProblemType } from './types'

export const HOME_DOG_QUICK_CHOICE_PHOTO = {
  src: '/images/cutover/dog-kitchen-chaos.png',
  width: 1024,
  height: 1536,
  alt: 'Wesoły pies w kuchennym wnętrzu jako zdjęcie dla strony opiekuna psa',
}

export const HOME_CAT_QUICK_CHOICE_PHOTO = {
  src: '/images/cutover/home-cat-hidden.png',
  width: 1024,
  height: 1536,
  alt: 'Ukryty kotek pod kanapą jako zdjęcie dla strony opiekuna kota',
}

export const HOME_HELP_CHOICE_PHOTO = {
  src: '/images/cutover/home-help-stress.png',
  width: 1024,
  height: 1536,
  alt: 'Zestresowany pies schowany pod łóżkiem jako zdjęcie pomocnicze, gdy temat jest szerszy albo chcesz napisać wiadomość',
}

export const HOME_HERO_PHOTO = {
  src: '/branding/omnie.png',
  width: 1024,
  height: 1536,
  alt: 'Krzysztof Regulski w granatowym kitlu z kotem na rękach i przysmakiem w kształcie małej kości',
}

export const SITE_NAME = 'Regulski Behawiorysta'
export const SITE_SHORT_NAME = 'Regulski Behawiorysta'
export const SITE_HEADER_BRAND = 'Regulski Behawiorysta'
export const SITE_HEADER_SUBTITLE = 'Krzysztof Regulski - behawiorysta zwierzęcy'
export const SITE_URL_FALLBACK = 'http://localhost:3000'
export const SITE_PRODUCTION_URL = 'https://regulskibehawiorysta.pl'
export const PUBLIC_CONTACT_EMAIL_FALLBACK = 'kontakt@regulskibehawiorysta.pl'
export const SITE_TAGLINE = 'Konsultacje behawioralne psów i kotów'
export const SITE_DESCRIPTION =
  'Krótkie konsultacje behawioralne dla opiekunów psów i kotów. Rozmowa z Krzysztofem Regulskim, behawiorystą zwierzęcym i trenerem COAPE.'

export const SPECIALIST_NAME = 'Krzysztof Regulski'
export const SPECIALIST_PUBLIC_STATUS = 'Dyplomant COAPE'
export const SPECIALIST_PUBLIC_DIRECTORY = 'publiczny profil CAPBT'
export const SPECIALIST_PUBLIC_TITLE = `${SPECIALIST_PUBLIC_STATUS} | ${SPECIALIST_PUBLIC_DIRECTORY}`
export const SPECIALIST_CREDENTIALS_LIST = [
  'dyplomant COAPE',
  'technik weterynarii',
  'dogoterapeuta',
  'dietetyk',
] as const
export const SPECIALIST_CREDENTIALS = SPECIALIST_CREDENTIALS_LIST.join(', ')
export const SPECIALIST_PUBLIC_PROOF_SUMMARY =
  'Dyplomant COAPE z publicznym profilem CAPBT, technik weterynarii, dogoterapeuta i dietetyk.'
export const SPECIALIST_STATUS_EXPLANATION =
  'Na publicznym profilu CAPBT status widnieje jako dyplomant COAPE. Tę formę zostawiam w serwisie bez skrótów i bez dopowiadania szerszych tytułów, których nie potwierdza źródło.'
export const SPECIALIST_LOCATION = 'Polska'
export const COAPE_INTL_URL = 'https://coape.org/'
export const COAPE_ORG_URL = 'https://coape.pl/'
export const CAPBT_ORG_URL = 'https://behawioryscicoape.pl/'
export const CAPBT_PROFILE_URL = 'https://behawioryscicoape.pl/behawiorysta/Regulski'
export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/regulskibehawiorysta/'
export const PUBLIC_SOCIAL_LINKS = [
  {
    label: 'Instagram',
    href: INSTAGRAM_PROFILE_URL,
    description: 'publiczne treści marki',
  },
  {
    label: 'Zweryfikuj kwalifikacje COAPE',
    href: CAPBT_PROFILE_URL,
    description: 'publiczny profil specjalisty',
  },
] as const
export const ORGANIZATION_PUBLIC_PROFILE_URLS = PUBLIC_SOCIAL_LINKS.map((link) => link.href)
export const SPECIALIST_PUBLIC_PROFILE_URLS = [
  COAPE_INTL_URL,
  COAPE_ORG_URL,
  CAPBT_ORG_URL,
  CAPBT_PROFILE_URL,
  INSTAGRAM_PROFILE_URL,
] as const

export const COAPE_INTL_LOGO = {
  src: '/branding/coape-org.png',
  alt: 'Logo COAPE',
  width: 1024,
  height: 254,
}

export const COAPE_POLSKA_LOGO = {
  src: '/branding/coape-polska.png',
  alt: 'Logo COAPE Polska',
  width: 442,
  height: 104,
}

export const CAPBT_POLSKA_LOGO = {
  src: '/branding/capbt-polska.png',
  alt: 'Logo CAPBT Polska, Stowarzyszenie Behawiorystów i Trenerów COAPE',
  width: 436,
  height: 107,
}

// Legacy aliases kept for existing sections outside homepage.
export const COAPE_LOGO = COAPE_POLSKA_LOGO
export const CAPBT_LOGO = CAPBT_POLSKA_LOGO

export const SPECIALIST_TRUST_STATEMENT = 'Pomagam spokojnie uporządkować sytuację i wybrać dobry następny krok.'
export const CONSULTATION_PRICE_COMPARE_COPY =
  'Jeśli temat okaże się szerszy, po tej rozmowie łatwiej zdecydować o kolejnym kroku.'

export const LANDING_SPECIALIST_PHOTO = {
  src: '/images/cutover/therapy-animals.png',
  width: 1024,
  height: 1536,
  alt: 'Pies i kot w spokojnym kadrze jako ilustracja marki Regulski Behawiorysta',
}

export const SPECIALIST_PHOTO = LANDING_SPECIALIST_PHOTO
export const ABOUT_SPECIALIST_PHOTO = {
  src: HOME_HERO_PHOTO.src,
  width: HOME_HERO_PHOTO.width,
  height: HOME_HERO_PHOTO.height,
  alt: 'Krzysztof Regulski w granatowym stroju medycznym z informacją o pomocy behawioralnej dla psów i kotów',
}

export const SPECIALIST_WIDE_PHOTO = {
  src: '/images/cutover/therapy-animals.png',
  alt: 'Terapia behawioralna dla zwierząt w szerokim kadrze jako ilustracja pracy marki Regulski',
  width: 1536,
  height: 1024,
}

export const SPECIALIST_CAT_SUPPORT_PHOTO = {
  src: '/images/cutover/cat-kuweta.png',
  width: 1024,
  height: 1536,
  alt: 'Koty w łazience z piaskiem jako ilustracja wsparcia przy kuwecie i zachowaniach toaletowych',
}

export const SPECIALIST_EXTENDED_START_PHOTO = {
  src: '/images/cutover/therapy-animals.png',
  width: 1536,
  height: 1024,
  alt: 'Terapia behawioralna dla zwierząt jako ilustracja spokojniejszego, rozszerzonego startu',
}

export const SPECIALIST_ONLINE_PHOTO = {
  src: '/images/cutover/therapy-animals.png',
  alt: 'Terapia behawioralna dla zwierząt jako ilustracja konsultacji online',
  width: 1536,
  height: 1024,
}

export const SITE_OG_IMAGE = {
  url: '/images/cutover/therapy-animals.png',
  width: 1200,
  height: 630,
  alt: 'Terapia behawioralna dla zwierząt jako obraz do udostępnień marki Regulski Behawiorysta',
} as const

export const SUPPORTING_SPECIALIST_PHOTO = {
  src: '/images/cutover/dog-puppy-home.png',
  width: 1024,
  height: 1536,
  alt: 'Wesoły szczeniak w przytulnym salonie jako ilustracja spokojniejszego wsparcia',
}

export const CAT_HOME_PHOTO = {
  src: '/images/cutover/home-cat-hidden.png',
  alt: 'Ukryty kotek pod kanapą jako ilustracja pracy z kuwetą, stresem i relacją w domu',
  width: 1024,
  height: 1536,
}

export const CATS_PAGE_PHOTO = {
  src: '/images/cutover/cat-stress.png',
  width: 1024,
  height: 1536,
  alt: 'Ukryty kotek pod kanapą jako ilustracja kociego startu i wycofania',
}

export const SPECIALIST_CAT_PHOTO = {
  src: '/images/cutover/cat-conflict.png',
  width: 1024,
  height: 1536,
  alt: 'Kotki w konfliktowej konfrontacji jako ilustracja konsultacji behawioralnej i terapii kotów',
}

export const THERAPY_PROCESS_PHOTO = {
  src: '/images/cutover/therapy-animals.png',
  width: 1536,
  height: 1024,
  alt: 'Terapia behawioralna dla zwierząt jako ilustracja dłuższego wsparcia',
}

export const HOME_VISIT_PHOTO = {
  src: '/images/cutover/dog-kitchen-chaos.png',
  width: 1024,
  height: 1536,
  alt: 'Wesoły pies w kuchennym chaosie jako ilustracja konsultacji prowadzonej w miejscu codziennego funkcjonowania',
}

export const STAYS_PHOTO = {
  src: '/images/cutover/dog-puppy-home.png',
  width: 1024,
  height: 1536,
  alt: 'Wesoły szczeniak w przytulnym salonie jako ilustracja pobytów socjalizacyjno-terapeutycznych',
}

export const HERO_SUPPORT_IMAGES = [
  {
    id: 'hero-dog',
    src: '/images/cutover/dog-puppy-home.png',
    width: 1024,
    height: 1536,
    alt: 'Wesoły szczeniak w przytulnym salonie jako ilustracja domowego wsparcia',
    label: 'Pies w domowym środowisku',
  },
  {
    id: 'hero-cat',
    src: '/images/cutover/home-cat-hidden.png',
    width: 1024,
    height: 1536,
    alt: 'Ukryty kotek pod kanapą jako ilustracja spokojnego startu dla kota',
    label: 'Kot w spokojnym kadrze',
  },
] as const

export const CAT_TOPIC_VISUALS = {
  'kot-wycofanie': {
    src: '/images/cutover/cat-stress.png',
    alt: 'Ukryty kotek pod kanapą jako ilustracja wycofania i napięcia u kota',
    width: 1024,
    height: 1536,
  },
  'kot-kuweta': {
    src: '/images/cutover/cat-kuweta.png',
    alt: 'Koty w łazience z piaskiem jako ilustracja kuwety i zachowań toaletowych',
    width: 1024,
    height: 1536,
  },
  'kot-konflikt': {
    src: '/images/cutover/cat-conflict.png',
    alt: 'Kotki w konfliktowej konfrontacji jako ilustracja konfliktu między kotami',
    width: 1024,
    height: 1536,
  },
  'kot-zmiany-w-domu': {
    src: '/images/cutover/cat-destruction.png',
    alt: 'Kot w zniszczonym salonie jako ilustracja zmian w domu i przeciążenia środowiskiem',
    width: 1024,
    height: 1536,
  },
  'kot-wokalizacja': {
    src: '/images/cutover/cat-night.png',
    alt: 'Kot aktywny nocą jako ilustracja wokalizacji i pobudzenia',
    width: 1024,
    height: 1536,
  },
  'kot-dotyk': {
    src: '/images/cutover/cat-destruction.png',
    alt: 'Kot w zniszczonym salonie jako ilustracja trudnego dotyku, pielęgnacji i obrony',
    width: 1024,
    height: 1536,
  },
  'kot-stres': {
    src: '/images/cutover/cat-stress.png',
    alt: 'Ukryty kotek pod kanapą jako ilustracja lęku, stresu i wycofania',
    width: 1024,
    height: 1536,
  },
  'kot-nocna-wokalizacja': {
    src: '/images/cutover/cat-night.png',
    alt: 'Kot w skoku na śpiącego mężczyznę jako ilustracja nocnej aktywności i rytmu dnia',
    width: 1024,
    height: 1536,
  },
} as const

export const TOPIC_VISUALS: Record<ProblemType, { src: string; alt: string; width: number; height: number }> = {
  szczeniak: {
    src: '/images/cutover/dog-puppy-home.png',
    alt: 'Wesoły szczeniak w przytulnym salonie jako ilustracja startu że szczeniakiem i młodym psem',
    width: 1024,
    height: 1536,
  },
  ...CAT_TOPIC_VISUALS,
  separacja: {
    src: '/images/cutover/dog-separation.png',
    alt: 'Zestresowany pies schowany pod łóżkiem jako ilustracja problemów separacyjnych',
    width: 1024,
    height: 1536,
  },
  spacer: {
    src: '/images/cutover/dog-spacer-reactivity.png',
    alt: 'Pies goniący rowerzystę w lesie jako ilustracja spaceru i reakcji',
    width: 1024,
    height: 1536,
  },
  agresja: {
    src: '/images/cutover/dog-resource-guarding.png',
    alt: 'Pies broniący kości na kanapie jako ilustracja obrony zasobów',
    width: 1024,
    height: 1536,
  },
  pobudzenie: {
    src: '/images/cutover/dog-pobudzenie.png',
    alt: 'Piesek grzebiący w śmieciach jako ilustracja pobudzenia i pogoni',
    width: 1024,
    height: 1536,
  },
  inne: {
    src: '/images/cutover/therapy-animals.png',
    alt: 'Terapia behawioralna dla zwierząt jako ilustracja szerszego lub nietypowego tematu',
    width: 1536,
    height: 1024,
  },
}

export type RealCaseStudy = {
  id: string
  imageSrc: string
  imageAlt: string
  sourceLabel: string
  sourceHref?: string
  problem: string
  summary: string
  effect: string
}

export const REAL_CASE_STUDIES: RealCaseStudy[] = [
  {
    id: 'fear-dog',
    imageSrc: '/branding/case-dog-rest.jpg',
    imageAlt: 'Spokojny pies odpoczywający w domowym otoczeniu',
    sourceLabel: 'Start: napięcie i samotność',
    problem: 'Pies szczeka, nie wycisza się i trudno mu zostać samemu.',
    summary: 'Najpierw rozdzielamy przeciążenie, brak rutyny i możliwy lęk separacyjny.',
    effect: 'Po rozmowie opiekun wie, co wdrożyć od razu i czy potrzebny będzie dłuższy start.',
  },
  {
    id: 'litter-box-cat',
    imageSrc: '/branding/case-cat-sofa.jpg',
    imageAlt: 'Kot odpoczywający w jasnym wnętrzu',
    sourceLabel: 'Start: kuweta i napięcie',
    problem: 'Kot omija kuwetę albo wyraźnie sygnalizuje stres w domu.',
    summary: 'Porządkujemy tło środowiskowe, napięcie w domu i moment, w którym wrócić do weterynarza.',
    effect: 'Po rozmowie masz plan: co sprawdzić, co zanotować i jaki następny krok ma sens.',
  },
  {
    id: 'multi-animal-home',
    imageSrc: '/branding/case-cat-snow.jpg',
    imageAlt: 'Kot stojący na śniegu i obserwujący otoczenie',
    sourceLabel: 'Start: konflikt w domu',
    problem: 'Napięcie między zwierzętami, konflikt albo rozjazd relacji w domu.',
    summary: 'Oddzielamy sygnały ostrzegawcze od codziennych napięć i ustalamy, co zabezpieczyć najpierw.',
    effect: 'Opiekun wychodzi z konkretem: co uspokoić dziś, jak zarządzić przestrzenią i co dalej.',
  },
]

export type MediaMention = {
  id: string
  label: string
  title: string
  summary: string
  href: string
  cta: string
}

export const MEDIA_MENTIONS: MediaMention[] = [
  {
    id: 'magwet-litter-box',
    label: 'Publikacja · Magazyn Weterynaryjny',
    title: 'Terapia farmakologiczna i behawioralna przy oddawaniu moczu poza kuwetą u kota. Przypadek kliniczny',
    summary: 'Współautorski artykuł o łączeniu pracy behawioralnej z tłem medycznym u kota.',
    href: 'https://magwet.pl/31443,terapia-farmakologiczna-i-behawioralna-przy-oddawaniu-moczu-poza-kuweta-u-kota-przypadek-kliniczny',
    cta: 'Otwórz artykuł',
  },
  {
    id: 'magwet-fear',
    label: 'Publikacja · Magazyn Weterynaryjny',
    title: 'Strach, lęk i fobia u psów i kotów - różnicowanie i leczenie farmakologiczne',
    summary: 'Współautorski artykuł o różnicowaniu strachu, lęku i fobii u psów i kotów.',
    href: 'https://magwet.pl/31564%2Cstrach-lek-i-fobia-u-psow-i-kotow-roznicowanie-i-leczenie-farmakologiczne',
    cta: 'Otwórz artykuł',
  },
]

function isValidPublicEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function extractConfiguredEmail(value: string | null): string | null {
  if (!value) {
    return null
  }

  const match = value.match(/<([^>]+)>/)
  const candidate = (match?.[1] ?? value).trim()

  return isValidPublicEmail(candidate) ? candidate : null
}

export function getContactDetails() {
  const emailCandidate = extractConfiguredEmail(process.env.REGULSKI_CONTACT_EMAIL?.trim() || null) ?? PUBLIC_CONTACT_EMAIL_FALLBACK

  return {
    email: emailCandidate,
    phoneDisplay: null,
    phoneHref: null,
  }
}

export function getPublicContactDetails() {
  const contact = getContactDetails()

  return {
    email: contact.email,
    phoneDisplay: null,
    phoneHref: null,
  }
}

export function getPublicContactEmailNote() {
  return 'Kontakt prowadzę przez formularz i e-mail.'
}

export function buildMailtoHref(email: string, subject: string, body?: string) {
  const params = new URLSearchParams({
    subject,
  })

  if (body) {
    params.set('body', body)
  }

  return `mailto:${email}?${params.toString()}`
}
