import { AdminCaseMapReviewButton } from '@/components/AdminCaseMapReviewButton'
import type { ConsultantCaseMap } from '@/lib/server/case-map-store'

const ANSWER_LABELS: Record<string, string> = {
  case_focus: 'Czego dotyczy sytuacja',
  case_description: 'Opis opiekuna',
  case_path: 'Wybrany zakres',
  intake_pet_name: 'Imię zwierzęcia',
  intake_pet_age: 'Wiek zwierzęcia',
  intake_pet_history: 'Historia zwierzęcia',
  intake_household: 'Dom i domownicy',
  intake_health_history: 'Historia zdrowia',
  intake_medication: 'Leki i zalecenia',
  intake_problem_start: 'Początek problemu',
  intake_triggers: 'Wyzwalacze',
  intake_daily_routine: 'Rytm dnia',
  intake_environment: 'Środowisko',
  intake_relationships: 'Relacje',
  intake_event_before: 'Przed zdarzeniem',
  intake_event_behavior: 'W trakcie zdarzenia',
  intake_event_after: 'Po zdarzeniu',
  intake_previous_steps: 'Dotychczasowe działania',
  intake_goal: 'Cel opiekuna',
  intake_notes: 'Dodatkowe notatki',
}
const TRIAGE_LABELS: Record<ConsultantCaseMap['triageState'], string> = {
  SAFETY_NOW: 'Pilne bezpieczeństwo',
  HUMAN_MEDICAL: 'Pomoc medyczna',
  VET_URGENT: 'Pilny weterynarz',
  VET_FIRST: 'Weterynarz najpierw',
  SAFETY_PRIORITY: 'Priorytet bezpieczeństwa',
  PROCEED: 'Można przygotować rozmowę',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

function formatAnswer(value: string | number | boolean | null) {
  if (value === null || value === '') return '—'
  if (value === true) return 'tak'
  if (value === false) return 'nie'
  return String(value).replaceAll('_', ' ')
}

function formatAnswerLabel(key: string) {
  return ANSWER_LABELS[key] ?? key.replaceAll('_', ' ')
}

export function AdminCaseMaps({ caseMaps }: { caseMaps: ConsultantCaseMap[] }) {
  if (caseMaps.length === 0) {
    return <div className="empty-box">Nie ma jeszcze Map przekazanych do przygotowania konsultacji.</div>
  }

  return (
    <div className="admin-booking-list-shell">
      {caseMaps.map((caseMap) => (
        <article className="admin-booking-row-compact" key={caseMap.id}>
          <div className="admin-booking-main">
            <div className="admin-booking-chip-row">
              <span className="admin-booking-chip">{caseMap.species === 'kot' ? 'Kot' : 'Pies'}</span>
              <span className="admin-booking-chip">{caseMap.path === 'long' ? 'Pełny wywiad' : 'Krótka mapa'}</span>
              <span className="admin-booking-chip">{TRIAGE_LABELS[caseMap.triageState]}</span>
              {caseMap.reviewedAt ? <span className="admin-booking-chip">Przejrzana</span> : <span className="admin-booking-chip admin-booking-chip-warn">Do przejrzenia</span>}
            </div>
            <h3>{caseMap.booking?.ownerName ?? 'Przekazana Mapa zachowania'}</h3>
            <p>{caseMap.booking ? `${caseMap.booking.email} · ${caseMap.booking.bookingDate} ${caseMap.booking.bookingTime}` : 'Rezerwacja nie jest już dostępna w bazie.'}</p>
            <p>Przekazana: {formatDate(caseMap.sharedWithConsultantAt)}</p>
          </div>
          <AdminCaseMapReviewButton caseMapId={caseMap.id} reviewed={Boolean(caseMap.reviewedAt)} />
          <details className="admin-row-details">
            <summary>Otwórz pełny formularz Mapy</summary>
            <div className="admin-row-details-body">
              <div><strong>Temat</strong><span>{caseMap.topic.replaceAll('_', ' ')}</span></div>
              <div><strong>Status mapy</strong><span>{caseMap.status}</span></div>
              <div><strong>Rezerwacja</strong><span>{caseMap.booking?.id ?? 'brak'}</span></div>
              {typeof caseMap.result.practitionerBrief === 'string' ? <div><strong>Brief do przygotowania rozmowy</strong><span>{caseMap.result.practitionerBrief}</span></div> : null}
              {Object.entries(caseMap.answers).map(([key, value]) => <div key={key}><strong>{formatAnswerLabel(key)}</strong><span>{formatAnswer(value)}</span></div>)}
            </div>
          </details>
        </article>
      ))}
    </div>
  )
}
