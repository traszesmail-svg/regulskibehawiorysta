import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { appendSearchParams } from '@/lib/booking-routing'
import { buildMarketingMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Kwadrans na już',
  path: '/kwadrans-na-juz',
  description: 'Pilny Kwadrans: wybierz najbliższy dostępny termin i przejdź do rezerwacji online.',
})

export default function KwadransNaJuzPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  redirect(appendSearchParams('/book?service=kwadrans-na-juz', searchParams, ['service']))
}
