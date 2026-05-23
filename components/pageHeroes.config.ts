// handoff-2/components/pageHeroes.config.ts
// Mapa: slug strony → konfiguracja hero (ilustracja + alt)
// Edytuj tę mapę gdy dodajesz nowe strony

export interface PageHero {
  illustration: string;    // ścieżka do SVG w /public/illustrations/
  alt: string;             // alt text (PL)
  bgGradient?: string;     // opcjonalny gradient tła sekcji ilustracji
}

export const pageHeroes: Record<string, PageHero> = {
  home: {
    illustration: '/illustrations/home.svg',
    alt: 'Para z psem na spokojnym spacerze',
    bgGradient: 'from-accent-light to-emerald-50',
  },
  'psy': {
    illustration: '/illustrations/psy-main.svg',
    alt: 'Właściciel bawiący się że swoim psem',
  },
  'psy-reaktywnosc': {
    illustration: '/illustrations/psy-reaktywnosc.svg',
    alt: 'Pies na smyczy podczas spaceru',
  },
  'psy-separacja': {
    illustration: '/illustrations/psy-separacja.svg',
    alt: 'Pies czekający na powrót właściciela',
  },
  'psy-szczeniak': {
    illustration: '/illustrations/psy-szczeniak.svg',
    alt: 'Szczeniak w domu',
  },
  'koty': {
    illustration: '/illustrations/koty-main.svg',
    alt: 'Osoba głaszcząca kota',
    bgGradient: 'from-amber-50 to-orange-50',
  },
  'koty-kuweta': {
    illustration: '/illustrations/koty-kuweta.svg',
    alt: 'Kot w domu przy kuwecie',
  },
  'koty-stres': {
    illustration: '/illustrations/koty-stres.svg',
    alt: 'Kot odpoczywający w spokojnym otoczeniu',
  },
  'koty-konflikt': {
    illustration: '/illustrations/koty-konflikt.svg',
    alt: 'Dwa koty w jednym domu',
  },
  'o-mnie': {
    illustration: '/illustrations/o-mnie.svg',
    alt: 'Konsultacja online z behawiorystą',
  },
  cennik: {
    illustration: '/illustrations/cennik.svg',
    alt: 'Wybór formatu konsultacji',
  },
  book: {
    illustration: '/illustrations/book.svg',
    alt: 'Rezerwacja terminu online',
  },
  faq: {
    illustration: '/illustrations/faq.svg',
    alt: 'Najczęstsze pytania',
  },
  blog: {
    illustration: '/illustrations/blog.svg',
    alt: 'Czytanie artykułów behawioralnych',
  },
  kontakt: {
    illustration: '/illustrations/kontakt.svg',
    alt: 'Kontakt mailowy',
  },
};

export type HeroSlug = keyof typeof pageHeroes;
