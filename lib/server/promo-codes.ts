import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { resolveBookingServiceType, type BookingServiceType } from '@/lib/booking-services'
import { DEFAULT_PROMO_CODE_COUNT, MAX_PROMO_CODE_COUNT, PROMO_CODE_SERVICE_TYPE } from '@/lib/promo-codes'
import { markBookingPaid } from '@/lib/server/db'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'
import type { BookingRecord, ConsultationMode } from '@/lib/types'

export { DEFAULT_PROMO_CODE_COUNT, MAX_PROMO_CODE_COUNT, PROMO_CODE_SERVICE_TYPE }

const PROMO_STORE_FILE = 'promo-codes.json'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

type PromoCampaignStatus = 'active' | 'paused' | 'archived'
type PromoCodeStatus = 'active' | 'used' | 'revoked' | 'expired'

export type PromoCampaignRecord = {
  id: string
  clinicName: string
  logoSrc: string | null
  serviceType: BookingServiceType
  codeCount: number
  status: PromoCampaignStatus
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

type PromoCodeRecord = {
  id: string
  campaignId: string
  codeHash: string
  codeLabel: string
  serviceType: BookingServiceType
  usageLimit: number
  usageCount: number
  status: PromoCodeStatus
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  usedAt: string | null
}

type PromoRedemptionRecord = {
  id: string
  codeId: string
  campaignId: string
  bookingId: string
  customerEmail: string
  serviceType: BookingServiceType
  redeemedAt: string
  releasedAt: string | null
  meta: Record<string, string | number | boolean | null>
}

type PromoStoreShape = {
  campaigns: PromoCampaignRecord[]
  codes: PromoCodeRecord[]
  redemptions: PromoRedemptionRecord[]
}

type PromoCampaignRow = {
  id: string
  clinic_name: string
  logo_src?: string | null
  service_type: string
  code_count: number
  status: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

type PromoCodeRow = {
  id: string
  campaign_id: string
  code_hash: string
  code_label: string
  service_type: string
  usage_limit: number
  usage_count: number
  status: string
  expires_at: string | null
  created_at: string
  updated_at: string
  used_at: string | null
}

type PromoRedemptionRow = {
  id: string
  code_id: string
  campaign_id: string
  booking_id: string
  customer_email: string
  service_type: string
  redeemed_at: string
  released_at: string | null
  meta: Record<string, string | number | boolean | null> | null
}

export type PromoCodeSummary = {
  id: string
  codeLabel: string
  status: PromoCodeStatus
  usageCount: number
  usageLimit: number
  expiresAt: string | null
  usedAt: string | null
}

export type PromoCampaignSummary = PromoCampaignRecord & {
  generatedCount: number
  usedCount: number
  activeCount: number
  lastUsedAt: string | null
  codes: PromoCodeSummary[]
}

export type PromoCampaignCreationResult = {
  campaign: PromoCampaignSummary
  codes: string[]
}

type PromoCodeClaim = {
  codeId: string
  campaignId: string
  redemptionId: string
  clinicName: string
  paymentReference: string
}

type CreatePromoCampaignInput = {
  clinicName: string
  logoSrc?: string | null
  codeCount?: number | string | null
  expiresAt?: string | null
}

let queue = Promise.resolve()

function withLock<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work)
  queue = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function nowIso() {
  return new Date().toISOString()
}

function getStorePath() {
  return path.join(getLocalStoreDataDir(), PROMO_STORE_FILE)
}

async function readLocalStore(): Promise<PromoStoreShape> {
  try {
    const raw = await readFile(getStorePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<PromoStoreShape>

    return {
      campaigns: Array.isArray(parsed.campaigns)
        ? parsed.campaigns.map((campaign) => ({
            ...campaign,
            logoSrc: sanitizeClinicLogoSrc(campaign.logoSrc),
          }))
        : [],
      codes: Array.isArray(parsed.codes) ? parsed.codes : [],
      redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : [],
    }
  } catch {
    return { campaigns: [], codes: [], redemptions: [] }
  }
}

async function writeLocalStore(store: PromoStoreShape) {
  const filePath = getStorePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf8')
}

function getSupabaseClient() {
  if (process.env.APP_DATA_MODE?.trim() !== 'supabase') {
    return null
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!url || !key) {
    return null
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

export function normalizePromoCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
}

function hashPromoCode(code: string) {
  return createHash('sha256').update(normalizePromoCode(code)).digest('hex')
}

function codeLabel(code: string) {
  const normalized = normalizePromoCode(code)
  return `...${normalized.slice(-4)}`
}

function generatePromoCode() {
  const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[randomBytes(1)[0] % CODE_ALPHABET.length]).join('')
  return `VET-${chars.slice(0, 4)}-${chars.slice(4)}`
}

function normalizeCodeCount(value: CreatePromoCampaignInput['codeCount']) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? DEFAULT_PROMO_CODE_COUNT), 10)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PROMO_CODE_COUNT
  }

  return Math.max(1, Math.min(MAX_PROMO_CODE_COUNT, Math.floor(parsed)))
}

