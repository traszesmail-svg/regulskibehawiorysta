'use client'

import { useState } from 'react'

export function AdminCaseMapReviewButton({ caseMapId, reviewed }: { caseMapId: string; reviewed: boolean }) {
  const [done, setDone] = useState(reviewed)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function markReviewed() {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/case-maps/${encodeURIComponent(caseMapId)}/review`, { method: 'POST' })
      const payload = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Nie udało się oznaczyć Mapy jako przejrzanej.')
      setDone(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się oznaczyć Mapy jako przejrzanej.')
    } finally {
      setSaving(false)
    }
  }

  if (done) return <span className="admin-booking-chip">Przejrzana</span>

  return (
    <span>
      <button type="button" className="button button-ghost small-button" disabled={saving} onClick={markReviewed}>
        {saving ? 'Zapisuję…' : 'Oznacz jako przejrzaną'}
      </button>
      {error ? <span className="form-error">{error}</span> : null}
    </span>
  )
}
