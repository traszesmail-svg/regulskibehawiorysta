import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {
  createEbookCommerceOrder,
  fulfillCommerceOrderAndNotify,
} from '../lib/server/commerce-service'
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
    productSlug: 'pies-sam-w-domu',
    name: 'Test Online',
    email: 'online@example.com',
  })
  assert.equal(online.status, 'created')

  const onlinePaid = await fulfillCommerceOrderAndNotify(online.orderNumber, 'mock', {
    providerPaymentId: 'mock-online-smoke',
  })
  assert.equal(onlinePaid.status, 'access_sent')
  assert.ok(onlinePaid.accessCode)

  const onlineAccess = await getCommerceOrderByAccessCode(onlinePaid.accessCode!, onlinePaid.customerEmail)
  assert.ok(onlineAccess)
  assert.equal(canUseCommerceAccess(onlineAccess!), true)

  const manual = await createEbookCommerceOrder({
    productKind: 'guide',
    productSlug: 'kot-zyje-w-napieciu',
    name: 'Test Blik',
    email: 'blik@example.com',
  })

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
