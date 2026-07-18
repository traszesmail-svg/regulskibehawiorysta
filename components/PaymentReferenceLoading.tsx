import { LoaderCircle } from 'lucide-react'
import { PaymentReferenceCardTitle, PaymentReferenceLayout } from '@/components/PaymentReferenceLayout'

type PaymentReferenceLoadingProps = {
  eyebrow: string
  title: string
  message: string
  summaryTitle: string
}

export function PaymentReferenceLoading({
  eyebrow,
  title,
  message,
  summaryTitle,
}: PaymentReferenceLoadingProps) {
  return (
    <PaymentReferenceLayout
      eyebrow={eyebrow}
      title={title}
      lead={message}
      variant="compact"
      summaryTitle={summaryTitle}
      summaryRows={[
        { icon: 'calendar', label: 'Termin', value: 'Ładowanie danych' },
        { icon: 'form', label: 'Forma', value: 'Sprawdzam rezerwację' },
        { icon: 'problem', label: 'Status', value: 'Chwileczkę' },
      ]}
      lineItemLabel="Rezerwacja"
      lineItemAmount="—"
      totalLabel="Razem"
      summarySafety={{
        title: 'Bezpieczne sprawdzanie',
        description: 'Pobieramy aktualny status rezerwacji.',
      }}
    >
      <div className="payment-ref-loading" role="status" aria-live="polite">
        <LoaderCircle className="payment-ref-loading-icon" aria-hidden="true" />
        <PaymentReferenceCardTitle title={title}>{message}</PaymentReferenceCardTitle>
      </div>
    </PaymentReferenceLayout>
  )
}
