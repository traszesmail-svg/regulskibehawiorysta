import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createLocalDataSandbox } from '../scripts/lib/local-data-sandbox'
import {
  createUrgentIntakeRequest,
  proposeUrgentIntakeTimeslot,
  confirmUrgentIntakePayment,
  transitionUrgentIntakeState,
  sweepExpiredSection16RecordsLocal,
  resetSection16LocalStore,
  readSection16StoreSnapshot,
  Section16SlotUnavailableError,
} from '../lib/server/section16-store'
import {
  Section16IdempotencyConflictError,
  Section16TransitionError,
  Section16HoldExpiredError,
} from '../lib/server/section16-types'
import {
  createAvailabilitySlot,
  resetAvailabilityLocalStore,
  listAvailability,
  listAvailabilityAdmin,
  createPendingBooking,
  holdAvailabilitySlotForSection16,
  confirmSection16AvailabilityBooking,
} from '../lib/server/local-store'
import type { BookingFormData } from '../lib/types'

let sandbox: Awaited<ReturnType<typeof createLocalDataSandbox>> | null = null

// Data w przyszłości w strefie Europe/Warsaw: 2026-10-20 (wtorek), 10:00 czasu warszawskiego (08:00 UTC)
const TEST_REF_NOW = new Date('2026-10-20T08:00:00.000Z')
const TEST_DATE = '2026-10-20'

test.before(async () => {
  sandbox = await createLocalDataSandbox('section16-cal-hold-int')
  process.env.APP_DATA_MODE = 'local'
  process.env.CALL_SESSION_PHONE_SECRET = 'test-secret-with-at-least-16-chars'
  await resetSection16LocalStore()
  await resetAvailabilityLocalStore()
})

test.beforeEach(async () => {
  await resetSection16LocalStore()
  await resetAvailabilityLocalStore()
})

test.after(async () => {
  if (sandbox) {
    await sandbox.cleanup()
    sandbox = null
  }
})

