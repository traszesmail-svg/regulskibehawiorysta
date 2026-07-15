import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { appendSearchParams } from '@/lib/booking-routing'
import { buildMarketingMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: 'Wybierz termin konsultacji',
    path: '/termin',
    description: 'Prosty widok wyboru terminu po krótkim wyborze tematu psa albo kota.',
  }),
  robots: { index: false, follow: true },
}

export default function TerminRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  redirect(appendSearchParams('/book', searchParams))
}
