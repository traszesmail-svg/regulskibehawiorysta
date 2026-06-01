'use client'

import { useMemo, useState } from 'react'

type BookingReminderOptInProps = {
  role: 'owner' | 'customer'
  publicKey: string | null
  targetUrl: string
  bookingId?: string
  accessToken?: string | null
  ownerToken?: string | null
  className?: string
}

type OptInState = 'idle' | 'subscribing' | 'subscribed' | 'unsupported' | 'denied' | 'error'

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

  if (!publicKey) {
    return null
  }

  const vapidPublicKey = publicKey

  async function subscribe() {
    setMessage(null)

    if (!hasPushSupport()) {
      setState('unsupported')
      setMessage('Ta przeglądarka nie obsługuje powiadomień push dla tej strony.')
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

  return (
    <div className={`list-card accent-outline tree-backed-card${className ? ` ${className}` : ''}`} data-push-opt-in={role}>
      <strong>{copy.title}</strong>
      <span>{message ?? copy.body}</span>
      <button className="button button-ghost small-button" type="button" onClick={subscribe} disabled={isBusy || state === 'subscribed'}>
        {state === 'subscribed' ? 'Włączone' : isBusy ? 'Włączam...' : copy.action}
      </button>
    </div>
  )
}
