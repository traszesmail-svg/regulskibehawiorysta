'use client'

import { useState } from 'react'

export function CommerceAccessForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const payload = (await response.json()) as { redirectTo?: string; error?: string }
      if (!response.ok || !payload.redirectTo) {
        throw new Error(payload.error ?? 'Kod jest nieprawidłowy albo wygasł.')
      }
      window.location.assign(payload.redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kod jest nieprawidłowy albo wygasł.')
      setLoading(false)
    }
  }

  return (
    <form className="materialy-form" onSubmit={submit}>
      <label>
        E-mail z zamówienia
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Kod dostępu
        <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="button button-primary big-button" disabled={loading}>
        {loading ? 'Sprawdzam...' : 'Wejdź'}
      </button>
    </form>
  )
}
