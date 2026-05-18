import type { Metadata } from 'next'
import { BookingSlotCalendar } from '@/app/termin/page'
import { buildMarketingMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Wybierz termin konsultacji',
  path: '/book',
  description:
    'Wybierz termin 15-minutowej konsultacji behawioralnej, Dwóch kwadransów albo Pełnej konsultacji online.',
})

export default function BookPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  return <BookingSlotCalendar searchParams={searchParams} />
}
