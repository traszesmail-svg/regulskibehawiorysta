// Section 16 Stage 5: Periodic expiration sweep server wrapper.
// Safe, bounded, atomic, idempotent periodic expiration of qualified Section 16 records
// (Urgent Intake, Availability Notifications, and Consultation Talk Entitlements).
// No cron or background schedule is activated in this stage.

import {
  Section16SweepResult,
  Section16ExpirationSweepOptions,
  Section16ValidationError,
} from './section16-types'
import {
  MIN_SWEEP_BATCH_LIMIT,
  MAX_SWEEP_BATCH_LIMIT,
  DEFAULT_SWEEP_BATCH_LIMIT,
  validateSweepBatchLimit,
} from './section16-policy'
import {
  sweepExpiredSection16Records,
  mapSection16SweepResult,
} from './section16-store'

export {
  MIN_SWEEP_BATCH_LIMIT,
  MAX_SWEEP_BATCH_LIMIT,
  DEFAULT_SWEEP_BATCH_LIMIT,
  validateSweepBatchLimit,
  mapSection16SweepResult,
}

export type {
  Section16SweepResult,
  Section16ExpirationSweepOptions,
}

/**
 * Executes a single, bounded, atomic sweep of expired Section 16 records.
 * Fails closed if batchLimit is missing or outside [1..500].
 * In test mode, options.now may be provided to simulate time boundaries.
 * In production mode, options.now should be omitted so DB server time is authoritative.
 */
export async function runSection16ExpirationSweep(
  options: Section16ExpirationSweepOptions,
): Promise<Section16SweepResult> {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Section16ValidationError(
      'Wymagany jest obiekt opcji (Section16ExpirationSweepOptions) z jawnym parametrem batchLimit',
    )
  }

  const validatedLimit = validateSweepBatchLimit(options.batchLimit)

  let validatedNow: Date | undefined = undefined
  if (options.now !== undefined && options.now !== null) {
    if (!(options.now instanceof Date) || Number.isNaN(options.now.getTime())) {
      throw new Section16ValidationError(
        'Opcjonalny parametr now musi być prawidłowym obiektem Date',
      )
    }
    validatedNow = options.now
  }

  return sweepExpiredSection16Records(validatedLimit, validatedNow)
}
