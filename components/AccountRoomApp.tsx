'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Download,
  History,
  LogIn,
  LogOut,
  MessageCircle,
  PawPrint,
  Smartphone,
  Upload,
} from 'lucide-react'
import type { AccountHomePayload, AccountPet, AccountPetSpecies } from '@/lib/account'

type AccountView = 'start' | 'pupil' | 'rozmowa' | 'materialy' | 'historia'

type AccountRoomAppProps = {
  initialView?: AccountView
}

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const ACCOUNT_VIEWS: Array<{ id: AccountView; label: string; icon: typeof PawPrint }> = [
  { id: 'start', label: 'Start', icon: Smartphone },
  { id: 'pupil', label: 'Pupil', icon: PawPrint },
  { id: 'rozmowa', label: 'Rozmowa', icon: MessageCircle },
  { id: 'materialy', label: 'Materiały', icon: BookOpen },
  { id: 'historia', label: 'Historia', icon: History },
]

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function pickFirstConversation(account: AccountHomePayload | null) {
  return account?.conversations[0]?.id ?? ''
}

function createEmptyPetDraft() {
  return {
    id: '',
    name: '',
    species: 'pies' as AccountPetSpecies,
    age: '',
    behaviorNotes: '',
  }
}

function petToDraft(pet: AccountPet) {
  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    age: pet.age,
    behaviorNotes: pet.behaviorNotes,
  }
}

function AccountInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    setInstalled(standalone)
    setIsIos(/iPad|iPhone|iPod/.test(window.navigator.userAgent))

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as DeferredInstallPrompt)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (installed) {
    return (
      <div className="account-install-strip">
        <Smartphone size={18} aria-hidden="true" />
        <span>Aplikacja działa w trybie zainstalowanym.</span>
      </div>
    )
  }

  return (
    <div className="account-install-strip">
      <Smartphone size={18} aria-hidden="true" />
      <span>{isIos ? 'Na iPhonie dodaj stronę przez Safari: Udostępnij -> Do ekranu początkowego.' : 'Dodaj pokój opiekuna do ekranu telefonu.'}</span>
      {deferredPrompt ? (
        <button type="button" className="button button-ghost" onClick={install}>
          Instaluj
        </button>
      ) : null}
    </div>
  )
}

