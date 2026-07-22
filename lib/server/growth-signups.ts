import { randomBytes } from 'crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { resolveDataMode } from '@/lib/server/env'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'

export type GrowthSignupKind = 'newsletter' | 'lead_magnet'

export type GrowthSignupRecord = {
  id: string
  email: string
  kind: GrowthSignupKind
  leadMagnetSlug: string | null
  location: string | null
  sourcePage: string | null
  segment: string | null
  createdAt: string
  welcomeSentAt: string | null
  followUpThreeSentAt: string | null
  followUpSevenSentAt: string | null
  marketingOptIn: boolean
  marketingOptInAt: string | null
  marketingUnsubscribedAt: string | null
  unsubscribeToken: string | null
}

type GrowthSignupInput = {
  email: string
  kind: GrowthSignupKind
  leadMagnetSlug?: string | null
  location?: string | null
  sourcePage?: string | null
  segment?: string | null
  marketingOptIn?: boolean
}

function getSignupId(input: GrowthSignupInput) {
  return [input.kind, input.leadMagnetSlug ?? 'none', input.email.trim().toLowerCase()].join(':')
}

function shouldUseSupabase() {
  return (
    resolveDataMode('growth signups') === 'supabase' &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  )
}

function getSupabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function getStorePath() {
  return path.join(getLocalStoreDataDir(), 'growth-signups.json')
}

function createUnsubscribeToken() {
  return randomBytes(32).toString('base64url')
}

function toGrowthSignupRecord(row: Partial<GrowthSignupRecord>): GrowthSignupRecord {
  return {
    id: row.id ?? '',
    email: row.email ?? '',
    kind: row.kind === 'newsletter' ? 'newsletter' : 'lead_magnet',
    leadMagnetSlug: row.leadMagnetSlug ?? null,
    location: row.location ?? null,
    sourcePage: row.sourcePage ?? null,
    segment: row.segment ?? null,
    createdAt: row.createdAt ?? new Date(0).toISOString(),
    welcomeSentAt: row.welcomeSentAt ?? null,
    followUpThreeSentAt: row.followUpThreeSentAt ?? null,
    followUpSevenSentAt: row.followUpSevenSentAt ?? null,
    // Rekordy zapisane przed wdrożeniem zgody nie mogą uruchamiać follow-upów.
    marketingOptIn: row.marketingOptIn === true,
    marketingOptInAt: row.marketingOptInAt ?? null,
    marketingUnsubscribedAt: row.marketingUnsubscribedAt ?? null,
    unsubscribeToken: row.unsubscribeToken ?? null,
  }
}

async function ensureLocalStore() {
  const filePath = getStorePath()
  await mkdir(path.dirname(filePath), { recursive: true })

  try {
    const raw = await readFile(filePath, 'utf8')
    JSON.parse(raw)
  } catch {
    await writeLocalRecords([])
  }
}

async function readLocalRecords(): Promise<GrowthSignupRecord[]> {
  await ensureLocalStore()
  const records = JSON.parse(await readFile(getStorePath(), 'utf8')) as Array<Partial<GrowthSignupRecord>>
  return records.map(toGrowthSignupRecord)
}

async function writeLocalRecords(records: GrowthSignupRecord[]) {
  const filePath = getStorePath()
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempFilePath, JSON.stringify(records, null, 2), 'utf8')

  try {
    await rename(tempFilePath, filePath)
  } finally {
    await rm(tempFilePath, { force: true })
  }
}

