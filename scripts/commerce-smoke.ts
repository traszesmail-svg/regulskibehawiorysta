import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {
  createEbookCommerceOrder,
  createRecommendedEbookCommerceOrder,
  fulfillCommerceOrderAndNotify,
} from '../lib/server/commerce-service'
import {
  createAvailabilitySlot,
  createPendingBooking,
  listAvailabilityAdmin,
  markBookingDone,
  markBookingPaid,
} from '../lib/server/db'
import {
  canUseCommerceAccess,
  getCommerceOrderByAccessCode,
  prepareCommerceManualPayment,
  reportCommerceManualPayment,
} from '../lib/server/commerce-store'

async function main() {
  const sandboxDir = path.join(process.cwd(), '.tmp-commerce-smoke')
  await rm(sandboxDir, { recursive: true, force: true })
  await mkdir(sandboxDir, { recursive: true })

  process.env.APP_DATA_MODE = 'local'
  process.env.APP_LOCAL_DATA_DIR = sandboxDir
  process.env.COMMERCE_TEST_MODE = '1'
  process.env.RESEND_API_KEY = ''
  process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.com'
  process.env.MANUAL_PAYMENT_BLIK_PHONE = '512992026'

  const online = await createEbookCommerceOrder({
    productKind: 'guide',
    productSlug: 'pies-burza-nagly-halas',
    name: 'Test Online',
    email: 'online@example.com',
  })
  assert.equal(online.status, 'created')
  await assert.rejects(
    createEbookCommerceOrder({
      productKind: 'guide',
      productSlug: 'pies-sam-w-domu',
      name: 'Bez rozmowy',
      email: 'blocked@example.com',
    }),
    /wcześniejszym Zapytaj/i,
  )

  const onlinePaid = await fulfillCommerceOrderAndNotify(online.orderNumber, 'mock', {
    providerPaymentId: 'mock-online-smoke',
  })
  assert.equal(onlinePaid.status, 'access_sent')
  assert.ok(onlinePaid.accessCode)

  const onlineAccess = await getCommerceOrderByAccessCode(onlinePaid.accessCode!, onlinePaid.customerEmail)
  assert.ok(onlineAccess)
  assert.equal(canUseCommerceAccess(onlineAccess!), true)

  await createAvailabilitySlot('2035-01-15', '11:00')
  const sourceSlot = (await listAvailabilityAdmin()).find(
    (slot) => slot.bookingDate === '2035-01-15' && slot.bookingTime === '11:00',
  )
  assert.ok(sourceSlot)

  const sourceBooking = await createPendingBooking({
    ownerName: 'Test Blik',
    serviceType: 'szybka-konsultacja-15-min',
    consultationMode: 'phone',
    problemType: 'inne',
    animalType: 'Kot',
    petAge: '4 lata',
    durationNotes: '',
    description: 'Smoke test rekomendacji materiału po rozmowie.',
    phone: '+48600700801',
    email: 'blik@example.com',
    slotId: sourceSlot.id,
  })
  await markBookingPaid(sourceBooking.booking.id, { paymentMethod: 'manual', consultationMode: 'phone' })
  await markBookingDone(sourceBooking.booking.id, 'Dalsza praca z napięciem w domu.', 'kot-zyje-w-napieciu')

  const manual = await createRecommendedEbookCommerceOrder({
    bookingId: sourceBooking.booking.id,
    productSlug: 'kot-zyje-w-napieciu',
  })
  assert.equal(manual.amount, 19)
  assert.equal(manual.meta.sourceBookingId, sourceBooking.booking.id)

  const prepared = await prepareCommerceManualPayment(manual.orderNumber)
  assert.ok(prepared?.adminConfirmationToken)
  assert.equal(prepared?.status, 'waiting_manual_payment')

  const reported = await reportCommerceManualPayment(manual.orderNumber, manual.viewerToken)
  assert.equal(reported?.order.status, 'payment_reported')
  assert.equal(reported?.reportedNow, true)

  const manualPaid = await fulfillCommerceOrderAndNotify(manual.orderNumber, 'blik_phone', {
    adminTokenUsedAt: new Date().toISOString(),
    adminIp: '127.0.0.1',
    adminUserAgent: 'commerce-smoke',
  })
  assert.equal(manualPaid.status, 'access_sent')
  assert.ok(manualPaid.accessCode)

  const secondClick = await fulfillCommerceOrderAndNotify(manual.orderNumber, 'blik_phone', {
    adminTokenUsedAt: new Date().toISOString(),
    adminIp: '127.0.0.1',
    adminUserAgent: 'commerce-smoke-repeat',
  })
  assert.equal(secondClick.accessCode, manualPaid.accessCode)

  console.log('commerce-smoke PASS', {
    onlineOrder: onlinePaid.orderNumber,
    manualOrder: manualPaid.orderNumber,
    onlineCode: onlinePaid.accessCode,
    manualCode: manualPaid.accessCode,
  })
}

main().catch((error) => {
  console.error('commerce-smoke FAIL', error)
  process.exit(1)
})
