'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, CheckCircle2, ImagePlus, Send, ShieldCheck } from 'lucide-react'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { REGULSKI_WEB_BADGE_LOGO } from '@/lib/regulski-web-assets'
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
      <OpinionPageShell>
        <section className="add-opinion-confirmation" data-opinion-form="sent">
          <span className="add-opinion-confirmation-icon" aria-hidden="true">
            <CheckCircle2 size={34} strokeWidth={1.7} />
          </span>
          <h1>Dzięki za opinię</h1>
          <p>Opinia trafiła do weryfikacji. Odezwę się po sprawdzeniu, najczęściej w ciągu 1-2 dni roboczych.</p>
          <Link href="/opinie" prefetch={false} className="add-opinion-secondary-link">
            Wróć do opinii
          </Link>
        </section>
      </OpinionPageShell>
    )
  }

  return (
    <OpinionPageShell>
      <section className="add-opinion-layout" data-opinion-form="page">
        <aside className="add-opinion-intro" aria-labelledby="add-opinion-heading">
          <Link href="/opinie" prefetch={false} className="add-opinion-back-link">
            <ArrowLeft size={17} strokeWidth={1.8} />
            Wróć do opinii
          </Link>

          <div className="add-opinion-brand-card">
            <span className="add-opinion-brand-logo">
              <Image src={REGULSKI_WEB_BADGE_LOGO} alt="" width={58} height={58} priority />
            </span>
            <span>
              <strong>Regulski Behawiorysta</strong>
              <small>opinie po konsultacjach psów i kotów</small>
            </span>
          </div>

          <div className="add-opinion-intro-copy">
            <span className="add-opinion-eyebrow">Po konsultacji</span>
            <h1 id="add-opinion-heading">Dodaj opinię</h1>
            <p>
              Formularz jest dla osób po konsultacji. Treść i zdjęcie trafiają do ręcznej weryfikacji, więc nic nie
              pojawia się na stronie automatycznie.
            </p>
          </div>

          <ul className="add-opinion-trust-list" aria-label="Zasady publikacji opinii">
            <li>
              <ShieldCheck size={18} strokeWidth={1.7} />
              Publikuję tylko imię, inicjały albo opis anonimowy.
            </li>
            <li>
              <ImagePlus size={18} strokeWidth={1.7} />
              Zdjęcie możesz dodać jako plik, nie jako link.
            </li>
            <li>
              <CheckCircle2 size={18} strokeWidth={1.7} />
              Pełne dane kontaktowe zostają tylko do weryfikacji.
            </li>
          </ul>
        </aside>

        <form className="add-opinion-form" onSubmit={handleSubmit} data-opinion-form="submit" noValidate>
          <input
            type="text"
            name="website"
            value={fields.website}
            onChange={handleChange}
            className="add-opinion-honeypot"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
          />

          <label className="add-opinion-field" htmlFor="displayName">
            <span>Imię lub inicjały do publikacji *</span>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={fields.displayName}
              onChange={handleChange}
              required
              maxLength={60}
              placeholder="np. Anna K. albo Opiekunka psa"
            />
          </label>

          <label className="add-opinion-field" htmlFor="email">
            <span>Adres e-mail do kontaktu *</span>
            <input
              id="email"
              name="email"
              type="email"
              value={fields.email}
              onChange={handleChange}
              required
              maxLength={120}
              placeholder="twoj@email.pl"
            />
            <small>Nie publikuję adresu e-mail. Służy tylko do potwierdzenia opinii.</small>
          </label>

          <label className="add-opinion-field" htmlFor="issueCategory">
            <span>Czego dotyczyła konsultacja? *</span>
            <select id="issueCategory" name="issueCategory" value={fields.issueCategory} onChange={handleChange} required>
              <option value="">Wybierz temat</option>
              {TESTIMONIAL_ISSUE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="add-opinion-field add-opinion-field-wide" htmlFor="opinion">
            <span>Treść opinii *</span>
            <textarea
              id="opinion"
              name="opinion"
              value={fields.opinion}
              onChange={handleChange}
              required
              maxLength={600}
              rows={6}
              placeholder="Co konkretnie pomogło? Co stało się jaśniejsze po konsultacji?"
            />
            <small>{fields.opinion.length}/600 znaków</small>
          </label>

          <label className="add-opinion-field add-opinion-field-wide" htmlFor="photo">
            <span>Zdjęcie psa / kota (opcjonalnie)</span>
            <input id="photo" name="photo" type="file" accept="image/*" onChange={handlePhotoChange} data-opinion-photo-input="true" />
            <small>{photoFile ? `Wybrany plik: ${photoFile.name}` : 'JPG, PNG albo WEBP. Limit załącznika: 25 MB.'}</small>
          </label>

          <label className="add-opinion-checkbox" htmlFor="consentPublish">
            <input
              id="consentPublish"
              type="checkbox"
              name="consentPublish"
              checked={fields.consentPublish}
              onChange={handleChange}
              required
            />
            <span>
              Wyrażam zgodę na publikację tej opinii na stronie regulskibehawiorysta.pl pod podanym imieniem,
              inicjałami albo opisem anonimowym. *
            </span>
          </label>

          {status === 'error' && errorMessage ? (
            <p className="add-opinion-error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" disabled={status === 'sending'} className="add-opinion-submit">
            <span>{status === 'sending' ? 'Wysyłam...' : 'Wyślij opinię'}</span>
            <Send size={17} strokeWidth={1.8} />
          </button>

          <p className="add-opinion-footnote">
            Pola oznaczone * są wymagane. Opinia trafia do weryfikacji przed publikacją.
          </p>
        </form>
      </section>
    </OpinionPageShell>
  )
}

function OpinionPageShell({ children }: { children: ReactNode }) {
  return (
    <NotatnikPageShell
      tag="Opinie"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/opinie"
      ctaLabel="Wróć do opinii"
      footerPrimaryHref="/opinie"
      footerPrimaryLabel="Wróć do opinii"
      sideVisualVariant="mixed"
      pageClassName="opinions-showcase-page add-opinion-page"
      shellClassName="opinions-showcase-shell add-opinion-shell"
      showFooterReviews={false}
    >
      {children}
    </NotatnikPageShell>
  )
}