test('1. Test zajętego lub już zablokowanego slotu: propozycja odrzucona, brak mutacji requestu i eventu', async () => {
  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600111222',
      idempotencyKey: 'int-test-req-1',
    },
    TEST_REF_NOW,
  )
  assert.equal(req.state, 'pending_proposal')
  assert.equal(req.version, 1)

  // 1a. Slot nieistniejący w kalendarzu (13:15 nie istnieje w standardowym seedzie ani nie został dodany)
  await assert.rejects(
    async () => {
      await proposeUrgentIntakeTimeslot(
        {
          requestId: req.id,
          proposedDate: TEST_DATE,
          proposedTime: '13:15',
          expectedVersion: 1,
          idempotencyKey: 'prop-slot-not-found',
        },
        TEST_REF_NOW,
      )
    },
    (err: unknown) => {
      assert.ok(err instanceof Section16SlotUnavailableError)
      assert.equal(err.code, 'SLOT_NOT_FOUND')
      return true
    },
  )

  // Request i zdarzenia bez mutacji
  const snapshotAfterNonExistent = await readSection16StoreSnapshot()
  const reqAfter1 = snapshotAfterNonExistent.urgentIntakes.find((r) => r.id === req.id)!
  assert.equal(reqAfter1.state, 'pending_proposal')
  assert.equal(reqAfter1.version, 1)
  assert.equal(snapshotAfterNonExistent.urgentEvents.filter((e) => e.requestId === req.id).length, 1) // tylko intake_created

  // 1b. Slot zajęty (isBooked = true)
  await createAvailabilitySlot(TEST_DATE, '13:30', undefined, TEST_REF_NOW)
  await holdAvailabilitySlotForSection16({
    bookingDate: TEST_DATE,
    bookingTime: '13:30',
    requestId: 'prior-booking-id',
    holdExpiresAt: new Date(TEST_REF_NOW.getTime() + 30 * 60 * 1000).toISOString(),
    now: TEST_REF_NOW,
  })
  await confirmSection16AvailabilityBooking('prior-booking-id', TEST_DATE, '13:30', TEST_REF_NOW)

  await assert.rejects(
    async () => {
      await proposeUrgentIntakeTimeslot(
        {
          requestId: req.id,
          proposedDate: TEST_DATE,
          proposedTime: '13:30',
          expectedVersion: 1,
          idempotencyKey: 'prop-slot-booked',
        },
        TEST_REF_NOW,
      )
    },
    (err: unknown) => {
      assert.ok(err instanceof Section16SlotUnavailableError)
      assert.equal(err.code, 'SLOT_UNAVAILABLE')
      return true
    },
  )

  // Request i zdarzenia bez mutacji
  const snapshotAfterBooked = await readSection16StoreSnapshot()
  const reqAfter2 = snapshotAfterBooked.urgentIntakes.find((r) => r.id === req.id)!
  assert.equal(reqAfter2.state, 'pending_proposal')
  assert.equal(reqAfter2.version, 1)
  assert.equal(snapshotAfterBooked.urgentEvents.filter((e) => e.requestId === req.id).length, 1)

  // 1c. Slot zablokowany rezerwacją publiczną (lockedByBookingId)
  const lockedSlot = await createAvailabilitySlot(TEST_DATE, '14:00', undefined, TEST_REF_NOW)
  await createPendingBooking({
    ownerName: 'Jan Rezerwujący',
    liveMode: true,
    serviceType: 'szybka-konsultacja-15-min',
    problemType: 'agresja',
    animalType: 'Pies',
    petAge: '2 lata',
    durationNotes: 'od miesiąca',
    description: 'Rezerwacja publiczna',
    email: 'jan@example.com',
    phone: '+48600123456',
    slotId: lockedSlot.id,
  })

  await assert.rejects(
    async () => {
      await proposeUrgentIntakeTimeslot(
        {
          requestId: req.id,
          proposedDate: TEST_DATE,
          proposedTime: '14:00',
          expectedVersion: 1,
          idempotencyKey: 'prop-slot-locked',
        },
        new Date(),
      )
    },
    (err: unknown) => {
      assert.ok(err instanceof Section16SlotUnavailableError)
      assert.equal(err.code, 'SLOT_LOCKED')
      return true
    },
  )

  // Request i zdarzenia bez mutacji
  const snapshotAfterLocked = await readSection16StoreSnapshot()
  const reqAfter3 = snapshotAfterLocked.urgentIntakes.find((r) => r.id === req.id)!
  assert.equal(reqAfter3.state, 'pending_proposal')
  assert.equal(reqAfter3.version, 1)
  assert.equal(snapshotAfterLocked.urgentEvents.filter((e) => e.requestId === req.id).length, 1)

  // 1d. Slot zablokowany przez inną Sekcję 16 (SLOT_ALREADY_HELD)
  await createAvailabilitySlot(TEST_DATE, '14:30', undefined, TEST_REF_NOW)
  const otherReq = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600333444',
      idempotencyKey: 'int-test-req-other',
    },
    TEST_REF_NOW,
  )
  await proposeUrgentIntakeTimeslot(
    {
      requestId: otherReq.id,
      proposedDate: TEST_DATE,
      proposedTime: '14:30',
      expectedVersion: 1,
      idempotencyKey: 'prop-other-success',
    },
    TEST_REF_NOW,
  )

  // Nasz request próbuje objąć ten sam termin
  await assert.rejects(
    async () => {
      await proposeUrgentIntakeTimeslot(
        {
          requestId: req.id,
          proposedDate: TEST_DATE,
          proposedTime: '14:30',
          expectedVersion: 1,
          idempotencyKey: 'prop-slot-already-held',
        },
        TEST_REF_NOW,
      )
    },
    (err: unknown) => {
      assert.ok(err instanceof Section16SlotUnavailableError)
      assert.equal(err.code, 'SLOT_ALREADY_HELD')
      return true
    },
  )

  // Request pierwotny bez mutacji
  const snapshotAfterAlreadyHeld = await readSection16StoreSnapshot()
  const reqAfter4 = snapshotAfterAlreadyHeld.urgentIntakes.find((r) => r.id === req.id)!
  assert.equal(reqAfter4.state, 'pending_proposal')
  assert.equal(reqAfter4.version, 1)
  assert.equal(snapshotAfterAlreadyHeld.urgentEvents.filter((e) => e.requestId === req.id).length, 1)
})

