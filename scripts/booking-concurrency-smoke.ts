import assert from 'node:assert/strict'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import {
  createAvailabilitySlot,
  createPendingBooking,
  getAvailabilitySlot,
  listAvailability,
} from '../lib/server/local-store'

const rootDir = process.cwd()
const trackedFiles = ['availability.json', 'pricing-settings.json', 'bookings.json', 'users.json', 'funnel-events.json']

function assertBookingErrorMessage(value: unknown) {
  const message = value instanceof Error ? value.message : String(value)
  return message.includes('Wybrany termin') || message.includes('dostępny') || message.includes('dostepny')
}

function getWarsawDateInDays(daysAhead: number) {
  const target = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(target)
}

function buildBooking(index: number, slotId: string, label: string) {
  return {
    ownerName: `${label} ${String(index + 1).padStart(2, '0')}`,
    problemType: 'szczeniak' as const,
    animalType: 'Pies' as const,
    petAge: '8 miesiecy',
    durationNotes: 'Od tygodnia',
    description: 'Test paralelnego zajmowania tego samego terminu w bezpiecznym sandboxie lokalnym.',
    phone: `500700${String(800 + index).slice(-3)}`,
    email: `${label.toLowerCase().replace(/\s+/g, '-')}-${String(index + 1).padStart(2, '0')}@example.com`,
    slotId,
  }
}

async function main() {
  process.env.APP_DATA_MODE = 'local'
  process.env.APP_PAYMENT_MODE = 'mock'
  process.env.RESEND_API_KEY = ''
  process.env.MANUAL_PAYMENT_BANK_ACCOUNT = '11112222333344445555666677'
  process.env.MANUAL_PAYMENT_ACCOUNT_NAME = 'Krzysztof Regulski'
  process.env.SMS_PROVIDER = 'disabled'

  const sandbox = await createLocalDataSandbox('booking-concurrency-smoke', rootDir)
  const { dataDir } = sandbox

  try {
    await Promise.all(trackedFiles.map((fileName) => rm(path.join(dataDir, fileName), { force: true })))

    const sameSlotDate = getWarsawDateInDays(5)
    const sameSlot = await createAvailabilitySlot(sameSlotDate, '10:00')

    const sameSlotAttempts = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        createPendingBooking({
          ...buildBooking(index, sameSlot.id, 'parallel-same'),
        }),
      ),
    )

    const sameSlotSuccesses = sameSlotAttempts.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof createPendingBooking>>> => result.status === 'fulfilled',
    )
    const sameSlotFailures = sameSlotAttempts.filter((result): result is PromiseRejectedResult => result.status === 'rejected')

    assert.equal(sameSlotSuccesses.length, 1, 'Dokladnie jedna probba powinna zajac ten sam termin.')
    assert.equal(sameSlotFailures.length, 9, 'Pozostale probby powinny zostac odrzucone.')
    assert(
      sameSlotFailures.every((result) => assertBookingErrorMessage(result.reason)),
      'Odrzucone probby powinny zwracac czytelny komunikat o zajetym terminie.',
    )

    const successfulSameSlotBooking = sameSlotSuccesses[0]!.value.booking
    const claimedSameSlot = await getAvailabilitySlot(sameSlot.id)

    assert(claimedSameSlot, 'Zajety slot powinien byc nadal zapisany w magazynie danych.')
    assert.equal(
      claimedSameSlot?.lockedByBookingId,
      successfulSameSlotBooking.id,
      'Zajety slot powinien byc przypiety do wygranego bookingu.',
    )

    const distinctTimes = ['12:00', '12:20', '12:40', '13:00', '13:20', '13:40', '14:00', '14:20', '14:40', '15:00']
    const distinctSlots = await Promise.all(distinctTimes.map((bookingTime) => createAvailabilitySlot(sameSlotDate, bookingTime)))

    const distinctAttempts = await Promise.allSettled(
      distinctSlots.map((slot, index) =>
        createPendingBooking({
          ...buildBooking(index, slot.id, 'parallel-distinct'),
          problemType: index % 2 === 0 ? ('separacja' as const) : ('kot-stres' as const),
          animalType: index % 2 === 0 ? ('Pies' as const) : ('Kot' as const),
          petAge: index % 2 === 0 ? '3 lata' : '4 lata',
          durationNotes: index % 2 === 0 ? 'Od miesiaca' : 'Od tygodnia',
          description:
            'Test kilku równoległych rezerwacji różnych terminów w bezpiecznym sandboxie lokalnym. Ten opis spełnia minimalną długość.',
        }),
      ),
    )

    const distinctSuccesses = distinctAttempts.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof createPendingBooking>>> => result.status === 'fulfilled',
    )
    const distinctFailures = distinctAttempts.filter((result): result is PromiseRejectedResult => result.status === 'rejected')

    assert.equal(distinctSuccesses.length, 10, 'Wszystkie różne terminy powinny przejść poprawnie.')
    assert.equal(distinctFailures.length, 0, 'Różne terminy nie powinny powodować konfliktu.')

    const availabilityReads = await Promise.all(Array.from({ length: 10 }, () => listAvailability()))
    assert.equal(availabilityReads.length, 10, 'Równoległe odczyty dostępności powinny zwrócić 10 wyników.')

    const bookingIds = new Set([
      successfulSameSlotBooking.id,
      ...distinctSuccesses.map((result) => result.value.booking.id),
    ])

    assert.equal(bookingIds.size, 11, 'Nie powinno być duplikatów bookingId w testach równoległych.')

    console.log(
      JSON.stringify(
        {
          sameSlotSuccesses: sameSlotSuccesses.length,
          sameSlotFailures: sameSlotFailures.length,
          distinctSuccesses: distinctSuccesses.length,
          distinctFailures: distinctFailures.length,
          availabilityReads: availabilityReads.length,
          uniqueBookingIds: bookingIds.size,
        },
        null,
        2,
      ),
    )
  } finally {
    await sandbox.cleanup().catch(() => {})
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
