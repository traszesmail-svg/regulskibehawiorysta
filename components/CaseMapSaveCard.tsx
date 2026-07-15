'use client'

import Link from 'next/link'
import { Check, LogIn, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  CASE_MAP_CONSENT_VERSION,
  type CaseMapAnswers,
  type CaseMapPath,
  type CaseMapSpecies,
  type CaseMapTopic,
  type CaseMapTriageAnswers,
} from '@/lib/case-map'
import styles from './CaseMapSaveCard.module.css'

type SavedCaseMap = {
  id: string
  revision: number
}

type Props = {
  species: CaseMapSpecies
  topic: CaseMapTopic
  path: CaseMapPath
  triage: CaseMapTriageAnswers
  answers: CaseMapAnswers
  currentQuestionId: string | null
  initialProblemKey?: string | null
  source?: 'direct' | 'problem_page' | 'instagram'
  mode?: 'draft' | 'completed'
  onSaved?: (caseMap: SavedCaseMap) => void
  onRequestSignIn?: () => void
}

type AuthState = 'checking' | 'authenticated' | 'anonymous'

export function CaseMapSaveCard({
  species,
  topic,
  path,
  triage,
  answers,
  currentQuestionId,
  initialProblemKey,
  source = initialProblemKey ? 'problem_page' : 'direct',
  mode = 'completed',
  onSaved,
  onRequestSignIn,
}: Props) {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState('')
  const [error, setError] = useState('')
  const isDraft = mode === 'draft'
  const title = isDraft ? 'Zapisz postęp w Pokoju' : 'Zapisz tę mapę w Pokoju'

  useEffect(() => {
    let active = true

    void fetch('/api/account/me')
      .then((response) => {
        if (!active) return
        setAuthState(response.ok ? 'authenticated' : 'anonymous')
      })
      .catch(() => {
        if (active) setAuthState('anonymous')
      })

    return () => {
      active = false
    }
  }, [])

  async function saveCaseMap() {
    if (!privacyConsent || authState !== 'authenticated') return

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/account/case-maps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          species,
          topic,
          path,
          source,
          problemKey: initialProblemKey ?? null,
          triage,
          answers,
          currentQuestionId,
          privacyConsent,
          consentVersion: CASE_MAP_CONSENT_VERSION,
          marketingConsent,
        }),
      })
      const payload = (await response.json()) as { ok?: boolean; caseMap?: SavedCaseMap; error?: string }

      if (!response.ok || !payload.caseMap?.id || !payload.caseMap.revision) {
        throw new Error(payload.error ?? 'Nie udało się zapisać Mapy zachowania.')
      }

      let savedCaseMap = payload.caseMap
      if (!isDraft) {
        const completionResponse = await fetch('/api/account/case-maps/' + encodeURIComponent(payload.caseMap.id), {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            revision: payload.caseMap.revision,
            status: 'completed',
            currentQuestionId: null,
          }),
        })
        const completionPayload = (await completionResponse.json()) as { ok?: boolean; caseMap?: SavedCaseMap; error?: string }

        if (!completionResponse.ok || !completionPayload.caseMap?.id || !completionPayload.caseMap.revision) {
          throw new Error(completionPayload.error ?? 'Mapa została utworzona, ale nie udało się oznaczyć jej jako ukończonej.')
        }
        savedCaseMap = completionPayload.caseMap
      }

      setSavedId(savedCaseMap.id)
      onSaved?.(savedCaseMap)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się zapisać Mapy zachowania.')
    } finally {
      setSaving(false)
    }
  }

  if (savedId) {
    return (
      <section className={styles.root} aria-live="polite">
        <div className={styles.success}><Check size={19} aria-hidden="true" /> {isDraft ? 'Postęp Mapy zachowania został zapisany prywatnie w Twoim Pokoju.' : 'Mapa zachowania została zapisana prywatnie w Twoim Pokoju.'}</div>
        <Link className={styles.primaryLink} href={'/mapa-sprawy?resume=' + encodeURIComponent(savedId)}>Otwórz zapisaną mapę</Link>
        <Link className={styles.secondaryLink} href="/pokoj">Przejdź do Pokoju</Link>
      </section>
    )
  }

  if (authState === 'checking') {
    return <p className={styles.pending}>Sprawdzam, czy można zapisać tę Mapę zachowania.</p>
  }

  if (authState === 'anonymous') {
    return (
      <section className={styles.root}>
        <h3>{title}</h3>
        <p>{isDraft ? 'Po zalogowaniu możesz zapisać prywatny postęp i wrócić do niego później.' : 'Po zalogowaniu możesz zachować prywatny zapis tej zakończonej mapy i wrócić do niego później.'}</p>
        <Link className={styles.primaryLink} href="/login?returnTo=%2Fmapa-sprawy" onClick={onRequestSignIn}><LogIn size={17} aria-hidden="true" /> Zaloguj się, aby zapisać</Link>
      </section>
    )
  }

  return (
    <section className={styles.root}>
      <h3>{title}</h3>
      <p>{isDraft ? 'Po zapisie kolejne odpowiedzi tej mapy będą automatycznie aktualizowane w Twoim koncie.' : 'Tworzysz prywatny zapis odpowiedzi dla swojego konta. Nie jest to zapis do marketingu.'}</p>
      <label className={styles.checkLabel}>
        <input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} />
        <span>Wyrażam zgodę na zapis tej Mapy zachowania w Pokoju zgodnie z <Link href="/polityka-prywatnosci">polityką prywatności</Link>.</span>
      </label>
      <label className={styles.checkLabel}>
        <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} />
        <span>Chcę opcjonalnie otrzymywać informacje edukacyjne i ofertowe e-mailem.</span>
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="button" className={styles.primaryButton} disabled={!privacyConsent || saving} onClick={saveCaseMap}>
        <Save size={17} aria-hidden="true" /> {saving ? 'Zapisuję…' : isDraft ? 'Zapisz postęp prywatnie' : 'Zapisz prywatnie'}
      </button>
    </section>
  )
}
