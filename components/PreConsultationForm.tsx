'use client'

import { useState, type FormEvent } from 'react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

type PreConsultationFormProps = {
  orderNumber: string
}

type SubmissionPayload = {
  routine: string
  health: string
  reaction: string
  triggers: string
  environment: string
  links: string
}

function createInitialForm(): SubmissionPayload {
  return {
    routine: '',
    health: '',
    reaction: '',
    triggers: '',
    environment: '',
    links: '',
  }
}

export function PreConsultationForm({ orderNumber }: PreConsultationFormProps) {
  const [form, setForm] = useState<SubmissionPayload>(createInitialForm())
  const [status, setStatus] = useState<FormState>('idle')
  const [feedback, setFeedback] = useState('')

  const isSubmitDisabled = status === 'loading'

  function updateField<K extends keyof SubmissionPayload>(key: K, value: SubmissionPayload[K]) {
    if (status === 'success') {
      setStatus('idle')
      setFeedback('')
    }
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setStatus('loading')
    setFeedback('')

    try {
      const messageBody = `
Zamówienie: ${orderNumber}

1. Sen i Odpoczynek:
${form.routine || 'Brak odpowiedzi'}

2. Zdrowie i fizjologia:
${form.health || 'Brak odpowiedzi'}

3. Reakcja otoczenia na problem:
${form.reaction || 'Brak odpowiedzi'}

4. Sytuacje wyzwalające:
${form.triggers || 'Brak odpowiedzi'}

5. Niewidoczne zmiany w środowisku:
${form.environment || 'Brak odpowiedzi'}

6. Linki wideo:
${form.links || 'Brak odpowiedzi'}
      `.trim()

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Klient (Formularz po opłacie)',
          email: 'formularz@regulskibehawiorysta.pl',
          contact: 'formularz@regulskibehawiorysta.pl',
          species: 'nie-wiem',
          topicId: 'inne',
          topic: `Formularz przed-konsultacyjny dla zamówienia ${orderNumber}`,
          message: messageBody,
          website: '',
          consentProcessing: true,
          consentPolicy: true,
        }),
      })

      const payload = (await response.json()) as { ok?: boolean; message?: string; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się wysłać formularza. Spróbuj ponownie później.')
      }

      setStatus('success')
      setFeedback('Dziękuję! Twoje odpowiedzi zostały zapisane i pomogą w przygotowaniu do konsultacji.')
      setForm(createInitialForm())
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof Error ? error.message : 'Nie udało się wysłać formularza. Spróbuj ponownie później.')
    }
  }

  if (status === 'success') {
    return (
      <div className="info-box full-width" role="status">
        <p>{feedback}</p>
      </div>
    )
  }

  return (
    <form className="form-grid top-gap" action="#" method="post" onSubmit={handleSubmit} noValidate>
      <div className="notatnik-callout form-field full-width">
        <p>
          <strong>To tylko kilka pytań.</strong> Wypełnij to, co uznasz za istotne. Jeśli wolisz opowiedzieć o tym na spotkaniu – zostaw puste.
        </p>
      </div>

      <div className="full-width form-field">
        <label htmlFor="pre-routine">1. Sen i Odpoczynek</label>
        <p className="field-hint" style={{ fontSize: '13px', color: '#666', marginTop: '-2px', marginBottom: '8px' }}>Ile godzin na dobę (w przybliżeniu) zwierzę śpi? Czy sen jest głęboki, czy budzi się przy każdym hałasie?</p>
        <textarea
          id="pre-routine"
          name="routine"
          rows={3}
          value={form.routine}
          onChange={(event) => updateField('routine', event.target.value)}
          placeholder="np. Śpi około 12h, ale często czuwa..."
        />
      </div>

      <div className="full-width form-field">
        <label htmlFor="pre-health">2. Zdrowie i fizjologia</label>
        <p className="field-hint" style={{ fontSize: '13px', color: '#666', marginTop: '-2px', marginBottom: '8px' }}>Czy w ciągu ostatnich 3 miesięcy wystąpiły problemy z trawieniem, apetytem lub nietypowe zachowania kuwetowe/toaletowe?</p>
        <textarea
          id="pre-health"
          name="health"
          rows={3}
          value={form.health}
          onChange={(event) => updateField('health', event.target.value)}
        />
      </div>

      <div className="full-width form-field">
        <label htmlFor="pre-reaction">3. Reakcja na problem</label>
        <p className="field-hint" style={{ fontSize: '13px', color: '#666', marginTop: '-2px', marginBottom: '8px' }}>Co zazwyczaj robisz Ty lub domownicy, gdy zwierzę zachowuje się problematycznie? Co pomaga, a co pogarsza sytuację?</p>
        <textarea
          id="pre-reaction"
          name="reaction"
          rows={3}
          value={form.reaction}
          onChange={(event) => updateField('reaction', event.target.value)}
        />
      </div>

      <div className="full-width form-field">
        <label htmlFor="pre-triggers">4. Sytuacje wyzwalające</label>
        <p className="field-hint" style={{ fontSize: '13px', color: '#666', marginTop: '-2px', marginBottom: '8px' }}>Czy jesteś w stanie przewidzieć ten moment, w którym zwierzę &quot;wybucha&quot; lub wycofuje się? Co dzieje się sekundy przedtem?</p>
        <textarea
          id="pre-triggers"
          name="triggers"
          rows={3}
          value={form.triggers}
          onChange={(event) => updateField('triggers', event.target.value)}
        />
      </div>

      <div className="full-width form-field">
        <label htmlFor="pre-environment">5. Niewidoczne zmiany środowiskowe</label>
        <p className="field-hint" style={{ fontSize: '13px', color: '#666', marginTop: '-2px', marginBottom: '8px' }}>Czy w ciągu ostatniego roku zmieniło się coś w Waszym otoczeniu? (np. przemeblowanie, nowa praca, remont, zmiana diety)</p>
        <textarea
          id="pre-environment"
          name="environment"
          rows={3}
          value={form.environment}
          onChange={(event) => updateField('environment', event.target.value)}
        />
      </div>

      <div className="full-width form-field">
        <label htmlFor="pre-links">6. Materiały wideo (Opcjonalnie)</label>
        <p className="field-hint" style={{ fontSize: '13px', color: '#666', marginTop: '-2px', marginBottom: '8px' }}>Możesz wkleić tutaj linki (Dysk Google, YouTube itp.) pokazujące codzienne życie lub niepokojące zachowanie.</p>
        <textarea
          id="pre-links"
          name="links"
          rows={2}
          value={form.links}
          onChange={(event) => updateField('links', event.target.value)}
          placeholder="https://..."
        />
      </div>

      {feedback && status === 'error' ? (
        <div className="error-box full-width" role="status">
          <p>{feedback}</p>
        </div>
      ) : null}

      <div className="full-width">
        <button type="submit" className="button button-primary big-button" disabled={isSubmitDisabled}>
          {status === 'loading' ? 'Wysyłam...' : 'Wyślij formularz'}
        </button>
      </div>
    </form>
  )
}
