'use client'

import { useEffect, useMemo, useState } from 'react'

type BookingReminderOptInProps = {
  role: 'owner' | 'customer'
  publicKey: string | null
  targetUrl: string
  bookingId?: string
  accessToken?: string | null
  ownerToken?: string | null
  className?: string
}

type OptInState = 'idle' | 'subscribing' | 'subscribed' | 'install-required' | 'unsupported' | 'denied' | 'error'

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index)
  }

  return output
}

function hasPushSupport() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function isIosLike() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isStandaloneApp() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  return (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function getUnsupportedPushMessage() {
  if (isIosLike() && !isStandaloneApp()) {
    return 'Na iPhonie najpierw dodaj stronę do ekranu początkowego i otwórz ją z ikony aplikacji. Dopiero wtedy iOS pozwala włączyć powiadomienia.'
  }

  return 'Ta przeglądarka nie obsługuje powiadomień push dla tej strony. Użyj Chrome/Edge na Androidzie albo aplikacji z ekranu początkowego na iPhonie.'
}

export function BookingReminderOptIn({
  role,
  publicKey,
  targetUrl,
  bookingId,
  accessToken,
  ownerToken,
  className,
}: BookingReminderOptInProps) {
  const [state, setState] = useState<OptInState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const isBusy = state === 'subscribing'
  const copy = useMemo(() => {
    if (role === 'owner') {
      return {
        title: 'Przypomnienia na ten telefon',
        body: '15 minut przed rozmową telefon pokaże powiadomienie z wejściem do pokoju.',
        action: 'Włącz na tym telefonie',
      }
    }

    return {
      title: 'Przypomnienie na telefon',
      body: '15 minut przed rozmową dostaniesz przycisk do pokoju rozmowy.',
      action: 'Włącz przypomnienie',
    }
  }, [role])

  const vapidPublicKey = publicKey ?? ''

  useEffect(() => {
    if (!publicKey || typeof window === 'undefined') {
      return
    }

    if (isIosLike() && !isStandaloneApp()) {
      setState('install-required')
      setMessage(getUnsupportedPushMessage())
      return
    }

    if (!hasPushSupport()) {
      setState('unsupported')
      setMessage(getUnsupportedPushMessage())
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      setMessage('Powiadomienia są zablokowane w ustawieniach przeglądarki lub telefonu.')
      return
    }

    async function checkExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/push-sw.js')
        const subscription = await registration?.pushManager.getSubscription()

        if (subscription) {
          setState('subscribed')
          setMessage('Przypomnienie jest już włączone na tym urządzeniu.')
        }
      } catch {
        // The button can still attempt a fresh registration.
      }
    }

    void checkExistingSubscription()
  }, [publicKey])

  if (!publicKey) {
    return null
  }

  async function subscribe() {
    setMessage(null)

    if (isIosLike() && !isStandaloneApp()) {
      setState('install-required')
      setMessage(getUnsupportedPushMessage())
      return
    }

    if (!hasPushSupport()) {
      setState('unsupported')
      setMessage(getUnsupportedPushMessage())
      return
    }

    if (Notification.permission === 'denied') {
      setState('denied')
      setMessage('Powiadomienia są zablokowane w ustawieniach przeglądarki.')
      return
    }

    setState('subscribing')

    try {
      const permission = await Notification.requestPermission()

      if (permission !== 'granted') {
        setState('denied')
        setMessage('Powiadomienia nie zostały włączone.')
        return
      }

      const registration = await navigator.serviceWorker.register('/push-sw.js')
      await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
      }

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          role,
          bookingId,
          accessToken,
          ownerToken,
          targetUrl,
          subscription: subscription.toJSON(),
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? 'Nie udało się zapisać przypomnienia.')
      }

      setState('subscribed')
      setMessage('Przypomnienie jest włączone na tym urządzeniu.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Nie udało się włączyć przypomnienia.')
    }
  }

  const actionLabel =
    state === 'subscribed'
      ? 'Włączone'
      : state === 'install-required'
        ? 'Dodaj do ekranu początkowego'
        : state === 'unsupported'
          ? 'Nieobsługiwane'
          : state === 'denied'
            ? 'Powiadomienia zablokowane'
            : isBusy
              ? 'Włączam...'
              : copy.action
  const isDisabled = isBusy || state === 'subscribed' || state === 'install-required' || state === 'unsupported' || state === 'denied'

  return (
    <div
      className={`list-card accent-outline tree-backed-card${className ? ` ${className}` : ''}`}
      data-push-opt-in={role}
      data-push-state={state}
    >
      <strong>{copy.title}</strong>
      <span>{message ?? copy.body}</span>
      <button className="button button-ghost small-button" type="button" onClick={subscribe} disabled={isDisabled}>
        {actionLabel}
      </button>
    </div>
  )
}
