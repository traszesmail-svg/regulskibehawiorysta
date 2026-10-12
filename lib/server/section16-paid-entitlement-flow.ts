// Section 16 Stage 4: Paid availability offer to temporary talk entitlement granting flow.
// Strictly binds an already confirmed paid availability notification request to exactly one
// consultation talk entitlement with fail-closed external boundary adapters.

import {
  ConsultationTalkEntitlement,
  TalkEntitlementState,
  Section16DomainError,
  Section16NotFoundError,
  Section16TerminalStateError,
  Section16PaymentRequiredError,
  Section16HoldExpiredError,
  Section16IdempotencyConflictError,
  Section16ValidationError,
  Section16EntitlementAlreadyExistsError,
} from './section16-types'
import {
  validateIdempotencyKey,
  computeSection16PayloadHash,
  sanitizePayload,
  computePaymentReferenceHash,
} from './section16-policy'
import {
  getAvailabilityNotificationRequest,
  createTalkEntitlement,
  getTalkEntitlement,
  getTalkEntitlementEventByIdempotencyKey,
  SECTION16_UUID_REGEX,
} from './section16-store'

export { computePaymentReferenceHash }

export const PAID_ENTITLEMENT_ACTION_TYPE = 'grant_paid_availability_talk_entitlement'

// Safe technical policy bounds for talk entitlement granting (explicitly required, NO business defaults)
export const MIN_TALK_ENTITLEMENT_ALLOCATED_SECONDS = 60
export const MAX_TALK_ENTITLEMENT_ALLOCATED_SECONDS = 7200

export const MIN_TALK_ENTITLEMENT_VALIDITY_MINUTES = 5
export const MAX_TALK_ENTITLEMENT_VALIDITY_MINUTES = 2880 // 48 hours

export const CANONICAL_UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function validateGrantActionId(actionId: unknown): string {
  if (typeof actionId !== 'string' || !CANONICAL_UUID_V4_REGEX.test(actionId)) {
    throw new Section16ValidationError(
      'Wymagany jest niezgadywalny, kanoniczny identyfikator akcji w formacie UUID v4 (actionId)',
    )
  }
  return actionId
}

export function validateNotificationRequestId(id: unknown): string {
  if (typeof id !== 'string' || !SECTION16_UUID_REGEX.test(id.trim())) {
    throw new Section16ValidationError(
      'Wymagany jest prawidłowy identyfikator zgłoszenia powiadomienia w formacie UUID (notificationRequestId)',
    )
  }
  return id.trim()
}

export const RESERVED_PAID_ENTITLEMENT_CANONICAL_KEYS = Object.freeze([
  'actionType',
  'notificationRequestId',
  'actionId',
  'allocatedSeconds',
  'validForMinutes',
  'paymentReference',
  'payment_reference',
  'paymentReferenceHash',
  'bookingId',
  'metadata',
] as const)

export const REDACTED_PAYMENT_REFERENCE_MARKER = '[REDACTED_PAYMENT_REFERENCE]'

/**
 * Deterministically and recursively redacts any occurrence of the authoritative raw payment reference
 * within strings, arrays, nested objects, and object keys inside metadata.
 * Does not mutate server canonical fields.
 */
export function redactPaymentReferenceFromMetadata<T>(
  value: T,
  paymentReference?: string | null,
): T {
  if (
    !paymentReference ||
    typeof paymentReference !== 'string' ||
    !paymentReference.trim()
  ) {
    return value
  }

  const target = paymentReference.trim()

  function redactRecursive(val: unknown): unknown {
    if (typeof val === 'string') {
      return val.replaceAll(target, REDACTED_PAYMENT_REFERENCE_MARKER)
    }
    if (val === null || val === undefined || typeof val !== 'object') {
      return val
    }
    if (Array.isArray(val)) {
      return val.map((item) => redactRecursive(item))
    }
    const record = val as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [key, propVal] of Object.entries(record)) {
      const redactedKey = key.replaceAll(target, REDACTED_PAYMENT_REFERENCE_MARKER)
      result[redactedKey] = redactRecursive(propVal)
    }
    return result
  }

  return redactRecursive(value) as T
}


