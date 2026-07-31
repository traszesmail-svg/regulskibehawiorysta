import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  buildBookHref,
  buildSlotHref,
  readClinicFlowSearchParam,
  readBookingSpeciesSearchParam,
  readBookingServiceSearchParam,
  readProblemTypeSearchParam,
  readQaBookingSearchParam,
} from '@/lib/booking-routing'
import { DEFAULT_BOOKING_SERVICE, normalizeBookingServiceType } from '@/lib/booking-services'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Wybór terminu rozmowy',
  path: '/slot',
  description: 'Wybierz termin 15-minutowej konsultacji behawioralnej z Krzysztofem Regulskim.',
  noIndex: true,
  follow: false,
})

export default async function SlotPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const problem = readProblemTypeSearchParam(searchParams?.problem)
  const serviceType = normalizeBookingServiceType(readBookingServiceSearchParam(searchParams?.service))
  const serviceQuery = serviceType === DEFAULT_BOOKING_SERVICE ? null : serviceType
  const qaBooking = readQaBookingSearchParam(searchParams?.qa)
  const species = readBookingSpeciesSearchParam(searchParams?.species)
  const clinicFlow = readClinicFlowSearchParam(searchParams?.clinic)

  if (!problem) {
    redirect(buildBookHref(null, serviceQuery, qaBooking, species, clinicFlow))
  }

  redirect(buildSlotHref(problem, serviceQuery, qaBooking, species, clinicFlow))
}
