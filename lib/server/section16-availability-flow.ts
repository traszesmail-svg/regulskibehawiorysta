// Section 16 Stage 3: Availability notification queue flow backend orchestration (Path B).
// Handles strict manual owner readiness confirmation, safe FIFO queue selection,
// and atomic time-limited offer preparation with fail-closed integration boundaries.

import {
  AvailabilityNotificationRequest,
  AvailabilityNotificationState,
  Section16DomainError,
  Section16NotFoundError,
  Section16ConcurrencyError,
  Section16IdempotencyConflictError,
  Section16ValidationError,
  Section16TransitionError,
} from './section16-types'
import {
  MIN_OFFER_EXPIRY_MINUTES,
  MAX_OFFER_EXPIRY_MINUTES,
  DEFAULT_OFFER_EXPIRY_MINUTES,
  validateIdempotencyKey,
  computeSection16PayloadHash,
} from './section16-policy'
import {
  getFirstActiveQueuedAvailabilityNotificationRequest,
  getAvailabilityNotificationRequest,
  getAvailabilityNotificationEventByIdempotencyKey,
  offerAvailabilityNotification,
} from './section16-store'

export const AVAILABILITY_OFFER_ACTION_TYPE = 'owner_availability_offer'

// ---------------------------------------------------------------------------
// DOMAIN ERRORS & RESULT TYPES
// ---------------------------------------------------------------------------

export class Section16AvailabilityFlowError extends Section16DomainError {
  constructor(message: string, code: string) {
    super(message, code)
    this.name = 'Section16AvailabilityFlowError'
  }
}

export class Section16QueueEmptyError extends Section16DomainError {
  constructor(message = 'Brak aktywnych osób w kolejce oczekujących') {
    super(message, 'QUEUE_EMPTY')
    this.name = 'Section16QueueEmptyError'
  }
}

export const CANONICAL_UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function validateOwnerActionId(ownerActionId: unknown): string {
  if (
    typeof ownerActionId !== 'string' ||
    !CANONICAL_UUID_V4_REGEX.test(ownerActionId)
  ) {
    throw new Section16ValidationError(
      'Wymagany jest niezgadywalny, kanoniczny identyfikator akcji właściciela w formacie UUID v4 (ownerActionId)',
    )
  }
  return ownerActionId
}

export interface AvailabilityOfferDescriptor {
  requestId: string
  queuePosition: number
  state: AvailabilityNotificationState
  channel: 'sms' | 'email'
  ownerActionId: string
  offeredAt: string
  offerExpiresAt: string
  offerTtlMinutes: number
  paymentReference: null
  paymentUrl: null
  paymentToken: null
}

export interface ProcessOwnerAvailabilityReadyInput {
  ownerConfirmedReady: boolean
  ownerActionId: string
  idempotencyKey: string
  offerTtlMinutes?: number
  expectedRequestId?: string
  expectedVersion?: number
  expectedQueuePosition?: number
  now?: Date
  payload?: Record<string, unknown>
}

export interface ProcessOwnerAvailabilityReadyResult {
  request: AvailabilityNotificationRequest
  descriptor: AvailabilityOfferDescriptor
  isRetry: boolean
}

// ---------------------------------------------------------------------------
// INTEGRATION BOUNDARIES & ADAPTERS (FAIL-CLOSED IN THIS STAGE)
// ---------------------------------------------------------------------------

export interface ClientOfferDispatchAdapter {
  dispatchClientOffer(descriptor: AvailabilityOfferDescriptor): Promise<void>
}

export interface OwnerNotificationAdapter {
  dispatchOwnerNotification(payload: Record<string, unknown>): Promise<void>
}

export class DisabledClientOfferDispatchAdapter implements ClientOfferDispatchAdapter {
  async dispatchClientOffer(): Promise<void> {
    throw new Section16DomainError(
      'Wysyłka oferty do klienta jest wyłączona w tym etapie (fail-closed)',
      'CLIENT_OFFER_DISPATCH_DISABLED',
    )
  }
}

