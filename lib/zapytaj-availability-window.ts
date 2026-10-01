export type ZapytajAvailabilityWindow = {
  from: string
  to: string
  month: string
}

function dateToUtcDay(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null
  return Math.floor(timestamp / 86_400_000)
}

function monthStart(month: string): string | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  return `${month}-01`
}

export function addAvailabilityMonths(month: string, delta: number): string {
  const start = monthStart(month)
  if (!start || !Number.isInteger(delta)) throw new Error('Invalid availability month')
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function resolveZapytajAvailabilityWindow(
  requestedFrom: string | null,
  today: string,
): ZapytajAvailabilityWindow | null {
  const todayDay = dateToUtcDay(today)
  if (todayDay === null) return null
  const currentMonth = today.slice(0, 7)
  let month = currentMonth

  if (requestedFrom !== null) {
    const requestedDay = dateToUtcDay(requestedFrom)
    if (requestedDay === null || requestedFrom.slice(8) !== '01') return null
    const requestedMonth = requestedFrom.slice(0, 7)
    if (!monthStart(requestedMonth) || requestedMonth < currentMonth) return null
    const maxMonth = addAvailabilityMonths(currentMonth, 12)
    if (requestedMonth > maxMonth) return null
    month = requestedMonth
  }

  const from = monthStart(month)
  if (!from) return null
  const [year, monthNumber] = month.split('-').map(Number)
  const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return { from, to, month }
}

export function sliceZapytajAvailabilityWindow<T>(
  groups: Array<{ date: string; slots: T[] }>,
  window: ZapytajAvailabilityWindow,
  today: string,
) {
  const dates = groups.map((group) => group.date).sort()

  return {
    slots: groups
      .filter((group) => group.date >= window.from && group.date <= window.to)
      .flatMap((group) => group.slots),
    hasAnySlots: dates.length > 0,
    hasEarlier: window.month > today.slice(0, 7),
    hasLater: dates.some((date) => date > window.to),
  }
}

export function buildZapytajMonthDates(month: string) {
  const start = monthStart(month)
  if (!start) return []
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay()
  const mondayOffset = (firstDay + 6) % 7
  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`),
  ]
}
