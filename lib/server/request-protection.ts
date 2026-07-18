export type RequestRateLimitPolicy = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

export type RequestRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

const MAX_RATE_LIMIT_ENTRIES = 5_000

function getClientFingerprint(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for')
  const candidate = forwardedFor?.split(',')[0] ?? realIp ?? vercelForwardedFor ?? 'unknown'

  return candidate.trim() || 'unknown'
}

export function createInMemoryRequestRateLimiter() {
  const store = new Map<string, RateLimitEntry>()

  function prune(now: number) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key)
      }
    }

    while (store.size > MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = store.keys().next().value
      if (typeof oldestKey !== 'string') break
      store.delete(oldestKey)
    }
  }

  return {
    consume(request: Request, policy: RequestRateLimitPolicy, now = Date.now()): RequestRateLimitResult {
      prune(now)

      const key = `${policy.key}:${getClientFingerprint(request)}`
      const current = store.get(key)

      if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + policy.windowMs })
        return { allowed: true }
      }

      if (current.count >= policy.limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        }
      }

      current.count += 1
      store.set(key, current)
      return { allowed: true }
    },
  }
}

const globalRateLimitStore = globalThis as typeof globalThis & {
  __regulskiBehawiorystaRequestRateLimiter?: ReturnType<typeof createInMemoryRequestRateLimiter>
}

const requestRateLimiter =
  globalRateLimitStore.__regulskiBehawiorystaRequestRateLimiter ?? createInMemoryRequestRateLimiter()

if (!globalRateLimitStore.__regulskiBehawiorystaRequestRateLimiter) {
  globalRateLimitStore.__regulskiBehawiorystaRequestRateLimiter = requestRateLimiter
}

export const PRIVATE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const

export function consumeRequestRateLimit(request: Request, policy: RequestRateLimitPolicy) {
  return requestRateLimiter.consume(request, policy)
}
