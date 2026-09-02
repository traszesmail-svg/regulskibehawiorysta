import { getWarsawNowBoundary } from '@/lib/data'

export const ZAPYTAJ_SERVICE_TYPE = 'szybka-konsultacja-15-min' as const
export const ZAPYTAJ_LIVE_SLOT_PREFIX = 'zapytaj-live-'
export const ZAPYTAJ_LIVE_PRICE_PLN = 104
export const ZAPYTAJ_LIVE_MINIMUM_MINUTES = 60
export const ZAPYTAJ_LIVE_BUFFER_MINUTES = 10
export const ZAPYTAJ_LIVE_INITIAL_LEAD_MINUTES = 1
export const ZAPYTAJ_LIVE_QUEUE_LEAD_MINUTES = 20
export const ZAPYTAJ_LIVE_HOLD_MINUTES = 5
export const ZAPYTAJ_MANUAL_CONFIRMATION_HOURS = 24

export type ZapytajLiveState = {
  enabledUntil: string | null
  nextSlotId: string | null
  currentSlotId: string | null
  currentBookingId: string | null
  bufferUntil: string | null
  updatedAt: string
}

export type ZapytajLiveStatus = 'unavailable' | 'offline' | 'available_now' | 'payment_pending' | 'in_call' | 'buffer'

export type ZapytajLiveStatusDto = {
  status: ZapytajLiveStatus
  label: string
  message: string
  livePricePln: number
  liveSlotId: string | null
  enabledUntil: string | null
  storageAvailable: boolean
}

export function createEmptyZapytajLiveState(now = new Date().toISOString()): ZapytajLiveState {
  return {
    enabledUntil: null,
    nextSlotId: null,
    currentSlotId: null,
    currentBookingId: null,
    bufferUntil: null,
    updatedAt: now,
  }
}

export function normalizeZapytajLiveState(value: unknown): ZapytajLiveState {
  const source = value && typeof value === 'object' ? (value as Partial<ZapytajLiveState>) : {}
  const now = new Date().toISOString()

  return {
    enabledUntil: typeof source.enabledUntil === 'string' ? source.enabledUntil : null,
    nextSlotId: typeof source.nextSlotId === 'string' ? source.nextSlotId : null,
    currentSlotId: typeof source.currentSlotId === 'string' ? source.currentSlotId : null,
    currentBookingId: typeof source.currentBookingId === 'string' ? source.currentBookingId : null,
    bufferUntil: typeof source.bufferUntil === 'string' ? source.bufferUntil : null,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : now,
  }
}

export function isZapytajLiveSlot(slotId: string | null | undefined): boolean {
  return typeof slotId === 'string' && slotId.startsWith(ZAPYTAJ_LIVE_SLOT_PREFIX)
}

export function isFutureIso(value: string | null | undefined, now = Date.now()): boolean {
  return Boolean(value && Number.isFinite(Date.parse(value)) && Date.parse(value) > now)
}

export function isZapytajLiveEnabled(state: ZapytajLiveState, now = Date.now()): boolean {
  return isFutureIso(state.enabledUntil, now)
}

export function getWarsawBoundaryAfterMinutes(minutes: number, now = new Date()) {
  const boundary = getWarsawNowBoundary(now)
  const [year, month, day] = boundary.date.split('-').map(Number)
  const [hour, minute] = boundary.time.split(':').map(Number)
  const pseudoUtc = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes, 0))

  return {
    date: `${pseudoUtc.getUTCFullYear()}-${String(pseudoUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(pseudoUtc.getUTCDate()).padStart(2, '0')}`,
    time: `${String(pseudoUtc.getUTCHours()).padStart(2, '0')}:${String(pseudoUtc.getUTCMinutes()).padStart(2, '0')}`,
  }
}

export function getZapytajLiveStatusCopy(status: ZapytajLiveStatus): Pick<ZapytajLiveStatusDto, 'label' | 'message'> {
  switch (status) {
    case 'available_now':
      return {
        label: 'Dostępny teraz',
        message: 'Możesz zarezerwować rozmowę live. Po potwierdzeniu wpłaty połączenie uruchomi się automatycznie.',
      }
    case 'in_call':
      return {
        label: 'Trwa rozmowa',
        message: 'Behawiorysta właśnie rozmawia. Możesz zarezerwować jedno następne okno, jeśli jest widoczne.',
      }
    case 'payment_pending':
      return {
        label: 'Trwa potwierdzanie',
        message: 'Ktoś właśnie kończy płatność za najbliższe okno live. Spróbuj ponownie za chwilę.',
      }
    case 'buffer':
      return {
        label: 'Dostępność właśnie się kończy',
        message: 'Nie przyjmuję nowych rozmów live. Zwykły termin możesz wybrać poniżej.',
      }
    case 'unavailable':
      return {
        label: 'Dostępność chwilowo niedostępna',
        message: 'Nie udało się bezpiecznie odczytać statusu live. Wybierz zwykły termin albo spróbuj później.',
      }
    default:
      return {
        label: 'Zapytaj w wybranym terminie',
        message: 'Dostępność live jest wyłączona. Wybierz zwykły termin rozmowy.',
      }
  }
}

export function createZapytajLiveStatusDto(
  status: ZapytajLiveStatus,
  options: Pick<ZapytajLiveStatusDto, 'liveSlotId' | 'enabledUntil' | 'storageAvailable'>,
): ZapytajLiveStatusDto {
  return {
    status,
    ...getZapytajLiveStatusCopy(status),
    livePricePln: ZAPYTAJ_LIVE_PRICE_PLN,
    ...options,
  }
}
