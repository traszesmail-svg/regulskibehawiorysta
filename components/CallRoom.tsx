'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBookingAnalyticsContextParams } from '@/lib/analytics-schema'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  type BookingServiceType,
  getBookingServiceRoomAccessLabel,
  getBookingServiceRoomDurationMinutes,
  getBookingServiceTitle,
  isAudioOnlyBookingService,
} from '@/lib/booking-services'
import { formatDateTimeLabel, getSecondsUntilRoomUnlock } from '@/lib/data'
import { createMeetingEmbedUrl } from '@/lib/server/jitsi'
import { CAPBT_LOGO, COAPE_LOGO, SITE_NAME, COAPE_ORG_URL, CAPBT_PROFILE_URL } from '@/lib/site'
import { AnimalType, BookingRecord, ProblemType } from '@/lib/types'

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = safeSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function capitalizeFirstLetter(value: string) {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getCallRoomCopy(serviceType: BookingServiceType, roomAccessLabel: string) {
  const roomAccessTitle = capitalizeFirstLetter(roomAccessLabel)

  if (!isAudioOnlyBookingService(serviceType)) {
    return {
      activeEyebrow: roomAccessTitle,
      lockedEyebrow: 'Przed konsultacją',
      lockedHeading: 'Pokój konsultacji otworzy się 15 minut przed terminem',
      activeLead:
        'Tutaj wejdziesz do konsultacji online. Przygotuj spokojne miejsce, najważniejsze notatki i materiały, które chcesz omówić na spotkaniu.',
      lockedLead:
        'Wejście do konsultacji odblokuje się automatycznie 15 minut przed startem.',
      iframeTitle: 'Panel konsultacji online',
      waitingKicker: 'Przed konsultacją',
      openInNewTabLabel: 'Otwórz konsultację w nowej karcie',
      activeLinkLabel: 'Link do konsultacji',
      lockedPrepLabel: 'Co przygotować',
      lockedPrepCopy:
        'Spokojne miejsce, notatki z najważniejszym tłem sprawy oraz materiały, które chcesz omówić, żeby wejść od razu w konkrety.',
      activeAfterLabel: 'Po konsultacji',
      activeAfterCopy:
        'Po konsultacji możesz wrócić do zaleceń, materiałów do sprawy albo ustalić dalsze kroki.',
      lockedAfterLabel: 'Co stanie się dalej',
      lockedAfterCopy: `Gdy nadejdzie czas wejścia, ${roomAccessLabel} stanie się aktywny i będzie można uruchomić licznik rozmowy.`,
      completionNextStep:
        'Po konsultacji możesz wrócić do zaleceń, materiałów do sprawy albo ustalić dalsze kroki.',
    }
  }

  return {
    activeEyebrow: roomAccessTitle,
    lockedEyebrow: 'Przed rozmową',
    lockedHeading: 'Pokój rozmowy otworzy się 15 minut przed terminem',
    activeLead:
      'Tutaj wejdziesz do rozmowy audio. Kamera nie jest potrzebna. Przygotuj spokojne miejsce, słuchawki lub głośnik i 2-3 najważniejsze obserwacje o zwierzęciu.',
    lockedLead:
      'Wejście do rozmowy odblokuje się automatycznie 15 minut przed startem.',
    iframeTitle: 'Panel rozmowy audio',
    waitingKicker: 'Przed rozmową',
    openInNewTabLabel: 'Otwórz rozmowę w nowej karcie',
    activeLinkLabel: 'Link do rozmowy audio',
    lockedPrepLabel: 'Co przygotować',
    lockedPrepCopy:
      'Spokojne miejsce, słuchawki albo głośnik oraz 2-3 najważniejsze obserwacje o zwierzęciu, żeby rozmowę wykorzystać konkretnie.',
    activeAfterLabel: 'Po rozmowie',
    activeAfterCopy:
      'Jeśli po rozmowie temat okaże się szerszy, kolejnym krokiem mogą być Dwa kwadranse albo pełna konsultacja behawioralna.',
    lockedAfterLabel: 'Co stanie się dalej',
    lockedAfterCopy: `Gdy nadejdzie czas wejścia, ${roomAccessLabel} stanie się aktywny i będzie można uruchomić licznik rozmowy.`,
    completionNextStep:
      'Jeśli po rozmowie temat okaże się szerszy, kolejnym krokiem mogą być Dwa kwadranse albo pełna konsultacja behawioralna.',
  }
}

type AudioContextWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

interface CallRoomProps {
  bookingId: string
  accessToken: string | null
  meetingUrl: string
  ownerName: string
  bookingDate: string
  bookingTime: string
  bookingStatus: BookingRecord['bookingStatus']
  animalType: AnimalType
  problemType: ProblemType
  serviceType: BookingServiceType
  qaBooking?: boolean
  callId?: string | null
  callStatus?: string | null
  startedAt?: string | null
  questionsRemaining?: number | null
  phone?: string | null
  petAge?: string | null
  durationNotes?: string | null
  description?: string | null
}

export function CallRoom({
  bookingId,
  accessToken,
  meetingUrl,
  ownerName,
  bookingDate,
  bookingTime,
  bookingStatus,
  animalType,
  problemType,
  serviceType,
  qaBooking = false,
  callId = null,
  callStatus = null,
  startedAt = null,
  questionsRemaining = null,
  phone = null,
  petAge = null,
  durationNotes = null,
  description = null,
}: CallRoomProps) {
  const router = useRouter()
  const trackedEntryRef = useRef(false)
  const roomDurationMinutes = getBookingServiceRoomDurationMinutes(serviceType)
  const serviceTitle = getBookingServiceTitle(serviceType)
  const roomAccessLabel = getBookingServiceRoomAccessLabel(serviceType)
  const roomCopy = getCallRoomCopy(serviceType, roomAccessLabel)
  const [secondsLeft, setSecondsLeft] = useState(roomDurationMinutes * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(bookingStatus === 'done')
  const [error, setError] = useState('')
  const [ambienceEnabled, setAmbienceEnabled] = useState(false)
  const [unlockInSeconds, setUnlockInSeconds] = useState(() =>
    Math.max(0, getSecondsUntilRoomUnlock(bookingDate, bookingTime)),
  )
  const isPhoneCall = serviceType === 'szybka-konsultacja-15-min' || serviceType === 'kwadrans-na-juz' || serviceType === 'konsultacja-30-min'
  const [callSecondsLeft, setCallSecondsLeft] = useState(roomDurationMinutes * 60)
  const [emergencyReason, setEmergencyReason] = useState('')
  const [emergencySubmitted, setEmergencySubmitted] = useState(false)
  const [emergencyLoading, setEmergencyLoading] = useState(false)
  const [emergencyError, setEmergencyError] = useState('')
  const [draftPetAge, setDraftPetAge] = useState(petAge || '')
  const [draftDurationNotes, setDraftDurationNotes] = useState(durationNotes || '')
  const [draftDescription, setDraftDescription] = useState(description || '')
  const [quizSaved, setQuizSaved] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizError, setQuizError] = useState('')
  const embedUrl = useMemo(() => createMeetingEmbedUrl(meetingUrl), [meetingUrl])
  const roomEntryLabel = useMemo(() => formatDateTimeLabel(bookingDate, bookingTime), [bookingDate, bookingTime])
  const roomUnlocked = finished || unlockInSeconds === 0
  const roomStatusLabel = roomUnlocked
    ? finished
      ? 'Rozmowa zakończona'
      : running
        ? 'Rozmowa aktywna'
        : 'Pokój aktywny'
    : 'Oczekiwanie na wejście'
  const completeUrl = useMemo(
    () =>
      accessToken
        ? `/api/bookings/${bookingId}/complete?access=${encodeURIComponent(accessToken)}`
        : `/api/bookings/${bookingId}/complete`,
    [accessToken, bookingId],
  )

  useEffect(() => {
    if (qaBooking) {
      return
    }

    if (trackedEntryRef.current) {
      return
    }

    trackedEntryRef.current = true
    trackAnalyticsEvent('call_room_viewed', {
      booking_id: bookingId,
      room_unlocked: roomUnlocked,
      source_page: '/call',
      ...getBookingAnalyticsContextParams({
        serviceType,
        animalType,
        problemType,
        bookingStatus,
      }),
    })
  }, [animalType, bookingId, bookingStatus, problemType, qaBooking, roomUnlocked, serviceType])

  useEffect(() => {
    setSecondsLeft(roomDurationMinutes * 60)
  }, [roomDurationMinutes])

  useEffect(() => {
    if (bookingStatus === 'done') {
      setRunning(false)
      setFinished(true)
      setUnlockInSeconds(0)
      setSecondsLeft(0)
    }
  }, [bookingStatus])

  useEffect(() => {
    if (finished) {
      setUnlockInSeconds(0)
      return
    }

    const refreshUnlockTime = () => {
      setUnlockInSeconds(Math.max(0, getSecondsUntilRoomUnlock(bookingDate, bookingTime)))
    }

    refreshUnlockTime()
    const timer = window.setInterval(refreshUnlockTime, 1000)
    return () => window.clearInterval(timer)
  }, [bookingDate, bookingTime, finished])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (!running || finished) {
          return previous
        }

        if (previous <= 1) {
          window.clearInterval(timer)
          setFinished(true)
          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [finished, running])

  useEffect(() => {
    if (!ambienceEnabled || roomUnlocked) {
      return
    }

    const audioWindow = window as AudioContextWindow
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext

    if (!AudioContextConstructor) {
      return
    }

    const context = new AudioContextConstructor()
    const masterGain = context.createGain()
    const timeouts: number[] = []
    let stopped = false

    masterGain.gain.value = 0.055
    masterGain.connect(context.destination)

    const motif = [
      { frequency: 261.63, duration: 0.55 },
      { frequency: 329.63, duration: 0.55 },
      { frequency: 392, duration: 0.55 },
      { frequency: 523.25, duration: 0.85 },
      { frequency: 392, duration: 0.5 },
      { frequency: 329.63, duration: 0.5 },
      { frequency: 293.66, duration: 0.7 },
      { frequency: 261.63, duration: 1.1 },
    ]

    function playTone(frequency: number, startAt: number, duration: number) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const endAt = startAt + duration

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, startAt)
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.052, startAt + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(startAt + 0.08, endAt - 0.12))
      oscillator.connect(gain)
      gain.connect(masterGain)
      oscillator.start(startAt)
      oscillator.stop(endAt)
    }

    function scheduleMotif() {
      if (stopped) return

      let cursor = context.currentTime + 0.05

      for (const note of motif) {
        playTone(note.frequency, cursor, note.duration)
        cursor += note.duration + 0.08
      }

      const timeout = window.setTimeout(scheduleMotif, 7800)
      timeouts.push(timeout)
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => {})
    }

    scheduleMotif()

    return () => {
      stopped = true
      for (const timeout of timeouts)
        window.clearTimeout(timeout)
      void context.close().catch(() => {})
    }
  }, [ambienceEnabled, roomUnlocked])

  useEffect(() => {
    if (!startedAt || (callStatus !== 'active' && callStatus !== 'warning_sent')) {
      return
    }
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - Date.parse(startedAt)) / 1000)
      const left = Math.max(0, roomDurationMinutes * 60 - elapsed)
      setCallSecondsLeft(left)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [startedAt, callStatus, roomDurationMinutes])

  async function handleEmergencyReschedule(e: React.FormEvent) {
    e.preventDefault()
    if (!emergencyReason.trim()) return
    setEmergencyLoading(true)
    setEmergencyError('')
    try {
      const accessParam = accessToken ? `?access=${encodeURIComponent(accessToken)}` : ''
      const res = await fetch(`/api/bookings/${bookingId}/reschedule${accessParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: emergencyReason.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd serwera.')
      }
      setEmergencySubmitted(true)
      setEmergencyReason('')
    } catch (err: any) {
      setEmergencyError(err.message || 'Nie udało się zgłosić zmiany terminu.')
    } finally {
      setEmergencyLoading(false)
    }
  }

  async function handleSaveQuiz(e: React.FormEvent) {
    e.preventDefault()
    setQuizLoading(true)
    setQuizError('')
    setQuizSaved(false)
    try {
      const accessParam = accessToken ? `?access=${encodeURIComponent(accessToken)}` : ''
      const res = await fetch(`/api/bookings/${bookingId}/update-quiz${accessParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petAge: draftPetAge,
          durationNotes: draftDurationNotes,
          description: draftDescription,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd serwera.')
      }
      setQuizSaved(true)
    } catch (err: any) {
      setQuizError(err.message || 'Nie udało się zapisać zmian w formularzu.')
    } finally {
      setQuizLoading(false)
    }
  }

  async function handleFinish() {
    setError('')

    try {
      const response = await fetch(completeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendedNextStep: roomCopy.completionNextStep,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error ?? 'Nie udało się zamknąć konsultacji.')
      }

      setRunning(false)
      setFinished(true)
      router.refresh()
    } catch (finishError) {
      console.error('[regulski-behawiorysta][room] finish failed', finishError)
      setError(finishError instanceof Error ? finishError.message : 'Wystąpił błąd podczas zamykania konsultacji.')
    }
  }

  if (isPhoneCall) {
    const activeCall = callStatus === 'active' || callStatus === 'warning_sent'
    const activeCallTimerLabel = activeCall ? formatTime(callSecondsLeft) : formatCountdown(unlockInSeconds)
    const activeCallStatusLabel = finished || callStatus === 'completed'
      ? 'Rozmowa zakończona'
      : activeCall
        ? 'Połączenie aktywne'
        : callStatus === 'calling'
          ? 'Łączenie telefoniczne...'
          : 'Oczekiwanie na telefon'

    return (
      <section className="two-col-section booking-layout">
        <div className="panel room-panel">
          <div className="section-eyebrow">Telefoniczny pokój konsultacji</div>
          <h1>{serviceTitle}</h1>
          <p className="muted paragraph-gap">
            Rozmowa telefoniczna odbędzie się na Twoim telefonie ({phone || 'podany numer'}). Kamera nie jest wymagana.
          </p>

          <div className="waiting-room-copy" style={{ padding: '2rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--panel-bg-card)', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1rem' }}>How does it work?</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
              <li>O ustalonej godzinie ({bookingTime}) system automatycznie połączy Behawiorystę z Twoim numerem.</li>
              <li>Wykonujemy maksymalnie <strong>2 próby połączenia co minutę</strong>. Jeśli nie odbierzesz, konsultacja przepada.</li>
              <li>Upewnij się, że nie blokujesz połączeń z numerów zastrzeżonych.</li>
              <li>Rozmowa zostanie automatycznie rozłączona po upływie {roomDurationMinutes} minut.</li>
              <li><strong>Minutę przed końcem otrzymasz SMS ostrzegawczy</strong>.</li>
            </ul>
          </div>

          {/* Emergency Reschedule Form */}
          <div className="account-room-card" style={{ border: '1px dashed #caa56e', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#8a3022' }}>Sytuacja awaryjna?</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>Jeśli nie możesz odebrać telefonu z przyczyn losowych, zgłoś prośbę o zmianę terminu.</p>
            {emergencySubmitted ? (
              <p className="form-success">Prośba o zmianę terminu została wysłana do behawiorysty.</p>
            ) : (
              <form onSubmit={handleEmergencyReschedule} className="account-form">
                <textarea
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="Opisz krótko sytuację i zaproponuj nowy termin..."
                  rows={3}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', marginBottom: '1rem' }}
                />
                {emergencyError ? <p className="form-error">{emergencyError}</p> : null}
                <button type="submit" className="button button-ghost" disabled={emergencyLoading}>
                  {emergencyLoading ? 'Zgłaszanie...' : 'Zgłoś zmianę terminu'}
                </button>
              </form>
            )}
          </div>

          {/* Edit Quiz Answers */}
          <div className="account-room-card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
            <h3>Edycja formularza zgłoszeniowego</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>Możesz edytować i dopisać informacje przed rozpoczęciem rozmowy.</p>
            <form onSubmit={handleSaveQuiz} className="account-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span>Wiek pupila:</span>
                <input
                  type="text"
                  value={draftPetAge}
                  onChange={(e) => setDraftPetAge(e.target.value)}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span>Twoje notatki / tło sprawy (np. z Mapy zachowania):</span>
                <textarea
                  value={draftDurationNotes}
                  onChange={(e) => setDraftDurationNotes(e.target.value)}
                  rows={3}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span>Opis problemu:</span>
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={4}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </label>
              {quizError ? <p className="form-error">{quizError}</p> : null}
              {quizSaved ? <p className="form-success">Formularz został pomyślnie zaktualizowany.</p> : null}
              <button type="submit" className="button button-primary" style={{ alignSelf: 'flex-start' }} disabled={quizLoading}>
                {quizLoading ? 'Zapisywanie...' : 'Zapisz zmiany w formularzu'}
              </button>
            </form>
          </div>

        </div>

        <div className="panel section-panel room-sidebar">
          <div className="timer-box tree-backed-card">{activeCallTimerLabel}</div>
          <div className="status-box tree-backed-card">{activeCallStatusLabel}</div>

          <div className="stack-gap top-gap">
            <div className="list-card tree-backed-card">
              <strong>Zaplanowany termin</strong>
              <span>{roomEntryLabel}</span>
            </div>
            <div className="list-card tree-backed-card">
              <strong>Opiekun</strong>
              <span>{ownerName}</span>
            </div>
            <div className="list-card tree-backed-card">
              <strong>Numer telefonu</strong>
              <span>{phone || 'brak'}</span>
            </div>
            {questionsRemaining !== null ? (
              <div className="list-card accent-outline tree-backed-card">
                <strong>Pytania uzupełniające</strong>
                <span>Pozostało pytań na czacie po rozmowie: <strong>{questionsRemaining}</strong></span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="two-col-section booking-layout">
      <div className="panel room-panel">
        <div className="section-eyebrow">{roomUnlocked ? roomCopy.activeEyebrow : roomCopy.lockedEyebrow}</div>
        <h1>{roomUnlocked ? `${roomCopy.activeEyebrow}: ${serviceTitle}` : roomCopy.lockedHeading}</h1>
        <p className="muted paragraph-gap">
          {roomUnlocked ? roomCopy.activeLead : roomCopy.lockedLead}
        </p>

        <div className={`video-shell room-stage ${roomUnlocked ? 'room-stage-live' : 'room-stage-locked'}`}>
          <div className="room-preview-frame">
            <iframe
              title={roomCopy.iframeTitle}
              src={embedUrl}
              className={`video-frame ${roomUnlocked ? '' : 'video-frame-muted'}`}
              allow="camera; microphone; fullscreen; display-capture"
              tabIndex={roomUnlocked ? 0 : -1}
            />
            {!roomUnlocked ? (
              <div className="room-preview-overlay">
                <div className="waiting-room-badge">{SITE_NAME}</div>
                <div className="waiting-room-copy">
                  <span className="waiting-room-kicker">{roomCopy.waitingKicker}</span>
                  <strong>Wejście otworzy się za {formatCountdown(unlockInSeconds)}</strong>
                  <span>Pełny dostęp pojawi się automatycznie 15 minut przed terminem {roomEntryLabel}.</span>
                </div>
                <div className="waiting-room-logos" aria-label="Certyfikacje specjalisty">
                  <a
                    href={COAPE_ORG_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="waiting-room-logo"
                    aria-label="Otwórz stronę COAPE"
                  >
                    <Image
                      src={COAPE_LOGO.src}
                      alt={COAPE_LOGO.alt}
                      width={COAPE_LOGO.width}
                      height={COAPE_LOGO.height}
                      sizes="221px"
                      style={{ width: 221, height: 'auto' }}
                    />
                  </a>
                  <a
                    href={CAPBT_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="waiting-room-logo"
                    aria-label="Otwórz profil specjalisty w CAPBT"
                  >
                    <Image
                      src={CAPBT_LOGO.src}
                      alt={CAPBT_LOGO.alt}
                      width={CAPBT_LOGO.width}
                      height={CAPBT_LOGO.height}
                      sizes="218px"
                      style={{ width: 218, height: 'auto' }}
                    />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="hero-actions top-gap">
          {roomUnlocked ? (
            <>
              <button
                type="button"
                onClick={() => setRunning(true)}
                className="button button-primary big-button"
                disabled={running || finished}
              >
                {running ? 'Rozmowa trwa' : finished ? 'Rozmowa zakończona' : `Uruchom licznik ${roomDurationMinutes} minut`}
              </button>
              {!finished ? (
                <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="button button-ghost big-button">
                  {roomCopy.openInNewTabLabel}
                </a>
              ) : null}
              <button type="button" onClick={handleFinish} className="button button-ghost big-button" disabled={finished}>
                Zakończ rozmowę
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button button-primary big-button" disabled>
                Pokój odblokuje się za {formatCountdown(unlockInSeconds)}
              </button>
              <button
                type="button"
                className="button button-ghost big-button"
                onClick={() => setAmbienceEnabled((current) => !current)}
              >
                {ambienceEnabled ? 'Wycisz dźwięk oczekiwania' : 'Włącz spokojny motyw oczekiwania'}
              </button>
            </>
          )}
        </div>

        {error ? <div className="error-box top-gap">{error}</div> : null}
      </div>

      <div className="panel section-panel room-sidebar">
        <div className="timer-box tree-backed-card">{roomUnlocked ? formatTime(secondsLeft) : formatCountdown(unlockInSeconds)}</div>
        <div className="status-box tree-backed-card">{roomStatusLabel}</div>

        <div className="stack-gap top-gap">
          <div className="list-card tree-backed-card">
            <strong>{roomUnlocked ? 'Termin rozmowy' : 'Aktywacja pokoju'}</strong>
            <span>
              {roomUnlocked
                ? roomEntryLabel
                : `Pokój odblokuje się automatycznie 15 minut przed terminem ${roomEntryLabel}.`}
            </span>
          </div>
          <div className="list-card tree-backed-card">
            <strong>Opiekun</strong>
            <span>{ownerName}</span>
          </div>
          <div className="list-card tree-backed-card">
            <strong>{roomUnlocked ? roomCopy.activeLinkLabel : roomCopy.lockedPrepLabel}</strong>
            <span>
              {roomUnlocked ? meetingUrl : roomCopy.lockedPrepCopy}
            </span>
          </div>
          <div className="list-card accent-outline tree-backed-card">
            <strong>{roomUnlocked ? roomCopy.activeAfterLabel : roomCopy.lockedAfterLabel}</strong>
            <span>
              {roomUnlocked ? roomCopy.activeAfterCopy : `${roomCopy.lockedAfterCopy} Licznik obejmuje ${roomDurationMinutes} minut.`}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
