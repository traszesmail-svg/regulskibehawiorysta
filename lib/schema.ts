import {
  CAPBT_PROFILE_URL,
  INSTAGRAM_PROFILE_URL,
  ORGANIZATION_PUBLIC_PROFILE_URLS,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_PRODUCTION_URL,
  SITE_SHORT_NAME,
  SITE_TAGLINE,
  SPECIALIST_LOCATION,
  SPECIALIST_NAME,
  SPECIALIST_PHOTO,
  SPECIALIST_PUBLIC_PROFILE_URLS,
  SPECIALIST_PUBLIC_PROOF_SUMMARY,
  SPECIALIST_PUBLIC_STATUS,
  getPublicContactDetails,
} from '@/lib/site'
import { PUBLIC_ZAPYTAJ_OFFER, PUBLIC_FULL_CONSULTATION_OFFER } from '@/lib/public-offer'

type BreadcrumbInput = {
  name: string
  path: string
}

type ServiceSchemaInput = {
  name: string
  description: string
  serviceUrl: string
  serviceType?: string
  offerPrice?: number | null
  offerPriceCurrency?: string
  areaServed?: string
  offerCatalog?: Array<{
    name: string
    description: string
    url: string
    price?: number | null
  }>
}

type FaqSchemaItem = {
  question: string
  answer: string
}

const ORGANIZATION_ID = `${SITE_PRODUCTION_URL}/#organization`
const WEBSITE_ID = `${SITE_PRODUCTION_URL}/#website`
const PERSON_ID = `${SITE_PRODUCTION_URL}/#krzysztof`
const SERVICE_ID = `${SITE_PRODUCTION_URL}/#consultation-service`

function withoutContext<T extends Record<string, unknown>>(data: T) {
  const { ['@context']: _context, ...rest } = data
  return rest
}

function toAbsoluteUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://') ? url : new URL(url, SITE_PRODUCTION_URL).toString()
}

export function getOrganizationJsonLd() {
  const publicContact = getPublicContactDetails()

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    url: SITE_PRODUCTION_URL,
    description: SITE_TAGLINE,
    email: publicContact.email,
    sameAs: ORGANIZATION_PUBLIC_PROFILE_URLS,
    logo: {
      '@type': 'ImageObject',
      url: new URL(SITE_OG_IMAGE.url, SITE_PRODUCTION_URL).toString(),
      width: SITE_OG_IMAGE.width,
      height: SITE_OG_IMAGE.height,
    },
  }
}

export function getWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_PRODUCTION_URL,
    name: SITE_NAME,
    alternateName: SITE_SHORT_NAME,
    description: SITE_TAGLINE,
    publisher: {
      '@id': ORGANIZATION_ID,
    },
    inLanguage: 'pl-PL',
  }
}

export function getPersonJsonLd() {
  const publicContact = getPublicContactDetails()

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SPECIALIST_NAME,
    jobTitle: `${SPECIALIST_PUBLIC_STATUS}, technik weterynarii, dogoterapeuta, dietetyk`,
    description: SPECIALIST_PUBLIC_PROOF_SUMMARY,
    email: publicContact.email,
    url: `${SITE_PRODUCTION_URL}/o-mnie`,
    image: new URL(SPECIALIST_PHOTO.src, SITE_PRODUCTION_URL).toString(),
    sameAs: [...SPECIALIST_PUBLIC_PROFILE_URLS],
    areaServed: {
      '@type': 'Country',
      name: SPECIALIST_LOCATION,
    },
  }
}

export function getConsultationServiceJsonLd() {
  const sameAs = [
    CAPBT_PROFILE_URL,
    INSTAGRAM_PROFILE_URL,
    ...ORGANIZATION_PUBLIC_PROFILE_URLS.filter((url) => url !== CAPBT_PROFILE_URL && url !== INSTAGRAM_PROFILE_URL),
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': SERVICE_ID,
    name: 'Regulski - Behawiorysta psów i kotów online',
    url: SITE_PRODUCTION_URL,
    serviceType: 'Konsultacja behawioralna online',
    provider: {
      '@id': PERSON_ID,
    },
    areaServed: {
      '@type': 'Country',
      name: 'Polska',
    },
    availableLanguage: ['pl-PL'],
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: String(PUBLIC_ZAPYTAJ_OFFER.pricePln),
      highPrice: String(PUBLIC_FULL_CONSULTATION_OFFER.pricePln),
      priceCurrency: 'PLN',
    },
    sameAs,
  }
}

export function getRootSchemaGraphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      withoutContext(getOrganizationJsonLd()),
      withoutContext(getWebsiteJsonLd()),
      withoutContext(getPersonJsonLd()),
      withoutContext(getConsultationServiceJsonLd()),
    ],
  }
}

export function getBreadcrumbJsonLd(items: BreadcrumbInput[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path === '/' ? SITE_PRODUCTION_URL : `${SITE_PRODUCTION_URL}${item.path}`,
    })),
  }
}

export function getServiceJsonLd({
  name,
  description,
  serviceUrl,
  serviceType = 'Konsultacja behawioralna online',
  offerPrice = null,
  offerPriceCurrency = 'PLN',
  areaServed = 'Polska',
  offerCatalog = [],
}: ServiceSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    url: toAbsoluteUrl(serviceUrl),
    provider: {
      '@id': PERSON_ID,
    },
    areaServed: {
      '@type': 'Country',
      name: areaServed,
    },
    availableLanguage: 'pl-PL',
    ...(offerCatalog.length > 0
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: `${name} - dostępne formaty`,
            itemListElement: offerCatalog.map((item) => ({
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: item.name,
                description: item.description,
                url: toAbsoluteUrl(item.url),
                provider: {
                  '@id': PERSON_ID,
                },
              },
              ...(typeof item.price === 'number'
                ? {
                    price: item.price,
                    priceCurrency: offerPriceCurrency,
                  }
                : {}),
              url: toAbsoluteUrl(item.url),
              availability: 'https://schema.org/InStock',
            })),
          },
        }
      : {}),
    ...(typeof offerPrice === 'number'
      ? {
          offers: {
            '@type': 'Offer',
            price: offerPrice,
            priceCurrency: offerPriceCurrency,
            url: toAbsoluteUrl(serviceUrl),
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }
}

export function getFaqPageJsonLd(items: FaqSchemaItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function getItemListJsonLd(
  items: Array<{
    name: string
    url: string
  }>,
  itemListOrder = 'https://schema.org/ItemListOrderAscending',
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListOrder,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  }
}

export function getProductJsonLd({
  name,
  description,
  url,
  price,
  image,
  category = 'Poradnik PDF',
}: {
  name: string
  description: string
  url: string
  price: string | number
  image?: string | null
  category?: string
}) {
  const priceValue =
    typeof price === 'number'
      ? price
      : Number(String(price).replace(',', '.').match(/\d+(?:\.\d{1,2})?/)?.[0] ?? NaN)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    category,
    url: toAbsoluteUrl(url),
    ...(image ? { image: toAbsoluteUrl(image) } : {}),
    brand: {
      '@id': ORGANIZATION_ID,
    },
    offers: {
      '@type': 'Offer',
      url: toAbsoluteUrl(url),
      priceCurrency: 'PLN',
      ...(Number.isFinite(priceValue) ? { price: priceValue } : {}),
      availability: 'https://schema.org/InStock',
    },
  }
}