export function validateAllocatedSeconds(allocatedSeconds: unknown): number {
  if (
    typeof allocatedSeconds !== 'number' ||
    !Number.isInteger(allocatedSeconds) ||
    allocatedSeconds < MIN_TALK_ENTITLEMENT_ALLOCATED_SECONDS ||
    allocatedSeconds > MAX_TALK_ENTITLEMENT_ALLOCATED_SECONDS
  ) {
    throw new Section16ValidationError(
      `allocatedSeconds musi być liczbą całkowitą z bezpiecznego zakresu ${MIN_TALK_ENTITLEMENT_ALLOCATED_SECONDS}-${MAX_TALK_ENTITLEMENT_ALLOCATED_SECONDS} sekund (brak domyślnej wartości)`,
    )
  }
  return allocatedSeconds
}

export function validateValidForMinutes(validForMinutes: unknown): number {
  if (
    typeof validForMinutes !== 'number' ||
    !Number.isInteger(validForMinutes) ||
    validForMinutes < MIN_TALK_ENTITLEMENT_VALIDITY_MINUTES ||
    validForMinutes > MAX_TALK_ENTITLEMENT_VALIDITY_MINUTES
  ) {
    throw new Section16ValidationError(
      `validForMinutes musi być liczbą całkowitą z bezpiecznego zakresu ${MIN_TALK_ENTITLEMENT_VALIDITY_MINUTES}-${MAX_TALK_ENTITLEMENT_VALIDITY_MINUTES} minut (brak domyślnej wartości)`,
    )
  }
  return validForMinutes
}

// ---------------------------------------------------------------------------
// DESCRIPTOR (MINIMAL NON-PII SURFACE)
// ---------------------------------------------------------------------------

/**
 * Minimal public descriptor of a talk entitlement.
 * Excludes raw phone, masked phone, fingerprint, paymentReference, bookingId,
 * idempotencyKey, and any other contact identifiers.
 */
export interface PaidTalkEntitlementDescriptor {
  entitlementId: string
  notificationRequestId: string
  state: TalkEntitlementState
  allocatedSeconds: number
  validFrom: string
  validUntil: string
  actionId: string
}

export function createPaidTalkEntitlementDescriptor(
  entitlement: ConsultationTalkEntitlement,
  actionId: string,
): PaidTalkEntitlementDescriptor {
  const validActionId = validateGrantActionId(actionId)
  if (!entitlement.notificationRequestId) {
    throw new Section16ValidationError(
      'Uprawnienie nie jest powiązane ze zgłoszeniem powiadomienia o dostępności',
    )
  }

  return {
    entitlementId: entitlement.id,
    notificationRequestId: entitlement.notificationRequestId,
    state: entitlement.state,
    allocatedSeconds: entitlement.allocatedSeconds,
    validFrom: entitlement.validFrom,
    validUntil: entitlement.validUntil,
    actionId: validActionId,
  }
}

// ---------------------------------------------------------------------------
// INTEGRATION BOUNDARIES & FAIL-CLOSED ADAPTERS
// ---------------------------------------------------------------------------

export interface OwnerTalkNotificationAdapter {
  dispatchOwnerTalkNotification(payload: Record<string, unknown>): Promise<void>
}

export interface ClientTalkNotificationAdapter {
  dispatchClientTalkNotification(descriptor: PaidTalkEntitlementDescriptor): Promise<void>
}

export interface CallBridgeInitiationAdapter {
  initiateCallBridge(descriptor: PaidTalkEntitlementDescriptor): Promise<void>
}

export class DisabledOwnerTalkNotificationAdapter implements OwnerTalkNotificationAdapter {
  async dispatchOwnerTalkNotification(_payload?: Record<string, unknown>): Promise<void> {
    throw new Section16DomainError(
      'Powiadomienia właściciela o uprawnieniu do rozmowy są wyłączone w tym etapie (fail-closed)',
      'OWNER_TALK_NOTIFICATION_DISABLED',
    )
  }
}

export class DisabledClientTalkNotificationAdapter implements ClientTalkNotificationAdapter {
  async dispatchClientTalkNotification(_descriptor?: PaidTalkEntitlementDescriptor): Promise<void> {
    throw new Section16DomainError(
      'Powiadomienia klienta o uprawnieniu do rozmowy są wyłączone w tym etapie (fail-closed)',
      'CLIENT_TALK_NOTIFICATION_DISABLED',
    )
  }
}

export class DisabledCallBridgeInitiationAdapter implements CallBridgeInitiationAdapter {
  async initiateCallBridge(_descriptor?: PaidTalkEntitlementDescriptor): Promise<void> {
    throw new Section16DomainError(
      'Inicjacja połączenia / call bridge jest wyłączona w tym etapie (fail-closed)',
      'CALL_BRIDGE_INITIATION_DISABLED',
    )
  }
}

