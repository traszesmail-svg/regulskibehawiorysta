import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BookingSlotCalendar } from '@/components/BookingSlotCalendar'
import { normalizeBookingServiceType } from '@/lib/booking-services'
import { readBookingServiceSearchParam, readClinicFlowSearchParam, readQaBookingSearchParam } from '@/lib/booking-routing'
import { buildBookMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const serviceType = normalizeBookingServiceType(readBookingServiceSearchParam(searchParams?.service))
  const metadata = await buildBookMetadata(serviceType)
  const hasQueryState = Boolean(searchParams && Object.keys(searchParams).length > 0)

  if (!hasQueryState) {
    return metadata
  }

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical: '/book',
    },
    robots: {
      index: false,
      follow: true,
    },
  }
}

export default async function BookPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const clinicFlow = readClinicFlowSearchParam(searchParams?.clinic)
  const qaBooking = readQaBookingSearchParam(searchParams?.qa)

  if (!clinicFlow && !qaBooking) {
    redirect('/zapytaj')
  }

  return <BookingSlotCalendar searchParams={searchParams} />
}
