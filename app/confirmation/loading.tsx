import { PaymentReferenceLoading } from '@/components/PaymentReferenceLoading'

export default function Loading() {
  return (
    <PaymentReferenceLoading
      eyebrow="Potwierdzenie rezerwacji"
      title="Ładuję potwierdzenie"
      message="Sprawdzam aktualny status płatności i przygotowuję podsumowanie rezerwacji."
      summaryTitle="Podsumowanie rezerwacji"
    />
  )
}
