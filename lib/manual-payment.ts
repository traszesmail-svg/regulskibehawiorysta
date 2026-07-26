type ManualPaymentCopyInput = {
  phoneDisplay?: string | null
  accountName?: string | null
}

export type ManualPaymentDisplayCopy = {
  selectionTitle: string
  summaryTitle: string
  description: string
}

export type ManualPaymentDetailCard = {
  key: 'phone' | 'account'
  label: string
  value: string
  href?: string | null
}

export function getManualPaymentDisplayCopy({
  phoneDisplay,
}: ManualPaymentCopyInput): ManualPaymentDisplayCopy {
  const hasPhone = Boolean(phoneDisplay)

  if (hasPhone) {
    return {
      selectionTitle: 'BLIK po instrukcji e-mail',
      summaryTitle: 'BLIK po instrukcji e-mail',
      description: 'Opłać rezerwację zgodnie z danymi poniżej. Wpłatę potwierdzimy w godzinach obsługi.',
    }
  }

  return {
    selectionTitle: 'Płatność według instrukcji',
    summaryTitle: 'Płatność według instrukcji',
    description: 'Dalsze szczegóły płatności zależą od aktywnej konfiguracji rezerwacji.',
  }
}

export function getManualPaymentDetailCards({
  phoneDisplay,
  accountName,
}: ManualPaymentCopyInput): ManualPaymentDetailCard[] {
  const cards: ManualPaymentDetailCard[] = []

  if (phoneDisplay) {
    cards.push({
      key: 'phone',
      label: 'BLIK po instrukcji e-mail',
      value: phoneDisplay,
    })
  }

  cards.push({
    key: 'account',
    label: 'Odbiorca',
    value: accountName ?? 'Regulski Behawiorysta',
  })

  return cards
}