export interface PaidEntitlementFlowIntegrationBoundaries {
  ownerNotification?: OwnerTalkNotificationAdapter
  clientNotification?: ClientTalkNotificationAdapter
  callBridge?: CallBridgeInitiationAdapter
}

export const DEFAULT_PAID_ENTITLEMENT_FLOW_BOUNDARIES: PaidEntitlementFlowIntegrationBoundaries = Object.freeze({
  ownerNotification: new DisabledOwnerTalkNotificationAdapter(),
  clientNotification: new DisabledClientTalkNotificationAdapter(),
  callBridge: new DisabledCallBridgeInitiationAdapter(),
})

// ---------------------------------------------------------------------------
// OPERATION INPUT & RESULT
// ---------------------------------------------------------------------------

export interface GrantTalkEntitlementForPaidAvailabilityInput {
  notificationRequestId: string
  idempotencyKey: string
  actionId: string
  allocatedSeconds: number
  validForMinutes: number
  now?: Date
  payload?: Record<string, unknown>
}

export interface GrantTalkEntitlementForPaidAvailabilityResult {
  entitlement: ConsultationTalkEntitlement
  descriptor: PaidTalkEntitlementDescriptor
  isRetry: boolean
}

// ---------------------------------------------------------------------------
// GRANT TALK ENTITLEMENT OPERATION
// ---------------------------------------------------------------------------

