import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { startVisiblePolling } from '@/components/visible-polling'
import { subscribeZapytajAvailability } from '@/lib/zapytaj-availability-polling'
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

function pollingPage(initialHidden = false) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const page = new EventTarget()
  let hidden = initialHidden
  let nextTimer = 0
  const timers = new Map<number, () => void>()
  Object.defineProperty(page, 'hidden', { get: () => hidden })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: page })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    setInterval: (callback: () => void) => { timers.set(++nextTimer, callback); return nextTimer },
    clearInterval: (timer: number) => { timers.delete(timer) },
  } })

  return {
    timers,
    tick: () => { for (const callback of [...timers.values()]) callback() },
    visibility: (nextHidden: boolean) => { hidden = nextHidden; page.dispatchEvent(new Event('visibilitychange')) },
    restore: () => {
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
      else Reflect.deleteProperty(globalThis, 'window')
      if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
      else Reflect.deleteProperty(globalThis, 'document')
    },
  }
}

const settlePolling = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('shared public availability polling', () => {
  it('shares one schedule and GET across home/header subscribers, replays the snapshot, and cleans up the last subscriber', async () => {
    const page = pollingPage()
    let now = 1_000
    let calls = 0
    Date.now = () => now
    globalThis.fetch = (() => Promise.resolve(jsonResponse({ sequence: ++calls }))) as typeof fetch
    const home: unknown[] = [], header: unknown[] = [], late: unknown[] = []
    const fail = (error: unknown) => { throw error }
    const stopHome = subscribeZapytajAvailability({ onData: (payload) => home.push(payload), onError: fail })
    const stopHeader = subscribeZapytajAvailability({ onData: (payload) => header.push(payload), onError: fail })
    let stopLate = () => {}
    try {
      await settlePolling()
      assert.equal(calls, 1)
      assert.equal(page.timers.size, 1)
      assert.deepEqual(home, [{ sequence: 1 }])
      assert.equal(home[0], header[0])
      stopLate = subscribeZapytajAvailability({ onData: (payload) => late.push(payload), onError: fail })
      assert.equal(late[0], home[0])
      assert.equal(calls, 1)
      now += 20_000
      page.tick()
      await settlePolling()
      assert.equal(calls, 2)
      assert.equal(home[1], header[1])
      assert.equal(header[1], late[1])
      stopHome()
      now += 20_000
      page.tick()
      await settlePolling()
      assert.equal(calls, 3)
      assert.equal(home.length, 2)
      assert.equal(header.length, 3)
      stopHeader()
      stopLate()
      assert.equal(page.timers.size, 0)
      page.visibility(true)
      page.visibility(false)
      assert.equal(calls, 3)
    } finally { stopHome(); stopHeader(); stopLate(); page.restore() }
  })

  it('pauses both consumers while hidden and forces one fresh shared GET on visibility return', async () => {
    const page = pollingPage(true)
    let calls = 0
    globalThis.fetch = (() => Promise.resolve(jsonResponse({ sequence: ++calls }))) as typeof fetch
    const home: unknown[] = [], header: unknown[] = []
    const stopHome = subscribeZapytajAvailability({ onData: (payload) => home.push(payload), onError: () => {} })
    const stopHeader = subscribeZapytajAvailability({ onData: (payload) => header.push(payload), onError: () => {} })
    try {
      page.tick()
      assert.equal(calls, 0)
      assert.equal(page.timers.size, 0)
      page.visibility(false)
      page.visibility(false)
      await settlePolling()
      assert.equal(calls, 1)
      page.visibility(true)
      page.tick()
      assert.equal(calls, 1)
      page.visibility(false)
      await settlePolling()
      assert.equal(calls, 2, 'a fresh GET bypasses the two-second cache')
      assert.equal(page.timers.size, 1)
      assert.deepEqual(home, header)
      assert.deepEqual(home, [{ sequence: 1 }, { sequence: 2 }])
    } finally { stopHome(); stopHeader(); page.restore() }
  })

  it('preserves per-subscriber deadlines without overlapping or cancelling the shared GET', async () => {
    const page = pollingPage()
    let calls = 0
    let finish: (response: Response) => void = () => {}
    globalThis.fetch = (() => { calls += 1; return new Promise<Response>((resolve) => { finish = resolve }) }) as typeof fetch
    const short: unknown[] = [], long: unknown[] = [], shortErrors: unknown[] = [], longErrors: unknown[] = []
    const stopShort = subscribeZapytajAvailability({ onData: (payload) => short.push(payload), onError: (error) => shortErrors.push(error), timeoutMs: 1 })
    const stopLong = subscribeZapytajAvailability({ onData: (payload) => long.push(payload), onError: (error) => longErrors.push(error), timeoutMs: 1_000 })
    try {
      page.tick()
      page.tick()
      await new Promise((resolve) => setTimeout(resolve, 10))
      assert.equal(calls, 1)
      assert.equal(shortErrors.length, 1)
      assert.equal(longErrors.length, 0)
      finish(jsonResponse({ available: true }))
      await settlePolling()
      assert.deepEqual(short, [])
      assert.deepEqual(long, [{ available: true }])
    } finally { stopShort(); stopLong(); page.restore() }
  })

  it('delivers errors and recovery independently so one consumer validation cannot break the other', async () => {
    const page = pollingPage()
    let calls = 0
    globalThis.fetch = (() => ++calls === 1 ? Promise.reject(new Error('upstream failed')) : Promise.resolve(jsonResponse({ available: true }))) as typeof fetch
    const home: unknown[] = [], homeErrors: unknown[] = [], headerErrors: unknown[] = []
    const stopHome = subscribeZapytajAvailability({ onData: (payload) => home.push(payload), onError: (error) => homeErrors.push(error) })
    const stopHeader = subscribeZapytajAvailability({ onData: () => { throw new Error('header validation') }, onError: (error) => headerErrors.push(error) })
    try {
      await settlePolling()
      assert.equal(homeErrors.length, 1)
      assert.equal(homeErrors[0], headerErrors[0])
      page.visibility(true)
      page.visibility(false)
      await settlePolling()
      assert.equal(calls, 2)
      assert.deepEqual(home, [{ available: true }])
      assert.equal(homeErrors.length, 1)
      assert.equal(headerErrors.length, 2)
      assert.match(String(headerErrors[1]), /header validation/)
    } finally { stopHome(); stopHeader(); page.restore() }
  })
})

