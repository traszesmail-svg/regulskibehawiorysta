import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminUrgentRequestActions } from '@/components/AdminUrgentRequestActions'
import { listUrgentNowRequests } from '@/lib/server/db'
import { parseUrgentRequestedSlotsFromMessage, stripUrgentRequestedSlotsFromMessage } from '@/lib/urgent-now'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UrgentConfirmPage({ params }: { params: { id: string } }) {
  noStore()
  const requests = await listUrgentNowRequests()
  const request = requests.find((item) => item.id === params.id)

  if (!request) {
    notFound()
  }

  const requestedSlots = parseUrgentRequestedSlotsFromMessage(request.message, {
    date: request.requestedDate,
    time: request.requestedTime,
  })

  return (
    <main style={{ maxWidth: 720, margin: '72px auto', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/admin" style={{ color: '#2f7667', fontSize: 14 }}>
        ← Panel admina
      </Link>

      <section style={{ marginTop: 18, display: 'grid', gap: 18 }}>
        <div>
          <div style={{ color: '#2f7667', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Kwadrans na już
          </div>
          <h1 style={{ margin: '8px 0 8px', fontSize: 28, lineHeight: 1.1 }}>Wybierz godzinę i wyślij link do płatności</h1>
          <p style={{ margin: 0, color: '#5d5750', lineHeight: 1.5 }}>
            Po zatwierdzeniu system tworzy rezerwację `kwadrans-na-juz`, blokuje termin i wysyła klientowi link do płatności.
          </p>
        </div>

        <article style={{ display: 'grid', gap: 8, padding: 18, border: '1px solid #e1d6c8', borderRadius: 14, background: '#fffdf8' }}>
          <strong>{request.name}</strong>
          <span>{request.email}</span>
          <span>
            {request.species === 'kot' ? 'Kot' : 'Pies'} · {request.topicLabel}
          </span>
          <span>
            Klient może: {requestedSlots.map((slot) => `${slot.date} ${slot.time}`).join(', ')}
          </span>
          <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>{stripUrgentRequestedSlotsFromMessage(request.message)}</p>
        </article>

        <AdminUrgentRequestActions
          requestId={request.id}
          disabled={request.status === 'responded'}
          requestedDate={request.requestedDate}
          requestedTime={request.requestedTime}
          requestedSlots={requestedSlots}
        />
      </section>
    </main>
  )
}
