import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPendingBooking, getBookingById, listAvailabilityAdmin, markBookingClinicPhoneUpgrade } from '@/lib/server/db'
import {
  createCommunityPromoBooking,
  createPromoCampaign,
  listPromoCampaigns,
  PromoCodeValidationError,
  redeemPromoCodeForBooking,
  validatePromoCodeForService,
} from '@/lib/server/promo-codes'
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

test('clinic code returns the logo assigned to its campaign', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
    },
    async () => {
      const sandbox = await createLocalDataSandbox('promo-clinic-logo', process.cwd())

      try {
        const campaign = await createPromoCampaign({
          clinicName: 'Lecznica z logo',
          logoSrc: '/branding/clinics/lecznica-z-logo/logo.svg',
          codeCount: 1,
          expiresAt: '2035-12-31',
        })

        const validated = await validatePromoCodeForService(campaign.codes[0])

        assert.equal(validated.clinicName, 'Lecznica z logo')
        assert.equal(validated.clinicLogoSrc, '/branding/clinics/lecznica-z-logo/logo.svg')
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})

test('clinic code keeps Jitsi until a paid phone upgrade supplies a valid phone', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      ADMIN_NOTIFICATION_EMAIL: null,
      RESEND_API_KEY: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('promo-clinic-channel', process.cwd())
      try {
        const slot = (await listAvailabilityAdmin()).find((item) =>
          isAvailabilitySlotBookableForService(item, 'szybka-konsultacja-15-min'),
        )
        assert.ok(slot, 'Expected a seeded Kwadrans slot.')

        const campaign = await createPromoCampaign({ clinicName: 'Lecznica Kanał', codeCount: 1, expiresAt: '2035-12-31' })
        await validatePromoCodeForService(campaign.codes[0])
        await validatePromoCodeForService(campaign.codes[0])
        const [beforeRedemption] = await listPromoCampaigns()
        assert.equal(beforeRedemption.activeCount, 1, 'Validation must not consume the code.')

        const created = await createQuickBooking(slot.id, 'promo-channel@example.com')
        const redeemed = await redeemPromoCodeForBooking(created.booking, campaign.codes[0], 'jitsi')
        assert.equal(redeemed.booking.consultationMode, 'jitsi')
        assert.equal(redeemed.booking.phone, '')

        await assert.rejects(
          () => markBookingClinicPhoneUpgrade(created.booking.id, ''),
          /poprawny numer telefonu/i,
        )
        const withoutUpgrade = await getBookingById(created.booking.id)
        assert.equal(withoutUpgrade?.consultationMode, 'jitsi', 'Unpaid/invalid phone upgrade must keep Jitsi.')

        const upgraded = await markBookingClinicPhoneUpgrade(created.booking.id, '500 600 700')
        assert.equal(upgraded?.consultationMode, 'phone')
        assert.equal(upgraded?.customerPhoneNormalized, '+48500600700')
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})

test('community campaign prices Zapytaj at 39.99, allows one email, and releases a code after expiry', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      ADMIN_NOTIFICATION_EMAIL: null,
      RESEND_API_KEY: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('promo-community', process.cwd())

      try {
        const slots = (await listAvailabilityAdmin()).filter((slot) =>
          isAvailabilitySlotBookableForService(slot, 'szybka-konsultacja-15-min'),
        )
        assert.ok(slots.length >= 3, 'Expected at least three seeded Kwadrans slots.')

        const campaign = await createPromoCampaign({
          clinicName: 'Grupa FB — wrzesień',
          kind: 'community',
          codeCount: 2,
          expiresAt: '2035-12-31',
        })

        assert.equal(campaign.campaign.kind, 'community')
        assert.equal(campaign.campaign.promotionPricePln, 39.99)
        assert.match(campaign.codes[0], /^GRP-/)

        const first = await createCommunityPromoBooking({
          code: campaign.codes[0],
          ownerName: 'Klient Grupy',
          problemType: 'inne',
          animalType: 'Pies',
          petAge: '',
          durationNotes: '',
          description: 'Pies reaguje szczekaniem na codzienne sytuacje.',
          phone: '500 600 700',
          email: 'community@example.com',
          slotId: slots[0].id,
        })

        assert.equal(first.booking.amount, 39.99)
        assert.equal(first.booking.paymentStatus, 'unpaid')
        assert.equal(first.claim.kind, 'community')

        await assert.rejects(
          () =>
            createCommunityPromoBooking({
              code: campaign.codes[1],
              ownerName: 'Klient Grupy',
              problemType: 'inne',
              animalType: 'Pies',
              petAge: '',
              durationNotes: '',
              description: 'Drugi opis tej samej osoby w kampanii.',
              phone: '500 600 700',
              email: 'community@example.com',
              slotId: slots[1].id,
            }),
          (error) => {
            assert.ok(error instanceof PromoCodeValidationError)
            assert.match((error as Error).message, /jeden kod/i)
            return true
          },
        )

        await (await import('@/lib/server/db')).markBookingExpired(first.booking.id)

        const reused = await createCommunityPromoBooking({
          code: campaign.codes[0],
          ownerName: 'Klient Grupy',
          problemType: 'inne',
          animalType: 'Pies',
          petAge: '',
          durationNotes: '',
          description: 'Po wygaśnięciu rezerwacji kod wraca do puli.',
          phone: '500 600 700',
          email: 'community@example.com',
          slotId: slots[1].id,
        })

        assert.equal(reused.booking.amount, 39.99)
        assert.equal((await listPromoCampaigns())[0]?.usedCount, 1)
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})
