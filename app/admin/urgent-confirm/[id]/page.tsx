import Link from 'next/link'
import { notFound } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminUrgentRequestActions } from '@/components/AdminUrgentRequestActions'
import { listUrgentNowRequests } from '@/lib/server/db'
import { parseUrgentRequestedSlotsFromMessage, stripUrgentRequestedSlotsFromMessage } from '@/lib/urgent-now'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UrgentConfirmPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  noStore()
  const requests = await listUrgentNowRequests()
  const request = requests.find((item) => item.id === params.id)

  if (!request) {
    notFound()
  }

  const requestedSlots = parseUrgentRequestedSlotsFromMessage(request.message, request.requestedTime === '00:00' ? null : {
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
            Zapytaj teraz
          </div>
          <h1 style={{ margin: '8px 0 8px', fontSize: 28, lineHeight: 1.1 }}>{request.species ? 'Wybierz godzinę i wyślij link do płatności' : 'Pilna prośba — odpowiedź ręczna'}</h1>
          <p style={{ margin: 0, color: '#5d5750', lineHeight: 1.5 }}>
            {request.species ? 'Po zatwierdzeniu system tworzy rezerwację i wysyła klientowi link do płatności.' : 'Wybierz propozycję, wyślij ją klientowi SMS-em i dopiero wtedy oznacz odpowiedź. Po 15 minutach bez oznaczonej odpowiedzi system wyśle SMS o braku terminu.'}
          </p>
        </div>

        <article style={{ display: 'grid', gap: 8, padding: 18, border: '1px solid #e1d6c8', borderRadius: 14, background: '#fffdf8' }}>
          <strong>{request.name}</strong>
          {request.email ? <span>{request.email}</span> : null}
          {request.phone ? <span>{request.phone}</span> : null}
          <span>Preferencja: {request.contactPreference === 'notify_only' ? 'tylko powiadomienie' : 'link do płatności po potwierdzeniu godziny'}</span>
          <span>
            {request.species ? `${request.species === 'kot' ? 'Kot' : 'Pies'} · ` : ''}{request.topicLabel}
          </span>
          <span>
            {requestedSlots.length ? `Preferowane godziny: ${requestedSlots.map((slot) => `${slot.date} ${slot.time}`).join(', ')}` : 'Godzinę ustala operator.'}
          </span>
          <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>{stripUrgentRequestedSlotsFromMessage(request.message)}</p>
        </article>

        {request.species ? <AdminUrgentRequestActions
          requestId={request.id}
          disabled={request.status === 'responded'}
          requestedDate={request.requestedDate}
          requestedTime={request.requestedTime}
          requestedSlots={requestedSlots}
          contactPreference={request.contactPreference}
        /> : <AdminUrgentRequestActions
          requestId={request.id}
          disabled={request.status === 'responded'}
          requestedDate={request.requestedDate}
          requestedTime={request.requestedTime}
          manualMode
        />}
      </section>
    </main>
  )
}
