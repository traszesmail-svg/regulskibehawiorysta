import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { CalendarDays, CircleHelp, GraduationCap, Headphones, Heart, Leaf, Mail, PawPrint, ShieldCheck, Video } from 'lucide-react'
import { BookingForm } from '@/components/BookingForm'
import { NotatnikFooter, NotatnikSideVisuals, NotatnikTopbar, PUBLIC_BOOKING_FLOW_NAV_ITEMS } from '@/components/NotatnikA'
import {
  DEFAULT_BOOKING_SERVICE,
  getBookableServiceAvailabilityWindow,
  getBookingServiceDurationLabel,
  getBookingServicePriceLabel,
  getBookingServiceRoomSummary,
  getBookingServiceTitle,
  normalizeBookingServiceType,
} from '@/lib/booking-services'
import {
  buildBookHref,
  buildSlotHref,
  readBookingSpeciesSearchParam,
  readBookingServiceSearchParam,
  readProblemTypeSearchParam,
  readQaBookingSearchParam,
  readSearchParam,
} from '@/lib/booking-routing'
import { formatDateTimeLabel, getProblemLabel, getProblemSpecies, isFutureAvailabilitySlot } from '@/lib/data'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'
import { DEFAULT_PRICE_PLN } from '@/lib/pricing'
import { isAvailabilitySlotBookableForService } from '@/lib/scheduling/rules'
import { getAvailabilitySlot, getActiveConsultationPrice, listAvailabilityAdmin } from '@/lib/server/db'
import { getDataModeStatus } from '@/lib/server/env'
import { buildTechnicalMetadata } from '@/lib/seo'
import { getPublicContactDetails } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const bookingFlowSteps = ['Termin', 'Godzina', 'Dane', 'Płatność'] as const

export function generateMetadata(): Metadata {
  return buildTechnicalMetadata({
    title: 'Dane do rezerwacji',
    path: '/form',
    description: 'Uzupełnij krótkie dane potrzebne do rezerwacji 15-minutowej konsultacji behawioralnej.',
    noIndex: true,
    follow: false,
  })
}

