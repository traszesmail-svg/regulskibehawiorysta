'use client'

import { startVisiblePolling } from '@/components/visible-polling'
import { readZapytajAvailability } from '@/lib/zapytaj-availability-client'

type Subscriber = {
  onData: (payload: unknown) => void
  onError: (error: unknown) => void
  timeoutMs: number
  cancelDelivery?: () => void
}

type Snapshot = { ok: true; payload: unknown } | { ok: false; error: unknown }
type PollingGroup = {
  subscribers: Set<Subscriber>
  request: Promise<unknown> | null
  snapshot: Snapshot | null
  stop: () => void
}

let activeGroup: PollingGroup | null = null

function publish(subscriber: Subscriber, snapshot: Snapshot) {
  if (!snapshot.ok) {
    subscriber.onError(snapshot.error)
    return
  }
  try {
    subscriber.onData(snapshot.payload)
  } catch (error) {
    subscriber.onError(error)
  }
}

function deliver(subscriber: Subscriber, request: Promise<unknown>) {
  subscriber.cancelDelivery?.()
  let settled = false
  const finish = (snapshot: Snapshot) => {
    if (settled) return
    settled = true
    clearTimeout(deadline)
    publish(subscriber, snapshot)
  }
  // Each consumer keeps its own deadline without cancelling the shared read.
  const deadline = setTimeout(() => finish({ ok: false, error: new Error('Availability read timed out.') }), subscriber.timeoutMs)
  subscriber.cancelDelivery = () => { settled = true; clearTimeout(deadline) }
  void request.then(
    (payload) => finish({ ok: true, payload }),
    (error) => finish({ ok: false, error }),
  )
}

async function refresh(group: PollingGroup, force: boolean) {
  const request = readZapytajAvailability('/api/zapytaj/availability', { force })
  group.request = request
  for (const subscriber of group.subscribers) deliver(subscriber, request)
  try {
    group.snapshot = { ok: true, payload: await request }
  } catch (error) {
    group.snapshot = { ok: false, error }
  } finally {
    group.request = null
  }
}

/** One visible-page schedule for the shared, unfiltered public availability URL. */
export function subscribeZapytajAvailability<T>({
  onData,
  onError,
  timeoutMs = 6_000,
}: {
  onData: (payload: T) => void
  onError: (error: unknown) => void
  timeoutMs?: number
}) {
  const subscriber: Subscriber = { onData: (payload) => onData(payload as T), onError, timeoutMs }
  const group = activeGroup ?? { subscribers: new Set<Subscriber>(), request: null, snapshot: null, stop: () => {} }
  group.subscribers.add(subscriber)

  if (!activeGroup) {
    activeGroup = group
    group.stop = startVisiblePolling((force) => refresh(group, force), 20_000)
  } else if (group.request) {
    deliver(subscriber, group.request)
  } else if (group.snapshot) {
    publish(subscriber, group.snapshot)
  }

  return () => {
    subscriber.cancelDelivery?.()
    group.subscribers.delete(subscriber)
    if (group.subscribers.size === 0) {
      group.stop()
      if (activeGroup === group) activeGroup = null
    }
  }
}