export function AccountRoomApp({ initialView = 'start' }: AccountRoomAppProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [account, setAccount] = useState<AccountHomePayload | null>(null)
  const [activeView, setActiveView] = useState<AccountView>(initialView)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [petDraft, setPetDraft] = useState(createEmptyPetDraft)
  const [petPhoto, setPetPhoto] = useState<File | null>(null)
  const [messageBody, setMessageBody] = useState('')
  const [messageFile, setMessageFile] = useState<File | null>(null)

  const activeConversationId = useMemo(() => pickFirstConversation(account), [account])
  const primaryPetId = account?.pets[0]?.id ?? ''

  const loadAccount = useCallback(async () => {
    setError('')
    try {
      const response = await fetch('/api/account/me')
      const payload = (await response.json()) as { ok?: boolean; account?: AccountHomePayload; error?: string }

      if (response.status === 401) {
        setAuthenticated(false)
        setAccount(null)
        return
      }

      if (!response.ok || !payload.account) {
        throw new Error(payload.error ?? 'Nie udało się odczytać pokoju opiekuna.')
      }

      setAuthenticated(true)
      setAccount(payload.account)
      if (payload.account.pets[0] && !petDraft.id && !petDraft.name) {
        setPetDraft(petToDraft(payload.account.pets[0]))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się odczytać pokoju opiekuna.')
    } finally {
      setLoading(false)
    }
  }, [petDraft.id, petDraft.name])

  useEffect(() => {
    void loadAccount()
  }, [loadAccount])

  async function signOut() {
    await fetch('/api/account/auth/logout', { method: 'POST' })
    setAuthenticated(false)
    setAccount(null)
  }

  async function savePet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/account/pet', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(petDraft),
      })
      const payload = (await response.json()) as { ok?: boolean; pet?: AccountPet; error?: string }

      if (!response.ok || !payload.pet) {
        throw new Error(payload.error ?? 'Nie udało się zapisać pupila.')
      }

      if (petPhoto) {
        const photoData = new FormData()
        photoData.set('petId', payload.pet.id)
        photoData.set('file', petPhoto)
        const photoResponse = await fetch('/api/account/pet/photo', {
          method: 'POST',
          body: photoData,
        })
        const photoPayload = (await photoResponse.json()) as { ok?: boolean; error?: string }
        if (!photoResponse.ok || !photoPayload.ok) {
          throw new Error(photoPayload.error ?? 'Nie udało się zapisać zdjęcia pupila.')
        }
      }

      setPetPhoto(null)
      setNotice('Profil pupila zapisany.')
      await loadAccount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać pupila.')
    } finally {
      setBusy(false)
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const formData = new FormData()
      formData.set('body', messageBody)
      formData.set('conversationId', activeConversationId)
      formData.set('petId', primaryPetId)
      if (messageFile) formData.set('file', messageFile)

      const response = await fetch('/api/account/messages', {
        method: 'POST',
        body: formData,
      })
      const payload = (await response.json()) as { ok?: boolean; error?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Nie udało się wysłać wiadomości.')
      }

      setMessageBody('')
      setMessageFile(null)
      setNotice('Wiadomość zapisana w pokoju opiekuna.')
      await loadAccount()
      setActiveView('rozmowa')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się wysłać wiadomości.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="account-room-panel">
        <div className="section-eyebrow">Pokój opiekuna</div>
        <h1>Ładuję konto...</h1>
      </section>
    )
  }

  if (!authenticated) {
    return (
      <section className="account-room-panel">
        <div className="section-eyebrow">Pokój opiekuna</div>
        <h1>Zaloguj się, żeby zobaczyć swoje rezerwacje i materiały.</h1>
        <p className="hero-text small-width center-text">
          Konto łączy zakupione PDF-y, konsultacje, profil pupila, rozmowę i pliki w jednym miejscu.
        </p>
        <div className="hero-actions centered-actions">
          <Link href="/login" className="button button-primary big-button">
            <LogIn size={18} aria-hidden="true" />
            Zaloguj się
          </Link>
          <Link href="/dostep" className="button button-ghost big-button">
            Mam kod dostępu
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="account-room-panel">
      <div className="account-room-header">
        <div>
          <div className="section-eyebrow">Pokój opiekuna</div>
          <h1>Moja aplikacja Regulski Behawiorysta</h1>
          <p>{account?.profile.email}</p>
        </div>
        <button type="button" className="button button-ghost" onClick={signOut}>
          <LogOut size={17} aria-hidden="true" />
          Wyloguj
        </button>
      </div>

      <AccountInstallPrompt />

      <nav className="account-tabbar" aria-label="Pokój opiekuna">
        {ACCOUNT_VIEWS.map((view) => {
          const Icon = view.icon
          return (
            <button
              key={view.id}
              type="button"
              className={activeView === view.id ? 'is-active' : ''}
              onClick={() => setActiveView(view.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{view.label}</span>
            </button>
          )
        })}
      </nav>

      {error ? <p className="form-error account-alert">{error}</p> : null}
      {notice ? <p className="form-success account-alert">{notice}</p> : null}

      {activeView === 'start' ? (
        <div className="account-dashboard-grid">
          <article className="account-room-card">
            <span className="account-card-kicker">Najbliższy krok</span>
            <h2>{account?.bookings[0]?.title ?? 'Brak aktywnej rezerwacji'}</h2>
            <p>{account?.bookings[0]?.dateLabel ?? 'Po rezerwacji termin pojawi się tutaj.'}</p>
            {account?.bookings[0]?.meetingUrl ? (
              <a href={account.bookings[0].meetingUrl} className="button button-primary" target="_blank" rel="noopener noreferrer">
                Otwórz pokój rozmowy
              </a>
            ) : (
              <Link href="/book" className="button button-primary">
                Zarezerwuj konsultację
              </Link>
            )}
          </article>

          <article className="account-room-card">
            <span className="account-card-kicker">Pupil</span>
            <h2>{account?.pets[0]?.name ?? 'Dodaj pupila'}</h2>
            <p>{account?.pets[0]?.behaviorNotes || 'Zdjęcie, wiek i krótka historia pomagają trzymać sprawę w jednym miejscu.'}</p>
            <button type="button" className="button button-ghost" onClick={() => setActiveView('pupil')}>
              <PawPrint size={17} aria-hidden="true" />
              Uzupełnij
            </button>
          </article>

          <article className="account-room-card">
            <span className="account-card-kicker">Materiały</span>
            <h2>{account?.materials.length ?? 0} w koncie</h2>
            <p>Zakupione ebooki i PDF-y będą widoczne po emailu konta.</p>
            <button type="button" className="button button-ghost" onClick={() => setActiveView('materialy')}>
              <BookOpen size={17} aria-hidden="true" />
              Otwórz
            </button>
          </article>

          <article className="account-room-card">
            <span className="account-card-kicker">Rozmowa</span>
            <h2>{account?.conversations[0]?.messages.length ?? 0} wiadomości</h2>
            <p>Dodaj opis, zdjęcie, film albo PDF do sprawy pupila.</p>
            <button type="button" className="button button-ghost" onClick={() => setActiveView('rozmowa')}>
              <MessageCircle size={17} aria-hidden="true" />
              Napisz
            </button>
          </article>
        </div>
      ) : null}

      {activeView === 'pupil' ? (
        <div className="account-split">
          <div className="account-room-card">
            <h2>Profil pupila</h2>
            <form className="materialy-form account-form" onSubmit={savePet}>
              <label>
                Imie pupila
                <input value={petDraft.name} onChange={(event) => setPetDraft({ ...petDraft, name: event.target.value })} required />
              </label>
              <label>
                Gatunek
                <select value={petDraft.species} onChange={(event) => setPetDraft({ ...petDraft, species: event.target.value as AccountPetSpecies })}>
                  <option value="pies">Pies</option>
                  <option value="kot">Kot</option>
                </select>
              </label>
              <label>
                Wiek
                <input value={petDraft.age} onChange={(event) => setPetDraft({ ...petDraft, age: event.target.value })} />
              </label>
              <label>
                Krótka historia
                <textarea value={petDraft.behaviorNotes} onChange={(event) => setPetDraft({ ...petDraft, behaviorNotes: event.target.value })} rows={5} />
              </label>
              <label>
                Zdjęcie pupila
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPetPhoto(event.target.files?.[0] ?? null)} />
              </label>
              <button type="submit" className="button button-primary big-button" disabled={busy}>
                {busy ? 'Zapisuję...' : 'Zapisz pupila'}
              </button>
            </form>
          </div>

          <div className="account-pets-list">
            {account?.pets.map((pet) => (
              <button key={pet.id} type="button" className="account-pet-card" onClick={() => setPetDraft(petToDraft(pet))}>
                {pet.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private Supabase signed URL, not a stable image domain.
                  <img src={pet.photoUrl} alt="" />
                ) : <span><PawPrint size={30} aria-hidden="true" /></span>}
                <strong>{pet.name}</strong>
                <small>{pet.species === 'kot' ? 'Kot' : 'Pies'} {pet.age ? `- ${pet.age}` : ''}</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {activeView === 'rozmowa' ? (
        <div className="account-split">
          <div className="account-room-card">
            <h2>Dodaj wiadomość albo plik</h2>
            <form className="materialy-form account-form" onSubmit={sendMessage}>
              <label>
                Wiadomość
                <textarea value={messageBody} onChange={(event) => setMessageBody(event.target.value)} rows={6} />
              </label>
              <label>
                Plik
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime"
                  onChange={(event) => setMessageFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button type="submit" className="button button-primary big-button" disabled={busy}>
                <Upload size={17} aria-hidden="true" />
                {busy ? 'Wysyłam...' : 'Dodaj do rozmowy'}
              </button>
            </form>
          </div>

          <div className="account-message-list">
            {(account?.conversations.length ?? 0) === 0 ? (
              <div className="account-room-card">
                <h2>Brak rozmowy</h2>
                <p>Pierwsza wiadomość utworzy wątek w pokoju opiekuna.</p>
              </div>
            ) : null}
            {account?.conversations.map((conversation) => (
              <article key={conversation.id} className="account-room-card">
                <span className="account-card-kicker">{conversation.subject}</span>
                {conversation.messages.length === 0 ? <p>Wątek jest pusty.</p> : null}
                {conversation.messages.map((message) => (
                  <div key={message.id} className={`account-message-bubble is-${message.sender}`}>
                    <div className="account-message-meta">{formatDateTime(message.createdAt)}</div>
                    {message.body ? <p>{message.body}</p> : null}
                    {message.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.signedUrl ?? '#'} className="account-attachment-link" target="_blank" rel="noopener noreferrer">
                        <Download size={15} aria-hidden="true" />
                        {attachment.fileName} ({formatBytes(attachment.fileSizeBytes)})
                      </a>
                    ))}
                  </div>
                ))}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {activeView === 'materialy' ? (
        <div className="account-list-grid">
          {(account?.materials.length ?? 0) === 0 ? (
            <article className="account-room-card">
              <h2>Brak materiałów w koncie</h2>
              <p>Zakupione PDF-y pojawią się tutaj po emailu konta. Starszy kod nadal wpiszesz na stronie dostępu.</p>
              <Link href="/dostep" className="button button-ghost">Wpisz kod</Link>
            </article>
          ) : null}
          {account?.materials.map((material) => (
            <article key={material.orderNumber} className="account-room-card">
              <span className="account-card-kicker">{material.orderNumber}</span>
              <h2>{material.productName}</h2>
              <p>{material.statusLabel}</p>
              {material.accessUrl ? (
                <Link href={material.accessUrl} className="button button-primary">
                  <Download size={17} aria-hidden="true" />
                  Otwórz PDF
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {activeView === 'historia' ? (
        <div className="account-timeline">
          {(account?.timeline.length ?? 0) === 0 ? (
            <article className="account-room-card">
              <h2>Historia jest pusta</h2>
              <p>Rezerwacje, materiały, profil pupila i rozmowa będą tu widoczne chronologicznie.</p>
            </article>
          ) : null}
          {account?.timeline.map((event) => (
            <article key={event.id} className="account-timeline-item">
              <time>{formatDateTime(event.createdAt)}</time>
              <h2>{event.title}</h2>
              <p>{event.description}</p>
              {event.href ? (
                <a href={event.href} target="_blank" rel="noopener noreferrer">
                  Otwórz
                </a>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
