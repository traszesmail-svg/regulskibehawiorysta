import { PUBLIC_CAT_PROBLEM_OPTIONS, PUBLIC_DOG_PROBLEM_OPTIONS } from './funnel'
import { buildScheduleAvailabilitySeed } from './scheduling/rules'
import { AvailabilitySeed, ProblemOption, ProblemType } from './types'

const LEGACY_CAT_PROBLEM_OPTIONS: ProblemOption[] = [
  {
    id: 'kot-dotyk',
    icon: 'cat',
    title: 'Dotyk, pielęgnacja i obrona',
    desc: 'Gryzienie przy dotyku, obrona przy zabiegach i trudna pielęgnacja.',
    marketingTitle: 'Dotyk, pielęgnacja i obrona',
    marketingDesc: 'Legacy kategoria utrzymana wyłącznie dla zgodności historycznych bookingów i starych linków.',
    examples: ['kot gryzie przy głaskaniu', 'kot nie daje obciąć pazurów', 'kot atakuje przy noszeniu'],
    visualLabel: 'Dotyk',
  },
  {
    id: 'kot-stres',
    icon: 'cat',
    title: 'Lęk, stres i wycofanie',
    desc: 'Chowanie się, napięcie po zmianach i trudność z powrotem do spokoju.',
    marketingTitle: 'Lęk, stres i wycofanie',
    marketingDesc: 'Legacy kategoria utrzymana wyłącznie dla zgodności historycznych bookingów i starych linków.',
    examples: ['kot chowa się cały dzień', 'kot boi się gości', 'kot po zmianie nie wraca do równowagi'],
    visualLabel: 'Stres',
  },
  {
    id: 'kot-nocna-wokalizacja',
    icon: 'cat',
    title: 'Nocna aktywność i rytm dnia',
    desc: 'Miauczenie w nocy, pobudki o śwrócićie i rozsypany rytm domu.',
    marketingTitle: 'Nocna aktywność i rytm dnia',
    marketingDesc: 'Legacy kategoria utrzymana wyłącznie dla zgodności historycznych bookingów i starych linków.',
    examples: ['kot miauczy po nocy', 'kot budzi dom o 4 rano', 'nocne gonitwy i wokalizacja'],
    visualLabel: 'Noc',
  },
]

const LEGACY_PROBLEM_LABELS: Record<string, string> = {
  kot: 'Kot',
  niszczenie: 'Pobudzenie / wyciszenie',
}

export const problemOptions: ProblemOption[] = [
  ...PUBLIC_DOG_PROBLEM_OPTIONS,
  ...PUBLIC_CAT_PROBLEM_OPTIONS,
  ...LEGACY_CAT_PROBLEM_OPTIONS,
]

export const CAT_PROBLEM_OPTIONS: ProblemOption[] = [...PUBLIC_CAT_PROBLEM_OPTIONS]
export const DOG_PROBLEM_OPTIONS: ProblemOption[] = [...PUBLIC_DOG_PROBLEM_OPTIONS]

export const steps = [
  {
    n: '01',
    title: 'Wybierasz temat',
    desc: 'Na spokojnie wskazujesz, czego dotyczy sytuacja.',
  },
  {
    n: '02',
    title: 'Widzisz, co dalej',
    desc: 'Od razu wiesz, czy kolejnym ruchem jest termin, wiadomość czy materiał pomocniczy.',
  },
  {
    n: '03',
    title: 'Masz jasne potwierdzenie',
    desc: 'Po płatności albo kontakcie zostaje czytelny punkt startu i mniej chaosu.',
  },
]

export const faq = [
  {
    q: 'Czy 15 minut wystarczy?',
    a: 'To szybka konsultacja porządkująca sytuację. Jej celem jest wstępna ocena problemu i pierwszy konkretny kierunek działania, a nie pełna terapia behawioralna.',
  },
  {
    q: 'Czy zakup jest bezpieczny?',
    a: 'Tak. Możesz wybrać prostą wpłatę BLIK po instrukcji e-mail albo płatność online, jeśli jest aktywna dla danego zamówienia. Link do rozmowy odblokowuje się dopiero po potwierdzeniu wpłaty.',
  },
  {
    q: 'Czy mogę anulować zakup?',
    a: 'Po potwierdzeniu wpłaty masz krótkie okno na zgłoszenie rezygnacji lub zmiany terminu. Przy obecnym modelu płatności ręcznej ewentualny zwrot wymaga kontaktu i indywidualnej decyzji.',
  },
  {
    q: 'Co dostaję po rozmowie?',
    a: 'Jasny pierwszy plan: co zrobić od razu, co obserwować dalej i czy wystarczy ten start, czy lepsza będzie dłuższa konsultacja albo diagnostyka weterynaryjna.',
  },
]

