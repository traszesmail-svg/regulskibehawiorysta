'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DEFAULT_PROMO_CODE_COUNT, MAX_PROMO_CODE_COUNT } from '@/lib/promo-codes'

type CreatedPromoCampaign = {
  campaign: {
    clinicName: string
    logoSrc: string | null
    expiresAt: string | null
    generatedCount: number
    kind: 'clinic' | 'community'
    promotionPricePln: number
  }
  codes: string[]
}

function defaultExpiryDate(days = 60) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function AdminPromoCodeGenerator() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState('')
  const [logoSrc, setLogoSrc] = useState('')
  const [campaignKind, setCampaignKind] = useState<'clinic' | 'community'>('clinic')
  const [codeCount, setCodeCount] = useState(String(DEFAULT_PROMO_CODE_COUNT))
  const [expiresAt, setExpiresAt] = useState(defaultExpiryDate)
  const [created, setCreated] = useState<CreatedPromoCampaign | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const codeList = useMemo(() => created?.codes.join('\n') ?? '', [created])

  function handleReset() {
    setClinicName('')
    setLogoSrc('')
    setCampaignKind('clinic')
    setCodeCount(String(DEFAULT_PROMO_CODE_COUNT))
    setExpiresAt(defaultExpiryDate())
    setCreated(null)
    setError('')
    setSuccess('')
  }

  async function copyCodes() {
    if (!codeList) return

    try {
      await navigator.clipboard.writeText(codeList)
      setError('')
      setSuccess('Skopiowano kody.')
    } catch {
      setError('Nie udało się skopiować kodów.')
    }
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
          logoSrc,
          codeCount,
          expiresAt,
          kind: campaignKind,
        }),
      })
      const payload = (await response.json()) as CreatedPromoCampaign & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? 'Nie udalo sie wygenerowac kodow.')
      }

      setCreated(payload)
      setSuccess(
        campaignKind === 'community'
          ? `Wygenerowano ${payload.codes.length} kodow grupowych po ${payload.campaign.promotionPricePln.toFixed(2).replace('.', ',')} zl.`
          : `Wygenerowano ${payload.codes.length} kodow dla: ${payload.campaign.clinicName}.`,
      )
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Wystapil blad generatora.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stack-gap top-gap">
      <div className="promo-generator-toolbar">
        <div>
          <strong>Szybkie akcje</strong>
          <p>Wyczyść formularz, odśwież historię albo skopiuj świeżo wygenerowaną pulę kodów.</p>
        </div>
        <div className="promo-generator-toolbar-actions">
          <button type="button" className="button button-ghost small-button" onClick={handleReset}>
            Wyczyść formularz
          </button>
          <button type="button" className="button button-ghost small-button" onClick={() => router.refresh()}>
            Odśwież kampanie
          </button>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="full-width">
          <label>Typ kampanii</label>
          <select
            value={campaignKind}
            onChange={(event) => {
              const nextKind = event.target.value === 'community' ? 'community' : 'clinic'
              setCampaignKind(nextKind)
              if (nextKind === 'community') {
                setCodeCount('10')
                setExpiresAt(defaultExpiryDate(14))
                setClinicName((current) => current || 'Grupa FB')
              } else {
                setCodeCount(String(DEFAULT_PROMO_CODE_COUNT))
                setExpiresAt(defaultExpiryDate())
              }
            }}
          >
            <option value="clinic">Lecznica — bezpłatna rozmowa</option>
            <option value="community">Grupa FB — Zapytaj za 39,99 zł</option>
          </select>
        </div>
        <div>
          <label>{campaignKind === 'community' ? 'Nazwa kampanii / źródło' : 'Nazwa lecznicy'}</label>
          <input
            type="text"
            value={clinicName}
            onChange={(event) => setClinicName(event.target.value)}
            placeholder={campaignKind === 'community' ? 'np. Grupa FB — wrzesień' : 'np. Przychodnia Vet...'}
            maxLength={120}
            required
          />
        </div>
        <div>
          <label>{campaignKind === 'community' ? 'Logo (opcjonalne)' : 'Logo lecznicy (URL lub ścieżka publiczna)'}</label>
          <input
            type="text"
            value={logoSrc}
            onChange={(event) => setLogoSrc(event.target.value)}
            placeholder="/branding/clinics/nazwa/logo.png"
            maxLength={500}
          />
        </div>
        <div>
          <label>Liczba kodów</label>
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
          <label>Ważne do</label>
          <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
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
          {created.campaign.kind === 'community' ? <span>Oferta: {created.campaign.promotionPricePln.toFixed(2).replace('.', ',')} zł / kod, tylko przez /zapytaj/promocja</span> : null}
          <span>Liczba kodow: {created.campaign.generatedCount}</span>
          <textarea className="promo-code-output" value={codeList} readOnly rows={Math.min(10, Math.max(3, created.codes.length))} />
          <button type="button" className="button button-ghost small-button" onClick={copyCodes} disabled={!codeList}>
            Skopiuj liste kodow
          </button>
        </div>
      ) : null}

      {success ? <div className="success-inline">{success}</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      <style jsx>{`
        .promo-generator-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
          padding: 16px 18px;
          border: 1px solid #e5d8c6;
          border-radius: 6px;
          background: #faf6f0;
        }
        .promo-generator-toolbar strong {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }
        .promo-generator-toolbar p {
          margin: 0;
          color: #8b6f5a;
          font-size: 14px;
          max-width: 54ch;
        }
        .promo-generator-toolbar-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  )
}
