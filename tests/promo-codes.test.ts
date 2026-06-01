import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPendingBooking, getBookingById, listAvailabilityAdmin } from '@/lib/server/db'
import { createPromoCampaign, listPromoCampaigns, redeemPromoCodeForBooking } from '@/lib/server/promo-codes'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

function withEnv(
  overrides: Record<string, string | null | undefined>,
  run: () => void | Promise<void>,
) {
  const previous = new Map<string, string | undefined>()
  const restore = () => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])

    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  const result = run()

  if (result && typeof (result as Promise<void>).then === 'function') {
    return (result as Promise<void>).finally(restore)
  }

  restore()
}

async function createQuickBooking(slotId: string, email: string) {
  return createPendingBooking({
    ownerName: 'Test Promo',
    serviceType: 'szybka-konsultacja-15-min',
    problemType: 'separacja',
    animalType: 'Pies',
    petAge: '',
    durationNotes: '',
    description: 'Test jednorazowego kodu promocyjnego.',
    phone: '',
    email,
    slotId,
  })
}

test('promo code confirms a Kwadrans booking once and cannot be reused', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      ADMIN_NOTIFICATION_EMAIL: null,
      RESEND_API_KEY: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('promo-codes', process.cwd())

      try {
        const slots = (await listAvailabilityAdmin()).filter((slot) =>
          isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min'),
        )
        assert.ok(slots.length >= 2, 'Expected at least two seeded Kwadrans slots.')

        const campaign = await createPromoCampaign({
          clinicName: 'Lecznica Testowa',
          codeCount: 1,
          expiresAt: '2035-12-31',
        })
        const booking = await createQuickBooking(slots[0].id, 'promo-a@example.com')
        const redeemed = await redeemPromoCodeForBooking(booking.booking, campaign.codes[0])
        const paidBooking = await getBookingById(booking.booking.id)

        assert.equal(redeemed.booking.paymentStatus, 'paid')
        assert.equal(redeemed.booking.bookingStatus, 'confirmed')
        assert.equal(redeemed.booking.paymentMethod, 'promo')
        assert.equal(paidBooking?.paymentMethod, 'promo')
        assert.match(paidBooking?.paymentReference ?? '', /PROMO Lecznica Testowa/)

        const [summary] = await listPromoCampaigns()
        assert.equal(summary.usedCount, 1)
        assert.equal(summary.activeCount, 0)

        const secondBooking = await createQuickBooking(slots[1].id, 'promo-b@example.com')
        await assert.rejects(
          () => redeemPromoCodeForBooking(secondBooking.booking, campaign.codes[0]),
          /wykorzystany/i,
        )

        const unpaidSecondBooking = await getBookingById(secondBooking.booking.id)
        assert.equal(unpaidSecondBooking?.paymentStatus, 'unpaid')
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})