test('2. Test współbieżny: dwa zgłoszenia na jeden slot, dokładnie jeden sukces', async () => {
  await createAvailabilitySlot(TEST_DATE, '15:00', undefined, TEST_REF_NOW)

  const reqA = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600111222',
      idempotencyKey: 'concurrent-req-a',
    },
    TEST_REF_NOW,
  )
  const reqB = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600222333',
      idempotencyKey: 'concurrent-req-b',
    },
    TEST_REF_NOW,
  )

  const results = await Promise.allSettled([
    proposeUrgentIntakeTimeslot(
      {
        requestId: reqA.id,
        proposedDate: TEST_DATE,
        proposedTime: '15:00',
        expectedVersion: 1,
        idempotencyKey: 'prop-concurrent-a',
      },
      TEST_REF_NOW,
    ),
    proposeUrgentIntakeTimeslot(
      {
        requestId: reqB.id,
        proposedDate: TEST_DATE,
        proposedTime: '15:00',
        expectedVersion: 1,
        idempotencyKey: 'prop-concurrent-b',
      },
      TEST_REF_NOW,
    ),
  ])

  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')

  assert.equal(fulfilled.length, 1, 'Dokładnie jedna propozycja powinna zakończyć się sukcesem')
  assert.equal(rejected.length, 1, 'Dokładnie jedna propozycja powinna zostać odrzucona')

  const rejectionReason = (rejected[0] as PromiseRejectedResult).reason
  assert.ok(
    rejectionReason instanceof Section16SlotUnavailableError,
    'Odrzucenie powinno być instancją Section16SlotUnavailableError',
  )
  assert.equal(rejectionReason.code, 'SLOT_ALREADY_HELD')

  // Weryfikacja stanu w store
  const allSlots = await listAvailabilityAdmin()
  const slot = allSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '15:00')!
  assert.ok(slot.section16HoldRequestId)

  const winner = (fulfilled[0] as PromiseFulfilledResult<any>).value
  assert.equal(slot.section16HoldRequestId, winner.id)

  const snapshot = await readSection16StoreSnapshot()
  const winnerReq = snapshot.urgentIntakes.find((r) => r.id === winner.id)!
  assert.equal(winnerReq.state, 'timeslot_proposed')
  assert.equal(winnerReq.version, 2)

  const loserId = winner.id === reqA.id ? reqB.id : reqA.id
  const loserReq = snapshot.urgentIntakes.find((r) => r.id === loserId)!
  assert.equal(loserReq.state, 'pending_proposal')
  assert.equal(loserReq.version, 1)
  assert.equal(snapshot.urgentEvents.filter((e) => e.requestId === loserId).length, 1) // tylko intake_created
})

