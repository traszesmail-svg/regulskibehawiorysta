'use client'

const SUCCESS_CACHE_MS = 2_000
const NETWORK_TIMEOUT_MS = 12_000

type ReadOptions = {
  /** Limits this caller's wait without cancelling a shared request. */
  signal?: AbortSignal
  /** A user-triggered refresh bypasses a successful short-lived response. */
  force?: boolean
}

type CachedPayload = {
  expiresAt: number
  payload: unknown
}

const inFlightReads = new Map<string, Promise<unknown>>()
const successfulReads = new Map<string, CachedPayload>()

function abortError(signal: AbortSignal) {
  return signal.reason ?? new DOMException('The availability read was aborted.', 'AbortError')
}

function waitForCaller<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request
  if (signal.aborted) return Promise.reject(abortError(signal))

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError(signal))
    signal.addEventListener('abort', onAbort, { once: true })
    void request.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

function loadAvailability(url: string): Promise<unknown> {
  const request = fetch(url, {
    cache: 'no-store',
    // The endpoint reads availability windows in parallel. Keep the shared network
    // request bounded while each caller retains its own shorter deadline.
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  })
    .then(async (response) => {
      const payload = await response.json()
      if (!response.ok) throw new Error('Availability read failed.')
      successfulReads.set(url, { payload, expiresAt: Date.now() + SUCCESS_CACHE_MS })
      return payload
    })
    .finally(() => inFlightReads.delete(url))

  inFlightReads.set(url, request)
  return request
}

/**
 * Reads the public availability endpoint without sharing mutations. Identical URLs
 * share one in-flight request and a successful payload for only two seconds.
 */
export function readZapytajAvailability<T>(url = '/api/zapytaj/availability', options: ReadOptions = {}): Promise<T> {
  const cached = successfulReads.get(url)
  if (!options.force && cached) {
    if (cached.expiresAt > Date.now()) return waitForCaller(Promise.resolve(cached.payload as T), options.signal)
    successfulReads.delete(url)
  }

  const request = (inFlightReads.get(url) ?? loadAvailability(url)) as Promise<T>
  return waitForCaller(request, options.signal)
}

/** Test-only reset so mocked fetch scenarios remain isolated. */
export function resetZapytajAvailabilityReadCacheForTests() {
  inFlightReads.clear()
  successfulReads.clear()
}
