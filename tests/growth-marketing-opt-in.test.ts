import assert from 'node:assert/strict'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { test } from 'node:test'
import { POST as postGrowthSignup } from '@/app/api/growth/signup/route'
import { POST as postGrowthUnsubscribe } from '@/app/api/growth/unsubscribe/route'
import { getLeadMagnetBySlug } from '@/lib/active-lead-magnets'
import {
  listGrowthSignups,
  upsertGrowthSignup,
  type GrowthSignupRecord,
} from '@/lib/server/growth-signups'
import {
  isGrowthSignupEligibleForMarketingFollowups,
  runGrowthFollowupSweep,
} from '@/lib/server/growth-runner'
import { sendLeadMagnetFollowUpThreeEmail } from '@/lib/server/notifications'
import { createLocalDataSandbox } from '@/scripts/lib/local-data-sandbox'

function withEnv(overrides: Record<string, string | null | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key])

    if (typeof value === 'string') {
      process.env[key] = value
    } else {
      delete process.env[key]
    }
  }

  return run().finally(() => {
    for (const [key, value] of previous.entries()) {
      if (typeof value === 'string') {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    }
  })
}

async function ageSignup(dataDir: string, signupId: string) {
  const storePath = path.join(dataDir, 'growth-signups.json')
  const records = JSON.parse(await readFile(storePath, 'utf8')) as GrowthSignupRecord[]
  const record = records.find((item) => item.id === signupId)

  assert.ok(record)
  record.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  await writeFile(storePath, JSON.stringify(records, null, 2), 'utf8')
}

test('lead-magnet follow-ups require explicit opt-in and stop after unsubscribe', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      MAIL_PROVIDER: 'resend',
      RESEND_API_KEY: null,
      RESEND_FROM_EMAIL: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('growth-marketing-opt-in')

      try {
        const withoutConsent = await upsertGrowthSignup({
          kind: 'lead_magnet',
          email: 'bez-zgody@example.com',
          leadMagnetSlug: '30-zachowan',
          marketingOptIn: false,
        })
        await ageSignup(sandbox.dataDir, withoutConsent.id)

        assert.equal(isGrowthSignupEligibleForMarketingFollowups(withoutConsent), false)
        const noConsentRun = await runGrowthFollowupSweep()
        assert.deepEqual(noConsentRun, {
          checked: 1,
          dueThreeDay: 0,
          dueSevenDay: 0,
          sent: 0,
          skipped: 0,
          failed: 0,
        })

        const withConsent = await upsertGrowthSignup({
          kind: 'lead_magnet',
          email: 'ze-zgoda@example.com',
          leadMagnetSlug: '30-zachowan',
          marketingOptIn: true,
        })
        await ageSignup(sandbox.dataDir, withConsent.id)

        assert.equal(isGrowthSignupEligibleForMarketingFollowups(withConsent), true)
        assert.ok(withConsent.unsubscribeToken)

        // W trybie wyłączonych e-maili runner może policzyć tylko zapis ze zgodą,
        // ale nie wysyła żadnej wiadomości na zewnątrz.
        const consentRun = await runGrowthFollowupSweep()
        assert.equal(consentRun.dueThreeDay, 1)
        assert.equal(consentRun.dueSevenDay, 1)
        assert.equal(consentRun.sent, 0)
        assert.equal(consentRun.skipped, 2)

        const unsubscribeResponse = await postGrowthUnsubscribe(
          new Request('https://example.test/api/growth/unsubscribe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: withConsent.unsubscribeToken }),
          }),
        )
        assert.equal(unsubscribeResponse.status, 200)
        assert.match(await unsubscribeResponse.text(), /Dodatkowe wiadomości są wyłączone/)

        const stored = await listGrowthSignups()
        const unsubscribed = stored.find((record) => record.id === withConsent.id)
        assert.ok(unsubscribed)
        assert.equal(unsubscribed.marketingOptIn, false)
        assert.ok(unsubscribed.marketingUnsubscribedAt)
        assert.equal(isGrowthSignupEligibleForMarketingFollowups(unsubscribed), false)

        const afterUnsubscribeRun = await runGrowthFollowupSweep()
        assert.equal(afterUnsubscribeRun.dueThreeDay, 0)
        assert.equal(afterUnsubscribeRun.dueSevenDay, 0)
        assert.equal(afterUnsubscribeRun.sent, 0)
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})

