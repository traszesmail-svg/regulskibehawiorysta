import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { addWarsawDateDays, countActiveUrgentDayBookings, countZapytajNowPaymentLinkRequestsForDate, getUrgentNowDayState, getWarsawDateAndDay, getZapytajHeaderStatusLabel, getZapytajNowPublicStatus, isUrgentOperatorResponseOverdue, isZapytajNowActivationTime, isZapytajTodayIntakeOpen, URGENT_NOW_DAILY_LIMIT, URGENT_OPERATOR_RESPONSE_WINDOW_MS, validateZapytajUrgentPreference } from '../lib/urgent-now-policy'
import { claimUrgentNoResponseSms, createUrgentNowRequest, listUrgentNowRequests, markUrgentNoResponseSms } from '../lib/server/urgent-now-store'

test('pilne zgłoszenia liczą dzień według strefy Europe/Warsaw', () => {
  const beforeWarsawMidnight = new Date('2026-10-02T21:59:00.000Z')
  const afterWarsawMidnight = new Date('2026-10-02T22:01:00.000Z')
  assert.equal(getWarsawDateAndDay(beforeWarsawMidnight).date, '2026-10-02')
  assert.equal(getWarsawDateAndDay(afterWarsawMidnight).date, '2026-10-03')
})

test('pilna dyspozycyjność akceptuje tylko dziś/jutro i prawidłową godzinę Warsaw', () => {
  const now = new Date('2026-10-01T10:15:00.000Z') // 12:15 w Warszawie
  assert.equal(validateZapytajUrgentPreference('2026-10-01', '12:00', now), 'past_time')
  assert.equal(validateZapytajUrgentPreference('2026-10-01', '12:30', now), null)
  assert.equal(validateZapytajUrgentPreference('2026-10-02', '08:00', now), null)
  assert.equal(validateZapytajUrgentPreference('2026-10-03', '08:00', now), 'invalid_date')
  assert.equal(validateZapytajUrgentPreference('2026-10-02', '20:30', now), 'invalid_time')
})

test('wiadomość o braku terminu przypada po 15 minutach bez statusu odpowiedzi', () => {
  const createdAt = '2026-10-01T10:00:00.000Z'
  assert.equal(URGENT_OPERATOR_RESPONSE_WINDOW_MS, 15 * 60 * 1000)
  assert.equal(isUrgentOperatorResponseOverdue(createdAt, 'new', new Date('2026-10-01T10:14:59.999Z')), false)
  assert.equal(isUrgentOperatorResponseOverdue(createdAt, 'new', new Date('2026-10-01T10:15:00.000Z')), true)
  assert.equal(isUrgentOperatorResponseOverdue(createdAt, 'responded', new Date('2026-10-01T10:20:00.000Z')), false)
})

test('publiczne zgłoszenie na dziś jest otwarte wyłącznie przy aktywnym, zdrowym oknie', () => {
  const now = new Date('2026-10-01T10:00:00.000Z')
  const active = { status: 'available_now' as const, enabledUntil: '2026-10-01T11:00:00.000Z', storageAvailable: true }
  assert.equal(isZapytajTodayIntakeOpen(active, now), true)
  assert.equal(isZapytajTodayIntakeOpen({ ...active, status: 'offline' }, now), false)
  assert.equal(isZapytajTodayIntakeOpen({ ...active, status: 'unavailable' }, now), false)
  assert.equal(isZapytajTodayIntakeOpen({ ...active, storageAvailable: false }, now), false)
  assert.equal(isZapytajTodayIntakeOpen({ ...active, enabledUntil: '2026-10-01T09:00:00.000Z' }, now), false)
})

test('limit wynosi dwie przyjęte prośby na dzień roboczy, a weekend jest zamknięty', () => {
  const weekday = new Date('2026-10-01T10:00:00.000Z')
  const saturday = new Date('2026-10-03T10:00:00.000Z')
  assert.equal(URGENT_NOW_DAILY_LIMIT, 2)
  assert.equal(getUrgentNowDayState(weekday, 0), 'available')
  assert.equal(getUrgentNowDayState(weekday, 1), 'available')
  assert.equal(getUrgentNowDayState(weekday, 2), 'full')
  assert.equal(getUrgentNowDayState(saturday, 0), 'weekend')
})

test('okno Zapytaj teraz można włączać od poniedziałku do piątku między 8:00 a 20:00 czasu Warsaw', () => {
  assert.equal(isZapytajNowActivationTime(new Date('2026-10-01T06:00:00.000Z')), true) // 08:00 CEST
  assert.equal(isZapytajNowActivationTime(new Date('2026-10-01T18:00:00.000Z')), true) // 20:00 CEST
  assert.equal(isZapytajNowActivationTime(new Date('2026-10-01T18:01:00.000Z')), false)
  assert.equal(isZapytajNowActivationTime(new Date('2026-10-03T10:00:00.000Z')), false)
  assert.equal(isZapytajNowActivationTime(new Date('2026-01-05T07:00:00.000Z')), true) // 08:00 CET
})

test('status rozdziela offline, aktywne okno z terminem i aktywne okno bez terminu', () => {
  const now = new Date('2026-10-01T10:00:00.000Z')
  assert.equal(getZapytajNowPublicStatus('available_now', 0, now, true), 'online_with_slot')
  assert.equal(getZapytajNowPublicStatus('available_now', 0, now), 'online_without_slot')
  assert.equal(getZapytajNowPublicStatus('offline', 0, now), 'offline')
  assert.equal(getZapytajNowPublicStatus('offline', 2, now), 'full')
  assert.equal(getZapytajNowPublicStatus('payment_pending', 0, now), 'in_progress')
  assert.equal(getZapytajNowPublicStatus('in_call', 0, now), 'in_progress')
  assert.equal(getZapytajNowPublicStatus('available_now', 0, new Date('2026-10-03T10:00:00.000Z')), 'weekend')
})

