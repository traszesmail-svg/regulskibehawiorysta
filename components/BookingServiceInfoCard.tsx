import { type BookingServiceType, getBookingServiceDurationLabel, getBookingServicePriceLabel } from '@/lib/booking-services'
import { COPY_SERVICE_NAMES } from '@/lib/copy-governance'
import { FUNNEL_SERVICE_CONFIG } from '@/lib/funnel'
import { PUBLIC_OFFER_CANCELLATION_COPY } from '@/lib/public-offer-copy'

type BookingServiceInfoCardProps = {
  serviceType: BookingServiceType
  quickConsultationPrice?: number
  title?: string
  stageLabel?: string
  emphasis?: string
}

export function BookingServiceInfoCard({
  serviceType,
  quickConsultationPrice,
  title = 'Informacje o usłudze',
  stageLabel = 'Ta usługa',
  emphasis,
}: BookingServiceInfoCardProps) {
  const service = FUNNEL_SERVICE_CONFIG[serviceType]
  const priceLabel = getBookingServicePriceLabel(serviceType, quickConsultationPrice ?? service.priceAmount)
  const cancellationPolicy = PUBLIC_OFFER_CANCELLATION_COPY
  const isPhoneService = service.mode === 'phone'
  const serviceLabel = service.title
  const formatLabel = isPhoneService ? 'połączenie telefoniczne' : 'Jitsi (audio lub wideo)'

  return (
    <aside className="booking-stage-sidecard booking-service-info-card tree-backed-card" aria-label={title}>
      <span className="booking-stage-sidecard-label">{stageLabel}</span>
      <strong>{title}</strong>
      <div className="booking-service-info-grid">
        <div className="booking-service-info-item">
          <span className="booking-service-info-key">Czas</span>
          <strong>{getBookingServiceDurationLabel(serviceType)}</strong>
        </div>
        <div className="booking-service-info-item">
          <span className="booking-service-info-key">Cena</span>
          <strong>{priceLabel}</strong>
        </div>
        <div className="booking-service-info-item">
          <span className="booking-service-info-key">Usługa</span>
          <strong>{serviceLabel}</strong>
        </div>
        <div className="booking-service-info-item">
          <span className="booking-service-info-key">Forma</span>
          <strong>{formatLabel}</strong>
        </div>
        <div className="booking-service-info-item">
          <span className="booking-service-info-key">Zmiana / odwołanie</span>
          <strong>{cancellationPolicy}</strong>
        </div>
      </div>
      <div className="booking-stage-sidecard-pills" aria-label="Najważniejsze informacje">
        <span className="hero-proof-pill">{service.slotBadge}</span>
        <span className="hero-proof-pill">{isPhoneService ? 'rozmowa telefoniczna' : 'pokój Jitsi'}</span>
      </div>
      <p className="booking-service-info-note">{emphasis ?? service.publicSummary}</p>
    </aside>
  )
}
