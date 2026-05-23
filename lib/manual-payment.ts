type ManualPaymentCopyInput = {
  phoneDisplay?: string | null
  paypalMeDisplay?: string | null
  paypalMeHref?: string | null
  accountName?: string | null
}

export type ManualPaymentDisplayCopy = {
  selectionTitle: string
  summaryTitle: string
  description: string
}

export type ManualPaymentDetailCard = {
  key: 'phone' | 'paypal' | 'account'
  label: string
  value: string
  href?: string | null
}

export function getManualPaymentDisplayCopy({
  phoneDisplay,
  paypalMeDisplay,
}: ManualPaymentCopyInput): ManualPaymentDisplayCopy {
  const hasPhone = Boolean(phoneDisplay)
  const hasPaypalMe = Boolean(paypalMeDisplay)

  if (hasPhone && hasPaypalMe) {
    return {
      selectionTitle: 'Wpłata ręczna',
      summaryTitle: 'Wpłata ręczna z potwierdzeniem',
      description: 'Opłać rezerwację wybraną metodą i poczekaj na ręczne potwierdzenie wpłaty.',
    }
  }

  if (hasPhone) {
    return {
      selectionTitle: 'Wpłata ręczna',
      summaryTitle: 'Wpłata ręczna z potwierdzeniem',
      description: 'Opłać rezerwację zgodnie z danymi poniżej i poczekaj na ręczne potwierdzenie wpłaty.',
    }
  }

  if (hasPaypalMe) {
    return {
      selectionTitle: 'PayPal.me',
      summaryTitle: 'PayPal.me z ręcznym potwierdzeniem',
      description: 'Opłać rezerwację przez PayPal.me i poczekaj na ręczne potwierdzenie wpłaty.',
    }
  }

  return {
    selectionTitle: 'Wpłata ręczna',
    summaryTitle: 'Wpłata ręczna z potwierdzeniem',
    description: 'Dalsze szczegóły płatności zależą od aktywnej konfiguracji rezerwacji.',
  }
}

export function getManualPaymentDetailCards({
  phoneDisplay,
  paypalMeDisplay,
  paypalMeHref,
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

  if (paypalMeDisplay) {
    cards.push({
      key: 'paypal',
      label: 'PayPal.me',
      value: paypalMeDisplay,
      href: paypalMeHref ?? null,
    })
  }

  cards.push({
    key: 'account',
    label: 'Odbiorca',
    value: accountName ?? 'Regulski Behawiorysta',
  })

  return cards
}
