// handoff-6/lib/seo.config.ts
// Centralna konfiguracja SEO — edytuj wszystko tutaj
// Pojedyncze źródło prawdy dla meta, OG, structured data

import { PUBLIC_OFFER_PRICE_LABELS } from './public-offer-copy'

export const SITE = {
  name: 'Regulski Behawiorysta',
  fullName: 'Krzysztof Regulski — Behawiorysta zwierzęcy',
  url: 'https://regulskibehawiorysta.pl',
  locale: 'pl_PL',
  language: 'pl',
  defaultOgImage: '/og-default.png',
  twitterHandle: '', // opcjonalnie
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
} as const;

export interface PageSeo {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  noindex?: boolean;
  priority?: number;       // sitemap priority (0.0-1.0)
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export const pageSeo: Record<string, PageSeo> = {
  '/': {
    title: `Behawiorysta psów i kotów online — konsultacje od ${PUBLIC_OFFER_PRICE_LABELS.quick}`,
    description: 'Krzysztof Regulski — behawiorysta COAPE/CAPBT. Pomagam opiekunom rozwiązać problemy z zachowaniem psów i kotów. Bez kar, bez przymusu. Konsultacje online od 15 minut.',
    keywords: ['behawiorysta online', 'behawiorysta psów', 'behawiorysta kotów', 'konsultacja behawioralna', 'COAPE'],
    priority: 1.0,
    changefreq: 'weekly',
  },
  '/psy': {
    title: 'Behawiorysta psów — pomoc online | Regulski',
    description: `Reaktywność, lęk separacyjny, agresja, szczeniak — pomoc behawiorystyczna online. Bez kar i przymusu. Pierwszy konkretny krok od ${PUBLIC_OFFER_PRICE_LABELS.quick}.`,
    keywords: ['behawiorysta psów', 'pies reaktywny', 'lęk separacyjny pies', 'agresja u psa', 'szczeniak'],
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy': {
    title: 'Pies reaktywny na smyczy — co robić? | Regulski',
    description: 'Pies ciągnie, szczeka i rzuca się na inne psy lub ludzi? Wytłumaczę mechanizm i pokażę krok po kroku jak wprowadzić spokój. Konsultacja online.',
    keywords: ['pies reaktywny', 'pies ciągnie smycz', 'agresja na inne psy', 'jak nauczyć psa spokoju'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/blog/pies-wyje-kiedy-zostaje-sam': {
    title: 'Lęk separacyjny u psa — pomoc behawiorystyczna | Regulski',
    description: 'Pies wyje, szczeka, niszczy rzeczy gdy zostaje sam? Plan poprawy krok po kroku. Konsultacja online z behawiorystą COAPE.',
    keywords: ['lęk separacyjny pies', 'pies sam w domu', 'pies wyje', 'jak nauczyć psa zostawania samemu'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/koty': {
    title: 'Behawiorysta kotów online — konsultacje | Regulski',
    description: 'Kot sika poza kuwetą, drapie meble, walczy z drugim kotem? Behawiorysta z certyfikatem COAPE pomoże ustalić przyczynę i plan działania.',
    keywords: ['behawiorysta kotów', 'kot poza kuwetą', 'konflikt między kotami', 'stres u kota'],
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/blog/kot-zalatwia-sie-poza-kuweta': {
    title: 'Kot sika poza kuwetą — pomoc behawiorysty | Regulski',
    description: 'Kot załatwia się poza kuwetą? Sprawdźimy ustawienie kuwety, środowisko, stres i zdrowie. Konkretny plan poprawy w 1 konsultacji.',
    keywords: ['kot sika poza kuwetą', 'kot kuweta problem', 'kot załatwia się w domu'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/blog/jak-zapoznac-dwa-koty': {
    title: 'Konflikt między kotami — co robić? | Regulski',
    description: 'Dwa koty walczą, syczą, blokują się przy zasobach? Plan resocjalizacji i wprowadzenia spokoju w domu z wieloma kotami.',
    keywords: ['konflikt kotów', 'koty walczą', 'dwa koty w domu', 'jak pogodzić koty'],
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/o-mnie': {
    title: 'O mnie — Krzysztof Regulski, behawiorysta COAPE',
    description: 'Behawiorysta z certyfikatem COAPE/CAPBT, technik weterynarii. Pracuję bez kar i przymusu — w oparciu o naukę i dobrostan zwierzęcia.',
    keywords: ['krzysztof regulski', 'behawiorysta COAPE', 'CAPBT polska', 'technik weterynarii behawiorysta'],
    priority: 0.7,
    changefreq: 'yearly',
  },
  '/cennik': {
    title: 'Cennik konsultacji behawioralnych | Regulski',
    description: `Kwadrans ${PUBLIC_OFFER_PRICE_LABELS.quick}, Dwa kwadranse ${PUBLIC_OFFER_PRICE_LABELS.bridge}, Pełna konsultacja ${PUBLIC_OFFER_PRICE_LABELS.premium}. Pomóż mi dobrać rozmowę dopasowaną do sytuacji. Płatność po potwierdzeniu terminu.`,
    keywords: ['cennik behawiorysta', 'cena konsultacji behawioralnej', 'konsultacja online cena'],
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/cennik/pelny': {
    title: 'Pełny cennik konsultacji behawioralnych | Regulski',
    description: `Pełna tabela rozmów: Kwadrans ${PUBLIC_OFFER_PRICE_LABELS.quick}, Kwadrans na już ${PUBLIC_OFFER_PRICE_LABELS.urgent}, Dwa kwadranse ${PUBLIC_OFFER_PRICE_LABELS.bridge} i Pełna konsultacja ${PUBLIC_OFFER_PRICE_LABELS.premium}.`,
    keywords: ['pełny cennik behawiorysta', 'cena konsultacji behawioralnej', 'kwadrans behawiorysta cena'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/book': {
    title: 'Umów spokojny pierwszy krok | Regulski',
    description: 'Wybierz termin konsultacji online z behawiorystą. Kwadrans, Dwa kwadranse lub Pełna konsultacja. Płatność po potwierdzeniu.',
    keywords: ['rezerwacja behawiorysta', 'zapisać się behawiorysta', 'umówić konsultację'],
    priority: 0.8,
    changefreq: 'weekly',
  },
  '/faq': {
    title: 'Najczęstsze pytania — konsultacje behawioralne | Regulski',
    description: 'Jak wygląda konsultacja online? Czy z kamerą? Jak długo trwa? Odpowiedzi na pytania, które najczęściej zadają opiekunowie przed pierwszą rozmową.',
    keywords: ['FAQ behawiorysta', 'jak wygląda konsultacja behawioralna', 'pytania behawiorysta'],
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/blog': {
    title: 'Blog — wiedza behawioralna o psach i kotach | Regulski',
    description: 'Artykuły, poradniki i wskazówki z behawiorystyki. Zachowanie psów, koty, szczeniaki, problemy w domu — praktycznie i bez przymusu.',
    keywords: ['blog behawiorysta', 'wiedza o psach', 'wiedza o kotach', 'poradniki behawioralne'],
    priority: 0.6,
    changefreq: 'weekly',
  },
  '/kontakt': {
    title: 'Kontakt — Regulski Behawiorysta',
    description: 'E-mail i formularz kontaktowy. Odpowiadam zwykle w ciągu 24h. Kontakt mailowy lub przez rezerwację.',
    keywords: ['kontakt behawiorysta', 'email behawiorysta', 'formularz kontaktowy behawiorysta'],
    priority: 0.5,
    changefreq: 'yearly',
  },
  '/behawiorysta-online-polska': {
    title: 'Behawiorysta online — cała Polska | Regulski',
    description: 'Konsultacje behawioralne online dla całej Polski. Audio, bez konieczności wychodzenia z domu. Behawiorysta COAPE/CAPBT.',
    keywords: ['behawiorysta online polska', 'behawiorysta zdalnie', 'konsultacja online cała polska'],
    priority: 0.8,
    changefreq: 'monthly',
  },
};

