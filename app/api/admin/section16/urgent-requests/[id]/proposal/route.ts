export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import {
  getAdminAuthChallengeHeaders,
  hasValidAdminAuthorization,
  isAdminRequestAuthorized,
} from '@/lib/admin-auth'
import {
  processOwnerProposalAndSetHold,
  Section16UrgentProposalError,
} from '@/lib/server/section16-urgent-flow'
import {
  MIN_HOLD_EXPIRY_MINUTES,
  MAX_HOLD_EXPIRY_MINUTES,
} from '@/lib/server/section16-policy'
import { SECTION16_UUID_REGEX, Section16SlotUnavailableError } from '@/lib/server/section16-store'
import {
  Section16DomainError,
  Section16NotFoundError,
  Section16HoldExpiredError,
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16TransitionError,
  Section16TerminalStateError,
  Section16ValidationError,
  Section16InvalidIdempotencyKeyError,
} from '@/lib/server/section16-types'
import { getBaseUrl, isProductionDeployment } from '@/lib/server/env'
import { SITE_PRODUCTION_URL } from '@/lib/site'

function getTrustedOrigins(): Set<string> {
  const trusted = new Set<string>()

  const addIfValid = (candidate: string | null | undefined) => {
    if (!candidate) return
    try {
      const u = new URL(candidate)
      if (u.origin && u.origin.toLowerCase() !== 'null') {
        trusted.add(u.origin.toLowerCase())
      }
    } catch {
      // ignore invalid URL
    }
  }

  addIfValid(SITE_PRODUCTION_URL)
  addIfValid(getBaseUrl())
  addIfValid(process.env.NEXT_PUBLIC_APP_URL)
  addIfValid(process.env.SITE_URL)
  addIfValid(process.env.APP_URL)
  if (process.env.VERCEL_URL) {
    addIfValid(`https://${process.env.VERCEL_URL}`)
  }

  return trusted
}

function isControlledLocalhostOrigin(url: URL): boolean {
  const hostname = url.hostname.toLowerCase()
  const isLocalhostHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  if (!isLocalhostHost) return false
  return url.protocol === 'http:' || url.protocol === 'https:'
}