export default async function FormPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  noStore()
  const problem = readProblemTypeSearchParam(searchParams?.problem)
  const serviceType = normalizeBookingServiceType(readBookingServiceSearchParam(searchParams?.service))
  const serviceQuery = serviceType === DEFAULT_BOOKING_SERVICE ? null : serviceType
  const slotId = readSearchParam(searchParams?.slotId)
  const fallbackError = readSearchParam(searchParams?.error)
  const qaBooking = readQaBookingSearchParam(searchParams?.qa)
  const requestedSpecies = readBookingSpeciesSearchParam(searchParams?.species)

  if (!problem || !slotId) {
    redirect(buildBookHref(null, serviceQuery, qaBooking, requestedSpecies))
  }

  const species = requestedSpecies ?? getProblemSpecies(problem)
  const messageHref = `/kontakt?species=${species}#formularz`
  const quickAudioHref = buildBookHref(null, 'szybka-konsultacja-15-min', qaBooking, species)
  const slotsHref = buildSlotHref(problem, serviceQuery, qaBooking, species)
  const isCat = species === 'kot'
  const publicContact = getPublicContactDetails()
  const petImage = isCat ? '/wybor/cat-choice-avatar.png' : '/wybor/dog-choice-avatar.png'
  const heroImageAlt = isCat ? 'Spokojny kot' : 'Spokojny pies'
  const dataMode = getDataModeStatus()
  let slot: Awaited<ReturnType<typeof getAvailabilitySlot>> = null
  let flowError: string | null = null
  let slotWindowAvailable = false
  let amount = DEFAULT_PRICE_PLN
  let amountLabel = getBookingServicePriceLabel(serviceType, DEFAULT_PRICE_PLN)

  if (dataMode.isValid) {
    try {
      const [selectedSlot, availabilitySlots, quickConsultationPrice] = await Promise.all([
        getAvailabilitySlot(slotId),
        listAvailabilityAdmin(),
        getActiveConsultationPrice(),
      ])
      slot = selectedSlot
      slotWindowAvailable = Boolean(
        selectedSlot &&
          isAvailabilitySlotBookableForService(selectedSlot, serviceType) &&
          getBookableServiceAvailabilityWindow(availabilitySlots, slotId, serviceType),
      )
      amount = quickConsultationPrice.amount
      amountLabel = getBookingServicePriceLabel(serviceType, quickConsultationPrice.amount)
    } catch (error) {
      console.warn('[regulski-behawiorysta][form] failed to load form or slot', error)
      flowError = 'Formularz chwilowo się odświeża. Spróbuj ponownie za moment.'
    }
  } else {
    flowError = 'Formularz chwilowo się odświeża. Spróbuj ponownie za moment.'
  }

  const slotIsBookable = slot
    ? !slot.isBooked &&
      !slot.lockedByBookingId &&
      isFutureAvailabilitySlot(slot.bookingDate, slot.bookingTime) &&
      slotWindowAvailable
    : false
  const activeSlot = slotIsBookable ? slot : null

  return (
    <main className={`notatnik-page booking-form-page booking-form-page-${isCat ? 'cat' : 'dog'}`} data-analytics-disabled={qaBooking ? 'true' : undefined} data-qa-booking={qaBooking ? 'true' : 'false'}>
      <NotatnikSideVisuals variant={isCat ? 'cat' : 'dog'} />
      <div className="notatnik-shell booking-form-shell">
        <NotatnikTopbar tag="Rezerwacja konsultacji" navItems={PUBLIC_BOOKING_FLOW_NAV_ITEMS} ctaHref={slotsHref} ctaLabel="Wróć do terminów" ctaVariant="ghost" />

        <section className="booking-flow-stage-head" aria-label="Etap rezerwacji">
          <div className="termin-breadcrumb">
            <CalendarDays size={15} strokeWidth={1.85} aria-hidden="true" />
            <span>Wybór terminu</span>
          </div>
          <div className="termin-step-track booking-flow-step-track" aria-label="Etapy rezerwacji">
            {bookingFlowSteps.map((step, index) => (
              <span key={step} className={index === 2 ? 'is-active' : ''}>
                <strong>{index + 1}</strong>
                {step}
              </span>
            ))}
          </div>
        </section>

        <section className="booking-form-hero">
          <div className="booking-form-hero-copy">
            <p className="booking-form-hero-title">Uzupełnij dane do rozmowy</p>
            <p>
              Podaj krótki opis sytuacji. Potem przejdziesz do płatności, a po jej zakończeniu dostaniesz e-mail z
              potwierdzeniem i dalszym krokiem.
            </p>
            {qaBooking ? (
              <div className="notatnik-contact-note">
                <strong>Tryb testowy</strong>
                <p>Przejdziesz przez kontrolowaną płatność testową bez realnego obciążenia klienta.</p>
              </div>
            ) : null}
          </div>
          <figure className="booking-form-hero-media">
            <Image src={petImage} alt={heroImageAlt} fill priority sizes="(max-width: 980px) 100vw, 430px" />
          </figure>
        </section>

        <section className="booking-form-summary-strip" aria-label="Skrót rezerwacji">
          <article>
            <CircleHelp size={28} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>Problem</strong>
              <small>{getProblemLabel(problem)}</small>
            </span>
          </article>
          <article>
            <CalendarDays size={28} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>Termin</strong>
              <small>{slot ? formatDateTimeLabel(slot.bookingDate, slot.bookingTime) : 'Termin niedostępny'}</small>
            </span>
          </article>
          <article>
            <Video size={28} strokeWidth={1.75} aria-hidden="true" />
            <span>
              <strong>Forma</strong>
              <small>{getBookingServiceRoomSummary(serviceType)}</small>
            </span>
          </article>
        </section>

        <section className="booking-form-layout">
          <article className="booking-form-card" id="formularz" aria-labelledby="booking-form-title">
            <h1 id="booking-form-title">Uzupełnij dane do rozmowy</h1>

            {fallbackError ? (
              <div className="notatnik-callout notatnik-callout-error" role="alert">
                {fallbackError}
              </div>
            ) : null}

            {flowError ? (
              <>
                <div className="notatnik-callout">
                  {flowError} Jeśli temat jest pilny, wyślij krótką wiadomość i wróć do terminów później.
                </div>
                <div className="notatnik-actions">
                  <Link href={slotsHref} prefetch={false} className="notatnik-btn notatnik-btn-accent">
                    Wróć do terminów
                  </Link>
                  <Link href={messageHref} prefetch={false} className="notatnik-btn notatnik-btn-ghost">
                    {FUNNEL_CTA_LABELS.contact}
                  </Link>
                </div>
              </>
            ) : activeSlot ? (
              <BookingForm
                problemType={problem}
                serviceType={serviceType}
                slotId={activeSlot.id}
                slotLabel={formatDateTimeLabel(activeSlot.bookingDate, activeSlot.bookingTime)}
                amountLabel={amountLabel}
                qaBooking={qaBooking}
              />
            ) : (
              <>
                <div className="notatnik-callout notatnik-callout-error">
                  Ten termin nie jest już dostępny dla wybranej usługi. Wróć do listy albo wyślij krótką wiadomość.
                </div>
                <div className="notatnik-actions">
                  <Link href={slotsHref} prefetch={false} className="notatnik-btn notatnik-btn-accent">
                    Wróć do terminów
                  </Link>
                  <Link href={messageHref} prefetch={false} className="notatnik-btn notatnik-btn-ghost">
                    {FUNNEL_CTA_LABELS.contact}
                  </Link>
                </div>
              </>
            )}
          </article>

          <aside className="booking-form-side">
            <section className="booking-form-side-card">
              <h2>Podsumowanie konsultacji</h2>
              <div className="booking-form-side-list">
                <span>
                  <CalendarDays size={27} strokeWidth={1.75} aria-hidden="true" />
                  <strong>Termin</strong>
                  <small>{slot ? formatDateTimeLabel(slot.bookingDate, slot.bookingTime) : 'Termin niedostępny'}</small>
                </span>
                <span>
                  <Video size={27} strokeWidth={1.75} aria-hidden="true" />
                  <strong>Forma</strong>
                  <small>{getBookingServiceTitle(serviceType)}</small>
                </span>
                <span>
                  <CircleHelp size={27} strokeWidth={1.75} aria-hidden="true" />
                  <strong>Problem</strong>
                  <small>{getProblemLabel(problem)}</small>
                </span>
                <span>
                  <CalendarDays size={27} strokeWidth={1.75} aria-hidden="true" />
                  <strong>Czas trwania</strong>
                  <small>{getBookingServiceDurationLabel(serviceType)}</small>
                </span>
              </div>

              <div className="booking-form-question">
                <h3>Masz pytania?</h3>
                <p>Napisz do mnie, jeśli potrzebujesz doprecyzować rezerwację.</p>
                <a href={`mailto:${publicContact.email}`}>
                  <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
                  {publicContact.email}
                </a>
                <span>
                  <Headphones size={18} strokeWidth={1.8} aria-hidden="true" />
                  Rozmowa głosowa online po rezerwacji
                </span>
              </div>
            </section>

            <section className="booking-form-safe-card">
              <ShieldCheck size={34} strokeWidth={1.65} aria-hidden="true" />
              <span>
                <strong>Bezpieczeństwo i zaufanie</strong>
                <small>Twoje dane traktuję poufnie i wykorzystuję wyłącznie w celu realizacji konsultacji.</small>
              </span>
            </section>
          </aside>
        </section>

        <section className="booking-form-proof-strip" aria-label="Najważniejsze informacje">
          {[
            { icon: PawPrint, title: 'Indywidualne podejście', copy: 'Plan dopasowany do potrzeb.' },
            { icon: GraduationCap, title: 'Wiedza i doświadczenie', copy: 'Praktyka oparta na nauce.' },
            { icon: Heart, title: 'Empatia i zrozumienie', copy: 'Wsparcie dla Ciebie i zwierzęcia.' },
            { icon: ShieldCheck, title: 'Bez presji i oceniania', copy: 'Pracujemy w tempie, które jest dobre dla Was.' },
            { icon: Leaf, title: 'Analiza i realny plan', copy: 'Pomagam nazwać możliwe źródło problemu i wybrać pierwszy krok.' },
          ].map((item) => {
            const Icon = item.icon

            return (
              <article key={item.title}>
                <Icon size={27} strokeWidth={1.7} aria-hidden="true" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.copy}</small>
                </span>
              </article>
            )
          })}
        </section>

        <section className="booking-form-final-cta">
          <span className="booking-form-final-icon" aria-hidden="true">
            <CalendarDays size={34} strokeWidth={1.7} />
          </span>
          <div>
            <h2>Gotowy na pierwszy krok?</h2>
            <p>Umów spokojny pierwszy krok i zacznijcie od uporządkowania sytuacji.</p>
          </div>
          <div className="booking-form-final-actions">
            <a href="#formularz" className="notatnik-btn notatnik-btn-accent">
              Przejdź do danych i płatności
            </a>
            <Link href={slotsHref} prefetch={false} className="notatnik-btn notatnik-btn-ghost">
              Wróć do wyboru
            </Link>
          </div>
        </section>

        <NotatnikFooter
          primaryHref={quickAudioHref}
          primaryLabel={FUNNEL_CTA_LABELS.primary}
          reviewSpecies={isCat ? 'cat' : 'dog'}
        />
      </div>
    </main>
  )
}
