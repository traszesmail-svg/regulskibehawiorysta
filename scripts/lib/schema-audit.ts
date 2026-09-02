import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

type SchemaMarker = {
  label: string
  needle: string
  expectedCount: number
}

type SchemaFileStatus = {
  path: string
  exists: boolean
}

export type SchemaAuditIssue = {
  label: string
  expectedCount: number
  foundCount: number
}

export type SchemaAuditResult = {
  ok: boolean
  schemaPath: string
  requiredFiles: SchemaFileStatus[]
  missingFiles: string[]
  missingMarkers: SchemaAuditIssue[]
  summary: string
}

const REQUIRED_SCHEMA_MARKERS: SchemaMarker[] = [
  {
    label: 'bookings.qa_booking',
    needle: 'qa_booking boolean not null default false',
    expectedCount: 1,
  },
  {
    label: 'funnel_events.qa_booking',
    needle: 'qa_booking boolean not null default false',
    expectedCount: 2,
  },
  {
    label: 'bookings.payment_method',
    needle: "payment_method text check (payment_method in ('manual', 'payu', 'stripe', 'mock', 'promo'))",
    expectedCount: 1,
  },
  {
    label: 'promo_campaigns',
    needle: 'create table if not exists public.promo_campaigns',
    expectedCount: 1,
  },
  {
    label: 'promo_codes',
    needle: 'create table if not exists public.promo_codes',
    expectedCount: 1,
  },
  {
    label: 'promo_redemptions',
    needle: 'create table if not exists public.promo_redemptions',
    expectedCount: 1,
  },
  {
    label: 'promo_campaigns.campaign_kind',
    needle: "campaign_kind text not null default 'clinic' check (campaign_kind in ('clinic', 'community'))",
    expectedCount: 1,
  },
  {
    label: 'promo_campaigns.promotion_price',
    needle: 'promotion_price numeric(10,2) not null default 0 check (',
    expectedCount: 1,
  },
  {
    label: 'promo_redemptions.campaign_kind',
    needle: "campaign_kind text not null default 'clinic' check (campaign_kind in ('clinic', 'community'))",
    expectedCount: 2,
  },
  {
    label: 'push_subscriptions',
    needle: 'create table if not exists public.push_subscriptions',
    expectedCount: 1,
  },
  {
    label: 'zapytaj_live_notifications',
    needle: 'create table if not exists public.zapytaj_live_notifications',
    expectedCount: 1,
  },
  {
    label: 'bookings.payment_reference',
    needle: 'payment_reference text',
    expectedCount: 1,
  },
  {
    label: 'bookings.payu_order_id',
    needle: 'payu_order_id text',
    expectedCount: 1,
  },
  {
    label: 'bookings.payu_order_status',
    needle: 'payu_order_status text',
    expectedCount: 1,
  },
  {
    label: 'bookings.sms_confirmation_status',
    needle: 'sms_confirmation_status text check (',
    expectedCount: 1,
  },
  {
    label: 'bookings.call_attempt',
    needle: 'call_attempt integer not null default 0',
    expectedCount: 1,
  },
  {
    label: 'bookings.call_recovery_token_hash',
    needle: 'call_recovery_token_hash text',
    expectedCount: 1,
  },
  {
    label: 'bookings.consultation_access_code_hash',
    needle: 'consultation_access_code_hash text',
    expectedCount: 1,
  },
  {
    label: 'bookings.recommended_material_slug',
    needle: 'recommended_material_slug text',
    expectedCount: 1,
  },
  {
    label: 'bookings.customer_access_token_hash',
    needle: "customer_access_token_hash text not null default ''",
    expectedCount: 1,
  },
  {
    label: 'bookings.booking_status',
    needle:
      "booking_status text not null check (booking_status in ('pending', 'pending_manual_payment', 'confirmed', 'done', 'cancelled', 'expired'))",
    expectedCount: 1,
  },
  {
    label: 'bookings.payment_status',
    needle:
      "payment_status text not null check (payment_status in ('unpaid', 'pending_manual_review', 'paid', 'failed', 'rejected', 'refunded'))",
    expectedCount: 1,
  },
  {
    label: 'case_maps',
    needle: 'create table if not exists public.case_maps',
    expectedCount: 1,
  },
  {
    label: 'case_map_profile_claims',
    needle: 'create table if not exists public.case_map_profile_claims',
    expectedCount: 1,
  },
  {
    label: 'case_map_profile_claim_cleanup',
    needle: 'create or replace function public.regulski_delete_expired_case_map_profile_claims()',
    expectedCount: 1,
  },
  {
    label: 'case_map_profile_claim_token',
    needle: 'claim_token_hash text not null',
    expectedCount: 1,
  },
]

