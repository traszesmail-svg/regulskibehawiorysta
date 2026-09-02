import { isBookingServiceType, type BookingServiceType } from '@/lib/booking-services'
import { isProblemType } from '@/lib/data'
import type { ProblemType } from '@/lib/types'

type SearchParamValue = string | string[] | undefined
type SearchParamsInput = Record<string, SearchParamValue> | undefined
export type BookingSpecies = 'pies' | 'kot'

export function readSearchParam(value: SearchParamValue): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export function readProblemTypeSearchParam(value: SearchParamValue): ProblemType | null {
  const problem = readSearchParam(value)
  return isProblemType(problem) ? (problem as ProblemType) : null
}

export function readBookingServiceSearchParam(value: SearchParamValue): BookingServiceType | null {
  const service = readSearchParam(value)
  return isBookingServiceType(service) ? (service as BookingServiceType) : null
}

export function readQaBookingSearchParam(value: SearchParamValue): boolean {
  const qa = readSearchParam(value)

  if (!qa) {
    return false
  }

  return ['1', 'true', 'qa', 'yes'].includes(qa.trim().toLowerCase())
}

export function readClinicFlowSearchParam(value: SearchParamValue): boolean {
  const clinic = readSearchParam(value)

  if (!clinic) {
    return false
  }

  return ['1', 'true', 'yes'].includes(clinic.trim().toLowerCase())
}

export function isBookingSpecies(value: string | null | undefined): value is BookingSpecies {
  return value === 'pies' || value === 'kot'
}

export function readBookingSpeciesSearchParam(value: SearchParamValue): BookingSpecies | null {
  const species = readSearchParam(value)
  return isBookingSpecies(species) ? species : null
}

function buildQueryHref(pathname: string, params: Record<string, string | null | undefined>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.length > 0) {
      searchParams.set(key, value)
    }
  }

  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildBookHref(
  problem?: ProblemType | null,
  serviceType?: BookingServiceType | null,
  qaBooking?: boolean,
  species?: BookingSpecies | null,
  clinicFlow?: boolean,
): string {
  // Public booking now starts with "Zapytaj behawiorystę". Keep the old
  // /book route only for QA and clinic-specific legacy flows that still need
  // their own query contract.
  if (!qaBooking && !clinicFlow && serviceType === 'konsultacja-behawioralna-online') {
    return '/konsultacja'
  }

  if (!qaBooking && !clinicFlow) {
    return buildQueryHref('/zapytaj', {
      problem: problem ?? null,
      species: species ?? null,
    })
  }

  return buildQueryHref('/book', {
    problem: problem ?? null,
    service: serviceType ?? null,
    qa: qaBooking ? '1' : null,
    species: species ?? null,
    clinic: clinicFlow ? '1' : null,
  })
}

export function buildSlotHref(
  problem: ProblemType,
  serviceType?: BookingServiceType | null,
  qaBooking?: boolean,
  species?: BookingSpecies | null,
  clinicFlow?: boolean,
): string {
  if (!qaBooking && !clinicFlow) {
    return buildQueryHref('/zapytaj', {
      problem,
      species: species ?? null,
    })
  }

  return buildQueryHref('/book', {
    problem,
    service: serviceType ?? null,
    qa: qaBooking ? '1' : null,
    species: species ?? null,
    clinic: clinicFlow ? '1' : null,
  })
}

export function buildFormHref(
  problem: ProblemType,
  slotId: string,
  serviceType?: BookingServiceType | null,
  qaBooking?: boolean,
  species?: BookingSpecies | null,
  clinicFlow?: boolean,
): string {
  if (!qaBooking && !clinicFlow) {
    return buildQueryHref('/zapytaj', {
      problem,
      species: species ?? null,
    })
  }

  return buildQueryHref('/form', {
    problem,
    slotId,
    service: serviceType ?? null,
    qa: qaBooking ? '1' : null,
    species: species ?? null,
    clinic: clinicFlow ? '1' : null,
  })
}

export function buildPaymentHref(
  bookingId: string,
  accessToken?: string | null,
  serviceType?: BookingServiceType | null,
  qaBooking?: boolean,
  clinicFlow?: boolean,
): string {
  return buildQueryHref('/payment', {
    bookingId,
    access: accessToken ?? null,
    service: serviceType ?? null,
    qa: qaBooking ? '1' : null,
    clinic: clinicFlow ? '1' : null,
  })
}

export function buildZapytajPaymentHref(bookingId: string, accessToken?: string | null): string {
  return buildQueryHref('/payment', {
    bookingId,
    access: accessToken ?? null,
    flow: 'zapytaj',
  })
}

export function appendSearchParams(
  href: string,
  searchParams?: SearchParamsInput,
  excludedKeys: string[] = [],
): string {
  if (!searchParams) {
    return href
  }

  const [pathname, existingQuery = ''] = href.split('?')
  const params = new URLSearchParams(existingQuery)
  const excluded = new Set(excludedKeys)

  for (const [key, value] of Object.entries(searchParams)) {
    if (excluded.has(key)) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          params.append(key, item)
        }
      }
      continue
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
