'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export function ClinicCodeEntry() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code.trim()) {
      setError('Wpisz kod otrzymany w lecznicy.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Nie udało się sprawdzić kodu.')

      window.sessionStorage.setItem('clinicPromoCode', code.trim().toUpperCase())
      router.push('/book?service=szybka-konsultacja-15-min&clinic=1')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nie udało się sprawdzić kodu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="clinic-code-form" onSubmit={handleSubmit} data-clinic-code-entry="true">
      <label htmlFor="clinic-code">Kod przekazany przez lecznicę</label>
      <div className="clinic-code-row">
        <input
          id="clinic-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="VET-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
        />
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? 'Sprawdzam...' : 'Przejdź dalej'}
        </button>
      </div>
      <p>Po sprawdzeniu kodu wybierzesz gatunek, temat i termin rozmowy.</p>
      {error ? <div className="error-box">{error}</div> : null}
    </form>
  )
}