describe('visible page polling', () => {
  it('makes no periodic GET while hidden and refreshes exactly once on visibility return', async () => {
    const page = pollingPage()
    let calls = 0
    globalThis.fetch = (() => { calls += 1; return Promise.resolve(jsonResponse({ ok: true })) }) as typeof fetch
    const stop = startVisiblePolling(() => fetch('/api/status'), 20_000)
    try {
      await settlePolling()
      assert.equal(calls, 1)
      page.visibility(true)
      page.tick()
      page.tick()
      assert.equal(calls, 1)
      assert.equal(page.timers.size, 0)

      page.visibility(false)
      page.visibility(false)
      await settlePolling()
      assert.equal(calls, 2)
      assert.equal(page.timers.size, 1)
      page.tick()
      await settlePolling()
      assert.equal(calls, 3)

      stop()
      page.visibility(true)
      page.visibility(false)
      page.tick()
      assert.equal(calls, 3)
      assert.equal(page.timers.size, 0)
    } finally { stop(); page.restore() }
  })

  it('starts a hidden page without a read or timer, then resumes with a fresh read', async () => {
    const page = pollingPage(true)
    const reasons: boolean[] = []
    const stop = startVisiblePolling((fromVisibility) => { reasons.push(fromVisibility) }, 4000)
    try {
      page.tick()
      assert.deepEqual(reasons, [])
      assert.equal(page.timers.size, 0)
      page.visibility(false)
      await settlePolling()
      assert.deepEqual(reasons, [true])
      assert.equal(page.timers.size, 1)
    } finally { stop(); page.restore() }
  })

  it('serializes a slow GET and coalesces visibility resumes into one following refresh', async () => {
    const page = pollingPage()
    const completions: Array<() => void> = []
    const reasons: boolean[] = []
    let active = 0
    let maximumActive = 0
    const stop = startVisiblePolling((fromVisibility) => {
      reasons.push(fromVisibility)
      active += 1
      maximumActive = Math.max(maximumActive, active)
      return new Promise<void>((resolve) => completions.push(() => { active -= 1; resolve() }))
    }, 4000)
    try {
      page.tick()
      page.tick()
      page.visibility(true)
      page.visibility(false)
      page.visibility(true)
      page.visibility(false)
      assert.deepEqual(reasons, [false])
      completions.shift()!()
      await settlePolling()
      assert.deepEqual(reasons, [false, true])
      assert.equal(maximumActive, 1)
      assert.equal(page.timers.size, 1)
      page.tick()
      assert.deepEqual(reasons, [false, true])

      // An unmount cancels both the interval and the queued visibility refresh.
      page.visibility(true)
      page.visibility(false)
      stop()
      completions.shift()!()
      await settlePolling()
      assert.deepEqual(reasons, [false, true])
      assert.equal(page.timers.size, 0)
    } finally { stop(); page.restore() }
  })

  it('preserves a delayed first poll for existing status watchers', async () => {
    const page = pollingPage()
    const reasons: boolean[] = []
    const stop = startVisiblePolling((fromVisibility) => { reasons.push(fromVisibility) }, 7000, { immediate: false })
    try {
      assert.deepEqual(reasons, [])
      page.tick()
      await settlePolling()
      assert.deepEqual(reasons, [false])
      page.visibility(true)
      page.visibility(false)
      await settlePolling()
      assert.deepEqual(reasons, [false, true])
      assert.equal(page.timers.size, 1)
    } finally { stop(); page.restore() }
  })
})
