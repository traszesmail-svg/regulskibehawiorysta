// handoff-6/lib/structured-data.ts
// Generatory JSON-LD dla różnych typów stron
// Wstaw przez <Script type="application/ld+json"> w odpowiednich page.tsx

import { SITE } from './seo.config';

// ============ LOCAL BUSINESS (globalnie w layout) ============
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': SITE.url,
    name: SITE.fullName,
    description: SITE.author.bio,
    url: SITE.url,
    image: `${SITE.url}${SITE.defaultOgImage}`,
    priceRange: SITE.business.priceRange,
    address: {
      '@type': 'PostalAddress',
      addressCountry: SITE.business.address.addressCountry,
      addressLocality: SITE.business.address.addressLocality,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Polska',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Konsultacje behawioralne',
      itemListElement: [
        { '@type': 'Offer', name: 'Kwadrans', price: '69', priceCurrency: 'PLN' },
        { '@type': 'Offer', name: 'Dwa kwadranse', price: '169', priceCurrency: 'PLN' },
        { '@type': 'Offer', name: 'Pełna konsultacja', price: '470', priceCurrency: 'PLN' },
      ],
    },
    sameAs: [
      // dodaj jeśli ma:
      // 'https://www.facebook.com/...',
      // 'https://www.instagram.com/...',
      // 'https://www.linkedin.com/in/...',
    ],
  };
}

// ============ SERVICE (strona oferty/cennika) ============
export function serviceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Konsultacja behawioralna',
    provider: { '@id': SITE.url },
    areaServed: { '@type': 'Country', name: 'Polska' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Formaty konsultacji',
      itemListElement: [
        {
          '@type': 'Offer',
          name: 'Kwadrans',
          description: '15 min audio bez kamery na jedno główne pytanie',
          price: '69',
          priceCurrency: 'PLN',
        },
        {
          '@type': 'Offer',
          name: 'Kwadrans na już',
          description: 'Ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem',
          price: '99',
          priceCurrency: 'PLN',
        },
        {
          '@type': 'Offer',
          name: 'Dwa kwadranse',
          description: '30 min online, gdy temat ma kilka wątków',
          price: '169',
          priceCurrency: 'PLN',
        },
        {
          '@type': 'Offer',
          name: 'Pełna konsultacja',
          description: 'Około 2h online, analiza zachowania, plan działania i 7 dni wsparcia przez WhatsApp',
          price: '470',
          priceCurrency: 'PLN',
        },
      ],
    },
  };
}

// ============ FAQ PAGE ============
interface FAQItem {
  question: string;
  answer: string;
}

export function faqPageSchema(items: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ============ BREADCRUMB LIST ============
interface Breadcrumb {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: Breadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE.url}${item.url}`,
    })),
  };
}

// ============ ARTICLE (wpisy bloga) ============
interface ArticleData {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
}

export function articleSchema(data: ArticleData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    image: data.image ?? `${SITE.url}${SITE.defaultOgImage}`,
    datePublished: data.datePublished,
    dateModified: data.dateModified ?? data.datePublished,
    author: {
      '@type': 'Person',
      name: SITE.author.name,
      url: `${SITE.url}/o-mnie`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url,
    },
  };
}

// ============ PERSON (strona /o-mnie) ============
export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.author.name,
    jobTitle: SITE.author.role,
    description: SITE.author.bio,
    url: `${SITE.url}/o-mnie`,
    image: `${SITE.url}/about-photo.jpg`,
    worksFor: {
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
    },
    knowsAbout: [
      'Behawiorystyka zwierząt',
      'Psy',
      'Koty',
      'Lęk separacyjny',
      'Reaktywność',
      'Konflikt między kotami',
    ],
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', name: 'Certyfikat COAPE' },
      { '@type': 'EducationalOccupationalCredential', name: 'Certyfikat CAPBT' },
      { '@type': 'EducationalOccupationalCredential', name: 'Technik weterynarii' },
    ],
  };
}

// ============ HELPER: render JSON-LD jako Script tag ============
export function jsonLdScript(data: object) {
  return JSON.stringify(data, null, 0);
}
