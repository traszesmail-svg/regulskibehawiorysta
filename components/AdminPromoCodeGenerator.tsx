'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DEFAULT_PROMO_CODE_COUNT, MAX_PROMO_CODE_COUNT } from '@/lib/promo-codes'

type CreatedPromoCampaign = {
  campaign: {
    clinicName: string
    expiresAt: string | null
    generatedCount: number
  }
  codes: string[]
}

function defaultExpiryDate() {
  const date = new Date()
  date.setDate(date.getDate() + 60)
  return date.toISOString().slice(0, 10)
}

export function AdminPromoCodeGenerator() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState('')
  const [codeCount, setCodeCount] = useState(String(DEFAULT_PROMO_CODE_COUNT))
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate)
  const [created, setCreated] = useState<CreatedPromoCampaign | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const codeList = useMemo(() => created?.codes.join('\n') ?? '', [created])

  async function copyCodes() {
    if (!codeList) return
    await navigator.clipboard.writeText(codeList)
    setSuccess('Skopiowano kody.')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setCreated(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinicName,
          codeCount,
          expiresAt,
        }),
      })
      const payload = (await response.json()) as CreatedPromoCampaign & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udalo sie wygenerowac kodow.')
      }

      setCreated(payload)
      setSuccess(`Wygenerowano ${payload.codes.length} kodow dla: ${payload.campaign.clinicName}.`)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystapil blad generatora.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stack-gap top-gap">
      <form className="form-grid" onSubmit={handleSubmit}>
        <div>
          <label>Nazwa lecznicy</label>
          <input
            type="text"
            value={clinicName}
            onChange={(event) => setClinicName(event.target.value)}
            placeholder="np. Przychodnia Vet..."
            maxLength={120}
            required
          />
        </div>
        <div>
          <label>Liczba kodow</label>
          <input
            type="number"
            value={codeCount}
            onChange={(event) => setCodeCount(event.target.value)}
            min="1"
            max={MAX_PROMO_CODE_COUNT}
            step="1"
            required
          />
        </div>
        <div>
          <label>Wazne do</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </div>
        <div className="full-width">
          <button type="submit" className="button button-primary big-button" disabled={isSubmitting}>
            {isSubmitting ? 'Generuje kody...' : 'Wygeneruj kody'}
          </button>
        </div>
      </form>

      {created ? (
        <div className="list-card tree-backed-card">
          <strong>Kody dla: {created.campaign.clinicName}</strong>
          <span>Liczba kodow: {created.campaign.generatedCount}</span>
          <textarea className="promo-code-output" value={codeList} readOnly rows={Math.min(10, Math.max(3, created.codes.length))} />
          <button type="button" className="button button-ghost" onClick={copyCodes}>
            Skopiuj liste kodow
          </button>
        </div>
      ) : null}

      {success ? <div className="success-inline">{success}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
    </div>
  )
}
