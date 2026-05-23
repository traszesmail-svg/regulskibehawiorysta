// Manualna lista opinii — fallback gdy brak Google API + źródło danych dla Schema.org
// Edytuj tę listę dodając/usuwając opinie

export interface Review {
  id: string;
  author: string;
  location?: string;
  petName?: string;
  petType: 'dog' | 'cat' | 'other';
  problem: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  text: string;
  source: 'file' | 'google' | 'direct' | 'email';
  consultationType?: 'kwadrans' | 'standardowa' | 'wyjazdowa';
  highlight?: boolean;
}

export const reviews: Review[] = [
  {
    id: 'rev-001',
    author: 'Anna',
    petName: 'Borys',
    petType: 'dog',
    problem: 'reakcje na spacerze',
    rating: 5,
    date: '2026-05-12',
    text: 'Przed rozmową o Borysie mieliśmy w głowie chaos: spacer, szczekanie, emocje. Po konsultacji wiedzieliśmy, co robimy najpierw i czego na razie nie dokładać.',
    source: 'file',
    consultationType: 'kwadrans',
    highlight: true,
  },
  {
    id: 'rev-002',
    author: 'Marta',
    petName: 'Luna',
    petType: 'dog',
    problem: 'praca w domu',
    rating: 5,
    date: '2026-05-12',
    text: 'Najbardziej pomogło mi to, że nikt nie oceniał mnie ani Luny. Zamiast listy zakazów dostałam prosty plan, który dało się wdrożyć w naszym domu.',
    source: 'file',
    consultationType: 'kwadrans',
    highlight: true,
  },
  {
    id: 'rev-003',
    author: 'Kasia',
    petName: 'Mila',
    petType: 'cat',
    problem: 'kuweta i napięcie',
    rating: 5,
    date: '2026-05-12',
    text: 'Myśleliśmy, że Mila jest złośliwa. Po rozmowie zobaczyliśmy, że to raczej napięcie i środowisko. Wreszcie wiedzieliśmy, co sprawdzić po kolei.',
    source: 'file',
    consultationType: 'kwadrans',
    highlight: true,
  },
];

export const aggregateRating = {
  ratingValue: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
  reviewCount: reviews.length,
  bestRating: 5,
  worstRating: 1,
};

export const highlightedReviews = reviews.filter(r => r.highlight);
export const dogReviews = reviews.filter(r => r.petType === 'dog');
export const catReviews = reviews.filter(r => r.petType === 'cat');
export const fiveStarReviews = reviews.filter(r => r.rating === 5);
