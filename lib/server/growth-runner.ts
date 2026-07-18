import { getLeadMagnetBySlug } from '@/lib/active-lead-magnets'
import {
  listGrowthSignups,
  markGrowthSignupStageSent,
  type GrowthSignupRecord,
} from '@/lib/server/growth-signups'
import {
  sendLeadMagnetFollowUpThreeEmail,
  sendLeadMagnetFollowUpSevenEmail,
} from '@/lib/server/notifications'
import { ConfigurationError, getBaseUrl } from '@/lib/server/env'
import { getReminderAuthorizationError } from '@/lib/server/reminder-runner'

export type GrowthRunResult = {
  checked: number
  dueThreeDay: number
  dueSevenDay: number
  sent: number
  skipped: number
  failed: number
}

function isDue(createdAt: string, days: number, now: number) {
  return Date.parse(createdAt) + days * 24 * 60 * 60 * 1000 <= now
}

export function isGrowthSignupEligibleForMarketingFollowups(record: GrowthSignupRecord) {
  return (
    record.kind === 'lead_magnet' &&
    Boolean(record.leadMagnetSlug) &&
    record.marketingOptIn === true &&
    !record.marketingUnsubscribedAt &&
    Boolean(record.unsubscribeToken)
  )
}

function buildGrowthUnsubscribeUrl(token: string) {
  const url = new URL('/api/growth/unsubscribe', getBaseUrl())
  url.searchParams.set('token', token)
  return url.toString()
}

export async function runGrowthFollowupSweep(): Promise<GrowthRunResult> {
  const signups = await listGrowthSignups()
  const now = Date.now()
  let sent = 0
  let skipped = 0
  let failed = 0
  let dueThreeDay = 0
  let dueSevenDay = 0

  for (const signup of signups) {
    // Follow-upy są marketingowe. Brak wyraźnej zgody (także w rekordach
    // historycznych) oznacza brak harmonogramu i brak wysyłki.
    if (!isGrowthSignupEligibleForMarketingFollowups(signup)) {
      continue
    }

    const magnet = getLeadMagnetBySlug(signup.leadMagnetSlug!)
    if (!magnet) {
      skipped += 1
      continue
    }

    if (!signup.followUpThreeSentAt && isDue(signup.createdAt, 3, now)) {
      dueThreeDay += 1
      const delivery = await sendLeadMagnetFollowUpThreeEmail(
        signup.email,
        magnet,
        buildGrowthUnsubscribeUrl(signup.unsubscribeToken!),
      )
      if (delivery.status === 'sent') {
        sent += 1
        await markGrowthSignupStageSent(signup.id, 'followup_three')
      } else if (delivery.status === 'skipped') {
        skipped += 1
      } else {
        failed += 1
      }
    }

    if (!signup.followUpSevenSentAt && isDue(signup.createdAt, 7, now)) {
      dueSevenDay += 1
      const delivery = await sendLeadMagnetFollowUpSevenEmail(
        signup.email,
        magnet,
        buildGrowthUnsubscribeUrl(signup.unsubscribeToken!),
      )
      if (delivery.status === 'sent') {
        sent += 1
        await markGrowthSignupStageSent(signup.id, 'followup_seven')
      } else if (delivery.status === 'skipped') {
        skipped += 1
      } else {
        failed += 1
      }
    }
  }

  return {
    checked: signups.length,
    dueThreeDay,
    dueSevenDay,
    sent,
    skipped,
    failed,
  }
}

export function getGrowthAuthorizationError(authorization: string | null) {
  return getReminderAuthorizationError(authorization)
}

export function assertGrowthRunnerConfigured() {
  if (!process.env.CRON_SECRET?.trim()) {
    throw new ConfigurationError('Brak konfiguracji CRON_SECRET.')
  }
}