test('lead-magnet API keeps the PDF available without promising an unconfirmed email', async () => {
  await withEnv(
    {
      APP_DATA_MODE: 'local',
      CUSTOMER_EMAIL_MODE: 'disabled',
      MAIL_PROVIDER: 'resend',
      RESEND_API_KEY: null,
      RESEND_FROM_EMAIL: null,
    },
    async () => {
      const sandbox = await createLocalDataSandbox('growth-delivery-wording')

      try {
        const response = await postGrowthSignup(
          new Request('https://example.test/api/growth/signup', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              kind: 'lead_magnet',
              email: 'material@example.com',
              leadMagnetSlug: '30-zachowan',
              location: 'test',
              sourcePage: '/test',
              marketingOptIn: false,
            }),
          }),
        )
        const payload = (await response.json()) as {
          ok?: boolean
          emailDelivery?: string
          downloadUrl?: string
          message?: string
        }

        assert.equal(response.status, 200)
        assert.equal(payload.ok, true)
        assert.equal(payload.emailDelivery, 'skipped')
        assert.equal(payload.downloadUrl, '/api/lead-magnet/30-zachowan')
        assert.match(payload.message ?? '', /bezpośrednio na tej stronie/i)
        assert.doesNotMatch(payload.message ?? '', /wysłałem/i)

        const [signup] = await listGrowthSignups()
        assert.equal(signup.marketingOptIn, false)
        assert.equal(signup.unsubscribeToken, null)

        const honeypotResponse = await postGrowthSignup(
          new Request('https://example.test/api/growth/signup', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': '203.0.113.92',
            },
            body: JSON.stringify({
              kind: 'lead_magnet',
              email: 'bot@example.com',
              leadMagnetSlug: '30-zachowan',
              website: 'https://spam.example',
            }),
          }),
        )
        assert.equal(honeypotResponse.status, 200)
        const honeypotPayload = (await honeypotResponse.json()) as { ok?: boolean }
        assert.equal(honeypotPayload.ok, true)
        assert.equal((await listGrowthSignups()).length, 1)

        let limitedResponse: Response | null = null
        for (let index = 0; index < 6; index += 1) {
          limitedResponse = await postGrowthSignup(
            new Request('https://example.test/api/growth/signup', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '203.0.113.93',
              },
              body: JSON.stringify({}),
            }),
          )
        }
        assert.equal(limitedResponse?.status, 429)
        assert.ok(Number(limitedResponse?.headers.get('Retry-After')) > 0)
      } finally {
        await sandbox.cleanup()
      }
    },
  )
})

test('marketing template always carries a usable unsubscribe link', async () => {
  const sentEmails: Array<{ html?: string; text?: string }> = []
  const originalFetch = globalThis.fetch
  const magnet = getLeadMagnetBySlug('30-zachowan')

  assert.ok(magnet)

  try {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (_input, init) => {
      sentEmails.push(JSON.parse(String(init?.body)) as { html?: string; text?: string })
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch

    await withEnv(
      {
        CUSTOMER_EMAIL_MODE: 'auto',
        MAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: 'Regulski Behawiorysta <kontakt@regulskibehawiorysta.pl>',
      },
      async () => {
        const unsubscribeUrl =
          'https://regulskibehawiorysta.pl/api/growth/unsubscribe?token=12345678901234567890123456789012'
        const delivery = await sendLeadMagnetFollowUpThreeEmail('odbiorca@example.com', magnet, unsubscribeUrl)

        assert.equal(delivery.status, 'sent')
        assert.equal(sentEmails.length, 1)
        assert.match(sentEmails[0]?.html ?? '', /Wypisz się z tych wiadomości/)
        assert.match(sentEmails[0]?.html ?? '', /api\/growth\/unsubscribe\?token=/)
        assert.match(sentEmails[0]?.text ?? '', /Wypisz się:/)

        const withoutLink = await sendLeadMagnetFollowUpThreeEmail('odbiorca@example.com', magnet, '')
        assert.equal(withoutLink.status, 'skipped')
        assert.equal(sentEmails.length, 1)
      },
    )
  } finally {
    ;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch
  }
})