test('headerowe komunikaty rozróżniają dostępność, brak miejsc, trwającą obsługę i błąd', () => {
  assert.equal(getZapytajHeaderStatusLabel('available'), 'Zapytaj teraz: dostępne')
  assert.equal(getZapytajHeaderStatusLabel('full'), 'Zapytaj teraz: limit zgłoszeń wykorzystany')
  assert.equal(getZapytajHeaderStatusLabel('offline'), 'Zapytaj teraz: sprawdź najbliższy dostępny dzień')
  assert.equal(getZapytajHeaderStatusLabel('in_progress'), 'Zapytaj teraz: trwa rozmowa lub oczekiwanie na płatność')
  assert.equal(getZapytajHeaderStatusLabel('unavailable'), 'Zapytaj teraz: okno nieaktywne')
  assert.equal(getZapytajHeaderStatusLabel('weekend'), 'Zapytaj teraz: dostępne w dni robocze')
  assert.equal(getZapytajHeaderStatusLabel('unknown'), 'Zapytaj teraz: nie można sprawdzić dostępności')
})

test('licznik limitu zwiększa się tylko dla wyboru indywidualnego linku', () => {
  const requests: Array<{ createdAt: string; requestedDate?: string; contactPreference: 'payment_link' | 'notify_only' }> = [
    { createdAt: '2026-10-01T07:00:00.000Z', requestedDate: '2026-10-02', contactPreference: 'notify_only' },
    { createdAt: '2026-10-01T07:05:00.000Z', requestedDate: '2026-10-02', contactPreference: 'payment_link' },
    { createdAt: '2026-09-30T20:30:00.000Z', requestedDate: '2026-10-03', contactPreference: 'payment_link' },
  ]
  assert.equal(countZapytajNowPaymentLinkRequestsForDate(requests, '2026-10-02'), 1)
  assert.equal(countZapytajNowPaymentLinkRequestsForDate(requests, '2026-10-03'), 1)
  assert.equal(addWarsawDateDays('2026-10-02', 3), '2026-10-05')
})

test('limit dnia docelowego uwzględnia potwierdzenia i tylko aktywne blokady slotu', () => {
  const bookings = [
    { id: 'confirmed', bookingDate: '2026-10-05', bookingStatus: 'confirmed' },
    { id: 'held', bookingDate: '2026-10-05', bookingStatus: 'pending' },
    { id: 'expired', bookingDate: '2026-10-05', bookingStatus: 'pending' },
    { id: 'other-day', bookingDate: '2026-10-06', bookingStatus: 'confirmed' },
  ]
  const slots = [
    { lockedByBookingId: 'held', lockedUntil: '2026-10-01T12:00:00.000Z' },
    { lockedByBookingId: 'expired', lockedUntil: '2026-10-01T09:00:00.000Z' },
  ]
  assert.equal(countActiveUrgentDayBookings(bookings, slots, '2026-10-05', new Date('2026-10-01T10:00:00.000Z')), 2)
})

test('atomiczny local queue przyjmuje tylko dwa równoległe linki dla docelowej daty; powiadomienie jest poza limitem', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zapytaj-now-capacity-'))
  const previousDirectory = process.env.APP_LOCAL_DATA_DIR
  process.env.APP_LOCAL_DATA_DIR = directory
  const input = {
    name: 'Test', email: 'test@example.com', phone: '+48123123123', contactPreference: 'payment_link' as const,
    species: 'pies' as const, topicId: 'inne' as const, topicLabel: 'Inne', message: 'Testowe zgłoszenie z opisem.',
    requestedDate: '2026-10-05', requestedTime: '13:30',
  }
  try {
    const attempts = await Promise.allSettled([createUrgentNowRequest(input), createUrgentNowRequest(input), createUrgentNowRequest(input)])
    assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 2)
    assert.equal(attempts.filter((result) => result.status === 'rejected' && result.reason instanceof Error && result.reason.message.includes('URGENT_NOW_DAILY_LIMIT')).length, 1)
    const notify = await createUrgentNowRequest({ ...input, contactPreference: 'notify_only' })
    assert.equal(notify.contactPreference, 'notify_only')
    assert.equal(notify.requestedDate, input.requestedDate)
    assert.equal(notify.requestedTime, input.requestedTime)
    const claimed = await claimUrgentNoResponseSms(notify.id)
    assert.equal(claimed?.noResponseSmsStatus, 'processing')
    const marked = await markUrgentNoResponseSms({ id: notify.id, status: 'failed' })
    assert.equal(marked?.noResponseSmsStatus, 'failed')
    assert.equal((await listUrgentNowRequests()).find((request) => request.id === notify.id)?.noResponseSmsStatus, 'failed')

    const heldCapacity = await createUrgentNowRequest({ ...input, requestedDate: '2026-10-06', activeBookingCount: 1 })
    assert.equal(heldCapacity.requestedDate, '2026-10-06')
    await assert.rejects(
      createUrgentNowRequest({ ...input, requestedDate: '2026-10-06', activeBookingCount: 1 }),
      /URGENT_NOW_DAILY_LIMIT/,
    )
  } finally {
    if (previousDirectory === undefined) delete process.env.APP_LOCAL_DATA_DIR
    else process.env.APP_LOCAL_DATA_DIR = previousDirectory
    await rm(directory, { recursive: true, force: true })
  }
})
