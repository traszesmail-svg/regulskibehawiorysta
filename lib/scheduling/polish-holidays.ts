function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function addDays(dateKey: string, offset: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + offset, 12, 0, 0))
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function getEasterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return formatDateKey(year, month, day)
}

export function getPolishPublicHolidayKeys(year: number): Set<string> {
  const easterSunday = getEasterSunday(year)

  return new Set([
    formatDateKey(year, 1, 1),
    formatDateKey(year, 1, 6),
    easterSunday,
    addDays(easterSunday, 1),
    formatDateKey(year, 5, 1),
    formatDateKey(year, 5, 3),
    addDays(easterSunday, 49),
    addDays(easterSunday, 60),
    formatDateKey(year, 8, 15),
    formatDateKey(year, 11, 1),
    formatDateKey(year, 11, 11),
    formatDateKey(year, 12, 24),
    formatDateKey(year, 12, 25),
    formatDateKey(year, 12, 26),
  ])
}

export function isPolishPublicHoliday(dateKey: string): boolean {
  const year = Number(dateKey.slice(0, 4))
  return getPolishPublicHolidayKeys(year).has(dateKey)
}
