export const DEFAULT_PRICE_PLN = 74
export const MIN_CONSULTATION_PRICE_PLN = 74
export const PRE_TOPIC_PRICE_CONFIRMATION_COPY = 'Dokładną kwotę poznasz po wyborze tematu konsultacji.'

export type ActiveConsultationPrice = {
  amount: number
  formattedAmount: string
  exactFormattedAmount: string
  updatedAt: string | null
  summary: string
}

function normalizeAmount(value: number): number {
  return Math.round(value * 100) / 100
}

function isLegacyConsultationPrice(amount: number): boolean {
  const normalizedAmount = normalizeAmount(amount)

  return normalizedAmount < MIN_CONSULTATION_PRICE_PLN
}

export function formatPricePln(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPricePlnExact(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function createActiveConsultationPrice(amount: number, updatedAt: string | null = null): ActiveConsultationPrice {
  const normalizedAmount = isLegacyConsultationPrice(amount) ? DEFAULT_PRICE_PLN : normalizeAmount(amount)

  return {
    amount: normalizedAmount,
    formattedAmount: formatPricePln(normalizedAmount),
    exactFormattedAmount: formatPricePlnExact(normalizedAmount),
    updatedAt,
    summary: `Aktywna cena konsultacji: ${formatPricePln(normalizedAmount)}.`,
  }
}

export function buildPublicPricingDisclosureMessage(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || isLegacyConsultationPrice(amount)) {
    return `Od ${formatPricePln(DEFAULT_PRICE_PLN)}. ${PRE_TOPIC_PRICE_CONFIRMATION_COPY}`
  }

  return `Od ${formatPricePln(amount)}. ${PRE_TOPIC_PRICE_CONFIRMATION_COPY}`
}

/**
 * This is a validity notice, not a promotion claim.  The amount is the actual
 * price in force and can be changed in the admin panel; if it is not changed,
 * the same amount simply remains in force in the following week.
 */
export const WEEKLY_PRICE_VALIDITY_COPY = 'Aktualna cena obowiązuje do niedzieli, 23:59.'

export function parseConsultationPriceInput(rawValue: string | number): number {
  const raw = typeof rawValue === 'number' ? String(rawValue) : rawValue.trim()
  const normalized = raw.replace(',', '.')

  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Podaj poprawną kwotę konsultacji w PLN, np. 69 albo 69.50.')
  }

  const amount = Number(normalized)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Cena konsultacji musi być dodatnia.')
  }

  if (amount < MIN_CONSULTATION_PRICE_PLN) {
    throw new Error(`Cena konsultacji nie może być niższa niż ${formatPricePlnExact(MIN_CONSULTATION_PRICE_PLN)}.`)
  }

  return normalizeAmount(amount)
}

export function toStripeUnitAmount(amount: number): number {
  return Math.round(normalizeAmount(amount) * 100)
}
