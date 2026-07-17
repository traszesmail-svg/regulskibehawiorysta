import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  appendSearchParams,
  buildBookHref,
  buildSlotHref,
  readBookingServiceSearchParam,
  readProblemTypeSearchParam,
  readQaBookingSearchParam,
} from '@/lib/booking-routing'
import { buildTechnicalMetadata } from '@/lib/seo'

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Wybór tematu konsultacji',
  path: '/problem',
  description: 'Wybierz temat 15-minutowej konsultacji behawioralnej z Krzysztofem Regulskim.',
  noIndex: true,
  follow: false,
})

export default async function LegacyProblemPage(
  props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const problem = readProblemTypeSearchParam(searchParams?.problem)
  const serviceType = readBookingServiceSearchParam(searchParams?.service)
  const qaBooking = readQaBookingSearchParam(searchParams?.qa)

  if (problem) {
    const slotHref = appendSearchParams(buildSlotHref(problem, null, qaBooking), searchParams, ['problem', 'qa', 'service'])
    redirect(serviceType ? appendSearchParams(slotHref, { service: serviceType }, []) : slotHref)
  }

  const bookHref = appendSearchParams(buildBookHref(null, null, qaBooking), searchParams, ['qa', 'service'])
  redirect(serviceType ? appendSearchParams(bookHref, { service: serviceType }, []) : bookHref)
}