export async function upsertGrowthSignup(input: GrowthSignupInput): Promise<GrowthSignupRecord> {
  const nowIso = new Date().toISOString()
  const marketingOptIn = input.marketingOptIn === true
  const record: GrowthSignupRecord = {
    id: getSignupId(input),
    email: input.email.trim().toLowerCase(),
    kind: input.kind,
    leadMagnetSlug: input.leadMagnetSlug ?? null,
    location: input.location ?? null,
    sourcePage: input.sourcePage ?? null,
    segment: input.segment ?? null,
    createdAt: nowIso,
    welcomeSentAt: null,
    followUpThreeSentAt: null,
    followUpSevenSentAt: null,
    marketingOptIn,
    marketingOptInAt: marketingOptIn ? nowIso : null,
    marketingUnsubscribedAt: null,
    unsubscribeToken: marketingOptIn ? createUnsubscribeToken() : null,
  }

  if (shouldUseSupabase()) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('growth_signups')
      .upsert(
        {
          id: record.id,
          email: record.email,
          kind: record.kind,
          lead_magnet_slug: record.leadMagnetSlug,
          location: record.location,
          source_page: record.sourcePage,
          segment: record.segment,
          created_at: nowIso,
          marketing_opt_in: record.marketingOptIn,
          marketing_opt_in_at: record.marketingOptInAt,
          marketing_unsubscribed_at: record.marketingUnsubscribedAt,
          unsubscribe_token: record.unsubscribeToken,
        },
        { onConflict: 'id' },
      )
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      email: data.email,
      kind: data.kind,
      leadMagnetSlug: data.lead_magnet_slug,
      location: data.location,
      sourcePage: data.source_page,
      segment: data.segment,
      createdAt: data.created_at,
      welcomeSentAt: data.welcome_sent_at,
      followUpThreeSentAt: data.followup_three_sent_at,
      followUpSevenSentAt: data.followup_seven_sent_at,
      marketingOptIn: data.marketing_opt_in === true,
      marketingOptInAt: data.marketing_opt_in_at,
      marketingUnsubscribedAt: data.marketing_unsubscribed_at,
      unsubscribeToken: data.unsubscribe_token,
    }
  }

  const records = await readLocalRecords()
  const existingIndex = records.findIndex((item) => item.id === record.id)

  if (existingIndex >= 0) {
    const existing = records[existingIndex]!
    record.createdAt = existing.createdAt
    record.welcomeSentAt = existing.welcomeSentAt
    record.followUpThreeSentAt = existing.followUpThreeSentAt
    record.followUpSevenSentAt = existing.followUpSevenSentAt
    records[existingIndex] = record
  } else {
    records.unshift(record)
  }

  await writeLocalRecords(records)
  return record
}

export async function listGrowthSignups(): Promise<GrowthSignupRecord[]> {
  if (shouldUseSupabase()) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from('growth_signups').select('*').order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      kind: row.kind,
      leadMagnetSlug: row.lead_magnet_slug,
      location: row.location,
      sourcePage: row.source_page,
      segment: row.segment,
      createdAt: row.created_at,
      welcomeSentAt: row.welcome_sent_at,
      followUpThreeSentAt: row.followup_three_sent_at,
      followUpSevenSentAt: row.followup_seven_sent_at,
      marketingOptIn: row.marketing_opt_in === true,
      marketingOptInAt: row.marketing_opt_in_at,
      marketingUnsubscribedAt: row.marketing_unsubscribed_at,
      unsubscribeToken: row.unsubscribe_token,
    }))
  }

  return readLocalRecords()
}

export async function unsubscribeGrowthSignupByToken(token: string): Promise<boolean> {
  const normalizedToken = token.trim()

  if (normalizedToken.length < 32) {
    return false
  }

  const nowIso = new Date().toISOString()

  if (shouldUseSupabase()) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('growth_signups')
      .update({
        marketing_opt_in: false,
        marketing_unsubscribed_at: nowIso,
      })
      .eq('unsubscribe_token', normalizedToken)
      .is('marketing_unsubscribed_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      throw error
    }

    return Boolean(data)
  }

  const records = await readLocalRecords()
  let unsubscribed = false
  const updated = records.map((record) => {
    if (record.unsubscribeToken !== normalizedToken || record.marketingUnsubscribedAt) {
      return record
    }

    unsubscribed = true
    return {
      ...record,
      marketingOptIn: false,
      marketingUnsubscribedAt: nowIso,
    }
  })

  if (unsubscribed) {
    await writeLocalRecords(updated)
  }

  return unsubscribed
}

export async function markGrowthSignupStageSent(
  signupId: string,
  stage: 'welcome' | 'followup_three' | 'followup_seven',
): Promise<void> {
  const nowIso = new Date().toISOString()

  if (shouldUseSupabase()) {
    const supabase = getSupabaseAdmin()
    const patch =
      stage === 'welcome'
        ? { welcome_sent_at: nowIso }
        : stage === 'followup_three'
          ? { followup_three_sent_at: nowIso }
          : { followup_seven_sent_at: nowIso }
    const { error } = await supabase.from('growth_signups').update(patch).eq('id', signupId)

    if (error) {
      throw error
    }

    return
  }

  const records = await readLocalRecords()
  const updated = records.map((record) =>
    record.id === signupId
      ? {
          ...record,
          welcomeSentAt: stage === 'welcome' ? nowIso : record.welcomeSentAt,
          followUpThreeSentAt: stage === 'followup_three' ? nowIso : record.followUpThreeSentAt,
          followUpSevenSentAt: stage === 'followup_seven' ? nowIso : record.followUpSevenSentAt,
        }
      : record,
  )

  await writeLocalRecords(updated)
}
