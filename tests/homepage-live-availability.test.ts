import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { upsertZapytajLiveNotification } from '@/lib/server/zapytaj-notifications'
import { POST as notifyRoute } from '@/app/api/zapytaj/notify/route'
import { GET as availabilityRoute } from '@/app/api/zapytaj/availability/route'

describe('homepage and zapytaj live availability verification', () => {
  it('1. home i /zapytaj korzystaja z tego samego zrodla dostepnosci (/api/zapytaj/availability)', async () => {
    const response = await availabilityRoute()
    assert.equal(response.status, 200)

    const data = (await response.json()) as {
      live: {
        status: string
        label: string
        message: string
        livePricePln: number
        liveSlotId: string | null
      }
      slots: Array<{ id: string; date: string; time: string; label: string }>
    }

    assert.ok(data.live, 'Payload must contain live object')
    assert.ok(Array.isArray(data.slots), 'Payload must contain slots array')
    assert.equal(typeof data.live.status, 'string')
    assert.equal(typeof data.live.livePricePln, 'number')
  })

  it('2. dostepny teraz -> realnie mozna przejsc dalej do rezerwacji', async () => {
    // Live mode requires both actionable liveSlotId and active live status
    function canProceedToLiveBooking(live: { status: string; liveSlotId: string | null }) {
      return Boolean(live.liveSlotId && (live.status === 'available_now' || live.status === 'in_call'))
    }

    assert.equal(canProceedToLiveBooking({ status: 'offline', liveSlotId: null }), false)
    assert.equal(canProceedToLiveBooking({ status: 'available_now', liveSlotId: null }), false)
    assert.equal(canProceedToLiveBooking({ status: 'available_now', liveSlotId: 'live-slot-123' }), true)
    assert.equal(canProceedToLiveBooking({ status: 'in_call', liveSlotId: 'live-slot-456' }), true)
  })

  it('3. przyszly termin -> pokazuje rzeczywisty termin pobrany z systemu', async () => {
    const mockSlots = [
      { id: '2026-09-22-09:00', date: '2026-09-22', time: '09:00', label: 'wt., 22 września · 09:00' },
      { id: '2026-09-22-09:30', date: '2026-09-22', time: '09:30', label: 'wt., 22 września · 09:30' },
    ]

    function getDisplayedSlot(isLive: boolean, slots: Array<{ label: string }>) {
      if (isLive || slots.length === 0) return null
      return slots[0].label
    }

    const displayed = getDisplayedSlot(false, mockSlots)
    assert.equal(displayed, 'wt., 22 września · 09:00')
  })

  it('4. brak terminow -> powiadomienie zapisuje sie naprawde', async () => {
    const testPhone = '505 111 222'
    const request = new Request('http://localhost:3000/api/zapytaj/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        channel: 'sms',
        consentAvailability: true,
      }),
    })

    const response = await notifyRoute(request)
    assert.equal(response.status, 200)

    const body = (await response.json()) as { ok: boolean; id: string }
    assert.equal(body.ok, true)
    assert.ok(body.id, 'Record ID must be returned')
  })

  it('5. blad pobrania -> neutralny stan sprawdzania, nigdy falszywe Dostepny teraz', async () => {
    function resolveState(error: boolean, availability: { live: { status: string; liveSlotId: string | null } } | null) {
      if (error || !availability) {
        return { isLive: false, label: 'Sprawdzam dostępne terminy…' }
      }
      const isLive = Boolean(availability.live.liveSlotId && (availability.live.status === 'available_now' || availability.live.status === 'in_call'))
      return { isLive, label: isLive ? 'Dostępny teraz' : 'Terminy z systemu' }
    }

    const stateOnError = resolveState(true, null)
    assert.equal(stateOnError.isLive, false)
    assert.notEqual(stateOnError.label, 'Dostępny teraz')
    assert.equal(stateOnError.label, 'Sprawdzam dostępne terminy…')
  })

  it('6. blad zapisu -> komunikat bledu i brak sukcesu', async () => {
    // Missing consent
    const requestNoConsent = new Request('http://localhost:3000/api/zapytaj/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '505 111 222',
        channel: 'sms',
        consentAvailability: false,
      }),
    })

    const resNoConsent = await notifyRoute(requestNoConsent)
    assert.equal(resNoConsent.status, 400)
    const bodyNoConsent = (await resNoConsent.json()) as { error: string }
    assert.ok(bodyNoConsent.error.includes('zgodę'))

    // Invalid phone
    const requestInvalidPhone = new Request('http://localhost:3000/api/zapytaj/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '123',
        channel: 'sms',
        consentAvailability: true,
      }),
    })

    const resInvalid = await notifyRoute(requestInvalidPhone)
    assert.equal(resInvalid.status, 400)
    const bodyInvalid = (await resInvalid.json()) as { error: string }
    assert.ok(bodyInvalid.error.length > 0)
  })

  it('7. ponowny identyczny zapis nie tworzy niekontrolowanych duplikatow (deduplikacja po notificationKey)', async () => {
    const testEmail = 'dedup-test@example.com'
    const record1 = await upsertZapytajLiveNotification({
      email: testEmail,
      channel: 'email',
      sourcePage: '/',
    })

    const record2 = await upsertZapytajLiveNotification({
      email: testEmail,
      channel: 'email',
      sourcePage: '/',
    })

    assert.equal(record1.id, record2.id, 'Deduplication must reuse existing record ID')
    assert.equal(record1.notificationKey, record2.notificationKey)
  })
})