test('3. Aktywna propozycja znika z publicznej dostępności i publiczny booking jej nie przejmuje', async () => {
  const slot = await createAvailabilitySlot(TEST_DATE, '18:00', undefined, TEST_REF_NOW)

  // Przed propozycją: termin jest widoczny w publicznym kalendarzu
  const beforeAvail = await listAvailability()
  const beforeDay = beforeAvail.find((d) => d.date === TEST_DATE)
  assert.ok(
    beforeDay?.slots.some((s) => s.bookingTime === '18:00'),
    'Slot powinien być widoczny przed propozycją',
  )

  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600444555',
      idempotencyKey: 'int-test-req-3',
    },
    TEST_REF_NOW,
  )

  await proposeUrgentIntakeTimeslot(
    {
      requestId: req.id,
      proposedDate: TEST_DATE,
      proposedTime: '18:00',
      expectedVersion: 1,
      idempotencyKey: 'prop-public-hide',
    },
    TEST_REF_NOW,
  )

  // Po propozycji: termin znika z publicznej dostępności
  const afterAvail = await listAvailability()
  const afterDay = afterAvail.find((d) => d.date === TEST_DATE)
  const isSlotVisibleAfter = afterDay?.slots.some((s) => s.bookingTime === '18:00') ?? false
  assert.equal(isSlotVisibleAfter, false, 'Slot musi zniknąć z publicznej dostępności')

  // Publiczny booking próbuje zarezerwować zablokowany slot
  const bookingForm: BookingFormData = {
    ownerName: 'Nieświadomy Klient',
    liveMode: true,
    serviceType: 'szybka-konsultacja-15-min',
    problemType: 'agresja',
    animalType: 'Pies',
    petAge: '3 lata',
    durationNotes: 'od tygodnia',
    description: 'Próba rezerwacji zablokowanego slotu',
    email: 'random@example.com',
    phone: '+48600777888',
    slotId: slot.id,
  }

  await assert.rejects(
    async () => {
      await createPendingBooking(bookingForm)
    },
    /Wybrany termin nie jest już dostępny/,
    'Publiczny booking musi odrzucić termin objęty aktywną blokadą Section 16',
  )

  // Upewnij się, że nie powstała żadna rezerwacja
  const adminSlots = await listAvailabilityAdmin()
  const slotAfter = adminSlots.find((s) => s.id === slot.id)!
  assert.equal(slotAfter.isBooked, false)
  assert.equal(slotAfter.lockedByBookingId, null)
  assert.equal(slotAfter.section16HoldRequestId, req.id)
})

