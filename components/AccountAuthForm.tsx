'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LogIn, Mail, UserPlus } from 'lucide-react'

type AuthMode = 'login' | 'register' | 'reset' | 'new-password'
const CASE_MAP_CLAIM_TOKEN_STORAGE_KEY = 'regulski-behawiorysta.case-map-profile-claim-token'
const CASE_MAP_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function readInitialEmail() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('email') ?? ''
}


function readReturnHref() {
  if (typeof window === 'undefined') return '/pokoj'
  const value = new URLSearchParams(window.location.search).get('returnTo') ?? ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/pokoj'
}

function readCaseMapClaimToken() {
  if (typeof window === 'undefined') return ''

  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('case-map-claim') ?? ''
  const candidate = fromHash || (() => {
    try {
      return window.sessionStorage.getItem(CASE_MAP_CLAIM_TOKEN_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })()

  return CASE_MAP_CLAIM_TOKEN_PATTERN.test(candidate) ? candidate : ''
}

function persistCaseMapClaimToken(token: string) {
  try {
    window.sessionStorage.setItem(CASE_MAP_CLAIM_TOKEN_STORAGE_KEY, token)
  } catch {}
}

function clearCaseMapClaimToken() {
  try {
    window.sessionStorage.removeItem(CASE_MAP_CLAIM_TOKEN_STORAGE_KEY)
  } catch {}
}

export function AccountAuthForm() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState(readInitialEmail)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recoveryToken, setRecoveryToken] = useState('')
  const [caseMapClaimToken, setCaseMapClaimToken] = useState(readCaseMapClaimToken)
  const signupConfirmationHandledRef = useRef(false)

  const title = useMemo(() => {
    if (mode === 'new-password') return 'Ustaw nowe hasło'
    if (mode === 'register') return 'Utwórz konto opiekuna'
    if (mode === 'reset') return 'Ustaw nowe hasło'
    return 'Zaloguj się do pokoju'
  }, [mode])

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token')
    const type = hash.get('type')
    const claimToken = hash.get('case-map-claim')
    let shouldClearHash = false

    if (claimToken) {
      shouldClearHash = true
      if (CASE_MAP_CLAIM_TOKEN_PATTERN.test(claimToken)) {
        setCaseMapClaimToken(claimToken)
        persistCaseMapClaimToken(claimToken)
      }
    }

    if (accessToken && refreshToken && (type === 'signup' || type === 'email')) {
      if (signupConfirmationHandledRef.current) {
        return
      }

      signupConfirmationHandledRef.current = true
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      void (async () => {
        setLoading(true)
        setError('')
        setMessage('')

        try {
          const response = await fetch('/api/account/auth/confirm', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ accessToken, refreshToken }),
          })
          const payload = (await response.json()) as { ok?: boolean; error?: string }

          if (!response.ok || !payload.ok) {
            throw new Error(payload.error ?? 'Nie udało się potwierdzić konta.')
          }

          window.location.assign(readReturnHref())
        } catch (confirmationError) {
          setError(confirmationError instanceof Error ? confirmationError.message : 'Nie udało się potwierdzić konta.')
          setLoading(false)
        }
      })()
      return
    }

    if (accessToken && (type === 'recovery' || type === 'invite')) {
      setRecoveryToken(accessToken)
      setMode('new-password')
      shouldClearHash = true
    }

    if (shouldClearHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
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
          body: JSON.stringify({ email, password, caseMapClaimToken: caseMapClaimToken || undefined }),
        })
        const payload = (await response.json()) as { ok?: boolean; error?: string; caseMapProfileClaimed?: boolean }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Nie udało się zalogować.')
        }
        if (caseMapClaimToken && !payload.caseMapProfileClaimed) {
          throw new Error('Zalogowano, ale Mapa nie została jeszcze odebrana. Użyj tego samego, potwierdzonego adresu e-mail i otwórz link z wiadomości.')
        }
        if (caseMapClaimToken) {
          clearCaseMapClaimToken()
          setCaseMapClaimToken('')
        }
        window.location.assign(readReturnHref())
        return
      }

      if (mode === 'register') {
        const response = await fetch('/api/account/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnTo: readReturnHref(),
            caseMapClaimToken: caseMapClaimToken || undefined,
          }),
        })
        const payload = (await response.json()) as {
          ok?: boolean
          hasSession?: boolean
          error?: string
          caseMapProfileClaimed?: boolean
        }

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Nie udało się utworzyć konta.')
        }

        if (payload.hasSession) {
          if (caseMapClaimToken && !payload.caseMapProfileClaimed) {
            throw new Error('Konto utworzono, ale Mapa nie została jeszcze odebrana. Otwórz link po potwierdzeniu tego samego adresu e-mail.')
          }
          if (caseMapClaimToken) {
            clearCaseMapClaimToken()
            setCaseMapClaimToken('')
          }
          window.location.assign(readReturnHref())
          return
        }

        setMessage('Konto zostało utworzone. Sprawdź email, jeśli Supabase wymaga potwierdzenia adresu.')
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
          throw new Error(payload.error ?? 'Nie udało się ustawić hasła.')
        }

        setPassword('')
        setMode('login')
        setMessage('Hasło zostało ustawione. Możesz się zalogować.')
        return
      }

      const response = await fetch('/api/account/auth/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się wysłać linku.')
      }
      setMessage('Wysłałem link do ustawienia hasła, jeśli konto istnieje dla tego adresu.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się obsłużyć konta.')
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
          Hasło
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
            Hasło
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
          {loading ? 'Pracuję...' : mode === 'login' ? 'Wejdź do pokoju' : mode === 'register' ? 'Utwórz konto' : mode === 'new-password' ? 'Ustaw hasło' : 'Wyślij link'}
        </button>
      </form>
    </div>
  )
}
