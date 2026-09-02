import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingSlotCalendar } from '@/components/BookingSlotCalendar'
import { getConsultationAccessByCode } from '@/lib/server/db'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Terminarz pełnej konsultacji',
  path: '/konsultacja/rezerwacja',
  description: 'Ukryty terminarz pełnej konsultacji behawioralnej dostępny po indywidualnym kodzie.',
  noIndex: true,
  follow: false,
})

export default async function ConsultationBookingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const rawCode = params?.code
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim() ?? ''
  const accessBooking = code ? await getConsultationAccessByCode(code) : null

  if (!accessBooking) {
    return (
      <main className="page-wrap">
        <div className="container">
          <section className="panel centered-panel">
            <div className="section-eyebrow">Dostęp indywidualny</div>
            <h1>Nie mogę otworzyć tego terminarza</h1>
            <p className="muted paragraph-gap">
              Kod jest nieprawidłowy, wykorzystany albo wygasł. Jeśli rozmawialiśmy i potrzebujesz ponownego dostępu, napisz bezpośrednio.
            </p>
            <div className="hero-actions centered-actions">
              <Link href="/konsultacja" className="button button-primary big-button">Wróć do opisu konsultacji</Link>
              <Link href="/kontakt#formularz" className="button button-ghost big-button">Napisz wiadomość</Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <BookingSlotCalendar
      searchParams={{ service: 'konsultacja-behawioralna-online' }}
      consultationAccessCode={code}
      consultationAccessEmail={accessBooking.email}
      consultationProblem={accessBooking.problemType}
      consultationSpecies={accessBooking.animalType === 'Kot' ? 'kot' : 'pies'}
    />
  )
}
