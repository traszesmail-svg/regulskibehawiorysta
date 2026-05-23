import type { Metadata } from 'next'
import { DEFAULT_BOOKING_SERVICE, getBookingServiceRoomSummary, getBookingServiceTitle, type BookingServiceType } from '@/lib/booking-services'
import { SITE_NAME, SITE_OG_IMAGE, SITE_SHORT_NAME, SPECIALIST_NAME } from '@/lib/site'

const DEFAULT_OG_IMAGE = SITE_OG_IMAGE

type MarketingMetadataInput = {
  title: string
  path: string
  description: string
  appendLocalContext?: boolean
}

type TechnicalMetadataInput = MarketingMetadataInput & {
  noIndex?: boolean
  follow?: boolean
}

function appendLocalSeoContext(description: string) {
  return description
}

function buildMetadataTitle(title: string) {
  return title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_SHORT_NAME}`
}

export function buildMarketingMetadata({ title, path, description, appendLocalContext = true }: MarketingMetadataInput): Metadata {
  const localizedDescription = appendLocalContext ? appendLocalSeoContext(description) : description
  const fullTitle = buildMetadataTitle(title)

  return {
    title,
    description: localizedDescription,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: fullTitle,
      description: localizedDescription,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'pl_PL',
      url: path,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: localizedDescription,
      images: [DEFAULT_OG_IMAGE.url],
    },
  }
}

export function buildTechnicalMetadata({ title, path, description, noIndex = true, follow = false }: TechnicalMetadataInput): Metadata {
  const localizedDescription = appendLocalSeoContext(description)
  const fullTitle = buildMetadataTitle(title)

  return {
    title: {
      absolute: title,
    },
    description: localizedDescription,
    alternates: {
      canonical: path,
    },
    robots: noIndex ? { index: false, follow } : undefined,
    openGraph: {
      title: fullTitle,
      description: localizedDescription,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'pl_PL',
      url: path,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: localizedDescription,
      images: [DEFAULT_OG_IMAGE.url],
    },
  }
}

export async function buildHomeMetadata(): Promise<Metadata> {
  const description = appendLocalSeoContext(
    'Krótkie konsultacje behawioralne dla opiekunów psów i kotów. Rozmowa z Krzysztofem Regulskim, behawiorystą zwierzęcym i trenerem COAPE.',
  )
  const title = 'Regulski Behawiorysta | Konsultacje behawioralne psów i kotów'

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'pl_PL',
      url: '/',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  }
}

export async function buildBookMetadata(serviceType: BookingServiceType = DEFAULT_BOOKING_SERVICE): Promise<Metadata> {
  const serviceTitle = getBookingServiceTitle(serviceType)
  const serviceSummary = getBookingServiceRoomSummary(serviceType)
  const isQuick = serviceType === 'szybka-konsultacja-15-min'

  return buildMarketingMetadata({
    title: isQuick ? 'Rezerwacja 15-minutowej konsultacji behawioralnej' : `Rezerwacja konsultacji: ${serviceTitle}`,
    path: '/book',
    description: isQuick
      ? 'Umów spokojny pierwszy krok: 15 minut rozmowy audio bez kamery, analiza zachowania na podstawie informacji i spokojne uporządkowanie tematu.'
      : `${serviceSummary} Wybierz gatunek i temat konsultacji, a potem przejdź do terminów i kolejnego kroku rezerwacji że specjalistą ${SPECIALIST_NAME}.`,
  })
}

export function buildLegalMetadata(title: string, path: string, description: string): Metadata {
  return buildMarketingMetadata({
    title,
    path,
    description,
    appendLocalContext: false,
  })
}
