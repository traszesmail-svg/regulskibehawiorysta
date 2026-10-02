import { AsyncLocalStorage } from 'node:async_hooks'

const availabilityReadContext = new AsyncLocalStorage<AbortSignal>()
const abortSignalWithAny = AbortSignal as typeof AbortSignal & { any(signals: AbortSignal[]): AbortSignal }

function combineSignals(signals: Array<AbortSignal | null | undefined>): AbortSignal | undefined {
  const activeSignals = [...new Set(signals.filter((signal): signal is AbortSignal => Boolean(signal)))]
  if (activeSignals.length === 0) return undefined
  if (activeSignals.length === 1) return activeSignals[0]
  return abortSignalWithAny.any(activeSignals)
}

function requestSignal(input: RequestInfo | URL): AbortSignal | undefined {
  return input instanceof Request ? input.signal : undefined
}

/**
 * Runs a read with a deadline that is visible only to SDK clients configured with
 * fetchWithAvailabilityReadDeadline. Other server reads and mutations are unchanged.
 */
export async function withAvailabilityReadDeadline<T>(read: () => Promise<T>, timeoutMs = 4_000): Promise<T> {
  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const reason = new DOMException(`Availability read timed out after ${timeoutMs}ms`, 'TimeoutError')
      controller.abort(reason)
      reject(reason)
    }, timeoutMs)
  })

  try {
    return await Promise.race([availabilityReadContext.run(controller.signal, read), deadline])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

/** A Supabase fetch adapter that preserves supplied signals and adds only the active availability read deadline. */
export async function fetchWithAvailabilityReadDeadline(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const deadlineSignal = availabilityReadContext.getStore()
  if (!deadlineSignal) return fetch(input, init)
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') return fetch(input, init)

  const signal = combineSignals([deadlineSignal, requestSignal(input), init?.signal ?? undefined])
  return fetch(input, { ...init, signal })
}
