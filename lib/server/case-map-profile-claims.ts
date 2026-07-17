import { createHmac, randomBytes } from 'node:crypto'
import { createClient, type User } from '@supabase/supabase-js'
import {
  normalizeCaseMapProfileSnapshot,
  type CaseMapCreateInput,
  type CaseMapProfileSnapshot,
  type CaseMapRecord,
} from '@/lib/case-map'
import { createCompletedCaseMapForUser } from '@/lib/server/case-map-store'
import { getSupabaseServerConfig } from '@/lib/server/env'

export const CASE_MAP_PROFILE_CLAIM_TTL_DAYS = 30
const CASE_MAP_PROFILE_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

type CaseMapProfileClaimRow = {
  id: string
  booking_id: string
  snapshot: unknown
  expires_at: string
  claimed_at: string | null
  claimed_by_user_id: string | null
  claimed_case_map_id: string | null
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('prywatnego zapisu Mapy zachowania')

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Nieprawidłowy adres e-mail dla prywatnego zapisu Mapy.')
  }

  return normalized
}

function getEmailHash(email: string) {
  const config = getSupabaseServerConfig('prywatnego zapisu Mapy zachowania')
  return createHmac('sha256', config.serviceRoleKey)
    .update(normalizeEmail(email))
    .digest('hex')
}

function createClaimToken() {
  return randomBytes(32).toString('base64url')
}

function getClaimTokenHash(value: unknown) {
  if (typeof value !== 'string' || !CASE_MAP_PROFILE_CLAIM_TOKEN_PATTERN.test(value)) {
    return null
  }

  const config = getSupabaseServerConfig('prywatnego zapisu Mapy zachowania')
  return createHmac('sha256', config.serviceRoleKey)
    .update(`case-map-profile-claim:${value}`)
    .digest('hex')
}

function getExpiresAt(now: Date) {
  return new Date(now.getTime() + CASE_MAP_PROFILE_CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export type PendingCaseMapProfileClaim = {
  id: string
  expiresAt: string
  claimToken: string
}

export async function createPendingCaseMapProfileClaim({
  bookingId,
  email,
  snapshot,
  now = new Date(),
}: {
  bookingId: string
  email: string
  snapshot: CaseMapProfileSnapshot | unknown
  now?: Date
}): Promise<PendingCaseMapProfileClaim> {
  const normalizedSnapshot = normalizeCaseMapProfileSnapshot(snapshot)
  const supabase = getSupabaseAdmin()
  const nowIso = now.toISOString()
  const expiresAt = getExpiresAt(now).toISOString()
  const claimToken = createClaimToken()
  const claimTokenHash = getClaimTokenHash(claimToken)

  if (!claimTokenHash) {
    throw new Error('Nie udaĹ‚o siÄ™ zabezpieczyÄ‡ prywatnego zapisu Mapy.')
  }

  // Expired claim rows have no purpose after their retention window. The
  // database scheduler performs this independently; this is an additional
  // best-effort cleanup before a new consented snapshot is stored.
  const expiredCleanup = await supabase
    .from('case_map_profile_claims')
    .delete()
    .lt('expires_at', nowIso)

  if (expiredCleanup.error) {
    console.warn('[regulski-behawiorysta][case-map-profile] expired claim cleanup skipped', {
      reason: expiredCleanup.error.message,
    })
  }

  const { data, error } = await supabase
    .from('case_map_profile_claims')
    .upsert(
      {
        booking_id: bookingId,
        email_hash: getEmailHash(email),
        claim_token_hash: claimTokenHash,
        snapshot: normalizedSnapshot,
        consent_version: normalizedSnapshot.consentVersion,
        consented_at: nowIso,
        expires_at: expiresAt,
      },
      { onConflict: 'booking_id' },
    )
    .select('id, expires_at')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Nie udało się przygotować prywatnego zapisu Mapy.')
  }

  return {
    id: String((data as { id: string }).id),
    expiresAt: String((data as { expires_at: string }).expires_at),
    claimToken,
  }
}

export async function claimPendingCaseMapProfileClaimsForUser(
  user: User,
  claimToken: string | null | undefined,
  now = new Date(),
): Promise<CaseMapRecord[]> {
  if (!user.email || !user.email_confirmed_at) return []

  const claimTokenHash = getClaimTokenHash(claimToken)
  if (!claimTokenHash) return []

  const supabase = getSupabaseAdmin()
  const nowIso = now.toISOString()
  const emailHash = getEmailHash(user.email)

  const { data, error } = await supabase
    .from('case_map_profile_claims')
    .select('id, booking_id, snapshot, expires_at, claimed_at, claimed_by_user_id, claimed_case_map_id')
    .eq('email_hash', emailHash)
    .eq('claim_token_hash', claimTokenHash)
    .is('claimed_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const claimedMaps: CaseMapRecord[] = []
  for (const rawClaim of data ?? []) {
    const claim = rawClaim as CaseMapProfileClaimRow
    const { data: reservation, error: reservationError } = await supabase
      .from('case_map_profile_claims')
      .update({
        claimed_at: nowIso,
        claimed_by_user_id: user.id,
      })
      .eq('id', claim.id)
      .is('claimed_at', null)
      .gt('expires_at', nowIso)
      .select('id, booking_id, snapshot, expires_at, claimed_at, claimed_by_user_id, claimed_case_map_id')
      .maybeSingle()

    if (reservationError || !reservation) {
      continue
    }

    let caseMap: CaseMapRecord | null = null
    try {
      const snapshot: CaseMapCreateInput = normalizeCaseMapProfileSnapshot((reservation as CaseMapProfileClaimRow).snapshot)
      caseMap = await createCompletedCaseMapForUser(user, snapshot, (reservation as CaseMapProfileClaimRow).booking_id)

      const { error: markError } = await supabase
        .from('case_map_profile_claims')
        .update({ claimed_case_map_id: caseMap.id })
        .eq('id', claim.id)
        .eq('claimed_by_user_id', user.id)

      if (markError) {
        throw new Error(markError.message)
      }

      const { error: deleteError } = await supabase
        .from('case_map_profile_claims')
        .delete()
        .eq('id', claim.id)
        .eq('claimed_case_map_id', caseMap.id)

      if (deleteError) {
        console.warn('[regulski-behawiorysta][case-map-profile] claimed snapshot cleanup skipped', {
          reason: deleteError.message,
        })
      }

      claimedMaps.push(caseMap)
    } catch (error) {
      if (!caseMap) {
        await supabase
          .from('case_map_profile_claims')
          .update({ claimed_at: null, claimed_by_user_id: null })
          .eq('id', claim.id)
          .eq('claimed_by_user_id', user.id)
          .is('claimed_case_map_id', null)
      }

      console.error('[regulski-behawiorysta][case-map-profile] claim skipped', {
        claimId: claim.id,
        reason: error instanceof Error ? error.message : 'unknown',
      })
    }
  }

  return claimedMaps
}
