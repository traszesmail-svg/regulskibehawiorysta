'use client'

import Image from 'next/image'
import { useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import { REGULSKI_WEB_LOGO } from '@/lib/regulski-web-assets'
import { TESTIMONIAL_ISSUE_OPTIONS } from '@/lib/testimonials'

const MAX_PHOTO_SIZE_BYTES = 25 * 1024 * 1024

export default function AddOpinionPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [fields, setFields] = useState({
    displayName: '',
    email: '',
    issueCategory: '',
    opinion: '',
    consentPublish: false,
    website: '',
  })

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = event.target
    setFields((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value,
    }))
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setPhotoFile(null)
      return
    }

    if (!file.type.startsWith('image/')) {
      setPhotoFile(null)
      event.target.value = ''
      setStatus('error')
      setErrorMessage('Dodaj plik graficzny, np. JPG, PNG albo WEBP.')
      return
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoFile(null)
      event.target.value = ''
      setStatus('error')
      setErrorMessage('Zdjęcie jest za duże. Limit załącznika to 25 MB.')
      return
    }

    setStatus('idle')
    setErrorMessage(null)
    setPhotoFile(file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage(null)

    try {
      const formData = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      if (photoFile) {
        formData.append('photo', photoFile)
      }

      const response = await fetch('/api/testimonials/submit', {
        method: 'POST',
        body: formData,
      })
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string }

      if (response.ok && data.ok) {
        setStatus('sent')
      } else {
        setStatus('error')
        setErrorMessage(data.error ?? 'Wystąpił nieoczekiwany błąd.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    }
  }

  if (status === 'sent') {
    return (
      <main style={pageStyle}>
        <BrandHeader />
        <h1 style={headingStyle}>Dzięki za opinię</h1>
        <p>Opinia trafiła do weryfikacji. Odezwę się po sprawdzeniu, najczęściej w ciągu 1-2 dni roboczych.</p>
      </main>
    )
  }

  return (
    <main style={pageStyle}>
      <BrandHeader />
      <h1 style={headingStyle}>Dodaj opinię</h1>
      <p style={{ color: '#6b625b', marginBottom: 32 }}>
        Ta strona jest dostępna tylko dla osób, które przeszły konsultacje. Opinia trafia do weryfikacji przed
        publikacją.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <input
          type="text"
          name="website"
          value={fields.website}
          onChange={handleChange}
          style={{ display: 'none' }}
          tabIndex={-1}
          aria-hidden="true"
          autoComplete="off"
        />

        <div style={fieldStyle}>
          <label htmlFor="displayName" style={labelStyle}>Imię lub inicjały do publikacji *</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={fields.displayName}
            onChange={handleChange}
            required
            maxLength={60}
            placeholder="np. Anna K."
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="email" style={labelStyle}>Adres e-mail (do kontaktu, nie publikowany) *</label>
          <input
            id="email"
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            required
            maxLength={120}
            placeholder="twoj@email.pl"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="issueCategory" style={labelStyle}>Czego dotyczyła konsultacja? *</label>
          <select
            id="issueCategory"
            name="issueCategory"
            value={fields.issueCategory}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="">Wybierz temat</option>
            {TESTIMONIAL_ISSUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="opinion" style={labelStyle}>Treść opinii *</label>
          <textarea
            id="opinion"
            name="opinion"
            value={fields.opinion}
            onChange={handleChange}
            required
            maxLength={600}
            rows={5}
            placeholder="Co konkretnie pomogło? Co się zmieniło po konsultacji?"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <span style={hintStyle}>{fields.opinion.length}/600 znaków</span>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="photo" style={labelStyle}>Zdjęcie psa / kota (opcjonalnie)</label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={inputStyle}
          />
          <span style={hintStyle}>
            Możesz dodać zdjęcie jako załącznik. Limit to 25 MB, zgodnie z limitem pojedynczej wiadomości Gmail.
          </span>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="consentPublish"
            checked={fields.consentPublish}
            onChange={handleChange}
            required
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 14 }}>
            Wyrażam zgodę na publikację tej opinii na stronie regulskibehawiorysta.pl pod podanym imieniem lub inicjałami. *
          </span>
        </label>

        {status === 'error' && errorMessage && (
          <p style={{ color: '#b91c1c', background: '#fef2f2', padding: '12px 16px', borderRadius: 8, margin: 0 }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          style={{
            padding: '14px 28px',
            borderRadius: 999,
            background: status === 'sending' ? '#9c8c80' : '#1f1a17',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: status === 'sending' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'sending' ? 'Wysyłam...' : 'Wyślij opinię'}
        </button>

        <p style={hintStyle}>
          Pola oznaczone * są wymagane. Opinia trafia do weryfikacji przed publikacją i nie pojawia się automatycznie na
          stronie.
        </p>
      </form>
    </main>
  )
}

function BrandHeader() {
  return (
    <a href="/" style={brandStyle} aria-label="Regulski Behawiorysta">
      <Image src={REGULSKI_WEB_LOGO} alt="" width={58} height={58} priority />
      <span>
        <strong style={{ display: 'block', fontSize: 18 }}>Regulski Behawiorysta</strong>
        <small style={{ color: '#6b625b' }}>opinie po konsultacji</small>
      </span>
    </a>
  )
}

const pageStyle: CSSProperties = {
  maxWidth: 560,
  margin: '60px auto',
  padding: '0 20px',
  fontFamily: 'var(--font-body), system-ui, sans-serif',
  color: '#1f1a17',
}

const headingStyle: CSSProperties = {
  margin: '0 0 8px',
  fontFamily: 'var(--font-display), Georgia, serif',
  fontSize: 'clamp(2.25rem, 7vw, 3rem)',
  fontWeight: 560,
  lineHeight: 1.05,
  letterSpacing: 0,
}

const brandStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  color: '#1f1a17',
  textDecoration: 'none',
  marginBottom: 28,
}

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const labelStyle: CSSProperties = {
  fontWeight: 600,
}

const hintStyle: CSSProperties = {
  fontSize: 12,
  color: '#6b625b',
}

const inputStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #d9cfc3',
  fontSize: 15,
  color: '#1f1a17',
  background: '#fafaf8',
  width: '100%',
  boxSizing: 'border-box',
}