export async function grantTalkEntitlementForPaidAvailability(
  input: GrantTalkEntitlementForPaidAvailabilityInput,
  boundaries: PaidEntitlementFlowIntegrationBoundaries = DEFAULT_PAID_ENTITLEMENT_FLOW_BOUNDARIES,
): Promise<GrantTalkEntitlementForPaidAvailabilityResult> {
  // 1. Strict validation of input parameters (fail-closed)
  const notificationRequestId = validateNotificationRequestId(input.notificationRequestId)
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)
  const actionId = validateGrantActionId(input.actionId)
  const allocatedSeconds = validateAllocatedSeconds(input.allocatedSeconds)
  const validForMinutes = validateValidForMinutes(input.validForMinutes)

  const nowDate = input.now ?? new Date()
  if (Number.isNaN(nowDate.getTime())) {
    throw new Section16ValidationError('Wstrzyknięta data now jest nieprawidłowa')
  }

  // 2. Read authoritative source record server-side
  const notifReq = await getAvailabilityNotificationRequest(notificationRequestId)
  if (!notifReq) {
    throw new Section16NotFoundError('AvailabilityNotificationRequest', notificationRequestId)
  }

  // 3. Build canonical event payload & idempotency identity
  // Isolate client metadata: strip reserved canonical keys so caller can NEVER tamper with
  // canonical operation identity or inject raw paymentReference into audit events.
  // Metadata is stored strictly once, isolated under the 'metadata' key, with recursive
  // deterministic redaction of the authoritative raw payment reference before and after sanitization.
  const rawClientPayload = redactPaymentReferenceFromMetadata(
    input.payload ?? {},
    notifReq.paymentReference,
  )
  const sanitizedClientPayload = sanitizePayload(rawClientPayload)
  const clientMetadata: Record<string, unknown> = {}
  if (
    sanitizedClientPayload &&
    typeof sanitizedClientPayload === 'object' &&
    !Array.isArray(sanitizedClientPayload)
  ) {
    for (const [key, value] of Object.entries(sanitizedClientPayload)) {
      if (
        !RESERVED_PAID_ENTITLEMENT_CANONICAL_KEYS.includes(
          key as (typeof RESERVED_PAID_ENTITLEMENT_CANONICAL_KEYS)[number],
        )
      ) {
        clientMetadata[key] = value
      }
    }
  }

  const redactedMetadata = redactPaymentReferenceFromMetadata(
    clientMetadata,
    notifReq.paymentReference,
  )

  const paymentReferenceHash = computePaymentReferenceHash(notifReq.paymentReference)

  const canonicalPayload: Record<string, unknown> = {
    actionType: PAID_ENTITLEMENT_ACTION_TYPE,
    notificationRequestId,
    actionId,
    allocatedSeconds,
    validForMinutes,
    paymentReferenceHash,
    bookingId: notifReq.bookingId ?? null,
    metadata: redactedMetadata,
  }
  const payloadHash = computeSection16PayloadHash(canonicalPayload)

  // 4. Exact retry check: if an event already exists with this idempotencyKey
  const existingEvent = await getTalkEntitlementEventByIdempotencyKey(idempotencyKey)
  if (existingEvent) {
    const evPayload = (existingEvent.payload ?? {}) as Record<string, unknown>

    if (evPayload.actionId !== undefined && evPayload.actionId !== actionId) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (
      evPayload.notificationRequestId !== undefined &&
      evPayload.notificationRequestId !== notificationRequestId
    ) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (
      evPayload.allocatedSeconds !== undefined &&
      evPayload.allocatedSeconds !== allocatedSeconds
    ) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (
      evPayload.validForMinutes !== undefined &&
      evPayload.validForMinutes !== validForMinutes
    ) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    if (existingEvent.payloadHash !== payloadHash) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    const existingEnt = await getTalkEntitlement(existingEvent.entitlementId)
    if (!existingEnt) {
      throw new Section16NotFoundError('ConsultationTalkEntitlement', existingEvent.entitlementId)
    }

    if (
      existingEnt.notificationRequestId &&
      existingEnt.notificationRequestId !== notificationRequestId
    ) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Exact retry: return existing entitlement and descriptor without mutation or new event,
    // even after validUntil, and even after source state transitioned to consumed, cancelled, or expired.
    return {
      entitlement: existingEnt,
      descriptor: createPaidTalkEntitlementDescriptor(existingEnt, actionId),
      isRetry: true,
    }
  }

  // 5. First attempt strict state verification: must be exactly accepted_paid
  if (notifReq.state !== 'accepted_paid') {
    if (
      notifReq.state === 'consumed' ||
      notifReq.state === 'cancelled' ||
      notifReq.state === 'expired'
    ) {
      throw new Section16TerminalStateError('AvailabilityNotificationRequest', notifReq.state)
    }
    throw new Section16PaymentRequiredError(
      `Zgłoszenie powiadomienia ${notificationRequestId} nie posiada opłaconej oferty (stan: ${notifReq.state})`,
    )
  }

  // 6. First attempt: require non-empty paymentReference and valid acceptedAt
  if (!notifReq.paymentReference || notifReq.paymentReference.trim().length === 0) {
    throw new Section16PaymentRequiredError(
      'Zgłoszenie powiadomienia nie posiada referencji płatności',
    )
  }

  if (
    !notifReq.acceptedAt ||
    notifReq.acceptedAt.trim().length === 0 ||
    Number.isNaN(Date.parse(notifReq.acceptedAt))
  ) {
    throw new Section16PaymentRequiredError(
      'Zgłoszenie powiadomienia nie posiada prawidłowej daty zaakceptowania płatności (acceptedAt)',
    )
  }

  // 7. First attempt: verify payment occurred before offer expiration: acceptedAt <= offerExpiresAt
  if (notifReq.offerExpiresAt) {
    const acceptedTime = Date.parse(notifReq.acceptedAt)
    const offerExpiresTime = Date.parse(notifReq.offerExpiresAt)
    if (acceptedTime > offerExpiresTime) {
      throw new Section16HoldExpiredError(
        'Płatność oferty została zarejestrowana po wygaśnięciu oferty (acceptedAt > offerExpiresAt)',
      )
    }
  }

  // 8. Calculate validity window for the new entitlement
  const validFromIso = nowDate.toISOString()
  const validUntilDate = new Date(nowDate.getTime() + validForMinutes * 60 * 1000)
  const validUntilIso = validUntilDate.toISOString()

  // 9. Create talk entitlement atomically via store
  // Derives callerPhoneFingerprint, callerPhoneMasked, paymentReference, and bookingId ONLY from authoritative source
  // Note: payload stored in event is canonicalPayload containing paymentReferenceHash (zero raw paymentReference)
  const entitlement = await createTalkEntitlement(
    {
      callerPhoneFingerprint: notifReq.callerPhoneFingerprint,
      callerPhoneMasked: notifReq.callerPhoneMasked,
      paymentReference: notifReq.paymentReference.trim(),
      bookingId: notifReq.bookingId ?? null,
      notificationRequestId: notifReq.id,
      allocatedSeconds,
      validFrom: validFromIso,
      validUntil: validUntilIso,
      idempotencyKey,
      payload: canonicalPayload,
    },
    nowDate,
  )

  // 10. Boundaries check: no external adapters called during grant
  // (boundaries passed for fail-closed isolation and spy verification)
  void boundaries

  const descriptor = createPaidTalkEntitlementDescriptor(entitlement, actionId)

  return {
    entitlement,
    descriptor,
    isRetry: false,
  }
}
