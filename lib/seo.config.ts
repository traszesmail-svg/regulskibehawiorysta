// handoff-6/lib/seo.config.ts
// Centralna konfiguracja SEO â€” edytuj wszystko tutaj
// Pojedyncze ĹşrĂłdĹ‚o prawdy dla meta, OG, structured data

export const SITE = {
  name: 'Regulski Behawiorysta',
  fullName: 'Krzysztof Regulski â€” Behawiorysta zwierzÄ™cy',
  url: 'https://regulskibehawiorysta.pl',
  locale: 'pl_PL',
  language: 'pl',
  defaultOgImage: '/og-default.png',
  twitterHandle: '', // opcjonalnie
  email: 'kontakt@regulskibehawiorysta.pl',
  author: {
    name: 'Krzysztof Regulski',
    role: 'Behawiorysta COAPE / CAPBT, technik weterynarii',
    bio: 'Behawiorysta zwierzÄ™cy z certyfikatem COAPE/CAPBT. Pomagam opiekunom psĂłw i kotĂłw rozwiÄ…zaÄ‡ problemy bez kar i przymusu.',
  },
  business: {
    type: 'Person',
    priceRange: '69â€“470 PLN',
    services: ['Konsultacje behawioralne', 'Konsultacje online', 'Praca z reaktywnoĹ›ciÄ…', 'LÄ™k separacyjny', 'Behawiorystyka kotĂłw'],
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
    title: 'Behawiorysta psĂłw i kotĂłw online â€” konsultacje od 69 zĹ‚',
    description: 'Krzysztof Regulski â€” behawiorysta COAPE/CAPBT. Pomagam opiekunom rozwiÄ…zaÄ‡ problemy z zachowaniem psĂłw i kotĂłw. Bez kar, bez przymusu. Konsultacje online od 15 minut.',
    keywords: ['behawiorysta online', 'behawiorysta psĂłw', 'behawiorysta kotĂłw', 'konsultacja behawioralna', 'COAPE'],
    priority: 1.0,
    changefreq: 'weekly',
  },
  '/psy': {
    title: 'Behawiorysta psĂłw â€” pomoc online | Regulski',
    description: 'ReaktywnoĹ›Ä‡, lÄ™k separacyjny, agresja, szczeniak â€” pomoc behawiorystyczna online. Bez kar i przymusu. Pierwszy konkretny krok od 69 zĹ‚.',
    keywords: ['behawiorysta psĂłw', 'pies reaktywny', 'lÄ™k separacyjny pies', 'agresja u psa', 'szczeniak'],
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/blog/reaktywnosc-na-smyczy-cwiczenie-luznej-smyczy': {
    title: 'Pies reaktywny na smyczy â€” co robiÄ‡? | Regulski',
    description: 'Pies ciÄ…gnie, szczeka i rzuca siÄ™ na inne psy lub ludzi? WytĹ‚umaczÄ™ mechanizm i pokaĹĽÄ™ krok po kroku jak wprowadziÄ‡ spokĂłj. Konsultacja online.',
    keywords: ['pies reaktywny', 'pies ciÄ…gnie smycz', 'agresja na inne psy', 'jak nauczyÄ‡ psa spokoju'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/blog/pies-wyje-kiedy-zostaje-sam': {
    title: 'LÄ™k separacyjny u psa â€” pomoc behawiorystyczna | Regulski',
    description: 'Pies wyje, szczeka, niszczy rzeczy gdy zostaje sam? Plan poprawy krok po kroku. Konsultacja online z behawiorystÄ… COAPE.',
    keywords: ['lÄ™k separacyjny pies', 'pies sam w domu', 'pies wyje', 'jak nauczyÄ‡ psa zostawania samemu'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/koty': {
    title: 'Behawiorysta kotĂłw online â€” konsultacje | Regulski',
    description: 'Kot sika poza kuwetÄ…, drapie meble, walczy z drugim kotem? Behawiorysta z certyfikatem COAPE pomoĹĽe ustaliÄ‡ przyczynÄ™ i plan dziaĹ‚ania.',
    keywords: ['behawiorysta kotĂłw', 'kot poza kuwetÄ…', 'konflikt miÄ™dzy kotami', 'stres u kota'],
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/blog/kot-zalatwia-sie-poza-kuweta': {
    title: 'Kot sika poza kuwetÄ… â€” pomoc behawiorysty | Regulski',
    description: 'Kot zaĹ‚atwia siÄ™ poza kuwetÄ…? SprawdĹşimy ustawienie kuwety, Ĺ›rodowisko, stres i zdrowie. Konkretny plan poprawy w 1 konsultacji.',
    keywords: ['kot sika poza kuwetÄ…', 'kot kuweta problem', 'kot zaĹ‚atwia siÄ™ w domu'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/blog/jak-zapoznac-dwa-koty': {
    title: 'Konflikt miÄ™dzy kotami â€” co robiÄ‡? | Regulski',
    description: 'Dwa koty walczÄ…, syczÄ…, blokujÄ… siÄ™ przy zasobach? Plan resocjalizacji i wprowadzenia spokoju w domu z wieloma kotami.',
    keywords: ['konflikt kotĂłw', 'koty walczÄ…', 'dwa koty w domu', 'jak pogodziÄ‡ koty'],
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/o-mnie': {
    title: 'O mnie â€” Krzysztof Regulski, behawiorysta COAPE',
    description: 'Behawiorysta z certyfikatem COAPE/CAPBT, technik weterynarii. PracujÄ™ bez kar i przymusu â€” w oparciu o naukÄ™ i dobrostan zwierzÄ™cia.',
    keywords: ['krzysztof regulski', 'behawiorysta COAPE', 'CAPBT polska', 'technik weterynarii behawiorysta'],
    priority: 0.7,
    changefreq: 'yearly',
  },
  '/cennik': {
    title: 'Cennik konsultacji behawioralnych | Regulski',
    description: 'Kwadrans 69 zĹ‚, Dwa kwadranse 169 zĹ‚, PeĹ‚na konsultacja 470 zĹ‚. PomĂłĹĽ mi dobraÄ‡ rozmowÄ™ dopasowanÄ… do sytuacji. PĹ‚atnoĹ›Ä‡ po potwierdzeniu terminu.',
    keywords: ['cennik behawiorysta', 'cena konsultacji behawioralnej', 'konsultacja online cena'],
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/cennik/pelny': {
    title: 'PeĹ‚ny cennik konsultacji behawioralnych | Regulski',
    description: 'PeĹ‚na tabela rozmĂłw: Kwadrans 69 zĹ‚, Kwadrans na juĹĽ 99 zĹ‚, Dwa kwadranse 169 zĹ‚ i PeĹ‚na konsultacja 470 zĹ‚.',
    keywords: ['peĹ‚ny cennik behawiorysta', 'cena konsultacji behawioralnej', 'kwadrans behawiorysta cena'],
    priority: 0.8,
    changefreq: 'monthly',
  },
  '/book': {
    title: 'UmĂłw spokojny pierwszy krok | Regulski',
    description: 'Wybierz termin konsultacji online z behawiorystÄ…. Kwadrans, Dwa kwadranse lub PeĹ‚na konsultacja. PĹ‚atnoĹ›Ä‡ po potwierdzeniu.',
    keywords: ['rezerwacja behawiorysta', 'zapisaÄ‡ siÄ™ behawiorysta', 'umĂłwiÄ‡ konsultacjÄ™'],
    priority: 0.8,
    changefreq: 'weekly',
  },
  '/faq': {
    title: 'NajczÄ™stsze pytania â€” konsultacje behawioralne | Regulski',
    description: 'Jak wyglÄ…da konsultacja online? Czy z kamerÄ…? Jak dĹ‚ugo trwa? Odpowiedzi na pytania, ktĂłre najczÄ™Ĺ›ciej zadajÄ… opiekunowie przed pierwszÄ… rozmowÄ….',
    keywords: ['FAQ behawiorysta', 'jak wyglÄ…da konsultacja behawioralna', 'pytania behawiorysta'],
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/blog': {
    title: 'Blog â€” wiedza behawioralna o psach i kotach | Regulski',
    description: 'ArtykuĹ‚y, poradniki i wskazĂłwki z behawiorystyki. Zachowanie psĂłw, koty, szczeniaki, problemy w domu â€” praktycznie i bez przymusu.',
    keywords: ['blog behawiorysta', 'wiedza o psach', 'wiedza o kotach', 'poradniki behawioralne'],
    priority: 0.6,
    changefreq: 'weekly',
  },
  '/kontakt': {
    title: 'Kontakt â€” Regulski Behawiorysta',
    description: 'E-mail i formularz kontaktowy. Odpowiadam zwykle w ciÄ…gu 24h. Kontakt mailowy lub przez rezerwacjÄ™.',
    keywords: ['kontakt behawiorysta', 'email behawiorysta', 'formularz kontaktowy behawiorysta'],
    priority: 0.5,
    changefreq: 'yearly',
  },
  '/behawiorysta-online-polska': {
    title: 'Behawiorysta online â€” caĹ‚a Polska | Regulski',
    description: 'Konsultacje behawioralne online dla caĹ‚ej Polski. Audio, bez koniecznoĹ›ci wychodzenia z domu. Behawiorysta COAPE/CAPBT.',
    keywords: ['behawiorysta online polska', 'behawiorysta zdalnie', 'konsultacja online caĹ‚a polska'],
    priority: 0.8,
    changefreq: 'monthly',
  },
};