test('4. Expiry/cancel/reject zwalniają slot; reschedule zwalnia stary i blokuje nowy atomowo', async () => {
  // 4a. Atomowy reschedule: zwalnia stary i blokuje nowy
  await createAvailabilitySlot(TEST_DATE, '18:30', undefined, TEST_REF_NOW)
  await createAvailabilitySlot(TEST_DATE, '19:00', undefined, TEST_REF_NOW)

  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600888999',
      idempotencyKey: 'int-test-reschedule',
    },
    TEST_REF_NOW,
  )

  await proposeUrgentIntakeTimeslot(
    {
      requestId: req.id,
      proposedDate: TEST_DATE,
      proposedTime: '18:30',
      expectedVersion: 1,
      idempotencyKey: 'prop-reschedule-slot1',
    },
    TEST_REF_NOW,
  )

  let adminSlots = await listAvailabilityAdmin()
  let slot1 = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '18:30')!
  let slot2 = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '19:00')!
  assert.equal(slot1.section16HoldRequestId, req.id)
  assert.equal(slot2.section16HoldRequestId, null)

  // Reschedule na slot 2 (19:00) z expectedVersion = 2
  await proposeUrgentIntakeTimeslot(
    {
      requestId: req.id,
      proposedDate: TEST_DATE,
      proposedTime: '19:00',
      expectedVersion: 2,
      idempotencyKey: 'prop-reschedule-slot2',
    },
    TEST_REF_NOW,
  )

  adminSlots = await listAvailabilityAdmin()
  slot1 = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '18:30')!
  slot2 = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '19:00')!
  assert.equal(slot1.section16HoldRequestId, null, 'Stary slot musi zostać zwolniony')
  assert.equal(slot2.section16HoldRequestId, req.id, 'Nowy slot musi zostać zablokowany')

  // Błędny reschedule (cel zajęty) nie zwalnia obecnej blokady
  await createAvailabilitySlot(TEST_DATE, '19:30', undefined, TEST_REF_NOW)
  await holdAvailabilitySlotForSection16({
    bookingDate: TEST_DATE,
    bookingTime: '19:30',
    requestId: 'other-booking-id',
    holdExpiresAt: new Date(TEST_REF_NOW.getTime() + 30 * 60 * 1000).toISOString(),
    now: TEST_REF_NOW,
  })
  await confirmSection16AvailabilityBooking('other-booking-id', TEST_DATE, '19:30', TEST_REF_NOW)

  await assert.rejects(
    async () => {
      await proposeUrgentIntakeTimeslot(
        {
          requestId: req.id,
          proposedDate: TEST_DATE,
          proposedTime: '19:30',
          expectedVersion: 3,
          idempotencyKey: 'prop-reschedule-fail',
        },
        TEST_REF_NOW,
      )
    },
    Section16SlotUnavailableError,
  )

  // Slot 2 (19:00) nadal zablokowany!
  adminSlots = await listAvailabilityAdmin()
  slot2 = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '19:00')!
  assert.equal(slot2.section16HoldRequestId, req.id, 'Błąd reschedule nie może zwolnić obecnego slotu')

  // 4b. Cancel / odrzucenie zwalnia slot
  await transitionUrgentIntakeState(
    {
      requestId: req.id,
      targetState: 'cancelled',
      expectedVersion: 3,
      idempotencyKey: 'trans-cancel-req',
    },
    TEST_REF_NOW,
  )

  adminSlots = await listAvailabilityAdmin()
  slot2 = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '19:00')!
  assert.equal(slot2.section16HoldRequestId, null, 'Anulowanie musi zwolnić blokadę slotu')
  assert.equal(slot2.section16HoldExpiresAt, null)

  // 4c. Expiry sweep zwalnia slot, a spóźniona płatność zostaje odrzucona
  await createAvailabilitySlot(TEST_DATE, '20:00', undefined, TEST_REF_NOW)
  const reqExpire = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600999000',
      idempotencyKey: 'int-test-expire',
    },
    TEST_REF_NOW,
  )

  const holdExpiry = '2026-10-20T10:15:00.000Z'
  await proposeUrgentIntakeTimeslot(
    {
      requestId: reqExpire.id,
      proposedDate: TEST_DATE,
      proposedTime: '20:00',
      holdExpiresAt: holdExpiry,
      expectedVersion: 1,
      idempotencyKey: 'prop-will-expire',
    },
    TEST_REF_NOW,
  )

  // Sweep po wygaśnięciu (10:20 UTC to 12:20 Warsaw)
  const sweepNow = new Date('2026-10-20T10:20:00.000Z')
  const swept = await sweepExpiredSection16RecordsLocal(10, sweepNow)
  assert.equal(swept.urgentIntakesExpired, 1)

  adminSlots = await listAvailabilityAdmin()
  const expiredSlot = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '20:00')!
  assert.equal(expiredSlot.section16HoldRequestId, null, 'Wygaśnięcie musi zwolnić blokadę slotu')

  const expiredSnapshot = await readSection16StoreSnapshot()
  const expiredReq = expiredSnapshot.urgentIntakes.find((r) => r.id === reqExpire.id)!
  assert.equal(expiredReq.state, 'expired')

  // Próba spóźnionego potwierdzenia płatności po wygaśnięciu
  await assert.rejects(
    async () => {
      await confirmUrgentIntakePayment(
        {
          requestId: reqExpire.id,
          paymentReference: 'PAY-LATE-123',
          idempotencyKey: 'pay-late-attempt',
        },
        sweepNow,
      )
    },
    Section16TransitionError,
  )

  // 4d. Płatność przed wygaśnięciem potwierdza slot jako isBooked i zwalnia hold
  await createAvailabilitySlot(TEST_DATE, '20:30', undefined, TEST_REF_NOW)
  const reqPay = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600123987',
      idempotencyKey: 'int-test-pay',
    },
    TEST_REF_NOW,
  )

  await proposeUrgentIntakeTimeslot(
    {
      requestId: reqPay.id,
      proposedDate: TEST_DATE,
      proposedTime: '20:30',
      expectedVersion: 1,
      idempotencyKey: 'prop-to-be-paid',
    },
    TEST_REF_NOW,
  )

  await confirmUrgentIntakePayment(
    {
      requestId: reqPay.id,
      paymentReference: 'PAY-ON-TIME-789',
      expectedVersion: 2,
      idempotencyKey: 'pay-confirmed-success',
    },
    TEST_REF_NOW,
  )

  adminSlots = await listAvailabilityAdmin()
  const bookedSlotFinal = adminSlots.find((s) => s.bookingDate === TEST_DATE && s.bookingTime === '20:30')!
  assert.equal(bookedSlotFinal.isBooked, true, 'Slot po opłaceniu musi stać się isBooked: true')
  assert.equal(bookedSlotFinal.section16HoldRequestId, reqPay.id, 'Hold request id zachowuje powiązanie ze zgłoszeniem')
  assert.equal(bookedSlotFinal.section16HoldExpiresAt, null)

  // 4e. Odrzucenie confirmSection16AvailabilityBooking wyłącznie z aktywnym holdem należącym do requestu
  await createAvailabilitySlot(TEST_DATE, '20:45', undefined, TEST_REF_NOW)

  // Brak holda dla tego requestu: HOLD_NOT_FOUND
  await assert.rejects(
    async () => {
      await confirmSection16AvailabilityBooking('non-existent-request-id', TEST_DATE, '20:45', TEST_REF_NOW)
    },
    (err: unknown) => {
      assert.ok(err instanceof Section16SlotUnavailableError)
      assert.equal(err.code, 'HOLD_NOT_FOUND')
      return true
    },
  )

  // Hold wygasły: HOLD_EXPIRED
  await holdAvailabilitySlotForSection16({
    bookingDate: TEST_DATE,
    bookingTime: '20:45',
    requestId: 'expired-hold-request-id',
    holdExpiresAt: new Date(TEST_REF_NOW.getTime() + 10 * 60 * 1000).toISOString(),
    now: TEST_REF_NOW,
  })
  const lateConfirmTime = new Date(TEST_REF_NOW.getTime() + 15 * 60 * 1000)
  await assert.rejects(
    async () => {
      await confirmSection16AvailabilityBooking('expired-hold-request-id', TEST_DATE, '20:45', lateConfirmTime)
    },
    Section16HoldExpiredError,
  )

  // Niezgodność daty/godziny: SLOT_MISMATCH
  await assert.rejects(
    async () => {
      await confirmSection16AvailabilityBooking('expired-hold-request-id', TEST_DATE, '21:00', TEST_REF_NOW)
    },
    (err: unknown) => {
      assert.ok(err instanceof Section16SlotUnavailableError)
      assert.equal(err.code, 'SLOT_MISMATCH')
      return true
    },
  )
})