function normalizeExpiresAt(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  const raw = value.trim()
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T23:59:59.999`)
    : new Date(raw)

  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function isExpired(expiresAt: string | null | undefined, now = Date.now()) {
  return Boolean(expiresAt && Date.parse(expiresAt) < now)
}

function sanitizeClinicName(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 120)
}

function sanitizeClinicLogoSrc(value: string | null | undefined) {
  const raw = value?.trim().slice(0, 500) ?? ''

  if (!raw) {
    return null
  }

  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return raw
  }

  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function paymentReferenceForClaim(campaign: Pick<PromoCampaignRecord, 'clinicName'>, code: Pick<PromoCodeRecord, 'codeLabel'>) {
  return `PROMO ${campaign.clinicName} ${code.codeLabel}`.slice(0, 120)
}

function mapCampaignRow(row: PromoCampaignRow): PromoCampaignRecord {
  return {
    id: row.id,
    clinicName: row.clinic_name,
    logoSrc: sanitizeClinicLogoSrc(row.logo_src),
    serviceType: resolveBookingServiceType(row.service_type, 0),
    codeCount: Number(row.code_count),
    status: row.status === 'paused' || row.status === 'archived' ? row.status : 'active',
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapCodeRow(row: PromoCodeRow): PromoCodeRecord {
  const status = row.status === 'used' || row.status === 'revoked' || row.status === 'expired' ? row.status : 'active'

  return {
    id: row.id,
    campaignId: row.campaign_id,
    codeHash: row.code_hash,
    codeLabel: row.code_label,
    serviceType: resolveBookingServiceType(row.service_type, 0),
    usageLimit: Number(row.usage_limit),
    usageCount: Number(row.usage_count),
    status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    usedAt: row.used_at,
  }
}

function mapRedemptionRow(row: PromoRedemptionRow): PromoRedemptionRecord {
  return {
    id: row.id,
    codeId: row.code_id,
    campaignId: row.campaign_id,
    bookingId: row.booking_id,
    customerEmail: row.customer_email,
    serviceType: resolveBookingServiceType(row.service_type, 0),
    redeemedAt: row.redeemed_at,
    releasedAt: row.released_at,
    meta: row.meta ?? {},
  }
}

function buildCampaignSummary(campaign: PromoCampaignRecord, codes: PromoCodeRecord[]): PromoCampaignSummary {
  const now = Date.now()
  const campaignCodes = codes.filter((code) => code.campaignId === campaign.id)
  const summaries = campaignCodes
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((code) => {
      const expired = code.status === 'active' && isExpired(code.expiresAt ?? campaign.expiresAt, now)

      return {
        id: code.id,
        codeLabel: code.codeLabel,
        status: expired ? 'expired' : code.status,
        usageCount: code.usageCount,
        usageLimit: code.usageLimit,
        expiresAt: code.expiresAt ?? campaign.expiresAt,
        usedAt: code.usedAt,
      } satisfies PromoCodeSummary
    })
  const usedCount = summaries.filter((code) => code.status === 'used' || code.usageCount >= code.usageLimit).length
  const activeCount = summaries.filter((code) => code.status === 'active' && code.usageCount < code.usageLimit).length
  const lastUsedAt = summaries
    .map((code) => code.usedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  return {
    ...campaign,
    generatedCount: summaries.length,
    usedCount,
    activeCount,
    lastUsedAt,
    codes: summaries,
  }
}

function buildLocalCampaignSummary(store: PromoStoreShape, campaign: PromoCampaignRecord) {
  return buildCampaignSummary(campaign, store.codes)
}

async function createLocalPromoCampaign(input: Required<Pick<CreatePromoCampaignInput, 'clinicName'>> & {
  logoSrc: string | null
  codeCount: number
  expiresAt: string | null
}): Promise<PromoCampaignCreationResult> {
  return withLock(async () => {
    const store = await readLocalStore()
    const createdAt = nowIso()
    const campaign: PromoCampaignRecord = {
      id: randomUUID(),
      clinicName: input.clinicName,
      logoSrc: input.logoSrc,
      serviceType: PROMO_CODE_SERVICE_TYPE,
      codeCount: input.codeCount,
      status: 'active',
      expiresAt: input.expiresAt,
      createdAt,
      updatedAt: createdAt,
    }
    const existingHashes = new Set(store.codes.map((code) => code.codeHash))
    const plainCodes: string[] = []
    const codeRecords: PromoCodeRecord[] = []

    while (plainCodes.length < input.codeCount) {
      const code = generatePromoCode()
      const codeHash = hashPromoCode(code)

      if (existingHashes.has(codeHash)) {
        continue
      }

      existingHashes.add(codeHash)
      plainCodes.push(code)
      codeRecords.push({
        id: randomUUID(),
        campaignId: campaign.id,
        codeHash,
        codeLabel: codeLabel(code),
        serviceType: PROMO_CODE_SERVICE_TYPE,
        usageLimit: 1,
        usageCount: 0,
        status: 'active',
        expiresAt: input.expiresAt,
        createdAt,
        updatedAt: createdAt,
        usedAt: null,
      })
    }

    store.campaigns.unshift(campaign)
    store.codes.unshift(...codeRecords)
    await writeLocalStore(store)

    return {
      campaign: buildLocalCampaignSummary(store, campaign),
      codes: plainCodes,
    }
  })
}

async function createSupabasePromoCampaign(input: Required<Pick<CreatePromoCampaignInput, 'clinicName'>> & {
  logoSrc: string | null
  codeCount: number
  expiresAt: string | null
}): Promise<PromoCampaignCreationResult | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const createdAt = nowIso()
  const campaignId = randomUUID()
  const plainCodes = Array.from({ length: input.codeCount }, generatePromoCode)
  const codeRows = plainCodes.map((code) => ({
    id: randomUUID(),
    campaign_id: campaignId,
    code_hash: hashPromoCode(code),
    code_label: codeLabel(code),
    service_type: PROMO_CODE_SERVICE_TYPE,
    usage_limit: 1,
    usage_count: 0,
    status: 'active',
    expires_at: input.expiresAt,
    created_at: createdAt,
    updated_at: createdAt,
  }))

  const { data: campaignRow, error: campaignError } = await supabase
    .from('promo_campaigns')
    .insert({
      id: campaignId,
      clinic_name: input.clinicName,
      logo_src: input.logoSrc,
      service_type: PROMO_CODE_SERVICE_TYPE,
      code_count: input.codeCount,
      status: 'active',
      expires_at: input.expiresAt,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select('*')
    .single()

  if (campaignError || !campaignRow) {
    console.warn('[promo-codes] Supabase campaign insert failed, using local fallback', campaignError?.message)
    return null
  }

  const { data: insertedCodeRows, error: codesError } = await supabase
    .from('promo_codes')
    .insert(codeRows)
    .select('*')

  if (codesError || !insertedCodeRows) {
    console.warn('[promo-codes] Supabase code insert failed, using local fallback', codesError?.message)
    await supabase.from('promo_campaigns').delete().eq('id', campaignId)
    return null
  }

  const campaign = mapCampaignRow(campaignRow as PromoCampaignRow)
  const codes = (insertedCodeRows as PromoCodeRow[]).map(mapCodeRow)

  return {
    campaign: buildCampaignSummary(campaign, codes),
    codes: plainCodes,
  }
}

export async function createPromoCampaign(input: CreatePromoCampaignInput): Promise<PromoCampaignCreationResult> {
  const clinicName = sanitizeClinicName(input.clinicName)

  if (!clinicName) {
    throw new Error('Podaj nazwe lecznicy.')
  }

  const payload = {
    clinicName,
    logoSrc: sanitizeClinicLogoSrc(input.logoSrc),
    codeCount: normalizeCodeCount(input.codeCount),
    expiresAt: normalizeExpiresAt(input.expiresAt),
  }

  return (await createSupabasePromoCampaign(payload)) ?? createLocalPromoCampaign(payload)
}

export async function listPromoCampaigns(): Promise<PromoCampaignSummary[]> {
  const supabase = getSupabaseClient()

  if (supabase) {
    const [campaignsResult, codesResult] = await Promise.all([
      supabase.from('promo_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
    ])

    if (!campaignsResult.error && !codesResult.error && campaignsResult.data && codesResult.data) {
      const campaigns = (campaignsResult.data as PromoCampaignRow[]).map(mapCampaignRow)
      const codes = (codesResult.data as PromoCodeRow[]).map(mapCodeRow)
      return campaigns.map((campaign) => buildCampaignSummary(campaign, codes))
    }

    console.warn('[promo-codes] Supabase listing failed, using local fallback', {
      campaigns: campaignsResult.error?.message ?? null,
      codes: codesResult.error?.message ?? null,
    })
  }

  const store = await readLocalStore()
  return store.campaigns
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((campaign) => buildLocalCampaignSummary(store, campaign))
}

function assertPromoCodeCanBeUsed(
  campaign: PromoCampaignRecord | null,
  code: PromoCodeRecord | null,
  serviceType: BookingServiceType,
) {
  if (!campaign || !code) {
    throw new Error('Kod jest nieprawidlowy albo juz wykorzystany.')
  }

  if (campaign.status !== 'active') {
    throw new Error('Ta pula kodow nie jest aktywna.')
  }

  if (campaign.serviceType !== serviceType || code.serviceType !== serviceType) {
    throw new Error('Ten kod dziala tylko dla uslugi Kwadrans z behawiorysta.')
  }

  if (isExpired(code.expiresAt ?? campaign.expiresAt)) {
    throw new Error('Ten kod promocyjny wygasl.')
  }

  if (code.status !== 'active' || code.usageCount >= code.usageLimit) {
    throw new Error('Ten kod zostal juz wykorzystany.')
  }
}

export async function validatePromoCodeForService(rawCode: string, serviceType: BookingServiceType = PROMO_CODE_SERVICE_TYPE) {
  const code = normalizePromoCode(rawCode)

  if (!code) {
    throw new Error('Wpisz kod promocyjny.')
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    const { data: codeRow, error: codeError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code_hash', hashPromoCode(code))
      .maybeSingle()

    if (!codeError && codeRow) {
      const codeRecord = mapCodeRow(codeRow as PromoCodeRow)
      const { data: campaignRow, error: campaignError } = await supabase
        .from('promo_campaigns')
        .select('*')
        .eq('id', codeRecord.campaignId)
        .maybeSingle()

      if (!campaignError) {
        const campaign = campaignRow ? mapCampaignRow(campaignRow as PromoCampaignRow) : null
        assertPromoCodeCanBeUsed(campaign, codeRecord, serviceType)
        return { ok: true as const, clinicName: campaign?.clinicName ?? null, clinicLogoSrc: campaign?.logoSrc ?? null }
      }
    } else if (codeError) {
      console.warn('[promo-codes] Supabase code validation failed, using local fallback', codeError.message)
    }
  }

  const store = await readLocalStore()
  const codeHash = hashPromoCode(code)
  const codeRecord = store.codes.find((item) => item.codeHash === codeHash) ?? null
  const campaign = codeRecord ? store.campaigns.find((item) => item.id === codeRecord.campaignId) ?? null : null
  assertPromoCodeCanBeUsed(campaign, codeRecord, serviceType)
  return { ok: true as const, clinicName: campaign?.clinicName ?? null, clinicLogoSrc: campaign?.logoSrc ?? null }
}
async function claimLocalPromoCode(input: {
  code: string
  bookingId: string
  customerEmail: string
  serviceType: BookingServiceType
}): Promise<PromoCodeClaim> {
  return withLock(async () => {
    const store = await readLocalStore()
    const codeHash = hashPromoCode(input.code)
    const code = store.codes.find((item) => item.codeHash === codeHash) ?? null
    const campaign = code ? store.campaigns.find((item) => item.id === code.campaignId) ?? null : null

    assertPromoCodeCanBeUsed(campaign, code, input.serviceType)

    const now = nowIso()
    const redemption: PromoRedemptionRecord = {
      id: randomUUID(),
      codeId: code!.id,
      campaignId: code!.campaignId,
      bookingId: input.bookingId,
      customerEmail: input.customerEmail.toLowerCase(),
      serviceType: input.serviceType,
      redeemedAt: now,
      releasedAt: null,
      meta: {},
    }

    code!.usageCount += 1
    code!.status = code!.usageCount >= code!.usageLimit ? 'used' : 'active'
    code!.usedAt = code!.status === 'used' ? now : code!.usedAt
    code!.updatedAt = now
    store.redemptions.unshift(redemption)
    await writeLocalStore(store)

    return {
      codeId: code!.id,
      campaignId: campaign!.id,
      redemptionId: redemption.id,
      clinicName: campaign!.clinicName,
      paymentReference: paymentReferenceForClaim(campaign!, code!),
    }
  })
}

async function claimSupabasePromoCode(input: {
  code: string
  bookingId: string
  customerEmail: string
  serviceType: BookingServiceType
}): Promise<PromoCodeClaim | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data: codeRow, error: codeError } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code_hash', hashPromoCode(input.code))
    .maybeSingle()

  if (codeError) {
    console.warn('[promo-codes] Supabase code lookup failed, using local fallback', codeError.message)
    return null
  }

  if (!codeRow) {
    throw new Error('Kod jest nieprawidlowy albo juz wykorzystany.')
  }

  const code = mapCodeRow(codeRow as PromoCodeRow)
  const { data: campaignRow, error: campaignError } = await supabase
    .from('promo_campaigns')
    .select('*')
    .eq('id', code.campaignId)
    .maybeSingle()

  if (campaignError) {
    console.warn('[promo-codes] Supabase campaign lookup failed, using local fallback', campaignError.message)
    return null
  }

  const campaign = campaignRow ? mapCampaignRow(campaignRow as PromoCampaignRow) : null
  assertPromoCodeCanBeUsed(campaign, code, input.serviceType)

  const now = nowIso()
  const nextUsageCount = code.usageCount + 1
  const nextStatus: PromoCodeStatus = nextUsageCount >= code.usageLimit ? 'used' : 'active'
  const { data: updatedCodeRow, error: updateError } = await supabase
    .from('promo_codes')
    .update({
      usage_count: nextUsageCount,
      status: nextStatus,
      used_at: nextStatus === 'used' ? now : code.usedAt,
      updated_at: now,
    })
    .eq('id', code.id)
    .eq('status', 'active')
    .eq('usage_count', code.usageCount)
    .lt('usage_count', code.usageLimit)
    .select('*')
    .maybeSingle()

  if (updateError) {
    console.warn('[promo-codes] Supabase code claim failed, using local fallback', updateError.message)
    return null
  }

  if (!updatedCodeRow) {
    throw new Error('Ten kod zostal juz wykorzystany.')
  }

  const updatedCode = mapCodeRow(updatedCodeRow as PromoCodeRow)
  const redemptionId = randomUUID()
  const { data: redemptionRow, error: redemptionError } = await supabase
    .from('promo_redemptions')
    .insert({
      id: redemptionId,
      code_id: updatedCode.id,
      campaign_id: updatedCode.campaignId,
      booking_id: input.bookingId,
      customer_email: input.customerEmail.toLowerCase(),
      service_type: input.serviceType,
      redeemed_at: now,
      released_at: null,
      meta: {},
    })
    .select('*')
    .single()

  if (redemptionError || !redemptionRow) {
    await releaseSupabasePromoCodeClaim(redemptionId, updatedCode.id)
    throw new Error('Nie udalo sie zapisac uzycia kodu. Sprobuj ponownie.')
  }

  return {
    codeId: updatedCode.id,
    campaignId: campaign!.id,
    redemptionId: mapRedemptionRow(redemptionRow as PromoRedemptionRow).id,
    clinicName: campaign!.clinicName,
    paymentReference: paymentReferenceForClaim(campaign!, updatedCode),
  }
}

async function releaseLocalPromoCodeClaim(redemptionId: string) {
  await withLock(async () => {
    const store = await readLocalStore()
    const redemption = store.redemptions.find((item) => item.id === redemptionId)

    if (!redemption || redemption.releasedAt) {
      return
    }

    const code = store.codes.find((item) => item.id === redemption.codeId)
    const now = nowIso()
    redemption.releasedAt = now

    if (code) {
      code.usageCount = Math.max(0, code.usageCount - 1)
      code.status = code.usageCount >= code.usageLimit ? 'used' : 'active'
      code.usedAt = code.status === 'used' ? code.usedAt : null
      code.updatedAt = now
    }

    await writeLocalStore(store)
  })
}

async function releaseSupabasePromoCodeClaim(redemptionId: string, fallbackCodeId?: string | null) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const { data: redemptionRow } = await supabase
    .from('promo_redemptions')
    .select('*')
    .eq('id', redemptionId)
    .maybeSingle()
  const redemption = redemptionRow ? mapRedemptionRow(redemptionRow as PromoRedemptionRow) : null
  const codeId = redemption?.codeId ?? fallbackCodeId

  if (!codeId) {
    return
  }

  const { data: codeRow } = await supabase.from('promo_codes').select('*').eq('id', codeId).maybeSingle()
  const code = codeRow ? mapCodeRow(codeRow as PromoCodeRow) : null
  const now = nowIso()

  if (code) {
    await supabase
      .from('promo_codes')
      .update({
        usage_count: Math.max(0, code.usageCount - 1),
        status: 'active',
        used_at: null,
        updated_at: now,
      })
      .eq('id', code.id)
  }

  if (redemption) {
    await supabase.from('promo_redemptions').update({ released_at: now }).eq('id', redemption.id)
  }
}

async function releasePromoCodeClaim(claim: PromoCodeClaim) {
  await releaseSupabasePromoCodeClaim(claim.redemptionId, claim.codeId)
  await releaseLocalPromoCodeClaim(claim.redemptionId)
}

async function claimPromoCode(input: {
  code: string
  bookingId: string
  customerEmail: string
  serviceType: BookingServiceType
}): Promise<PromoCodeClaim> {
  return (await claimSupabasePromoCode(input)) ?? claimLocalPromoCode(input)
}

export async function redeemPromoCodeForBooking(booking: BookingRecord, rawCode: string, consultationMode: ConsultationMode = 'jitsi') {
  const code = normalizePromoCode(rawCode)
  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)

  if (!code) {
    throw new Error('Wpisz kod promocyjny.')
  }

  if (serviceType !== PROMO_CODE_SERVICE_TYPE) {
    throw new Error('Kod przekazany przez lecznice dziala tylko dla uslugi Kwadrans z behawiorysta.')
  }

  if (!(booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid')) {
    throw new Error('Ten termin nie czeka juz na platnosc.')
  }

  const claim = await claimPromoCode({
    code,
    bookingId: booking.id,
    customerEmail: booking.email,
    serviceType,
  })

  try {
    const updatedBooking = await markBookingPaid(booking.id, {
      paymentMethod: 'promo',
      paymentReference: claim.paymentReference,
      triggerPaymentConfirmationSms: false,
      consultationMode,
    })

    if (!updatedBooking) {
      throw new Error('Nie znaleziono rezerwacji do potwierdzenia.')
    }

    return {
      booking: updatedBooking,
      claim,
    }
  } catch (error) {
    await releasePromoCodeClaim(claim).catch((releaseError) => {
      console.error('[promo-codes] failed to release promo claim after booking error', releaseError)
    })
    throw error
  }
}
