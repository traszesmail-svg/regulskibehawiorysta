import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  readZapytajAvailability,
  resetZapytajAvailabilityReadCacheForTests,
} from '@/lib/zapytaj-availability-client'

const originalFetch = globalThis.fetch
const originalDateNow = Date.now

afterEach(() => {
  globalThis.fetch = originalFetch
  Date.now = originalDateNow
  resetZapytajAvailabilityReadCacheForTests()
})

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('public availability client reader', () => {
  it('shares one in-flight request and briefly reuses a successful result', async () => {
    let calls = 0
    let resolveFetch: ((response: Response) => void) | undefined
    globalThis.fetch = (() => {
      calls += 1
      return new Promise<Response>((resolve) => { resolveFetch = resolve })
    }) as typeof fetch

    const first = readZapytajAvailability<{ source: string }>('/api/zapytaj/availability')
    const second = readZapytajAvailability<{ source: string }>('/api/zapytaj/availability')
    assert.equal(calls, 1)

    resolveFetch?.(jsonResponse({ source: 'live' }))
    assert.deepEqual(await first, { source: 'live' })
    assert.deepEqual(await second, { source: 'live' })

    assert.deepEqual(await readZapytajAvailability<{ source: string }>('/api/zapytaj/availability'), { source: 'live' })
    assert.equal(calls, 1)
  })

  it('does not cache errors and lets a later read recover', async () => {
    let calls = 0
    globalThis.fetch = (() => {
      calls += 1
      return calls === 1
        ? Promise.reject(new Error('temporary upstream failure'))
        : Promise.resolve(jsonResponse({ recovered: true }))
    }) as typeof fetch

    await assert.rejects(readZapytajAvailability('/api/zapytaj/availability'), /temporary upstream failure/)
    assert.deepEqual(await readZapytajAvailability<{ recovered: boolean }>('/api/zapytaj/availability'), { recovered: true })
    assert.equal(calls, 2)
  })

  it('lets one caller time out without cancelling its shared read for another caller', async () => {
    let calls = 0
    let networkSignal: AbortSignal | undefined
    let resolveFetch: ((response: Response) => void) | undefined
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1
      networkSignal = init?.signal ?? undefined
      return new Promise<Response>((resolve) => { resolveFetch = resolve })
    }) as typeof fetch

    const shortDeadline = new AbortController()
    const shortCaller = readZapytajAvailability('/api/zapytaj/availability', { signal: shortDeadline.signal })
    const longCaller = readZapytajAvailability<{ available: boolean }>('/api/zapytaj/availability')
    shortDeadline.abort(new Error('short deadline'))

    await assert.rejects(shortCaller, /short deadline/)
    assert.notEqual(networkSignal, shortDeadline.signal)
    resolveFetch?.(jsonResponse({ available: true }))
    assert.deepEqual(await longCaller, { available: true })
    assert.equal(calls, 1)
  })

  it('expires a successful result after two seconds', async () => {
    let now = 1_000
    let calls = 0
    Date.now = () => now
    globalThis.fetch = (() => {
      calls += 1
      return Promise.resolve(jsonResponse({ call: calls }))
    }) as typeof fetch

    assert.deepEqual(await readZapytajAvailability('/api/zapytaj/availability'), { call: 1 })
    now += 2_001
    assert.deepEqual(await readZapytajAvailability('/api/zapytaj/availability'), { call: 2 })
  })

  it('keeps month queries isolated and allows a forced refresh', async () => {
    const urls: string[] = []
    globalThis.fetch = ((input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)
      return Promise.resolve(jsonResponse({ url, request: urls.length }))
    }) as typeof fetch

    const current = '/api/zapytaj/availability'
    const later = '/api/zapytaj/availability?from=2026-11-01'
    const [currentPayload, laterPayload] = await Promise.all([
      readZapytajAvailability<{ url: string }>(current),
      readZapytajAvailability<{ url: string }>(later),
    ])
    assert.equal(currentPayload.url, current)
    assert.equal(laterPayload.url, later)
    await readZapytajAvailability(current, { force: true })
    assert.deepEqual(urls, [current, later, current])
  })
})