test('5. Idempotentny retry zwraca istniejący rezultat bez ponownej mutacji', async () => {
  await createAvailabilitySlot(TEST_DATE, '21:00', undefined, TEST_REF_NOW)

  const req = await createUrgentIntakeRequest(
    {
      dayChoice: 'today',
      targetDate: TEST_DATE,
      rawPhone: '+48600555666',
      idempotencyKey: 'int-test-idempotent-req',
    },
    TEST_REF_NOW,
  )

  const payload = { testNote: 'notatka-1' }
  const result1 = await proposeUrgentIntakeTimeslot(
    {
      requestId: req.id,
      proposedDate: TEST_DATE,
      proposedTime: '21:00',
      expectedVersion: 1,
      idempotencyKey: 'prop-idem-key-1',
      payload,
    },
    TEST_REF_NOW,
  )

  assert.equal(result1.state, 'timeslot_proposed')
  assert.equal(result1.version, 2)

  // Dokładny retry z tym samym kluczem i payloadem
  const result2 = await proposeUrgentIntakeTimeslot(
    {
      requestId: req.id,
      proposedDate: TEST_DATE,
      proposedTime: '21:00',
      expectedVersion: 1, // pierwotna oczekiwana wersja
      idempotencyKey: 'prop-idem-key-1',
      payload,
    },
    TEST_REF_NOW,
  )

  assert.equal(result2.id, result1.id)
  assert.equal(result2.version, 2, 'Wersja nie może się zwiększyć przy idempotencji')

  // Weryfikacja liczby zdarzeń w logu
  const snapshot = await readSection16StoreSnapshot()
  const events = snapshot.urgentEvents.filter((e) => e.idempotencyKey === 'prop-idem-key-1')
  assert.equal(events.length, 1, 'Musi istnieć dokładnie jedno zdarzenie dla tego klucza')

  // Próba użycia tego samego klucza z innym payloadem zwraca błąd konfliktu
  await assert.rejects(
    async () => {
      await proposeUrgentIntakeTimeslot(
        {
          requestId: req.id,
          proposedDate: TEST_DATE,
          proposedTime: '21:00',
          expectedVersion: 2,
          idempotencyKey: 'prop-idem-key-1',
          payload: { testNote: 'zmieniona-notatka-konflikt' },
        },
        TEST_REF_NOW,
      )
    },
    Section16IdempotencyConflictError,
  )
})