// Standard slot times: 08:00–12:00, max 2 per hour (every 30 min), Mon–Fri only
// Used by: Kwadrans zwykły, Dwa Kwadranse (start from day +4)
// Used by: Kwadrans na już confirmed window (days 0–2)
const STANDARD_SLOT_TIMES = [
  '08:00', '08:30',
  '09:00', '09:30',
  '10:00', '10:30',
  '11:00', '11:30',
] as const

// Pełna konsultacja: Mon–Fri at 09:00, Sat at 10:00
const FULL_CONSULT_WEEKDAY_TIME = '09:00'
const FULL_CONSULT_SAT_TIME = '10:00'

function formatWarsawDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatWarsawTime(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function getWarsawDateTimeParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const values: Record<string, string> = {}

  for (const part of formatter.formatToParts(now)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value
    }
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    second: Number(values.second ?? '0'),
  }
}

function getPseudoUtcTimestamp(date: string, time: string, second = 0): number {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  return Date.UTC(year, month - 1, day, hour, minute, second)
}

export function getWarsawNowBoundary(now = new Date()) {
  return {
    date: formatWarsawDate(now),
    time: formatWarsawTime(now),
  }
}

export function isFutureAvailabilitySlot(bookingDate: string, bookingTime: string, now = new Date()): boolean {
  const boundary = getWarsawNowBoundary(now)
  return `${bookingDate}T${bookingTime}` >= `${boundary.date}T${boundary.time}`
}

function getWarsawDayOfWeek(date: Date): number {
  // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  const d = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    weekday: 'short',
  }).format(date)
  // sv-SE weekday: mån=Mon, tis=Tue, ons=Wed, tor=Thu, fre=Fri, lör=Sat, sön=Sun
  const map: Record<string, number> = { mån: 0, tis: 1, ons: 2, tor: 3, fre: 4, lör: 5, sön: 6 }
  return map[d] ?? new Date(formatWarsawDate(date)).getDay()
}

// Kwadrans zwykły + Dwa Kwadranse: 08:00–12:00 co 30 min, skip first 3 days, 30 days ahead, Mon–Fri only
export function buildStandardAvailabilitySeed(now = new Date()): AvailabilitySeed[] {
  const result: AvailabilitySeed[] = []
  for (let offset = 4; offset <= 34; offset++) {
    const date = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    const bookingDate = formatWarsawDate(date)
    const dow = getWarsawDayOfWeek(date)
    if (dow >= 5) continue // skip Sat (5) and Sun (6)
    const times = STANDARD_SLOT_TIMES.filter((t) => isFutureAvailabilitySlot(bookingDate, t, now))
    if (times.length > 0) result.push({ date: bookingDate, times })
  }
  return result
}

// Kwadrans na już: days 0–2, standard slots (confirmed), remaining hours = question mark placeholder
// We represent "question mark" slots with a special prefix "?HH:MM" — UI reads this
export function buildUrgentAvailabilitySeed(now = new Date()): AvailabilitySeed[] {
  const result: AvailabilitySeed[] = []
  for (let offset = 0; offset <= 2; offset++) {
    const date = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    const bookingDate = formatWarsawDate(date)
    const dow = getWarsawDayOfWeek(date)
    if (dow >= 5) continue // skip Sat (5) and Sun (6)
    const confirmedTimes = STANDARD_SLOT_TIMES.filter((t) => isFutureAvailabilitySlot(bookingDate, t, now))
    // Question mark slots: every 20 min from 12:20 to 16:40 (outside standard window)
    const questionTimes: string[] = []
    for (let h = 12; h <= 16; h++) {
      for (const m of [0, 20, 40]) {
        if (h === 12 && m === 0) continue // 12:00 skip (standard ends at 11:40)
        const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        if (isFutureAvailabilitySlot(bookingDate, t, now)) questionTimes.push(`?${t}`)
      }
    }
    const allTimes = [...confirmedTimes, ...questionTimes]
    if (allTimes.length > 0) result.push({ date: bookingDate, times: allTimes })
  }
  return result
}

