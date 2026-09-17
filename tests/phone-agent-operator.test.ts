import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  recordPhoneAgentHeartbeat,
  getPhoneAgentDeviceState,
  runPhoneAgentWatchdogCheck,
  enqueueSms,
  claimNextPendingSms,
  reportSmsResult,
  listSmsQueue,
  cancelPendingBookingSms,
  cancelPendingLiveAvailabilitySms,
  generateUpcomingBookingSmsReminders,
  PHONE_AGENT_HEARTBEAT_TIMEOUT_MS,
} from '@/lib/server/phone-agent-store'
import { sendPaymentConfirmationSms } from '@/lib/server/sms'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'
import { GET as getHeartbeat, POST as postHeartbeat } from '@/app/api/phone-agent/heartbeat/route'
import { GET as getSmsQueue, POST as postSmsQueue } from '@/app/api/phone-agent/sms-queue/route'
import { POST as postWatchdog } from '@/app/api/phone-agent/watchdog/route'
import { GET as getCronWatchdog, POST as postCronWatchdog } from '@/app/api/cron/phone-agent-watchdog/route'
import { createAvailabilitySlot, createPendingBooking, markBookingPaid } from '@/lib/server/local-store'
import { NextRequest } from 'next/server'

function withEnv(overrides: Record<string, string | null | undefined>, run: () => void | Promise<void>) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])
    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  const result = run()
  if (result && typeof (result as Promise<void>).then === 'function') {
    return (result as Promise<void>).finally(restore)
  }
  restore()
}

test('phone-agent heartbeat updates state and calculates online status', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-heartbeat', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local', PHONE_AGENT_TOKEN: 'test-token-123' }, async () => {
      // Initially never connected
      const initial = await getPhoneAgentDeviceState()
      assert.equal(initial.status, 'never_connected')
      assert.equal(initial.isOnline, false)

      // Record heartbeat
      const state = await recordPhoneAgentHeartbeat({
        batteryLevel: 94,
        isCharging: true,
        network: 'Play LTE',
        isDefaultDialer: true,
        appVersion: '1.1.0',
      })

      assert.equal(state.status, 'online')
      assert.equal(state.isOnline, true)
      assert.equal(state.batteryLevel, 94)
      assert.equal(state.isCharging, true)
      assert.equal(state.network, 'Play LTE')
      assert.equal(state.isDefaultDialer, true)
      assert.equal(state.appVersion, '1.1.0')

      // Reading back verifies persistence
      const readBack = await getPhoneAgentDeviceState()
      assert.equal(readBack.status, 'online')
      assert.equal(readBack.batteryLevel, 94)
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('phone-agent watchdog triggers when heartbeat is stale', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-watchdog', process.cwd())

  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        PHONE_AGENT_TOKEN: 'test-token-123',
        ADMIN_NOTIFICATION_EMAIL: 'kontakt@regulskibehawiorysta.pl',
      },
      async () => {
        // Record heartbeat
        await recordPhoneAgentHeartbeat({ batteryLevel: 80, isCharging: true })

        // Online check
        const onlineCheck = await runPhoneAgentWatchdogCheck()
        assert.equal(onlineCheck.isOnline, true)
        assert.equal(onlineCheck.watchdogTriggered, false)

        // Mock time forward by altering stored state timestamp directly
        const storePath = require('path').join(sandbox.dataDir, 'phone-agent-state.json')
        const fs = require('fs')
        const state = JSON.parse(fs.readFileSync(storePath, 'utf8'))
        // 5 minutes ago
        state.lastHeartbeatAt = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        fs.writeFileSync(storePath, JSON.stringify(state), 'utf8')

        // Now run watchdog
        const staleCheck = await runPhoneAgentWatchdogCheck()
        assert.equal(staleCheck.isOnline, false)
        assert.equal(staleCheck.watchdogTriggered, true)
        assert.equal(staleCheck.liveDisabled, true)
        assert.ok(staleCheck.lastSeenMinutes >= 4)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})