test('6. Lokalny store i kontrakt Supabase/migracja mają parytet (audyt statyczny)', () => {
  const root = resolve(__dirname, '..')
  const migrationPath = resolve(root, 'supabase/migrations/20261013002_section16_calendar_holds.sql')
  const schemaPath = resolve(root, 'supabase/schema.sql')

  const migrationSql = readFileSync(migrationPath, 'utf8')
  const schemaSql = readFileSync(schemaPath, 'utf8')

  // 1. Sprawdzenie kolumn w tabeli public.availability
  assert.ok(
    migrationSql.includes('section16_hold_request_id uuid references public.urgent_intake_requests(id)'),
    'Migracja musi definiować foreign key section16_hold_request_id',
  )
  assert.ok(
    schemaSql.includes('section16_hold_request_id uuid'),
    'schema.sql musi zawierać section16_hold_request_id',
  )
  assert.ok(
    migrationSql.includes('section16_hold_expires_at timestamptz'),
    'Migracja musi definiować section16_hold_expires_at',
  )
  assert.ok(
    schemaSql.includes('section16_hold_expires_at timestamptz'),
    'schema.sql musi zawierać section16_hold_expires_at',
  )

  // 2. Indeksy
  assert.ok(
    migrationSql.includes('idx_availability_section16_hold'),
    'Migracja musi tworzyć indeks idx_availability_section16_hold',
  )
  assert.ok(
    schemaSql.includes('idx_availability_section16_hold'),
    'schema.sql musi zawierać indeks idx_availability_section16_hold',
  )

  // 3. Procedury atomowe w migracji
  const requiredProcedures = [
    'propose_urgent_intake_timeslot',
    'confirm_urgent_intake_payment',
    'transition_urgent_intake_state',
    'sweep_expired_section16_records',
  ]

  for (const proc of requiredProcedures) {
    assert.ok(
      migrationSql.includes(`create or replace function public.${proc}`),
      `Migracja musi definiować procedurę ${proc}`,
    )
    assert.ok(
      schemaSql.includes(`create or replace function public.${proc}`),
      `schema.sql musi definiować procedurę ${proc}`,
    )
  }

  // 4. Obsługa blokady slotu w procedurach SQL
  assert.ok(
    migrationSql.includes('SLOT_NOT_FOUND'),
    'Migracja musi obsługiwać błąd SLOT_NOT_FOUND',
  )
  assert.ok(
    migrationSql.includes('SLOT_UNAVAILABLE'),
    'Migracja musi obsługiwać błąd SLOT_UNAVAILABLE',
  )
  assert.ok(
    migrationSql.includes('SLOT_LOCKED'),
    'Migracja musi obsługiwać błąd SLOT_LOCKED',
  )
  assert.ok(
    migrationSql.includes('SLOT_ALREADY_HELD'),
    'Migracja musi obsługiwać błąd SLOT_ALREADY_HELD',
  )
  assert.ok(
    schemaSql.includes('SLOT_ALREADY_HELD'),
    'schema.sql musi obsługiwać błąd SLOT_ALREADY_HELD',
  )
})
