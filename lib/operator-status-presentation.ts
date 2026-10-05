import type { OperatorStatusData } from '@/components/AdminOperatorMobileCard'

export const OPERATOR_HEARTBEAT_TIMEOUT_MS = 180000
export const OPERATOR_STATUS_STALE_MS = 30000

export function getOperatorStatusPresentation(data: OperatorStatusData | null, now = Date.now(), hasError = false) {
  const updatedAt = data?.updatedAt ? Date.parse(data.updatedAt) : NaN
  const dataCurrent = !hasError && Number.isFinite(updatedAt) && updatedAt <= now + 5000 && now - updatedAt < OPERATOR_STATUS_STALE_MS
  const heartbeatAt = data?.device?.lastHeartbeatAt ? Date.parse(data.device.lastHeartbeatAt) : NaN
  const heartbeatAgeMs = Number.isFinite(heartbeatAt) && heartbeatAt <= now ? now - heartbeatAt : null
  const deviceOnline = dataCurrent && heartbeatAgeMs !== null && heartbeatAgeMs < OPERATOR_HEARTBEAT_TIMEOUT_MS
  const enabledUntil = data?.live?.enabledUntil ? Date.parse(data.live.enabledUntil) : NaN
  const modeEnabled = dataCurrent && Number.isFinite(enabledUntil) && enabledUntil > now
  const serverState = data?.live?.status ?? 'unavailable'
  const liveState = !dataCurrent ? 'unavailable' : !modeEnabled && serverState === 'available_now' ? 'offline' : serverState
  const availableNow = modeEnabled && liveState === 'available_now'
  const liveLabel = !dataCurrent ? 'STATUS LIVE: NIEPOTWIERDZONY'
    : availableNow ? 'DOSTĘPNY TERAZ'
    : liveState === 'in_call' ? 'OBSŁUGA ROZMOWY'
    : liveState === 'payment_pending' ? 'POTWIERDZANIE WPŁATY'
    : liveState === 'buffer' ? 'PRZERWA PO ROZMOWIE'
    : modeEnabled ? 'TRYB LIVE: WŁĄCZONY' : 'TRYB LIVE: WYŁĄCZONY'
  const liveExplanation = !dataCurrent ? 'Nie można potwierdzić bieżącego stanu. Odśwież status.'
    : liveState === 'in_call' ? 'Trwa obsługa opłaconej rozmowy. Ten status nie potwierdza odebrania telefonu.'
    : liveState === 'payment_pending' ? 'Najbliższe okno czeka na potwierdzenie płatności.'
    : liveState === 'buffer' ? 'Przerwa po rozmowie. Nowa dostępność Live wymaga włączenia.'
    : availableNow ? 'Tryb Live jest włączony. Najbliższe okno jest dostępne do rezerwacji.'
    : modeEnabled ? 'Tryb Live jest włączony, lecz nie przyjmuje teraz nowej rozmowy.'
    : 'Live jest wyłączony. Włącz go, gdy możesz obsłużyć rozmowę za 104 zł.'

  return {
    dataCurrent,
    deviceOnline,
    heartbeatAgeSeconds: heartbeatAgeMs === null ? null : Math.floor(heartbeatAgeMs / 1000),
    modeEnabled,
    liveState,
    availableNow,
    liveLabel,
    liveExplanation,
    deviceLabel: !dataCurrent || heartbeatAgeMs === null ? 'BRAK AKTUALNYCH DANYCH' : deviceOnline ? 'ONLINE' : 'OFFLINE',
    lastUpdateLabel: Number.isFinite(updatedAt) ? new Date(updatedAt).toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw' }) : 'brak danych',
    remainingMs: modeEnabled ? enabledUntil - now : 0,
  }
}