function isOriginTrusted(originString: string | null | undefined): boolean {
  if (!originString) {
    return false
  }

  const trimmed = originString.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  if (!parsed.protocol || !parsed.host) {
    return false
  }

  const normalizedOrigin = parsed.origin.toLowerCase()
  if (normalizedOrigin === 'null') {
    return false
  }

  // Local storage never grants a production deployment a localhost exception.
  if (isControlledLocalhostOrigin(parsed)) {
    return !isProductionDeployment() &&
      (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')
  }

  // Check strictly trusted origins from configuration
  const trustedOrigins = getTrustedOrigins()
  if (trustedOrigins.has(normalizedOrigin)) {
    return true
  }

  return false
}

function getOriginFromUrl(urlString: string | null | undefined): string | null {
  if (!urlString) return null
  try {
    const u = new URL(urlString)
    return u.origin && u.origin.toLowerCase() !== 'null' ? u.origin : null
  } catch {
    return null
  }
}

function isRequestOriginAllowed(request: Request, hasBasicAuth: boolean): boolean {
  // 1. Odrzucenie zapytań z Sec-Fetch-Site cross-site (zarówno cookie jak i basic)
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase().trim()
  if (secFetchSite === 'cross-site') {
    return false
  }

  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')

  // 2. Jawny Origin: jeśli obecny, musi być zaufany (także przy Basic Auth)
  if (originHeader !== null) {
    if (!isOriginTrusted(originHeader)) {
      return false
    }

    if (refererHeader) {
      const refererOrigin = getOriginFromUrl(refererHeader)
      if (!refererOrigin || !isOriginTrusted(refererOrigin)) {
        return false
      }
    }

    return true
  }

  // 3. Brak nagłówka Origin:
  if (hasBasicAuth) {
    // Klienci serwerowi z Basic Auth bez Origin: akceptujemy jeśli brak obcego Referer
    if (refererHeader) {
      const refererOrigin = getOriginFromUrl(refererHeader)
      if (!refererOrigin || !isOriginTrusted(refererOrigin)) {
        return false
      }
    }
    return true
  }

  // 4. Uwierzytelnienie sesyjne (cookie) bez Origin: wymaga poprawnego zaufanego Referer (brak obu -> fail-closed)
  if (!refererHeader) {
    return false
  }

  const refererOrigin = getOriginFromUrl(refererHeader)
  if (!refererOrigin || !isOriginTrusted(refererOrigin)) {
    return false
  }

  return true
}

function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get('content-type')
  if (!contentType) {
    return false
  }
  const [mime] = contentType.split(';')
  return mime.trim().toLowerCase() === 'application/json'
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Admin authorization check
  const isAuthorized = await isAdminRequestAuthorized(request.headers)
  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Brak autoryzacji administratora.' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          ...getAdminAuthChallengeHeaders(),
        },
      },
    )
  }

  // 2. CSRF / foreign Origin & Sec-Fetch-Site protection (for both cookie and Basic Auth)
  const hasBasicAuth = hasValidAdminAuthorization(request.headers.get('authorization'))
  if (!isRequestOriginAllowed(request, hasBasicAuth)) {
    return NextResponse.json(
      { error: 'Niedozwolone źródło żądania (Cross-Origin Request Blocked).' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // 3. Server-side feature gate (disabled by default)
  const isGateEnabled = process.env.SECTION16_ADMIN_PROPOSALS_ENABLED?.trim().toLowerCase() === 'true'
  if (!isGateEnabled) {
    return NextResponse.json(
      { error: 'Bramka SECTION16_ADMIN_PROPOSALS_ENABLED jest wyłączona.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // 4. Require JSON content type (reject text/plain, form data, etc.)
  if (!isJsonContentType(request)) {
    return NextResponse.json(
      { error: 'Wymagany nagłówek Content-Type: application/json.' },
      { status: 415, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // 5. Validate URL parameter [id] against store UUID format
  const resolvedParams = await props.params
  const id = resolvedParams?.id
  if (!id || typeof id !== 'string' || !SECTION16_UUID_REGEX.test(id.trim())) {
    return NextResponse.json(
      { error: 'Identyfikator zgłoszenia musi być poprawnym UUID.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // 6. Strict JSON object parsing and whitelist field validation
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Nieprawidłowy format JSON.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json(
      { error: 'Ciało żądania musi być obiektem JSON.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const body = rawBody as Record<string, unknown>
  const allowedKeys = new Set(['response', 'idempotencyKey', 'expectedVersion', 'holdDurationMinutes'])
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      return NextResponse.json(
        { error: `Niedozwolone pole w żądaniu: ${key}.` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  if (typeof body.response !== 'string' || !body.response.trim()) {
    return NextResponse.json(
      { error: 'Wymagane jest niepuste pole response (ciąg znaków).' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (
    typeof body.idempotencyKey !== 'string' ||
    !body.idempotencyKey.trim() ||
    body.idempotencyKey.trim().length > 128
  ) {
    return NextResponse.json(
      { error: 'Wymagane jest pole idempotencyKey o długości od 1 do 128 znaków.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (
    typeof body.expectedVersion !== 'number' ||
    !Number.isSafeInteger(body.expectedVersion) ||
    body.expectedVersion <= 0
  ) {
    return NextResponse.json(
      { error: 'Pole expectedVersion musi być dodatnią liczbą całkowitą (safe integer).' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  let holdDurationMinutes: number | undefined = undefined
  if (body.holdDurationMinutes !== undefined) {
    if (
      typeof body.holdDurationMinutes !== 'number' ||
      !Number.isSafeInteger(body.holdDurationMinutes) ||
      body.holdDurationMinutes < MIN_HOLD_EXPIRY_MINUTES ||
      body.holdDurationMinutes > MAX_HOLD_EXPIRY_MINUTES
    ) {
      return NextResponse.json(
        {
          error: `Pole holdDurationMinutes musi być liczbą całkowitą od ${MIN_HOLD_EXPIRY_MINUTES} do ${MAX_HOLD_EXPIRY_MINUTES}.`,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    holdDurationMinutes = body.holdDurationMinutes
  }

  // 7. Execute domain proposal and hold creation
  const result = await processOwnerProposalAndSetHold({
      requestId: id.trim(),
      response: body.response,
      idempotencyKey: body.idempotencyKey.trim(),
      expectedVersion: body.expectedVersion,
      ...(holdDurationMinutes !== undefined ? { holdDurationMinutes } : {}),
    })

    // Minimal DTO only: id, state, version, proposal, holdExpiresAt, isRetry (no full record, no PII, no fingerprints, no audit)
    return NextResponse.json(
      {
        id: result.request.id,
        state: result.request.state,
        version: result.request.version,
        proposal: {
          raw: result.parsedProposal.raw,
          formattedDate: result.parsedProposal.formattedDate,
          formattedTime: result.parsedProposal.formattedTime,
          isoTimestamp: result.parsedProposal.isoTimestamp,
          warsawOffset: result.parsedProposal.warsawOffset,
        },
        holdExpiresAt: result.request.holdExpiresAt,
        isRetry: result.isRetry,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    if (error instanceof Section16NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (error instanceof Section16HoldExpiredError) {
      return NextResponse.json(
        { error: error.message },
        { status: 410, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (
      error instanceof Section16ConcurrencyError ||
      error instanceof Section16IdempotencyConflictError ||
      error instanceof Section16TransitionError ||
      error instanceof Section16TerminalStateError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (error instanceof Section16SlotUnavailableError) {
      const status = error.code === 'SLOT_NOT_FOUND' ? 404 : 409
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (
      error instanceof Section16UrgentProposalError ||
      error instanceof Section16ValidationError ||
      error instanceof Section16InvalidIdempotencyKeyError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (error instanceof Section16DomainError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    console.error('[admin/section16/urgent-requests/proposal] Błąd serwera (INTERNAL_SERVER_ERROR)')
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd serwera.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
