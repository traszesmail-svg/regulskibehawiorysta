import { PaymentReferenceLoading } from '@/components/PaymentReferenceLoading'

export default function Loading() {
  return (
    <PaymentReferenceLoading
      eyebrow="Wybór płatności"
      title="Ładuję płatność"
      message="Pobieram dane rezerwacji i przygotowuję dostępne metody płatności."
      summaryTitle="Podsumowanie rezerwacji"
    />
  )
}