test('sms queue operations: enqueue, claim, report, and idempotency', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-sms-queue', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local' }, async () => {
      const item1 = await enqueueSms({
        bookingId: 'booking-1',
        phone: '500600700',
        message: 'Testowa treść SMS',
        type: 'reminder_15m',
        idempotencyKey: 'reminder_15m:booking-1',
      })

      assert.equal(item1.status, 'pending')
      assert.equal(item1.phone, '+48500600700')
      assert.equal(item1.message, 'Testowa treść SMS')

      // Idempotency: enqueueing same key returns existing without duplicates
      const itemDup = await enqueueSms({
        bookingId: 'booking-1',
        phone: '500600700',
        message: 'Inna treść',
        type: 'reminder_15m',
        idempotencyKey: 'reminder_15m:booking-1',
      })
      assert.equal(itemDup.id, item1.id)
      assert.equal(itemDup.message, 'Testowa treść SMS')

      // Claiming
      const claimed = await claimNextPendingSms()
      assert.ok(claimed)
      assert.equal(claimed.id, item1.id)
      assert.equal(claimed.status, 'claimed')

      // No more pending to claim
      const noneLeft = await claimNextPendingSms()
      assert.equal(noneLeft, null)

      // Report result
      const success = await reportSmsResult(item1.id, 'sent')
      assert.equal(success, true)

      const queueList = await listSmsQueue()
      assert.equal(queueList.length, 1)
      assert.equal(queueList[0].status, 'sent')
      assert.ok(queueList[0].sentAt)
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('heartbeat and sms-queue API endpoints respond with proper auth', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-routes', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local', PHONE_AGENT_TOKEN: 'super-secret-token', CRON_SECRET: 'cron-secret-456' }, async () => {
      // 1. Heartbeat POST without auth => 401
      const reqNoAuth = new NextRequest('http://localhost:3000/api/phone-agent/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batteryLevel: 90 }),
      })
      const resNoAuth = await postHeartbeat(reqNoAuth)
      assert.equal(resNoAuth.status, 401)

      // 2. Heartbeat POST with valid auth => 200
      const reqAuth = new NextRequest('http://localhost:3000/api/phone-agent/heartbeat', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer super-secret-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batteryLevel: 92, isCharging: true, network: 'Orange' }),
      })
      const resAuth = await postHeartbeat(reqAuth)
      assert.equal(resAuth.status, 200)
      const dataAuth = await resAuth.json()
      assert.equal(dataAuth.ok, true)
      assert.equal(dataAuth.state.batteryLevel, 92)
      assert.equal(dataAuth.state.isOnline, true)

      // 3. Heartbeat GET with auth => returns state
      const reqGet = new NextRequest('http://localhost:3000/api/phone-agent/heartbeat', {
        headers: { Authorization: 'Bearer super-secret-token' },
      })
      const resGet = await getHeartbeat(reqGet)
      assert.equal(resGet.status, 200)
      const dataGet = await resGet.json()
      assert.equal(dataGet.state.batteryLevel, 92)

      // 4. SMS queue GET => no pending
      const reqSmsGet = new NextRequest('http://localhost:3000/api/phone-agent/sms-queue', {
        headers: { Authorization: 'Bearer super-secret-token' },
      })
      const resSmsGet = await getSmsQueue(reqSmsGet)
      assert.equal(resSmsGet.status, 200)
      const dataSmsGet = await resSmsGet.json()
      assert.equal(dataSmsGet.sms, null)

      // 5. Watchdog route with auth => 200
      const reqWatchdog = new NextRequest('http://localhost:3000/api/phone-agent/watchdog', {
        method: 'POST',
        headers: { Authorization: 'Bearer super-secret-token' },
      })
      const resWatchdog = await postWatchdog(reqWatchdog)
      assert.equal(resWatchdog.status, 200)
      const dataWatchdog = await resWatchdog.json()
      assert.equal(dataWatchdog.ok, true)
      assert.equal(dataWatchdog.watchdog.isOnline, true)

      // The production scheduler uses CRON_SECRET, never the phone token.
      const cronNoAuth = await getCronWatchdog(new NextRequest('http://localhost:3000/api/cron/phone-agent-watchdog'))
      assert.equal(cronNoAuth.status, 401)

      // Supabase pg_net invokes cron endpoints with POST; it must use the
      // same authorization gate and runner as Vercel's GET cron invocation.
      const cronPost = await postCronWatchdog(new NextRequest('http://localhost:3000/api/cron/phone-agent-watchdog', {
        method: 'POST',
        headers: { Authorization: 'Bearer cron-secret-456' },
      }))
      assert.equal(cronPost.status, 200)
      const cronPostData = await cronPost.json()
      assert.equal(cronPostData.ok, true)
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('revolut and blik notification is disabled by default and requires an explicit pilot flag', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-revolut', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local', PHONE_AGENT_TOKEN: 'secret-token-rev', PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION: null }, async () => {
      const { reconcilePaymentNotification, extractAmountFromNotification } = await import('@/lib/server/payment-reconciliation')
      const { POST: postPaymentNotification } = await import('@/app/api/phone-agent/payment-notification/route')
      const { getBookingById } = await import('@/lib/server/db')

      // 1. Check amount extraction helpers
      assert.equal(extractAmountFromNotification('Otrzymałeś 79,00 zł', 'Jan Kowalski'), 79)
      assert.equal(extractAmountFromNotification('Nowy przelew', 'Wpływ 104 zł z tytułem konsultacja'), 104)
      assert.equal(extractAmountFromNotification('Revolut', 'Anna przesłała Ci 79.00 PLN'), 79)

      // 2. Create a pending booking for 79 zł
      const bookingDate = '2030-03-12'
      await createAvailabilitySlot(bookingDate, '10:00')
      const created = await createPendingBooking({
        ownerName: 'Jan Kowalski',
        serviceType: 'szybka-konsultacja-15-min',
        problemType: 'agresja',
        animalType: 'Pies',
        petAge: '2 lata',
        durationNotes: 'Test Revolut BLIK',
        description: 'Pies warczy przy misce',
        phone: '600700800',
        email: 'jan.kowalski@example.com',
        slotId: `${bookingDate}-10:00`,
      })

      assert.ok(created.booking.id)
      const beforeBooking = await getBookingById(created.booking.id)
      assert.equal(beforeBooking?.paymentStatus, 'unpaid')

      // 3. Test API route without auth => 401
      const reqNoAuth = new NextRequest('http://localhost:3000/api/phone-agent/payment-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Otrzymałeś 79,00 zł', text: 'Jan Kowalski' }),
      })
      const resNoAuth = await postPaymentNotification(reqNoAuth)
      assert.equal(resNoAuth.status, 401)

      const disabledRequest = new NextRequest('http://localhost:3000/api/phone-agent/payment-notification', {
        method: 'POST',
        headers: { Authorization: 'Bearer secret-token-rev', 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Otrzymałeś 79,00 zł', text: 'Jan Kowalski przesłał Ci 79,00 zł' }),
      })
      const disabledResponse = await postPaymentNotification(disabledRequest)
      assert.equal(disabledResponse.status, 409)

      process.env.PHONE_AGENT_AUTO_PAYMENT_RECONCILIATION = 'true'

      // Explicit pilot flag: test API route with valid auth => matches and marks paid
      const reqAuth = new NextRequest('http://localhost:3000/api/phone-agent/payment-notification', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-token-rev',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageName: 'com.revolut.revolut',
          title: 'Otrzymałeś 79,00 zł',
          text: 'Jan Kowalski przesłał Ci 79,00 zł',
        }),
      })
      const resAuth = await postPaymentNotification(reqAuth)
      assert.equal(resAuth.status, 200)
      const dataAuth = await resAuth.json()
      assert.equal(dataAuth.ok, true)
      assert.equal(dataAuth.result.matched, true)
      assert.equal(dataAuth.result.bookingId, created.booking.id)
      assert.equal(dataAuth.result.amount, 79)

      // 5. Verify booking in DB is now paid and confirmed
      const afterBooking = await getBookingById(created.booking.id)
      assert.equal(afterBooking?.paymentStatus, 'paid')
      assert.equal(afterBooking?.bookingStatus, 'confirmed')

      // 6. Verify confirmation SMS was automatically enqueued for Xperia
      const smsQueue = await listSmsQueue()
      const confSms = smsQueue.find((s) => s.bookingId === created.booking.id && s.type === 'payment_confirmed')
      assert.ok(confSms)
      assert.equal(confSms.status, 'pending')
      assert.match(confSms.message, /Wpłata 79 zł została zaksięgowana/)
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('phone job lifecycle: claimed, no_answer retry scheduling, and dropped recovery', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-job-lifecycle', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local', PHONE_AGENT_TOKEN: 'secret-token-job' }, async () => {
      const { POST: postJob, GET: getJob } = await import('@/app/api/phone-agent/job/route')
      const { getBookingById, updateBookingCallState } = await import('@/lib/server/db')

      const bookingDate = '2030-03-12'
      await createAvailabilitySlot(bookingDate, '10:00')
      const created = await createPendingBooking({
        ownerName: 'Piotr Testowy',
        serviceType: 'szybka-konsultacja-15-min',
        problemType: 'agresja',
        animalType: 'Pies',
        petAge: '3 lata',
        durationNotes: 'Test połączenia',
        description: 'Pies szczeka',
        phone: '500111222',
        email: 'piotr@example.com',
        slotId: `${bookingDate}-10:00`,
      })

      // Mark paid and phone_agent_pending
      await markBookingPaid(created.booking.id, { consultationMode: 'phone' })
      await updateBookingCallState(created.booking.id, {
        callStatus: 'phone_agent_pending',
      })

      // 1. GET job returns candidate
      const reqGet = new NextRequest('http://localhost:3000/api/phone-agent/job', {
        headers: { Authorization: 'Bearer secret-token-job' },
      })
      const resGet = await getJob(reqGet)
      assert.equal(resGet.status, 200)
      const dataGet = await resGet.json()
      assert.ok(dataGet.job)
      assert.equal(dataGet.job.id, created.booking.id)

      // 2. Report "no_answer" (1st attempt) => schedules 2nd attempt in 2 minutes
      const reqNoAnswer = new NextRequest('http://localhost:3000/api/phone-agent/job', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-token-job',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: created.booking.id, event: 'no_answer' }),
      })
      const resNoAnswer = await postJob(reqNoAnswer)
      assert.equal(resNoAnswer.status, 200)

      const bAfterNoAnswer = await getBookingById(created.booking.id)
      assert.equal(bAfterNoAnswer?.callStatus, 'phone_agent_pending')
      assert.ok(bAfterNoAnswer?.callNextAttemptAt)
      assert.match(bAfterNoAnswer?.callLastError || '', /2\. próbę za 2 minuty/)

      // 3. Right now GET job should skip because callNextAttemptAt is in future
      const resGetSkipped = await getJob(reqGet)
      const dataGetSkipped = await resGetSkipped.json()
      assert.equal(dataGetSkipped.job, null)

      // 4. Report "started" => call is active
      const reqStarted = new NextRequest('http://localhost:3000/api/phone-agent/job', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-token-job',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: created.booking.id, event: 'started' }),
      })
      const resStarted = await postJob(reqStarted)
      assert.equal(resStarted.status, 200)

      const bStarted = await getBookingById(created.booking.id)
      assert.equal(bStarted?.callStatus, 'phone_agent_active')
      assert.ok(bStarted?.callAnsweredAt)

      // 5. Report "dropped" => schedules quick reconnect in 30 seconds
      const reqDropped = new NextRequest('http://localhost:3000/api/phone-agent/job', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-token-job',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: created.booking.id, event: 'dropped' }),
      })
      const resDropped = await postJob(reqDropped)
      assert.equal(resDropped.status, 200)

      const bDropped = await getBookingById(created.booking.id)
      assert.equal(bDropped?.callStatus, 'phone_agent_pending')
      assert.match(bDropped?.callLastError || '', /wznowienie za 30 sekund/)

      // 6. Report "ended" => completed
      const reqEnded = new NextRequest('http://localhost:3000/api/phone-agent/job', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer secret-token-job',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: created.booking.id, event: 'ended' }),
      })
      const resEnded = await postJob(reqEnded)
      assert.equal(resEnded.status, 200)

      const bEnded = await getBookingById(created.booking.id)
      assert.equal(bEnded?.callStatus, 'phone_agent_completed')
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('cancelPendingBookingSms invalidates only pending reminders for specified booking', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-cancel-sms', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local' }, async () => {
      // 1. Pending reminder for booking-1
      const item1 = await enqueueSms({
        bookingId: 'booking-1',
        phone: '500600700',
        message: 'Reminder 60m',
        type: 'reminder_60m',
        idempotencyKey: 'reminder_60m:booking-1:2026-09-20_14:00',
      })

      // 2. Already sent reminder for booking-1
      const item2 = await enqueueSms({
        bookingId: 'booking-1',
        phone: '500600700',
        message: 'Previous reminder',
        type: 'reminder_15m',
        idempotencyKey: 'reminder_15m:booking-1:2026-09-20_14:00',
      })
      await reportSmsResult(item2.id, 'sent')

      // 3. Pending reminder for booking-2
      const item3 = await enqueueSms({
        bookingId: 'booking-2',
        phone: '500600701',
        message: 'Reminder for booking 2',
        type: 'reminder_60m',
        idempotencyKey: 'reminder_60m:booking-2:2026-09-20_15:00',
      })

      // Cancel booking-1
      const cancelledCount = await cancelPendingBookingSms('booking-1', 'booking_cancelled')
      assert.equal(cancelledCount, 1)

      const queue = await listSmsQueue(10)
      const q1 = queue.find((i) => i.id === item1.id)
      const q2 = queue.find((i) => i.id === item2.id)
      const q3 = queue.find((i) => i.id === item3.id)

      assert.equal(q1?.status, 'failed')
      assert.equal(q1?.error, 'booking_cancelled')
      assert.equal(q2?.status, 'sent') // unchanged
      assert.equal(q3?.status, 'pending') // unchanged
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('cancelPendingLiveAvailabilitySms invalidates live notifications when mode disabled', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-cancel-live-sms', process.cwd())

  try {
    await withEnv({ APP_DATA_MODE: 'local' }, async () => {
      const liveSms = await enqueueSms({
        bookingId: null,
        phone: '500600700',
        message: 'Zapytaj live jest dostępne',
        type: 'custom',
        idempotencyKey: 'zapytaj-live-availability-req-123',
      })

      const normalSms = await enqueueSms({
        bookingId: 'booking-99',
        phone: '500600700',
        message: 'Normalny SMS',
        type: 'reminder_15m',
        idempotencyKey: 'reminder_15m:booking-99:2026-09-20_16:00',
      })

      const count = await cancelPendingLiveAvailabilitySms('live_availability_expired')
      assert.equal(count, 1)

      const queue = await listSmsQueue(10)
      const qLive = queue.find((i) => i.id === liveSms.id)
      const qNormal = queue.find((i) => i.id === normalSms.id)

      assert.equal(qLive?.status, 'failed')
      assert.equal(qLive?.error, 'live_availability_expired')
      assert.equal(qNormal?.status, 'pending')
    })
  } finally {
    await sandbox.cleanup()
  }
})