// Pełna konsultacja: Mon–Fri at 09:00, Sat at 10:00, starting from day+1, 60 days ahead
export function buildFullConsultAvailabilitySeed(now = new Date()): AvailabilitySeed[] {
  const result: AvailabilitySeed[] = []
  for (let offset = 1; offset <= 60; offset++) {
    const date = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    const bookingDate = formatWarsawDate(date)
    const dow = getWarsawDayOfWeek(date)
    if (dow === 6) continue // skip Sunday
    const time = dow === 5 ? FULL_CONSULT_SAT_TIME : FULL_CONSULT_WEEKDAY_TIME
    if (isFutureAvailabilitySlot(bookingDate, time, now)) {
      result.push({ date: bookingDate, times: [time] })
    }
  }
  return result
}

// Legacy export used by local-store seed (generic pool, same as standard)
export function buildRollingAvailabilitySeed(now = new Date()): AvailabilitySeed[] {
  return buildScheduleAvailabilitySeed(now)
}

export function getSecondsUntilBookingStart(bookingDate: string, bookingTime: string, now = new Date()): number {
  const currentBoundary = getWarsawDateTimeParts(now)
  const bookingTimestamp = getPseudoUtcTimestamp(bookingDate, bookingTime)
  const currentTimestamp = getPseudoUtcTimestamp(currentBoundary.date, currentBoundary.time, currentBoundary.second)

  return Math.floor((bookingTimestamp - currentTimestamp) / 1000)
}

export function getSecondsUntilRoomUnlock(bookingDate: string, bookingTime: string, now = new Date()): number {
  return getSecondsUntilBookingStart(bookingDate, bookingTime, now) - 15 * 60
}

export function isCallRoomUnlocked(bookingDate: string, bookingTime: string, now = new Date()): boolean {
  return getSecondsUntilRoomUnlock(bookingDate, bookingTime, now) <= 0
}

export function getProblemLabel(problem: string): string {
  if (problem === 'inne') {
    return 'Inny temat'
  }

  return problemOptions.find((item) => item.id === problem)?.title ?? LEGACY_PROBLEM_LABELS[problem] ?? 'Konsultacja'
}

export function isCatProblemType(value: string | null | undefined): value is ProblemType {
  return [...PUBLIC_CAT_PROBLEM_OPTIONS, ...LEGACY_CAT_PROBLEM_OPTIONS].some((option) => option.id === value)
}

export function getProblemSpecies(problem: ProblemType): 'pies' | 'kot' {
  return isCatProblemType(problem) ? 'kot' : 'pies'
}

export function getBookingStatusLabel(
  status: 'pending' | 'pending_manual_payment' | 'confirmed' | 'done' | 'cancelled' | 'expired',
): string {
  switch (status) {
    case 'pending':
      return 'Oczekuje na płatność'
    case 'pending_manual_payment':
      return 'Czeka na potwierdzenie wpłaty'
    case 'confirmed':
      return 'Potwierdzona'
    case 'done':
      return 'Zakończona'
    case 'cancelled':
      return 'Anulowana'
    case 'expired':
      return 'Wygasła'
    default:
      return status
  }
}

export function getPaymentStatusLabel(
  status: 'unpaid' | 'pending_manual_review' | 'paid' | 'failed' | 'rejected' | 'refunded',
): string {
  switch (status) {
    case 'unpaid':
      return 'Nieopłacona'
    case 'pending_manual_review':
      return 'Zgłoszona, czeka na potwierdzenie'
    case 'paid':
      return 'Opłacona'
    case 'failed':
      return 'Płatność nieudana'
    case 'rejected':
      return 'Wpłata niepotwierdzona'
    case 'refunded':
      return 'Zwrócona'
    default:
      return status
  }
}

export function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`))
}

export function formatDateTimeLabel(date: string, time: string): string {
  return `${formatDateLabel(date)} - ${time}`
}

export function isProblemType(value: string | null | undefined): value is ProblemType {
  return value === 'inne' || problemOptions.some((option) => option.id === value)
}

export function compareDateAndTime(leftDate: string, leftTime: string, rightDate: string, rightTime: string): number {
  return `${leftDate}T${leftTime}`.localeCompare(`${rightDate}T${rightTime}`)
}
