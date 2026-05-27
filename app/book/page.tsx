import type { Metadata } from 'next'
import { BookingSlotCalendar } from '@/app/termin/page'
import { normalizeBookingServiceType } from '@/lib/booking-services'
import { readBookingServiceSearchParam } from '@/lib/booking-routing'
import { buildBookMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}): Promise<Metadata> {
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

export default function BookPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  return <BookingSlotCalendar searchParams={searchParams} />
}
