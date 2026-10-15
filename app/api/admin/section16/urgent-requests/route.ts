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
  SECTION16_UUID_REGEX,
  createUrgentIntakeRequest,
  getUrgentIntakeEventByIdempotencyKey,
  listUrgentIntakeRequests,
} from '@/lib/server/section16-store'
import {
  Section16DomainError,
  Section16NotFoundError,
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16TransitionError,
  Section16TerminalStateError,
  Section16ValidationError,
  Section16InvalidIdempotencyKeyError,
  Section16PrivacyError,
  URGENT_INTAKE_STATES,
  UrgentIntakeState,
  UrgentIntakeDayChoice,
  UrgentIntakeRequest,
} from '@/lib/server/section16-types'
import {
  validateWarsawIntakeTargetDate,
  validateContactCiphertextContract,
} from '@/lib/server/section16-policy'
import { getBaseUrl, isProductionDeployment } from '@/lib/server/env'
import { SITE_PRODUCTION_URL } from '@/lib/site'
import { normalizePolishPhone } from '@/lib/phone'
import { CallSessionInvalidPhoneError } from '@/lib/server/call-session-types'

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

  if (isControlledLocalhostOrigin(parsed)) {
    return !isProductionDeployment() &&
      (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')
  }

  const trustedOrigins = getTrustedOrigins()
  return trustedOrigins.has(normalizedOrigin)
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
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase().trim()
  if (secFetchSite === 'cross-site') {
    return false
  }

  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')

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

  if (hasBasicAuth) {
    if (refererHeader) {
      const refererOrigin = getOriginFromUrl(refererHeader)
      if (!refererOrigin || !isOriginTrusted(refererOrigin)) {
        return false
      }
    }
    return true
  }

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

export interface UrgentIntakeAdminDto {
  id: string
  dayChoice: UrgentIntakeDayChoice
  targetDate: string
  callerPhoneMasked: string
  state: UrgentIntakeState
  proposal: {
    proposedDate: string
    proposedTime: string
    proposedTimeslotIso: string | null
  } | null
  holdExpiresAt: string | null
  expiresAt: string
  version: number
  createdAt: string
  updatedAt: string
}

function toUrgentIntakeDto(req: UrgentIntakeRequest): UrgentIntakeAdminDto {
  return {
    id: req.id,
    dayChoice: req.dayChoice,
    targetDate: req.targetDate,
    callerPhoneMasked: req.callerPhoneMasked,
    state: req.state,
    proposal:
      req.proposedDate && req.proposedTime
        ? {
            proposedDate: req.proposedDate,
            proposedTime: req.proposedTime,
            proposedTimeslotIso: req.proposedTimeslotIso ?? null,
          }
        : null,
    holdExpiresAt: req.holdExpiresAt ?? null,
    expiresAt: req.expiresAt,
    version: req.version,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  }
}

export async function GET(request: Request) {
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

    // 2. CSRF / foreign Origin & Sec-Fetch-Site protection
    const hasBasicAuth = hasValidAdminAuthorization(request.headers.get('authorization'))
    if (!isRequestOriginAllowed(request, hasBasicAuth)) {
      return NextResponse.json(
        { error: 'Niedozwolone źródło żądania (Cross-Origin Request Blocked).' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // 3. Feature gate check
    const isGateEnabled = process.env.SECTION16_ADMIN_PROPOSALS_ENABLED?.trim().toLowerCase() === 'true'
    if (!isGateEnabled) {
      return NextResponse.json(
        { error: 'Bramka SECTION16_ADMIN_PROPOSALS_ENABLED jest wyłączona.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // 4. Validate query parameters / filters
    const url = new URL(request.url)
    const allowedParams = new Set(['id', 'state', 'dayChoice', 'targetDate', 'limit'])
    for (const key of url.searchParams.keys()) {
      if (!allowedParams.has(key)) {
        return NextResponse.json(
          { error: `Niedozwolony parametr zapytania: ${key}.` },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const idParam = url.searchParams.get('id')?.trim()
    if (idParam !== undefined && idParam !== '' && !SECTION16_UUID_REGEX.test(idParam)) {
      return NextResponse.json(
        { error: 'Parametr id musi być poprawnym UUID.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const stateParam = url.searchParams.get('state')?.trim()
    if (stateParam !== undefined && stateParam !== '') {
      if (!URGENT_INTAKE_STATES.includes(stateParam as UrgentIntakeState)) {
        return NextResponse.json(
          { error: `Nieprawidłowy stan w filtrze state: ${stateParam}.` },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const dayChoiceParam = url.searchParams.get('dayChoice')?.trim()
    if (dayChoiceParam !== undefined && dayChoiceParam !== '') {
      if (dayChoiceParam !== 'today' && dayChoiceParam !== 'tomorrow') {
        return NextResponse.json(
          { error: "Pole dayChoice musi mieć wartość 'today' lub 'tomorrow'." },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const targetDateParam = url.searchParams.get('targetDate')?.trim()
    if (targetDateParam !== undefined && targetDateParam !== '') {
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(targetDateParam)) {
        return NextResponse.json(
          { error: 'Parametr targetDate musi być w formacie YYYY-MM-DD.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const limitParam = url.searchParams.get('limit')?.trim()
    let limit = 50
    if (limitParam !== undefined && limitParam !== '') {
      if (!/^[1-9][0-9]*$/.test(limitParam)) {
        return NextResponse.json(
          { error: 'Parametr limit musi być dodatnią liczbą całkowitą z zakresu 1-100.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      const parsedLimit = Number(limitParam)
      if (parsedLimit > 100) {
        return NextResponse.json(
          { error: 'Parametr limit nie może przekraczać 100.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      limit = parsedLimit
    }

    const list = await listUrgentIntakeRequests({
      id: idParam || undefined,
      state: (stateParam as UrgentIntakeState) || undefined,
      dayChoice: (dayChoiceParam as UrgentIntakeDayChoice) || undefined,
      targetDate: targetDateParam || undefined,
      limit,
    })

    const dtos = list.map(toUrgentIntakeDto)

    return NextResponse.json(
      {
        items: dtos,
        requests: dtos,
        total: dtos.length,
        ...(idParam ? { request: dtos[0] ?? null } : {}),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    if (error instanceof Section16ValidationError) {
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

    console.error('[admin/section16/urgent-requests] Błąd serwera (INTERNAL_SERVER_ERROR)')
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd serwera.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(request: Request) {
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

    // 2. CSRF / foreign Origin & Sec-Fetch-Site protection
    const hasBasicAuth = hasValidAdminAuthorization(request.headers.get('authorization'))
    if (!isRequestOriginAllowed(request, hasBasicAuth)) {
      return NextResponse.json(
        { error: 'Niedozwolone źródło żądania (Cross-Origin Request Blocked).' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // 3. Feature gate check
    const isGateEnabled = process.env.SECTION16_ADMIN_PROPOSALS_ENABLED?.trim().toLowerCase() === 'true'
    if (!isGateEnabled) {
      return NextResponse.json(
        { error: 'Bramka SECTION16_ADMIN_PROPOSALS_ENABLED jest wyłączona.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // 4. Require JSON Content-Type
    if (!isJsonContentType(request)) {
      return NextResponse.json(
        { error: 'Wymagany nagłówek Content-Type: application/json.' },
        { status: 415, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // 5. Parse JSON object
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

    // 6. Whitelist body fields
    const allowedKeys = new Set([
      'idempotencyKey',
      'dayChoice',
      'rawPhone',
      'requestId',
      'id',
      'targetDate',
      'expectedVersion',
      'clientName',
      'clientNotes',
      'contactCiphertext',
      'expiresAt',
    ])

    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        return NextResponse.json(
          { error: `Niedozwolone pole w żądaniu: ${key}.` },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    // 7. Validate fields
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

    if (body.dayChoice !== 'today' && body.dayChoice !== 'tomorrow') {
      return NextResponse.json(
        { error: "Pole dayChoice musi mieć wartość 'today' lub 'tomorrow'." },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (typeof body.rawPhone !== 'string' || !body.rawPhone.trim()) {
      return NextResponse.json(
        { error: 'Wymagane jest pole rawPhone zawierające prawidłowy numer telefonu.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const normalizedPhone = normalizePolishPhone(body.rawPhone.trim())
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Nieprawidłowy numer telefonu w polu rawPhone.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const idCandidate = (body.requestId ?? body.id) as unknown
    let resolvedId: string | undefined = undefined
    if (idCandidate !== undefined && idCandidate !== null) {
      if (typeof idCandidate !== 'string' || !SECTION16_UUID_REGEX.test(idCandidate.trim())) {
        return NextResponse.json(
          { error: 'Identyfikator zgłoszenia musi być poprawnym UUID.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      resolvedId = idCandidate.trim()
    }

    if (body.targetDate !== undefined && body.targetDate !== null) {
      if (typeof body.targetDate !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(body.targetDate.trim())) {
        return NextResponse.json(
          { error: 'Pole targetDate musi być w formacie YYYY-MM-DD.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      validateWarsawIntakeTargetDate(body.dayChoice, body.targetDate.trim())
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== null) {
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
    }

    if (body.clientName !== undefined && body.clientName !== null) {
      if (typeof body.clientName !== 'string' || body.clientName.length > 200) {
        return NextResponse.json(
          { error: 'Pole clientName musi być ciągiem znaków o długości maksymalnie 200.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    if (body.clientNotes !== undefined && body.clientNotes !== null) {
      if (typeof body.clientNotes !== 'string' || body.clientNotes.length > 1000) {
        return NextResponse.json(
          { error: 'Pole clientNotes musi być ciągiem znaków o długości maksymalnie 1000.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    if (body.contactCiphertext !== undefined && body.contactCiphertext !== null) {
      if (typeof body.contactCiphertext !== 'string') {
        return NextResponse.json(
          { error: 'Pole contactCiphertext musi być ciągiem znaków lub null.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      validateContactCiphertextContract(body.contactCiphertext)
    }

    if (body.expiresAt !== undefined && body.expiresAt !== null) {
      if (
        typeof body.expiresAt !== 'string' ||
        Number.isNaN(Date.parse(body.expiresAt)) ||
        Date.parse(body.expiresAt) <= Date.now()
      ) {
        return NextResponse.json(
          { error: 'Pole expiresAt musi być prawidłową datą ISO w przyszłości.' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const idempotencyKey = body.idempotencyKey.trim()
    const existingEvent = await getUrgentIntakeEventByIdempotencyKey(idempotencyKey)
    const isRetry = Boolean(existingEvent)

    const result = await createUrgentIntakeRequest({
      requestId: resolvedId,
      dayChoice: body.dayChoice,
      targetDate: typeof body.targetDate === 'string' ? body.targetDate.trim() : undefined,
      rawPhone: body.rawPhone.trim(),
      contactCiphertext: typeof body.contactCiphertext === 'string' ? body.contactCiphertext.trim() : null,
      clientName: typeof body.clientName === 'string' ? body.clientName.trim() : null,
      clientNotes: typeof body.clientNotes === 'string' ? body.clientNotes.trim() : null,
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt.trim() : null,
      idempotencyKey,
      expectedVersion: typeof body.expectedVersion === 'number' ? body.expectedVersion : undefined,
      payload: {
        dayChoice: body.dayChoice,
        ...(typeof body.targetDate === 'string' ? { targetDate: body.targetDate.trim() } : {}),
      },
    })

    return NextResponse.json(
      {
        ...toUrgentIntakeDto(result),
        isRetry,
      },
      {
        status: isRetry ? 200 : 201,
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
    if (
      error instanceof Section16ValidationError ||
      error instanceof Section16InvalidIdempotencyKeyError ||
      error instanceof Section16PrivacyError ||
      error instanceof CallSessionInvalidPhoneError
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

    console.error('[admin/section16/urgent-requests] Błąd serwera (INTERNAL_SERVER_ERROR)')
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd serwera.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