export class DisabledOwnerNotificationAdapter implements OwnerNotificationAdapter {
  async dispatchOwnerNotification(): Promise<void> {
    throw new Section16DomainError(
      'Powiadomienia właściciela są wyłączone w tym etapie (fail-closed)',
      'OWNER_NOTIFICATION_DISABLED',
    )
  }
}

export interface AvailabilityFlowIntegrationBoundaries {
  clientOfferDispatch?: ClientOfferDispatchAdapter
  ownerNotification?: OwnerNotificationAdapter
}

export const DEFAULT_AVAILABILITY_FLOW_BOUNDARIES: AvailabilityFlowIntegrationBoundaries = Object.freeze({
  clientOfferDispatch: new DisabledClientOfferDispatchAdapter(),
  ownerNotification: new DisabledOwnerNotificationAdapter(),
})

// ---------------------------------------------------------------------------
// DESCRIPTOR BUILDER (NON-PII)
// ---------------------------------------------------------------------------

export function createAvailabilityOfferDescriptor(
  request: AvailabilityNotificationRequest,
  ownerActionId: string,
  offerTtlMinutes: number,
): AvailabilityOfferDescriptor {
  const validOwnerActionId = validateOwnerActionId(ownerActionId)
  if (!request.offeredAt || !request.offerExpiresAt) {
    throw new Section16ValidationError('Brak wymaganych znaczników czasu oferty w rekordzie')
  }

  return {
    requestId: request.id,
    queuePosition: request.queuePosition,
    state: request.state,
    channel: request.channel,
    ownerActionId: validOwnerActionId,
    offeredAt: request.offeredAt,
    offerExpiresAt: request.offerExpiresAt,
    offerTtlMinutes,
    paymentReference: null,
    paymentUrl: null,
    paymentToken: null,
  }
}

// ---------------------------------------------------------------------------
// ORCHESTRATION: PROCESS OWNER READINESS & CREATE OFFER
// ---------------------------------------------------------------------------

