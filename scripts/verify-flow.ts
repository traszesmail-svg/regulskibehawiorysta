import { rm } from 'fs/promises'
import path from 'path'
import { getProblemLabel, isFutureAvailabilitySlot } from '../lib/data'
import { createLocalDataSandbox } from './lib/local-data-sandbox'
import { BOOKING_SERVICE_30_PRICE, BOOKING_SERVICE_ONLINE_PRICE } from '../lib/booking-services'
import {
  attachPayuOrder,
  createAvailabilitySlot,
  createPendingBooking,
  deleteAvailabilitySlot,
  getBookingById,
  listAvailability,
  listAvailabilityAdmin,
  markBookingDone,
  markBookingManualPaymentPending,
  markBookingManualPaymentRejected,
  markBookingPaid,
} from '../lib/server/local-store'
import { getManualPaymentReference } from '../lib/server/payment-options'

const rootDir = process.cwd()
const trackedFiles = ['availability.json', 'bookings.json', 'users.json', 'pricing-settings.json', 'funnel-events.json']

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function createFutureWarsawDate(yearsAhead: number) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + yearsAhead * 365 * 24 * 60 * 60 * 1000))
}

async function main() {
  process.env.RESEND_API_KEY = ''
  process.env.MANUAL_PAYMENT_BANK_ACCOUNT = '11112222333344445555666677'
  process.env.SMS_PROVIDER = 'disabled'
  const sandbox = await createLocalDataSandbox('verify-flow', rootDir)
  const { dataDir } = sandbox

  try {
    await Promise.all(trackedFiles.map((fileName) => rm(path.join(dataDir, fileName), { force: true })))

    const initialAvailability = await listAvailability()
    const [manualSuccessSlot, manualRejectedSlot, payuSlot] = initialAvailability.flatMap((group) => group.slots).slice(0, 3)
    const allInitialSlots = initialAvailability.flatMap((group) => group.slots)

    assert(manualSuccessSlot, 'Brak pierwszego slotu testowego.')
    assert(manualRejectedSlot, 'Brak drugiego slotu testowego.')
    assert(payuSlot, 'Brak trzeciego slotu testowego.')
    assert(
      allInitialSlots.every((slot) => isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime)),
      'W local mode nie powinny pojawiac sie terminy z przeszlosci.',
    )

    const manualBooking = await createPendingBooking({
      ownerName: 'Manual Success',
      problemType: 'szczeniak',
      animalType: 'Pies',
      petAge: '8 miesiecy',
      durationNotes: '2 tygodnie',
      description: 'Testowe zachowanie do weryfikacji recznej platnosci.',
      phone: '500000000',
      email: 'manual-success@example.com',
      slotId: manualSuccessSlot.id,
    })

    assert(manualBooking.booking.bookingStatus === 'pending', 'Booking nie zaczyna od statusu pending.')
    assert(manualBooking.booking.paymentStatus === 'unpaid', 'Booking nie zaczyna od payment status unpaid.')

    const manualPending = await markBookingManualPaymentPending(manualBooking.booking.id, {
      paymentReference: getManualPaymentReference(manualBooking.booking.id),
    })

    assert(manualPending?.bookingStatus === 'pending_manual_payment', 'Booking nie przeszedl do statusu pending_manual_payment.')
    assert(manualPending?.paymentStatus === 'pending_manual_review', 'Payment status nie przeszedl do pending_manual_review.')

    const manualPendingRetry = await markBookingManualPaymentPending(manualBooking.booking.id, {
      paymentReference: getManualPaymentReference(manualBooking.booking.id),
    })

    assert(
      manualPendingRetry?.bookingStatus === 'pending_manual_payment',
      'Ponowne zgloszenie manualnej platnosci nie powinno zmieniac statusu bookingu.',
    )
    assert(
      manualPendingRetry?.paymentStatus === 'pending_manual_review',
      'Ponowne zgloszenie manualnej platnosci nie powinno zmieniac payment status.',
    )
    assert(
      manualPendingRetry?.paymentReportedAt === manualPending?.paymentReportedAt,
      'Ponowne zgloszenie manualnej platnosci nie powinno nadpisywac paymentReportedAt.',
    )

    const manualPaid = await markBookingPaid(manualBooking.booking.id, {
      paymentMethod: 'manual',
      paymentReference: getManualPaymentReference(manualBooking.booking.id),
      triggerPaymentConfirmationSms: true,
    })

    assert(manualPaid?.bookingStatus === 'confirmed', 'Booking po recznej akceptacji nie przeszedl do statusu confirmed.')
    assert(manualPaid?.paymentStatus === 'paid', 'Booking po recznej akceptacji nie ma statusu paid.')
    assert(manualPaid?.meetingUrl.startsWith('https://meet.jit.si/regulski-behawiorysta-'), 'Nie wygenerowano linku Jitsi.')
    assert(
      manualPaid?.smsConfirmationStatus === 'skipped_not_configured',
      'Manual payment success powinien zapisac kontrolowany status SMS przy braku providera.',
    )

    const futureBookingDate = createFutureWarsawDate(5)
    const thirtyMinuteFirstSlot = await createAvailabilitySlot(futureBookingDate, '10:00')
    const thirtyMinuteSecondSlot = await createAvailabilitySlot(futureBookingDate, '10:30')

    assert(thirtyMinuteFirstSlot.id !== thirtyMinuteSecondSlot.id, '30 min slots musza byc osobnymi, kolejnymi slotami.')

    const thirtyMinuteBooking = await createPendingBooking({
      ownerName: 'Thirty Minute Success',
      problemType: 'kot-stres',
      animalType: 'Kot',
      petAge: '5 lat',
      durationNotes: 'Od dwóch tygodni',
      description: 'Test osobnego flow dla konsultacji 30 min.',
      phone: '503000000',
      email: 'thirty-minute@example.com',
      slotId: thirtyMinuteFirstSlot.id,
      serviceType: 'konsultacja-30-min',
    })

    assert(
      thirtyMinuteBooking.booking.serviceType === 'konsultacja-30-min',
      'Booking 30 min nie zachowal serviceType.',
    )
    assert(
      thirtyMinuteBooking.booking.amount === BOOKING_SERVICE_30_PRICE,
      'Booking 30 min nie dostal stalej ceny 119 zl.',
    )

    const thirtyMinutePending = await markBookingManualPaymentPending(thirtyMinuteBooking.booking.id, {
      paymentReference: getManualPaymentReference(thirtyMinuteBooking.booking.id),
    })

    assert(
      thirtyMinutePending?.bookingStatus === 'pending_manual_payment',
      'Booking 30 min nie przeszedl do statusu pending_manual_payment.',
    )
    assert(
      thirtyMinutePending?.paymentStatus === 'pending_manual_review',
      'Booking 30 min nie przeszedl do statusu pending_manual_review.',
    )

    const thirtyMinutePaid = await markBookingPaid(thirtyMinuteBooking.booking.id, {
      paymentMethod: 'manual',
      paymentReference: getManualPaymentReference(thirtyMinuteBooking.booking.id),
      triggerPaymentConfirmationSms: true,
    })

    assert(thirtyMinutePaid?.bookingStatus === 'confirmed', 'Booking 30 min po akceptacji nie przeszedl do confirmed.')
    assert(thirtyMinutePaid?.paymentStatus === 'paid', 'Booking 30 min po akceptacji nie ma statusu paid.')

    const onlineFirstSlot = await createAvailabilitySlot(futureBookingDate, '12:00')
    const onlineSecondSlot = await createAvailabilitySlot(futureBookingDate, '12:30')
    const onlineThirdSlot = await createAvailabilitySlot(futureBookingDate, '13:00')
    const onlineFourthSlot = await createAvailabilitySlot(futureBookingDate, '13:30')

    assert(
      new Set([onlineFirstSlot.id, onlineSecondSlot.id, onlineThirdSlot.id, onlineFourthSlot.id]).size === 4,
      'Online slots musza byc osobnymi, kolejnymi slotami.',
    )

    const onlineBooking = await createPendingBooking({
      ownerName: 'Online Success',
      problemType: 'separacja',
      animalType: 'Pies',
      petAge: '6 lat',
      durationNotes: 'Od kilku miesiecy',
      description: 'Test osobnego flow dla konsultacji behawioralnej online.',
      phone: '504000000',
      email: 'online-success@example.com',
      slotId: onlineFirstSlot.id,
      serviceType: 'konsultacja-behawioralna-online',
    })

    assert(
      onlineBooking.booking.serviceType === 'konsultacja-behawioralna-online',
      'Booking online nie zachowal serviceType.',
    )
    assert(
      onlineBooking.booking.amount === BOOKING_SERVICE_ONLINE_PRICE,
      'Booking online nie dostal stalej ceny 350 zl.',
    )

    const onlinePending = await markBookingManualPaymentPending(onlineBooking.booking.id, {
      paymentReference: getManualPaymentReference(onlineBooking.booking.id),
    })

    assert(
      onlinePending?.bookingStatus === 'pending_manual_payment',
      'Booking online nie przeszedl do statusu pending_manual_payment.',
    )
    assert(
      onlinePending?.paymentStatus === 'pending_manual_review',
      'Booking online nie przeszedl do statusu pending_manual_review.',
    )

    const onlinePaid = await markBookingPaid(onlineBooking.booking.id, {
      paymentMethod: 'manual',
      paymentReference: getManualPaymentReference(onlineBooking.booking.id),
      triggerPaymentConfirmationSms: true,
    })

    assert(onlinePaid?.bookingStatus === 'confirmed', 'Booking online po akceptacji nie przeszedl do confirmed.')
    assert(onlinePaid?.paymentStatus === 'paid', 'Booking online po akceptacji nie ma statusu paid.')
    assert(
      onlinePaid?.smsConfirmationStatus === 'skipped_not_configured',
      'Booking online powinien zapisac kontrolowany status SMS przy braku providera.',
    )
    assert(
      onlinePaid?.meetingUrl.startsWith('https://meet.jit.si/regulski-behawiorysta-'),
      'Booking online nie wygenerowal linku Jitsi.',
    )

    const rejectedBooking = await createPendingBooking({
      ownerName: 'Manual Reject',
      problemType: 'kot-konflikt',
      animalType: 'Kot',
      petAge: '2 lata',
      durationNotes: '3 dni',
      description: 'Test odrzucenia manualnej platnosci po zgloszeniu.',
      phone: '501000000',
      email: 'manual-reject@example.com',
      slotId: manualRejectedSlot.id,
    })

    await markBookingManualPaymentPending(rejectedBooking.booking.id, {
      paymentReference: getManualPaymentReference(rejectedBooking.booking.id),
    })
    const rejectedResult = await markBookingManualPaymentRejected(rejectedBooking.booking.id, 'Nie znaleziono wplaty.')

    assert(rejectedResult?.bookingStatus === 'cancelled', 'Booking po odrzuceniu wplaty nie ma statusu cancelled.')
    assert(rejectedResult?.paymentStatus === 'rejected', 'Booking po odrzuceniu wplaty nie ma payment status rejected.')
    assert(getProblemLabel('kot') === 'Kot', 'Legacy label dla starych bookingow kota zostal uproszczony.')

    const availabilityAfterReject = await listAvailability()
    const rejectedSlotVisibleAgain = availabilityAfterReject.some((group) =>
      group.slots.some((slot) => slot.id === manualRejectedSlot.id),
    )
    assert(rejectedSlotVisibleAgain, 'Slot po odrzuceniu manualnej platnosci nie wrocil do puli.')

    const payuBooking = await createPendingBooking({
      ownerName: 'PayU Success',
      problemType: 'separacja',
      animalType: 'Pies',
      petAge: '3 lata',
      durationNotes: 'Od miesiaca',
      description: 'Test automatycznego przejscia do paid po sukcesie PayU.',
      phone: '502000000',
      email: 'payu-success@example.com',
      slotId: payuSlot.id,
    })

    await attachPayuOrder(payuBooking.booking.id, {
      payuOrderId: 'payu-order-test-001',
      payuOrderStatus: 'NEW',
    })
    const payuPaid = await markBookingPaid(payuBooking.booking.id, {
      paymentMethod: 'payu',
      payuOrderId: 'payu-order-test-001',
      payuOrderStatus: 'COMPLETED',
      triggerPaymentConfirmationSms: true,
    })

    assert(payuPaid?.bookingStatus === 'confirmed', 'Booking po sukcesie PayU nie przeszedl do confirmed.')
    assert(payuPaid?.paymentStatus === 'paid', 'Booking po sukcesie PayU nie ma statusu paid.')
    assert(
      payuPaid?.smsConfirmationStatus === 'skipped_not_configured',
      'PayU success powinien zapisac kontrolowany status SMS przy braku providera.',
    )

    const doneBooking = await markBookingDone(manualBooking.booking.id, 'Pelna konsultacja')
    assert(doneBooking?.bookingStatus === 'done', 'Booking nie przeszedl do statusu done.')
    assert(doneBooking?.paymentStatus === 'paid', 'Booking done powinien zachowac payment status paid.')

    const futureAdminSlotDate = createFutureWarsawDate(6)
    const adminSlot = await createAvailabilitySlot(futureAdminSlotDate, '23:30')
    const adminAvailability = await listAvailabilityAdmin()
    assert(adminAvailability.some((slot) => slot.id === adminSlot.id), 'Admin slot nie zostal dodany.')

    await deleteAvailabilitySlot(adminSlot.id)
    const adminAvailabilityAfterDelete = await listAvailabilityAdmin()
    assert(!adminAvailabilityAfterDelete.some((slot) => slot.id === adminSlot.id), 'Admin slot nie zostal usuniety.')

    const finalManualBooking = await getBookingById(manualBooking.booking.id)

    console.log(
      JSON.stringify(
        {
          manualPaymentFlow: {
            pendingStatus: manualPending?.bookingStatus ?? null,
            pendingPaymentStatus: manualPending?.paymentStatus ?? null,
            finalBookingStatus: manualPaid?.bookingStatus ?? null,
            finalPaymentStatus: manualPaid?.paymentStatus ?? null,
          },
          thirtyMinuteFlow: {
            bookingStatus: thirtyMinutePaid?.bookingStatus ?? null,
            paymentStatus: thirtyMinutePaid?.paymentStatus ?? null,
            amount: thirtyMinutePaid?.amount ?? null,
          },
          onlineFlow: {
            bookingStatus: onlinePaid?.bookingStatus ?? null,
            paymentStatus: onlinePaid?.paymentStatus ?? null,
            amount: onlinePaid?.amount ?? null,
            meetingUrl: onlinePaid?.meetingUrl ?? null,
          },
          manualRejectFlow: {
            bookingStatus: rejectedResult?.bookingStatus ?? null,
            paymentStatus: rejectedResult?.paymentStatus ?? null,
            slotReleased: rejectedSlotVisibleAgain,
          },
          payuFlow: {
            bookingStatus: payuPaid?.bookingStatus ?? null,
            paymentStatus: payuPaid?.paymentStatus ?? null,
            orderId: payuPaid?.payuOrderId ?? null,
          },
          adminAvailabilityAddRemove: true,
          noPastSlotsInAvailability: true,
          jitsiLinkAssigned: finalManualBooking?.meetingUrl ?? null,
          finalDoneStatus: doneBooking?.bookingStatus ?? null,
        },
        null,
        2,
      ),
    )
  } finally {
    await sandbox.cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
