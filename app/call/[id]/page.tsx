import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { headers } from 'next/headers'
import { CallRoom } from '@/components/CallRoom'
import { PreparationMaterialsCard } from '@/components/PreparationMaterialsCard'
import {
  getBookingServiceRoomAccessLabel,
  getBookingServiceTitle,
  resolveBookingServiceType,
} from '@/lib/booking-services'
import { getProblemLabel } from '@/lib/data'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { canEditPreparationMaterials } from '@/lib/preparation'
import { getBookingByRecoveryAccess, getBookingForViewer } from '@/lib/server/db'
import { getDataModeStatus } from '@/lib/server/env'
import { buildTechnicalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>
  }
): Promise<Metadata> {
  const params = await props.params;
  return buildTechnicalMetadata({
    title: 'Pokój rozmowy',
    path: `/call/${params.id}`,
    description: 'Bezpieczny pokój rozmowy po potwierdzeniu rezerwacji.',
  })
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function CallRoomHeader() {
  return (
    <header className="call-room-header">
      <div className="call-room-brand" aria-label="Regulski Behawiorysta">
        <Image
          src="/branding/regulski-web/logos/logo-regulski.png"
          alt="Regulski Behawiorysta"
          width={72}
          height={72}
          priority
          className="call-room-logo"
        />
        <div>
          <strong>Regulski Behawiorysta</strong>
          <span>Krzysztof Regulski, behawiorysta zwierzęcy</span>
        </div>
      </div>
      <nav className="call-room-nav" aria-label="Linki pomocnicze">
        <a href="/opinie" target="_blank" rel="noopener noreferrer">
          Opinie
        </a>
        <a href="/faq" target="_blank" rel="noopener noreferrer">
          FAQ
        </a>
      </nav>
    </header>
  )
}

export default async function CallPage(
  props: {
    params: Promise<{ id: string }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  noStore()
  const accessToken = readSearchParam(searchParams?.access)
  const dataMode = getDataModeStatus()
  const authorizationHeader = (await headers()).get('authorization')
  let booking: Awaited<ReturnType<typeof getBookingForViewer>> = null
  let flowError: string | null = null

  if (!dataMode.isValid) {
    flowError = 'Pokój rozmowy chwilowo nie jest dostępny. Spróbuj ponownie za kilka minut.'
  } else {
    try {
      booking = await getBookingForViewer(params.id, accessToken, authorizationHeader)
    } catch (error) {
      console.warn('[regulski-behawiorysta][call] failed to load booking', {
        bookingId: params.id,
        hasAccessToken: Boolean(accessToken),
        error,
      })
      flowError = 'Nie udało się wczytać pokoju rozmowy. Spróbuj ponownie za moment.'
    }
  }

  if (flowError) {
    return (
      <main className="page-wrap">
        <div className="container">
          <CallRoomHeader />
          <section className="panel centered-panel">
            <h1>Pokój rozmowy chwilowo niedostępny</h1>
            <div className="stack-gap">
              <div className="error-box">
                {flowError} Jeśli chcesz, przejdź do krótkiej wiadomości i wróć do rezerwacji później.
              </div>
              <div className="hero-actions centered-actions">
                <Link href="/zapytaj" className="button button-primary big-button">
                  {FUNNEL_CTA_LABELS.primary}
                </Link>
                <Link href="/kontakt#formularz" className="button button-ghost big-button">
                  {FUNNEL_CTA_LABELS.contact}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="page-wrap">
        <div className="container">
          <CallRoomHeader />
          <section className="panel centered-panel">
            <h1>Link do pokoju rozmowy wygasł</h1>
            <div className="stack-gap">
              <div className="error-box">Ten link do rozmowy jest nieprawidłowy albo wygasł.</div>
              <div className="hero-actions centered-actions">
                <Link href="/zapytaj" className="button button-primary big-button">
                  {FUNNEL_CTA_LABELS.primary}
                </Link>
                <Link href="/kontakt#formularz" className="button button-ghost big-button">
                  {FUNNEL_CTA_LABELS.contact}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const hasAccess = booking.paymentStatus === 'paid' && (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'done')
  const serviceType = resolveBookingServiceType(booking.serviceType, booking.amount)
  const roomAccessLabel = booking.consultationMode === 'jitsi'
    ? 'pokój rozmowy Jitsi'
    : booking.consultationMode === 'phone'
      ? 'rozmowa telefoniczna'
      : getBookingServiceRoomAccessLabel(serviceType)
  const qaBooking = Boolean(booking.qaBooking)
  const recoveryAccess = accessToken ? await getBookingByRecoveryAccess(booking.id, accessToken) : null
  const recoveryHref = recoveryAccess
    ? `/zapytaj/dodatkowy?bookingId=${encodeURIComponent(booking.id)}&token=${encodeURIComponent(accessToken ?? '')}`
    : null

  return (
    <main className="page-wrap" data-analytics-disabled={qaBooking ? 'true' : undefined} data-qa-booking={qaBooking ? 'true' : 'false'}>
      <div className="container">
        <CallRoomHeader />

        {hasAccess ? (
          <>
            <div className="panel section-panel call-summary-panel">
              <div className="section-eyebrow">Potwierdzona rezerwacja</div>
              <h2>{getProblemLabel(booking.problemType)}</h2>
              <p className="muted paragraph-gap">
                {`${getBookingServiceTitle(serviceType)}. Tutaj wejdziesz do ${roomAccessLabel}. Poniżej możesz dodać krótkie materiały do przygotowania rozmowy.`}
              </p>
              <div className="list-card top-gap call-description-card">
                <strong>Opis zgłoszenia</strong>
                <span>{booking.description}</span>
              </div>
            </div>
            <CallRoom
              bookingId={booking.id}
              accessToken={accessToken ?? null}
              meetingUrl={booking.meetingUrl}
              ownerName={booking.ownerName}
              bookingDate={booking.bookingDate}
              bookingTime={booking.bookingTime}
              bookingStatus={booking.bookingStatus}
              animalType={booking.animalType}
              problemType={booking.problemType}
              serviceType={serviceType}
              consultationMode={booking.consultationMode ?? null}
              liveMode={Boolean(booking.liveMode)}
              qaBooking={qaBooking}
              callId={booking.callId ?? null}
              callStatus={booking.callStatus ?? null}
              startedAt={booking.startedAt ?? null}
              questionsRemaining={booking.questionsRemaining ?? null}
              phone={booking.phone}
              petAge={booking.petAge}
              durationNotes={booking.durationNotes}
              description={booking.description}
              recoveryHref={recoveryHref}
            />
            <PreparationMaterialsCard
              bookingId={booking.id}
              accessToken={accessToken ?? ''}
              canEdit={canEditPreparationMaterials(booking)}
              hasVideo={Boolean(booking.prepVideoPath)}
              prepVideoFilename={booking.prepVideoFilename ?? null}
              prepVideoSizeBytes={booking.prepVideoSizeBytes ?? null}
              prepLinkUrl={booking.prepLinkUrl ?? null}
              prepNotes={booking.prepNotes ?? null}
              prepUploadedAt={booking.prepUploadedAt ?? null}
            />
          </>
        ) : (
          <section className="panel centered-panel">
            <div className="stack-gap">
              <div className="error-box">{`Dostęp do ${roomAccessLabel} odblokowuje się dopiero po potwierdzeniu wpłaty. Najpierw sprawdź status na potwierdzeniu albo wróć do płatności, jeśli ten etap nie został jeszcze domknięty.`}</div>
              <div className="hero-actions centered-actions">
                <Link
                  href={`/confirmation?bookingId=${booking.id}${accessToken ? `&access=${encodeURIComponent(accessToken)}` : ''}`}
                  className="button button-primary big-button"
                >
                  Zobacz potwierdzenie
                </Link>
                <Link
                  href={`/payment?bookingId=${booking.id}${accessToken ? `&access=${encodeURIComponent(accessToken)}` : ''}`}
                  className="button button-ghost big-button"
                >
                  Wróć do płatności
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