test('sendPaymentConfirmationSms routes through phone_agent queue when configured', async () => {
  const sandbox = await createLocalDataSandbox('phone-agent-sms-dispatch', process.cwd())

  try {
    await withEnv(
      {
        APP_DATA_MODE: 'local',
        SMS_PROVIDER: 'phone_agent',
      },
      async () => {
        const result = await sendPaymentConfirmationSms({
          id: '00000000-0000-0000-0000-000000000001',
          phone: '505848889',
          customerPhoneNormalized: '+48505848889',
          bookingDate: '2026-09-20',
          bookingTime: '15:00',
          serviceType: 'zapytaj_telefon',
          amount: 89,
        })

        assert.equal(result.status, 'sent')
        assert.equal(result.normalizedPhone, '+48505848889')
        assert.ok(result.providerMessageId)

        const queue = await listSmsQueue(10)
        const queuedItem = queue.find((i) => i.id === result.providerMessageId)
        assert.ok(queuedItem)
        assert.equal(queuedItem.type, 'payment_confirmed')
        assert.equal(queuedItem.status, 'pending')
        assert.equal(queuedItem.idempotencyKey, 'payment_confirmed:00000000-0000-0000-0000-000000000001')
        assert.match(queuedItem.message, /Potwierdzenie płatności/)
      },
    )
  } finally {
    await sandbox.cleanup()
  }
})
