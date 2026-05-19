'use client'

import { useEffect, useMemo, useState } from 'react'
import { LogIn, Mail, UserPlus } from 'lucide-react'

type AuthMode = 'login' | 'register' | 'reset' | 'new-password'

function readInitialEmail() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('email') ?? ''
}

export function AccountAuthForm() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState(readInitialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')

  const title = useMemo(() => {
    if (mode === 'new-password') return 'Ustaw nowe haslo'
    if (mode === 'register') return 'Utworz konto opiekuna'
    if (mode === 'reset') return 'Ustaw nowe haslo'
    return 'Zaloguj sie do pokoju'
  }, [mode])

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = hash.get('access_token')
    const type = hash.get('type')

    if (accessToken && type === 'recovery') {
      setRecoveryToken(accessToken)
      setMode('new-password')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        const response = await fetch('/api/account/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const payload = (await response.json()) as { ok?: boolean; error?: string }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Nie udalo sie zalogowac.')
        }
        window.location.assign('/pokoj')
        return
      }

      if (mode === 'register') {
        const response = await fetch('/api/account/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const payload = (await response.json()) as { ok?: boolean; hasSession?: boolean; error?: string }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Nie udalo sie utworzyc konta.')
        }

        if (payload.hasSession) {
          window.location.assign('/pokoj')
          return
        }

        setMessage('Konto zostalo utworzone. Sprawdz email, jesli Supabase wymaga potwierdzenia adresu.')
        return
      }

      if (mode === 'new-password') {
        const response = await fetch('/api/account/auth/update-password', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ accessToken: recoveryToken, password }),
        })
        const payload = (await response.json()) as { ok?: boolean; error?: string }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Nie udalo sie ustawic hasla.')
        }

        setPassword('')
        setMode('login')
        setMessage('Haslo zostalo ustawione. Mozesz sie zalogowac.')
        return
      }

      const response = await fetch('/api/account/auth/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udalo sie wyslac linku.')
      }
      setMessage('Wyslalem link do ustawienia hasla, jesli konto istnieje dla tego adresu.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie obsluzyc konta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="account-auth-card">
      <div className="account-auth-tabs" role="tablist" aria-label="Tryb konta">
        <button type="button" className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
          <LogIn size={16} aria-hidden="true" />
          Logowanie
        </button>
        <button type="button" className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>
          <UserPlus size={16} aria-hidden="true" />
          Konto
        </button>
        <button type="button" className={mode === 'reset' ? 'is-active' : ''} onClick={() => setMode('reset')}>
          <Mail size={16} aria-hidden="true" />
          Haslo
        </button>
      </div>

      <form className="materialy-form account-auth-form" onSubmit={submit}>
        <h2>{title}</h2>
        {mode !== 'new-password' ? (
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        ) : null}
        {mode !== 'reset' ? (
          <label>
            Haslo
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
        <button type="submit" className="button button-primary big-button" disabled={loading}>
          {loading ? 'Pracuje...' : mode === 'login' ? 'Wejdz do pokoju' : mode === 'register' ? 'Utworz konto' : mode === 'new-password' ? 'Ustaw haslo' : 'Wyslij link'}
        </button>
      </form>
    </div>
  )
}
