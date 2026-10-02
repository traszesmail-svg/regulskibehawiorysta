import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { fetchWithAvailabilityReadDeadline, withAvailabilityReadDeadline } from '@/lib/server/availability-read-context'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('availability read deadline context', () => {
  it('settles a non-cancellable read at its deadline and allows a later read', async () => {
    await assert.rejects(
      withAvailabilityReadDeadline(() => new Promise<Response>(() => {}), 10),
      /Availability read timed out after 10ms/,
    )
    assert.equal(await withAvailabilityReadDeadline(async () => 'recovered', 100), 'recovered')
  })

  it('preserves writes inside the availability context beyond its deadline', async () => {
    for (const method of ['POST', 'PATCH']) {
      const callerSignal = new AbortController().signal
      let observedSignal: AbortSignal | null | undefined
      let finishWrite: ((response: Response) => void) | undefined
      let write: Promise<Response> | undefined
      globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
        observedSignal = init?.signal
        return new Promise<Response>((resolve) => { finishWrite = resolve })
      }) as typeof fetch
      await assert.rejects(withAvailabilityReadDeadline(() => {
        write = fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/bookings', { method, signal: callerSignal })
        return write
      }, 10), /Availability read timed out after 10ms/)
      assert.equal(observedSignal, callerSignal)
      assert.equal(observedSignal?.aborted, false)
      finishWrite?.(new Response('saved'))
      assert.equal(await (await write)?.text(), 'saved')
    }
  })

  it('uses Request methods and respects init method overrides', async () => {
    const callerSignal = new AbortController().signal
    const request = new Request('https://example.test/rest/v1/bookings', { method: 'PATCH', signal: callerSignal })
    const observed: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      observed.push({ input, init })
      return Promise.resolve(new Response('ok'))
    }) as typeof fetch
    await withAvailabilityReadDeadline(() => fetchWithAvailabilityReadDeadline(request), 100)
    assert.equal(observed[0]?.input, request)
    assert.equal(observed[0]?.init, undefined)
    await withAvailabilityReadDeadline(() => fetchWithAvailabilityReadDeadline(request, { method: 'GET' }), 100)
    assert.ok(observed[1]?.init?.signal)
    assert.notEqual(observed[1]?.init?.signal, request.signal)
    await withAvailabilityReadDeadline(() => fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/bookings', { method: 'patch', signal: callerSignal }), 100)
    assert.equal(observed[2]?.init?.signal, callerSignal)
  })

  it('aborts a stalled upstream read and lets the next read recover', async () => {
    let calls = 0
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1
      if (calls === 2) return Promise.resolve(new Response(JSON.stringify({ ok: true })))

      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
      })
    }) as typeof fetch

    await assert.rejects(
      withAvailabilityReadDeadline(() => fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/availability'), 10),
      /Availability read timed out after 10ms/,
    )
    const response = await withAvailabilityReadDeadline(
      () => fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/availability'),
      10,
    )
    assert.equal(response.status, 200)
    assert.equal(calls, 2)
  })

  it('keeps simultaneous availability deadlines independent', async () => {
    const signals: AbortSignal[] = []
    let resolveLongRead: ((response: Response) => void) | undefined
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal
      if (!signal) throw new Error('Availability context signal missing')
      signals.push(signal)
      return new Promise<Response>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        if (signals.length === 2) resolveLongRead = resolve
      })
    }) as typeof fetch

    const shortRead = withAvailabilityReadDeadline(
      () => fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/availability?read=short'),
      10,
    )
    const longRead = withAvailabilityReadDeadline(
      () => fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/availability?read=long'),
      100,
    )

    await assert.rejects(shortRead, /Availability read timed out after 10ms/)
    assert.equal(signals[0]?.aborted, true)
    assert.equal(signals[1]?.aborted, false)
    resolveLongRead?.(new Response(JSON.stringify({ ok: true })))
    assert.equal((await longRead).status, 200)
  })

  it('preserves a request abort while an availability deadline is active', async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })) as typeof fetch

    const requestController = new AbortController()
    const request = new Request('https://example.test/rest/v1/availability', { signal: requestController.signal })
    const read = withAvailabilityReadDeadline(() => fetchWithAvailabilityReadDeadline(request), 100)
    requestController.abort(new Error('caller cancelled request'))

    await assert.rejects(read, /caller cancelled request/)
  })

  it('keeps the deadline attached after response headers while a body stalls', async () => {
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal
      if (!signal) throw new Error('Availability context signal missing')
      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener('abort', () => controller.error(signal.reason), { once: true })
        },
      })
      return Promise.resolve(new Response(body))
    }) as typeof fetch

    await assert.rejects(
      withAvailabilityReadDeadline(async () => {
        const response = await fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/availability')
        return response.text()
      }, 10),
      /Availability read timed out after 10ms/,
    )
  })

  it('does not add a deadline outside the availability context, including a booking POST', async () => {
    let observedSignal: AbortSignal | null | undefined
    let observedMethod: string | undefined
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      observedSignal = init?.signal
      observedMethod = init?.method
      return Promise.resolve(new Response(JSON.stringify({ ok: true })))
    }) as typeof fetch

    const bookingSignal = new AbortController().signal
    const response = await fetchWithAvailabilityReadDeadline('https://example.test/rest/v1/bookings', {
      method: 'POST',
      signal: bookingSignal,
    })
    assert.equal(response.status, 200)
    assert.equal(observedMethod, 'POST')
    assert.equal(observedSignal, bookingSignal)
  })
})
