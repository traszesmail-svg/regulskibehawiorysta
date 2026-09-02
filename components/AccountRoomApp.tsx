'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
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
import type { CaseMapSummary } from '@/lib/case-map'
import {
  PRICE_LABEL,
  getMaterialyGuideCoverSrc,
  getPublishedMaterialyGuideBySlug,
  type MaterialyGuide,
} from '@/lib/materialy-catalog'

type AccountView = 'start' | 'pupil' | 'rozmowa' | 'materialy' | 'historia'

type AccountRoomAppProps = {
  initialView?: AccountView
  initialSessionHint?: boolean
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

const ROOM_MATERIAL_SLUGS: Record<AccountPetSpecies, string[]> = {
  pies: ['pies-sam-w-domu', 'pies-reaktywny-na-spacerze', 'pies-burza-nagly-halas'],
  kot: ['kot-kuweta-pierwszy-plan', 'konflikt-miedzy-kotami', 'kot-drapie-meble'],
}

function getRoomMaterialGuides(species: AccountPetSpecies): MaterialyGuide[] {
  return ROOM_MATERIAL_SLUGS[species]
    .map((slug) => getPublishedMaterialyGuideBySlug(slug))
    .filter((guide): guide is MaterialyGuide => Boolean(guide))
}

function buildRoomMaterialOrderHref(slug: string) {
  return `/materialy/${encodeURIComponent(slug)}`
}

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
    const standalone = (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
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

export function AccountRoomApp({ initialView = 'start', initialSessionHint = false }: AccountRoomAppProps) {
  const [authenticated, setAuthenticated] = useState(false)
  const [account, setAccount] = useState<AccountHomePayload | null>(null)
  const [activeView, setActiveView] = useState<AccountView>(initialView)
  const [loading, setLoading] = useState(initialSessionHint)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [petDraft, setPetDraft] = useState(createEmptyPetDraft)
  const [petPhoto, setPetPhoto] = useState<File | null>(null)
  const [messageBody, setMessageBody] = useState('')
  const [messageFile, setMessageFile] = useState<File | null>(null)
  const [caseMaps, setCaseMaps] = useState<CaseMapSummary[]>([])
  const [orderingRecommendation, setOrderingRecommendation] = useState(false)

  const activeConversationId = useMemo(() => pickFirstConversation(account), [account])
  const primaryPetId = account?.pets[0]?.id ?? ''
  const latestAccountBooking = account?.bookings[0] ?? null
  const recommendedMaterial = latestAccountBooking?.recommendedMaterialSlug
    ? getPublishedMaterialyGuideBySlug(latestAccountBooking.recommendedMaterialSlug)
    : null

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
    if (!initialSessionHint) {
      setLoading(false)
      return
    }

    void loadAccount()
  }, [initialSessionHint, loadAccount])

  useEffect(() => {
    if (!authenticated) {
      setCaseMaps([])
      return
    }

    let active = true
    void fetch('/api/account/case-maps')
      .then(async (response) => {
        const payload = (await response.json()) as { ok?: boolean; caseMaps?: CaseMapSummary[] }
        if (!response.ok || !payload.caseMaps) throw new Error('Nie udało się pobrać Map sprawy.')
        return payload.caseMaps
      })
      .then((nextCaseMaps) => {
        if (active) setCaseMaps(nextCaseMaps)
      })
      .catch(() => {
        if (active) setCaseMaps([])
      })

    return () => {
      active = false
    }
  }, [authenticated])

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
      <section className="account-room-panel account-room-panel-shell">
        <div className="section-eyebrow">Pokój opiekuna</div>
        <h1>Ładuję konto...</h1>
      </section>
    )
  }

  if (!authenticated) {
    return (
      <section className="account-room-panel account-room-panel-shell account-room-entry">
        <div className="account-room-entry-copy">
          <div className="section-eyebrow">Twój prywatny Pokój</div>
          <h1>Wszystko o Twoim pupilu w jednym spokojnym miejscu</h1>
          <p className="account-room-entry-lead">
            Po zalogowaniu zobaczysz najbliższy termin, materiały i historię sprawy. Uzupełnisz też
            profil pupila, wrócisz do Mapy zachowania i wyślesz wiadomość lub plik.
          </p>

          <ul className="account-room-entry-benefits" aria-label="Co znajdziesz w Pokoju opiekuna">
            <li>
              <span className="account-room-entry-icon">
                <Smartphone size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Terminy i link do rozmowy</strong>
                <small>Wszystkie informacje przed konsultacją pod ręką.</small>
              </span>
            </li>
            <li>
              <span className="account-room-entry-icon">
                <PawPrint size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Profil pupila i zapisane Mapy</strong>
                <small>Nie musisz za każdym razem opowiadać wszystkiego od początku.</small>
              </span>
            </li>
            <li>
              <span className="account-room-entry-icon">
                <BookOpen size={20} aria-hidden="true" />
              </span>
              <span>
                <strong>Materiały, wiadomości i pliki</strong>
                <small>Wracasz do zaleceń wtedy, kiedy naprawdę ich potrzebujesz.</small>
              </span>
            </li>
          </ul>

          <div className="account-room-entry-actions">
            <Link href="/login" className="button button-primary big-button">
              <LogIn size={18} aria-hidden="true" />
              Otwórz mój Pokój
            </Link>
            <Link href="/dostep" className="button button-ghost big-button">
              Mam tylko kod do PDF
            </Link>
          </div>
          <p className="account-room-entry-security">Twoje dane są widoczne dopiero po zalogowaniu.</p>
        </div>

        <figure className="account-room-entry-media">
          <Image
            src="/branding/section-heroes/room-access-v1.webp"
            alt="Opiekunka korzystająca z Pokoju opiekuna w domu, w towarzystwie psa i kota"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 52vw"
          />
          <figcaption>
            <strong>Wracaj do sprawy bez szukania po mailach.</strong>
            <span>Termin, profil pupila i materiały czekają w jednym miejscu.</span>
          </figcaption>
        </figure>
      </section>
    )
  }

  async function orderRecommendedMaterial() {
    if (!latestAccountBooking?.id || !recommendedMaterial) return

    setOrderingRecommendation(true)
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/account/materials/recommendation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bookingId: latestAccountBooking.id,
          productSlug: recommendedMaterial.slug,
        }),
      })
      const payload = (await response.json()) as { ok?: boolean; redirectTo?: string; error?: string }

      if (!response.ok || !payload.ok || !payload.redirectTo) {
        throw new Error(payload.error ?? 'Nie udało się przygotować zamówienia PDF.')
      }

      window.location.assign(payload.redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przygotować zamówienia PDF.')
    } finally {
      setOrderingRecommendation(false)
    }
  }

  const roomMaterialGuides = getRoomMaterialGuides(account?.pets[0]?.species === 'kot' ? 'kot' : 'pies')
  const roomSetupCompleted = [
    Boolean(account?.pets.length),
    Boolean(account?.bookings.length),
    caseMaps.length > 0,
  ].filter(Boolean).length

  return (
    <section className="account-room-panel account-room-panel-shell">
      <div className="account-room-header">
        <div className="account-room-identity">
          <div className="section-eyebrow">Prywatna przestrzeń</div>
          <h1>Twój Pokój opiekuna</h1>
          <p>Terminy, historia pupila, materiały i rozmowa z behawiorystą w jednym miejscu.</p>
        </div>
        <div className="account-room-header-actions">
          <span className="account-user-chip">
            <PawPrint size={16} aria-hidden="true" />
            {account?.profile.email}
          </span>
          <button type="button" className="button button-ghost account-signout" onClick={signOut}>
            <LogOut size={17} aria-hidden="true" />
            Wyloguj
          </button>
        </div>
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
        <div className="account-room-start">
          <section className="account-room-overview">
            <div className="account-room-overview-copy">
              <span className="account-card-kicker">Wszystko pod ręką</span>
              <h2>{account?.pets[0]?.name ? `Dobrze Cię widzieć. Co dziś słychać u ${account.pets[0].name}?` : 'Dobrze Cię widzieć. Od czego zaczynamy?'}</h2>
              <p>
                Wróć do rozmowy, uzupełnij historię pupila albo sprawdź najbliższy termin bez szukania po wiadomościach.
              </p>
              <div className="account-room-overview-actions">
                <button type="button" className="button button-primary" onClick={() => setActiveView('rozmowa')}>
                  <MessageCircle size={17} aria-hidden="true" />
                  Przejdź do rozmowy
                </button>
                <button type="button" className="button button-ghost" onClick={() => setActiveView('pupil')}>
                  <PawPrint size={17} aria-hidden="true" />
                  Profil pupila
                </button>
              </div>
            </div>

            <div className="account-room-next-step">
              <span className="account-card-kicker">Najbliższy termin</span>
              <h3>{account?.bookings[0]?.title ?? 'Nie masz jeszcze rezerwacji'}</h3>
              <p>{account?.bookings[0]?.dateLabel ?? 'Po rezerwacji termin i link do spotkania pojawią się właśnie tutaj.'}</p>
              {account?.bookings[0]?.meetingUrl ? (
                <a href={account.bookings[0].meetingUrl} className="button button-primary" target="_blank" rel="noopener noreferrer">
                  Otwórz pokój rozmowy
                </a>
              ) : account?.bookings[0] ? (
                <button type="button" className="button button-ghost" onClick={() => setActiveView('historia')}>
                  Zobacz szczegóły
                </button>
              ) : (
                <Link href="/zapytaj" className="button button-primary">
                  Wybierz konsultację
                </Link>
              )}
            </div>
          </section>

          {account?.bookings[0]?.recommendedNextStep || recommendedMaterial ? (
            <section className="account-room-card account-recommendation-card" aria-labelledby="account-recommendation-title">
              <div>
                <span className="account-card-kicker">Po rozmowie</span>
                <h2 id="account-recommendation-title">Co robić dalej</h2>
                {latestAccountBooking?.recommendedNextStep ? <p>{latestAccountBooking.recommendedNextStep}</p> : null}
                {recommendedMaterial ? (
                  <div className="account-recommended-material">
                    <strong>{recommendedMaterial.title} · 19 zł</strong>
                    <span>Materiał dobrany do tej rozmowy. Kupisz go tutaj, w swoim Pokoju.</span>
                    <button type="button" className="button button-primary" onClick={() => void orderRecommendedMaterial()} disabled={orderingRecommendation}>
                      {orderingRecommendation ? 'Przygotowuję…' : 'Przejdź do zakupu PDF'}
                    </button>
                  </div>
                ) : null}
              </div>
              <button type="button" className="button button-ghost" onClick={() => setActiveView('rozmowa')}>
                Otwórz rozmowę
              </button>
            </section>
          ) : null}

          <div className="account-room-quick-grid">
            <article className="account-room-card account-quick-card">
              <span className="account-quick-icon"><PawPrint size={21} aria-hidden="true" /></span>
              <div>
                <span className="account-card-kicker">Pupil</span>
                <h2>{account?.pets[0]?.name ?? 'Dodaj pupila'}</h2>
                <p>{account?.pets[0]?.behaviorNotes || 'Zapisz najważniejsze informacje i obserwacje.'}</p>
              </div>
              <button type="button" className="account-card-link" onClick={() => setActiveView('pupil')}>Otwórz profil <span aria-hidden="true">→</span></button>
            </article>

            <article className="account-room-card account-quick-card">
              <span className="account-quick-icon"><MessageCircle size={21} aria-hidden="true" /></span>
              <div>
                <span className="account-card-kicker">Rozmowa</span>
                <h2>{account?.conversations[0]?.messages.length ?? 0} wiadomości</h2>
                <p>Wyślij opis, zdjęcie, film albo PDF do sprawy pupila.</p>
              </div>
              <button type="button" className="account-card-link" onClick={() => setActiveView('rozmowa')}>Napisz wiadomość <span aria-hidden="true">→</span></button>
            </article>

            <article className="account-room-card account-quick-card">
              <span className="account-quick-icon"><BookOpen size={21} aria-hidden="true" /></span>
              <div>
                <span className="account-card-kicker">Materiały</span>
                <h2>{account?.materials.length ?? 0} w koncie</h2>
                <p>Zakupione ebooki i PDF-y dostępne w jednym miejscu.</p>
              </div>
              <button type="button" className="account-card-link" onClick={() => setActiveView('materialy')}>Zobacz materiały <span aria-hidden="true">→</span></button>
            </article>

            <article className="account-room-card account-quick-card">
              <span className="account-quick-icon"><History size={21} aria-hidden="true" /></span>
              <div>
                <span className="account-card-kicker">Mapy zachowania</span>
                <h2>{caseMaps.length === 0 ? 'Zacznij pierwszą Mapę' : caseMaps.length === 1 ? '1 zapisana Mapa' : `${caseMaps.length} zapisane Mapy`}</h2>
                <p>Wracaj do prywatnych podsumowań przed rozmową.</p>
              </div>
              {caseMaps[0] ? (
                <Link href={'/mapa-sprawy?resume=' + encodeURIComponent(caseMaps[0].id)} className="account-card-link">Otwórz ostatnią Mapę <span aria-hidden="true">→</span></Link>
              ) : (
                <Link href="/mapa-sprawy" className="account-card-link">Rozpocznij Mapę <span aria-hidden="true">→</span></Link>
              )}
            </article>
          </div>

          <section className="account-room-card account-room-setup" aria-labelledby="account-room-setup-title">
            <div className="account-room-setup-header">
              <div>
                <span className="account-card-kicker">Spokojny start</span>
                <h2 id="account-room-setup-title">Ułóż swój pierwszy krok</h2>
                <p>Trzy krótkie rzeczy wystarczą, żeby Pokój zaczął pracować razem z Tobą.</p>
              </div>
              <div className="account-room-setup-count" aria-label={`${roomSetupCompleted} z 3 kroków gotowe`}>
                <strong>{roomSetupCompleted}/3</strong>
                <span>gotowe</span>
              </div>
            </div>

            <div className="account-room-setup-progress" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={roomSetupCompleted}>
              <span style={{ width: `${(roomSetupCompleted / 3) * 100}%` }} />
            </div>

            <div className="account-room-setup-grid">
              <button
                type="button"
                className={`account-room-setup-item${account?.pets.length ? ' is-complete' : ''}`}
                onClick={() => setActiveView('pupil')}
              >
                <span className="account-room-setup-icon"><PawPrint size={20} aria-hidden="true" /></span>
                <span className="account-room-setup-copy">
                  <strong>Uzupełnij profil pupila</strong>
                  <small>{account?.pets[0]?.name ? `${account.pets[0].name} jest już zapisany.` : 'Imię, gatunek i krótka historia pomogą zacząć od faktów.'}</small>
                </span>
                <span className="account-room-setup-state">{account?.pets.length ? <Check size={18} aria-hidden="true" /> : 'Otwórz'}</span>
              </button>

              {account?.bookings.length ? (
                <button type="button" className="account-room-setup-item is-complete" onClick={() => setActiveView('historia')}>
                  <span className="account-room-setup-icon"><CalendarDays size={20} aria-hidden="true" /></span>
                  <span className="account-room-setup-copy">
                    <strong>Sprawdź najbliższy termin</strong>
                    <small>{account.bookings[0]?.dateLabel ?? 'Termin jest zapisany w historii.'}</small>
                  </span>
                  <span className="account-room-setup-state"><Check size={18} aria-hidden="true" /></span>
                </button>
              ) : (
                <Link href="/zapytaj" className="account-room-setup-item">
                  <span className="account-room-setup-icon"><CalendarDays size={20} aria-hidden="true" /></span>
                  <span className="account-room-setup-copy">
                    <strong>Wybierz spokojny termin</strong>
                    <small>Po rezerwacji termin i link do rozmowy pojawią się tutaj.</small>
                  </span>
                  <span className="account-room-setup-state">Otwórz</span>
                </Link>
              )}

              {caseMaps[0] ? (
                <Link href={`/mapa-sprawy?resume=${encodeURIComponent(caseMaps[0].id)}`} className="account-room-setup-item is-complete">
                  <span className="account-room-setup-icon"><ClipboardCheck size={20} aria-hidden="true" /></span>
                  <span className="account-room-setup-copy">
                    <strong>Wróć do Mapy sprawy</strong>
                    <small>Masz zapisane podsumowanie do dalszej rozmowy.</small>
                  </span>
                  <span className="account-room-setup-state"><Check size={18} aria-hidden="true" /></span>
                </Link>
              ) : (
                <Link href="/mapa-sprawy" className="account-room-setup-item">
                  <span className="account-room-setup-icon"><ClipboardCheck size={20} aria-hidden="true" /></span>
                  <span className="account-room-setup-copy">
                    <strong>Zacznij Mapę sprawy</strong>
                    <small>Uporządkuj, co dzieje się przed zachowaniem i jaki jest pierwszy sygnał.</small>
                  </span>
                  <span className="account-room-setup-state">Otwórz</span>
                </Link>
              )}
            </div>
          </section>
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

      {activeView === 'rozmowa' ? (() => {
        const latestBooking = account?.bookings?.[0]
        const isLimited = latestBooking && (latestBooking.serviceType === 'szybka-konsultacja-15-min' || latestBooking.serviceType === 'kwadrans-na-juz' || latestBooking.serviceType === 'konsultacja-30-min')
        const questionsRemaining = isLimited ? latestBooking.questionsRemaining : null
        const isChatBlocked = isLimited && questionsRemaining !== null && questionsRemaining <= 0
        const fullSupportEndsAt = latestBooking?.serviceType === 'konsultacja-behawioralna-online' ? latestBooking.supportEndsAt : null
        const isFullSupportExpired = Boolean(fullSupportEndsAt && Date.now() > Date.parse(fullSupportEndsAt))
        const isMessageBlocked = isChatBlocked || isFullSupportExpired

        return (
          <div className="account-chat-layout">
            <aside className="account-room-card account-chat-aside">
              <span className="account-quick-icon"><MessageCircle size={22} aria-hidden="true" /></span>
              <span className="account-card-kicker">Prywatna rozmowa</span>
              <h2>{account?.pets[0]?.name ? `Sprawa: ${account.pets[0].name}` : 'Twoja rozmowa z behawiorystą'}</h2>
              <p>
                Opisz sytuację własnymi słowami. Możesz dołączyć zdjęcie, krótki film albo PDF — odpowiedź zostanie w tym Pokoju.
              </p>

              <div className="account-chat-context">
                <div>
                  <span>Pupil</span>
                  <strong>{account?.pets[0]?.name ?? 'Nieuzupełniony profil'}</strong>
                </div>
                <div>
                  <span>Konsultacja</span>
                  <strong>{latestBooking?.title ?? 'Brak aktywnej konsultacji'}</strong>
                </div>
              </div>

              {isLimited && questionsRemaining !== null ? (
                <div className={`account-chat-access-notice${isChatBlocked ? ' is-blocked' : ''}`}>
                  {isChatBlocked ? (
                    <strong>Wykorzystałeś limit pytań uzupełniających na czacie po tej konsultacji.</strong>
                  ) : (
                    <span>Pozostało pytań uzupełniających do Behawiorysty na czacie: <strong>{questionsRemaining}</strong>.</span>
                  )}
                </div>
              ) : null}
              {fullSupportEndsAt ? (
                <div className={`account-chat-access-notice${isFullSupportExpired ? ' is-blocked' : ''}`}>
                  {isFullSupportExpired
                    ? '14-dniowy okres komunikacji w pokoju po pełnej konsultacji zakończył się.'
                    : `Komunikacja w pokoju jest aktywna do ${new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(fullSupportEndsAt))}.`}
                </div>
              ) : null}
              {latestBooking?.recommendedNextStep ? (
                <div className="account-chat-recommendation">
                  <span className="account-card-kicker">Co robić dalej</span>
                  <p>{latestBooking.recommendedNextStep}</p>
                </div>
              ) : null}
            </aside>

            <section className="account-room-card account-chat-panel">
              <header className="account-chat-panel-header">
                <div>
                  <span className="account-card-kicker">Wiadomości</span>
                  <h2>Rozmowa z behawiorystą</h2>
                </div>
                <span className="account-chat-status"><span aria-hidden="true" /> Prywatny wątek</span>
              </header>

              <div className="account-chat-thread" aria-live="polite">
                {(account?.conversations.length ?? 0) === 0 ? (
                  <div className="account-chat-empty">
                    <span><MessageCircle size={28} aria-hidden="true" /></span>
                    <h3>Tu zacznie się Wasza rozmowa</h3>
                    <p>Napisz pierwszą wiadomość. Wątek zostanie automatycznie przypisany do Twojej sprawy.</p>
                  </div>
                ) : null}
                {account?.conversations.map((conversation) => (
                  <article key={conversation.id} className="account-chat-conversation">
                    <span className="account-chat-subject">{conversation.subject}</span>
                    {conversation.messages.length === 0 ? (
                      <div className="account-chat-empty compact">
                        <p>Wątek jest gotowy. Napisz pierwszą wiadomość poniżej.</p>
                      </div>
                    ) : null}
                    {conversation.messages.map((message) => (
                      <div key={message.id} className={`account-chat-message-row is-${message.sender}`}>
                        <div className={`account-message-bubble is-${message.sender}`}>
                          <div className="account-message-heading">
                            <strong>{message.sender === 'specialist' ? 'Behawiorysta' : message.sender === 'system' ? 'Informacja' : 'Ty'}</strong>
                            <span className="account-message-meta">{formatDateTime(message.createdAt)}</span>
                          </div>
                          {message.body ? <p>{message.body}</p> : null}
                          {message.attachments.map((attachment) => (
                            <a key={attachment.id} href={attachment.signedUrl ?? '#'} className="account-attachment-link" target="_blank" rel="noopener noreferrer">
                              <Download size={15} aria-hidden="true" />
                              {attachment.fileName} ({formatBytes(attachment.fileSizeBytes)})
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </article>
                ))}
              </div>

              <form className="materialy-form account-form account-chat-composer" onSubmit={sendMessage}>
                <label className="account-chat-message-field">
                  <span>Twoja wiadomość</span>
                  <textarea
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    rows={4}
                    disabled={isMessageBlocked}
                    placeholder={isMessageBlocked ? 'Wysyłka wiadomości jest obecnie niedostępna.' : 'Opisz krótko, co się wydarzyło i co najbardziej Cię niepokoi…'}
                  />
                </label>
                <div className="account-chat-composer-actions">
                  <label className={`account-chat-file${messageFile ? ' has-file' : ''}`}>
                    <Upload size={17} aria-hidden="true" />
                    <span>{messageFile?.name ?? 'Dodaj plik'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime"
                      onChange={(event) => setMessageFile(event.target.files?.[0] ?? null)}
                      disabled={isMessageBlocked}
                    />
                  </label>
                  <button type="submit" className="button button-primary" disabled={busy || isMessageBlocked}>
                    <MessageCircle size={17} aria-hidden="true" />
                    {busy ? 'Wysyłam...' : 'Wyślij wiadomość'}
                  </button>
                </div>
                <small>Możesz dołączyć JPG, PNG, WEBP, PDF albo krótki film.</small>
              </form>
            </section>
          </div>
        )
      })() : null}

      {activeView === 'materialy' ? (
        <div className="account-materials-room">
          <header className="account-materials-header">
            <div>
              <span className="account-card-kicker">Twoja biblioteka</span>
              <h2>Materiały do spokojnej pracy w domu</h2>
              <p>Bezpłatny materiał otworzysz od razu. Płatny PDF pojawi się tutaj dopiero wtedy, gdy zostanie dobrany do Twojej rozmowy.</p>
            </div>
            <Link href="/materialy" className="button button-ghost">Zobacz wszystkie materiały</Link>
          </header>

          {(account?.materials.length ?? 0) > 0 ? (
            <section className="account-owned-materials" aria-labelledby="account-owned-materials-title">
              <h3 id="account-owned-materials-title">Już w Twoim koncie</h3>
              <div className="account-list-grid">
                {account?.materials.map((material) => (
                  <article key={material.orderNumber} className="account-room-card account-owned-material">
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
            </section>
          ) : (
            <div className="account-materials-empty">
              <BookOpen size={20} aria-hidden="true" />
              <span>Nie masz jeszcze kupionych materiałów. Poniżej znajdziesz dobry punkt startu.</span>
              <Link href="/dostep">Mam starszy kod dostępu</Link>
            </div>
          )}

          <section className="account-materials-recommended" aria-labelledby="account-materials-recommended-title">
            <div className="account-materials-section-title">
              <div>
                <span className="account-card-kicker">Wybrane dla Ciebie</span>
                <h3 id="account-materials-recommended-title">Zacznij od jednego konkretnego tematu</h3>
              </div>
              <p>Bezpłatny na start albo jeden dobrany po rozmowie.</p>
            </div>
            <div className="account-materials-grid">
              {roomMaterialGuides.map((guide) => {
                const isFree = guide.priceCode === 'free'
                const href = buildRoomMaterialOrderHref(guide.slug)

                return (
                  <article key={guide.slug} className={`account-material-card${isFree ? ' is-free' : ''}`}>
                    <div className="account-material-cover">
                      <Image
                        src={getMaterialyGuideCoverSrc(guide)}
                        alt={`Okładka PDF: ${guide.title}`}
                        fill
                        sizes="(max-width: 680px) 82vw, (max-width: 980px) 40vw, 230px"
                        unoptimized
                      />
                      <span>{PRICE_LABEL[guide.priceCode]}</span>
                    </div>
                    <div className="account-material-card-copy">
                      <span className="account-card-kicker">{guide.category === 'cat' ? 'Dla kota' : guide.category === 'dog' ? 'Dla psa' : 'Dla psa i kota'}</span>
                      <h4>{guide.title}</h4>
                      <p>{guide.shortPromise}</p>
                      <Link href={href} className={`button ${isFree ? 'button-primary' : 'button-ghost'}`}>
                        {isFree ? <Download size={17} aria-hidden="true" /> : <BookOpen size={17} aria-hidden="true" />}
                        {isFree ? 'Zobacz i pobierz' : 'Zobacz opis · po rozmowie'}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
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