export async function processOwnerAvailabilityReady(
  input: ProcessOwnerAvailabilityReadyInput,
  _boundaries: AvailabilityFlowIntegrationBoundaries = DEFAULT_AVAILABILITY_FLOW_BOUNDARIES,
): Promise<ProcessOwnerAvailabilityReadyResult> {
  // 1. Explicit owner confirmation is mandatory (strictly true).
  // Fails closed immediately without reading contacts and without any mutations.
  if (input.ownerConfirmedReady !== true) {
    throw new Section16AvailabilityFlowError(
      'Wymagane jest jawne potwierdzenie gotowości przez właściciela (ownerConfirmedReady === true)',
      'OWNER_NOT_READY',
    )
  }

  // 2. ownerActionId: mandatory unguessable canonical UUID v4 action identifier (min 122 bits randomness)
  const ownerActionId = validateOwnerActionId(input.ownerActionId)

  // 3. idempotencyKey: mandatory valid key (1-128 chars)
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey)

  // 4. offerTtlMinutes: bounded in [MIN_OFFER_EXPIRY_MINUTES, MAX_OFFER_EXPIRY_MINUTES], default 15
  let ttlMinutes = DEFAULT_OFFER_EXPIRY_MINUTES
  if (input.offerTtlMinutes !== undefined) {
    if (
      typeof input.offerTtlMinutes !== 'number' ||
      !Number.isInteger(input.offerTtlMinutes) ||
      input.offerTtlMinutes < MIN_OFFER_EXPIRY_MINUTES ||
      input.offerTtlMinutes > MAX_OFFER_EXPIRY_MINUTES
    ) {
      throw new Section16ValidationError(
        `Czas ważności oferty (TTL) musi być liczbą całkowitą od ${MIN_OFFER_EXPIRY_MINUTES} do ${MAX_OFFER_EXPIRY_MINUTES} minut`,
      )
    }
    ttlMinutes = input.offerTtlMinutes
  }

  // 5. expectedVersion: if provided, must be a positive integer
  if (input.expectedVersion !== undefined) {
    if (
      typeof input.expectedVersion !== 'number' ||
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion <= 0 ||
      Number.isNaN(input.expectedVersion)
    ) {
      throw new Section16ValidationError('expectedVersion musi być dodatnią liczbą całkowitą')
    }
  }

  const now = input.now ?? new Date()

  // 6. Check existing event for idempotency BEFORE mutation or time expiration checks
  const existingEvent = await getAvailabilityNotificationEventByIdempotencyKey(idempotencyKey)
  if (existingEvent) {
    if (existingEvent.eventType !== 'offer_sent') {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    const existingReq = await getAvailabilityNotificationRequest(existingEvent.requestId)
    if (!existingReq) {
      throw new Section16NotFoundError('AvailabilityNotificationRequest', existingEvent.requestId)
    }

    const evPayload = (existingEvent.payload ?? {}) as Record<string, unknown>

    if (evPayload.ownerActionId !== undefined && evPayload.ownerActionId !== ownerActionId) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    if (input.expectedRequestId !== undefined && input.expectedRequestId !== existingEvent.requestId) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (input.expectedQueuePosition !== undefined && input.expectedQueuePosition !== existingReq.queuePosition) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (evPayload.queuePosition !== undefined && evPayload.queuePosition !== existingReq.queuePosition) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (
      input.expectedVersion !== undefined &&
      evPayload.expectedVersion !== undefined &&
      input.expectedVersion !== evPayload.expectedVersion
    ) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }
    if (evPayload.offerTtlMinutes !== undefined && evPayload.offerTtlMinutes !== ttlMinutes) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Canonical payload hash check
    const candidatePayload: Record<string, unknown> = {
      ...(input.payload ?? {}),
      actionType: AVAILABILITY_OFFER_ACTION_TYPE,
      ownerActionId,
      requestId: existingReq.id,
      queuePosition: existingReq.queuePosition,
      expectedVersion: evPayload.expectedVersion,
      offerTtlMinutes: ttlMinutes,
    }
    const candidatePayloadHash = computeSection16PayloadHash(candidatePayload)
    if (existingEvent.payloadHash !== candidatePayloadHash) {
      throw new Section16IdempotencyConflictError(idempotencyKey)
    }

    // Exact retry: returns existing request and descriptor without any mutation or new events,
    // even after expiresAt or offerExpiresAt has passed.
    const descriptor = createAvailabilityOfferDescriptor(
      existingReq,
      ownerActionId,
      ttlMinutes,
    )

    return {
      request: existingReq,
      descriptor,
      isRetry: true,
    }
  }

  // 7. Fresh operation: strictly pick the oldest active queued request
  const candidate = await getFirstActiveQueuedAvailabilityNotificationRequest(now)
  if (!candidate) {
    throw new Section16QueueEmptyError()
  }

  if (candidate.state !== 'queued') {
    throw new Section16TransitionError('AvailabilityNotificationRequest', candidate.state, 'offer_sent')
  }

  // If caller specified expectedRequestId or expectedQueuePosition, verify against candidate
  if (input.expectedRequestId !== undefined && input.expectedRequestId !== candidate.id) {
    throw new Section16ConcurrencyError(candidate.version, candidate.version)
  }
  if (input.expectedQueuePosition !== undefined && input.expectedQueuePosition !== candidate.queuePosition) {
    throw new Section16ConcurrencyError(candidate.version, candidate.version)
  }

  // CAS expectedVersion verification
  const expectedVersion = input.expectedVersion ?? candidate.version
  if (input.expectedVersion !== undefined && input.expectedVersion !== candidate.version) {
    throw new Section16ConcurrencyError(input.expectedVersion, candidate.version)
  }

  const offerExpiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString()
  const payloadToStore: Record<string, unknown> = {
    ...(input.payload ?? {}),
    actionType: AVAILABILITY_OFFER_ACTION_TYPE,
    ownerActionId,
    requestId: candidate.id,
    queuePosition: candidate.queuePosition,
    expectedVersion,
    offerTtlMinutes: ttlMinutes,
  }

  const updated = await offerAvailabilityNotification(
    {
      requestId: candidate.id,
      expectedVersion,
      offerExpiresAt,
      idempotencyKey,
      payload: payloadToStore,
    },
    now,
  )

  const descriptor = createAvailabilityOfferDescriptor(
    updated,
    ownerActionId,
    ttlMinutes,
  )

  return {
    request: updated,
    descriptor,
    isRetry: false,
  }
}
