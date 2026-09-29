// handoff-7/lib/lead-magnet.config.ts
// Konfiguracja lead magnetów — jeden plik prawdy

export interface LeadMagnet {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  pdfPath: string;        // ścieżka do pliku PDF w /public lub URL
  coverImage: string;     // miniaturka okładki PDF
  pages: number;
  audience: 'dog' | 'cat' | 'both';
}

export const LEAD_MAGNETS: LeadMagnet[] = [
  {
    id: 'pies-sam-w-domu',
    title: 'Pies sam w domu: co sprawdzić, zanim zaczniesz trening zostawania',
    subtitle: 'Wprowadzenie do pracy z lękiem separacyjnym',
    description: 'Praktyczny przewodnik: jak rozpoznać lęk, jak nie pogłębiać problemu, jak rozpocząć stopniowe przyzwyczajanie psa do bycia samym.',
    bullets: [
      'Rozpoznawanie objawów (różnica: nuda vs. lęk)',
      '7 kroków stopniowego przyzwyczajania',
      'Czego NIE robić — najczęstsze błędy',
      'Przykładowy plan na pierwsze 14 dni',
    ],
    pdfPath: '/poradniki/pies-sam-w-domu.pdf',
    coverImage: '/branding/pdf-covers/pies-sam-w-domu.png',
    pages: 14,
    audience: 'dog',
  },
  {
    id: 'pierwszy-tydzien-z-kotem',
    title: 'Pierwszy tydzień z kotem: spokojny start bez przyspieszania kontaktu',
    subtitle: 'Checklist + plan na pierwsze 7 dni',
    description: 'Co przygotować zanim kot przekroczy próg domu, jak zaaranżować pokój bezpieczny, jak wprowadzić kota stopniowo do reszty mieszkania.',
    bullets: [
      'Lista zakupów (15 pozycji)',
      'Pokój bezpieczny — jak zorganizować',
      'Wprowadzenie do mieszkania krok po kroku',
      'Dodatkowo: drukowalna checklist',
    ],
    pdfPath: '/poradniki/pierwszy-tydzien-z-kotem.pdf',
    coverImage: '/branding/pdf-covers/pierwszy-tydzien-z-kotem.png',
    pages: 8,
    audience: 'cat',
  },
  {
    id: 'lista-30-zachowan',
    title: '30 sygnałów, które warto zauważyć, zanim problem urośnie',
    subtitle: 'Sygnały u psa i kota — co znaczą',
    description: 'Lista najczęstszych zachowań psów i kotów wraz z interpretacją: co zwierzę komunikuje, kiedy reagować, kiedy obserwować dalej.',
    bullets: [
      '15 sygnałów u psa + co znaczą',
      '15 sygnałów u kota + co znaczą',
      'Kiedy zachowanie wymaga konsultacji',
      'Słownik mowy ciała',
    ],
    pdfPath: '/poradniki/30-zachowan.pdf',
    coverImage: '/branding/pdf-covers/30-zachowan.png',
    pages: 6,
    audience: 'both',
  },
];

export const DEFAULT_LEAD_MAGNET = LEAD_MAGNETS[2]; // "30 zachowań" — najszerszy

// Jak wybrać magnet do pokazania na danej stronie
export function pickLeadMagnet(pathname: string): LeadMagnet {
  const currentPath = pathname.split(/[?#]/)[0] ?? pathname

  if (currentPath.startsWith('/problemy/pies-')) {
    return LEAD_MAGNETS.find(m => m.audience === 'dog') ?? DEFAULT_LEAD_MAGNET;
  }
  if (currentPath.startsWith('/problemy/kot-') || currentPath === '/problemy/konflikt-miedzy-kotami') {
    return LEAD_MAGNETS.find(m => m.audience === 'cat') ?? DEFAULT_LEAD_MAGNET;
  }
  return DEFAULT_LEAD_MAGNET;
}

// Konfiguracja zachowania popup
export const POPUP_CONFIG = {
  exitIntentEnabled: true,
  exitIntentDelayMs: 5000,        // minimum czas zanim popup może się pojawić
  timerFallbackMs: 12000,         // pokaż po 12s niezależnie od akcji
  scrollFallbackPercent: 40,      // nieużywane (zostaje dla kompatybilności)
  scrollFallbackTimeMs: 8000,     // nieużywane
  hideForDays: 7,                 // po zamknięciu nie pokazuj przez 7 dni
  hideForDaysAfterSubmit: 365,    // po zapisie nie pokazuj 1 rok
  storageKey: 'regulski-lm-dismissed',
  submittedKey: 'regulski-lm-submitted',
};

export const BANNER_CONFIG = {
  showAfterMs: 15000,             // sticky banner po 15s
  hideForDays: 7,
  storageKey: 'regulski-lm-banner-dismissed',
};