const REQUIRED_FILES = [
  'supabase/migrations/20260325_manual_payment_and_payu.sql',
  'supabase/migrations/20260406002_qa_checkout.sql',
  'supabase/migrations/20260601001_promo_codes.sql',
  'supabase/migrations/20260601005_push_subscriptions.sql',
  'supabase/migrations/20260714001_case_maps.sql',
  'supabase/migrations/20260714002_case_map_consultant_handoff.sql',
  'supabase/migrations/20260717001_case_map_analytics_and_profile_claims.sql',
  'supabase/migrations/20260717002_case_map_profile_claim_tokens.sql',
  'supabase/migrations/20260901001_zapytaj_flow.sql',
  'supabase/migrations/20260901002_zapytaj_live_notifications.sql',
  'supabase/migrations/20260901003_zapytaj_call_recovery.sql',
  'supabase/migrations/20260901004_zapytaj_zadarma_scheduler.sql',
  'supabase/migrations/20260901005_consultation_access_codes.sql',
  'supabase/migrations/20260901006_reconcile_booking_sms_columns.sql',
  'supabase/migrations/20260901007_recommendation_material.sql',
  'supabase/migrations/20260901008_community_promo_campaigns.sql',
  'supabase/migrations/20260326_sms_payment_confirmation.sql',
]

function normalizeSchemaText(schemaText: string) {
  return schemaText
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function countOccurrences(source: string, needle: string) {
  if (!needle) {
    return 0
  }

  let count = 0
  let index = source.indexOf(needle)

  while (index !== -1) {
    count += 1
    index = source.indexOf(needle, index + needle.length)
  }

  return count
}

function buildSummary(result: Pick<SchemaAuditResult, 'missingFiles' | 'missingMarkers'>) {
  const missingSections = []

  if (result.missingFiles.length > 0) {
    missingSections.push(`missing files: ${result.missingFiles.join(', ')}`)
  }

  if (result.missingMarkers.length > 0) {
    missingSections.push(
      `missing markers: ${result.missingMarkers
        .map((issue) => `${issue.label} (${issue.foundCount}/${issue.expectedCount})`)
        .join(', ')}`,
    )
  }

  if (missingSections.length === 0) {
    return 'Canonical Supabase schema and rollout migrations are in sync.'
  }

  return `Supabase schema audit failed: ${missingSections.join('; ')}.`
}

export function auditSupabaseSchemaText(schemaText: string): Omit<SchemaAuditResult, 'schemaPath' | 'requiredFiles'> {
  const normalizedSchemaText = normalizeSchemaText(schemaText)
  const missingMarkers = REQUIRED_SCHEMA_MARKERS.flatMap((marker) => {
    const foundCount = countOccurrences(normalizedSchemaText, marker.needle)

    if (foundCount >= marker.expectedCount) {
      return []
    }

    return [
      {
        label: marker.label,
        expectedCount: marker.expectedCount,
        foundCount,
      },
    ]
  })

  return {
    ok: missingMarkers.length === 0,
    missingFiles: [],
    missingMarkers,
    summary: buildSummary({ missingFiles: [], missingMarkers }),
  }
}

export function getSupabaseSchemaAudit(rootDir = process.cwd()): SchemaAuditResult {
  const schemaPath = path.join(rootDir, 'supabase', 'schema.sql')
  const requiredFiles = REQUIRED_FILES.map((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath)

    return {
      path: relativePath,
      exists: existsSync(absolutePath),
    }
  })

  const missingFiles = requiredFiles.filter((file) => !file.exists).map((file) => file.path)
  const schemaText = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf8') : ''
  const textAudit = auditSupabaseSchemaText(schemaText)

  return {
    ok: missingFiles.length === 0 && textAudit.ok,
    schemaPath,
    requiredFiles,
    missingFiles,
    missingMarkers: textAudit.missingMarkers,
    summary: buildSummary({ missingFiles, missingMarkers: textAudit.missingMarkers }),
  }
}
