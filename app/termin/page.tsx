import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { CalendarDays, Cat, Check, ChevronDown, Dog, Headphones, PawPrint } from 'lucide-react'
import { AnalyticsEventOnMount } from '@/components/AnalyticsEventOnMount'
import { MobileFirstStepCta } from '@/components/MobileFirstStepCta'
import { NotatnikPageShell, PUBLIC_SITE_NAV_ITEMS } from '@/components/NotatnikA'
import { TerminCalendarPicker, type TerminCalendarDay as PickerCalendarDay } from '@/components/TerminCalendarPicker'
import { Schema } from '@/components/schema'
import {
  DEFAULT_BOOKING_SERVICE,
  getBookingServicePrice,
  getBookingServiceRoomAccessLabel,
  getBookingServiceSlotBadge,
  getBookingServiceSlotSummary,
  getBookingServiceDurationLabel,
  normalizeBookingServiceType,
  type BookingServiceType,
} from '@/lib/booking-services'
import {
  appendSearchParams,
  buildFormHref,
  buildSlotHref,
  readBookingSpeciesSearchParam,
  readBookingServiceSearchParam,
  readProblemTypeSearchParam,
  readQaBookingSearchParam,
} from '@/lib/booking-routing'
import { getProblemLabel, getProblemSpecies } from '@/lib/data'
import { FUNNEL_CTA_LABELS, FUNNEL_SERVICE_CONFIG } from '@/lib/funnel'
import { formatPricePln } from '@/lib/pricing'
import {
  buildScheduleDateKeys,
  buildVisibleServiceSlotsForDate,
  getServiceScheduleHorizonDays,
} from '@/lib/scheduling/rules'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'
import { listAvailabilityAdmin } from '@/lib/server/db'
import { getDataModeStatus } from '@/lib/server/env'
import { getPublicManualPaymentConfig } from '@/lib/server/payment-options'
import { getOnlinePaymentRuntimeForConsultation } from '@/lib/server/online-payments'
import type { AvailabilitySlot, ProblemType } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Wybierz termin konsultacji',
  path: '/termin',
  description: 'Prosty widok wyboru terminu po krĂłtkim wyborze tematu psa albo kota.',
})

const terminSteps = ['Termin', 'Godzina', 'Dane', 'PĹ‚atnoĹ›Ä‡'] as const
const urgentTerminSteps = ['NajbliĹĽsze terminy', 'Dane', 'PĹ‚atnoĹ›Ä‡'] as const

const bookingFaqItems = [
  {
    question: 'Jak wyglÄ…da konsultacja online?',
    answer:
      'Kwadrans odbywa siÄ™ jako rozmowa audio bez kamery. Dwa kwadranse i PeĹ‚na konsultacja sÄ… online; przy peĹ‚nej konsultacji forma audio albo video zaleĹĽy od potrzeb sprawy.',
  },
  {
    question: 'Czy muszÄ™ instalowaÄ‡ jakÄ…Ĺ› aplikacjÄ™?',
    answer:
      'Nie zakĹ‚adam instalacji aplikacji ani konta. Po potwierdzeniu pĹ‚atnoĹ›ci dostaniesz e-mail z linkiem do rozmowy, najczÄ™Ĺ›ciej w Jitsi albo pokoju rozmowy w serwisie.',
  },
  {
    question: 'Kiedy termin jest pewny?',
    answer:
      'Wybrany termin trzymamy przez 15 minut na dokoĹ„czenie rezerwacji. Termin jest pewny po opĹ‚aceniu i potwierdzeniu pĹ‚atnoĹ›ci; przy pĹ‚atnoĹ›ci rÄ™cznej potwierdzenie moĹĽe wymagaÄ‡ obsĹ‚ugi w godzinach 9-21.',
  },
  {
    question: 'Czy mogÄ™ zmieniÄ‡ lub odwoĹ‚aÄ‡ termin?',
    answer:
      'Po potwierdzeniu wpĹ‚aty moĹĽesz w ciÄ…gu 24 godzin napisaÄ‡ przez formularz albo odpowiedzieÄ‡ na e-mail i zgĹ‚osiÄ‡ zmianÄ™ terminu lub rezygnacjÄ™.',
  },
] as const

type CalendarDay = {
  date: string
  dayNumber: number
  monthLabel: string
  isInPrimaryMonth: boolean
  label: string
  slots: PickerCalendarDay['slots']
  availableSlotCount: number
  statusLabel: string
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
}

function formatReadableDate(date: Date) {
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getMondayStart(date: Date) {
  const start = new Date(date)
  const dayIndex = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - dayIndex)
  return start
}

function getSundayEnd(date: Date) {
  const end = new Date(date)
  const dayIndex = (end.getDay() + 6) % 7
  end.setDate(end.getDate() + (6 - dayIndex))
  return end
}

function isWeekendDateKey(dateKey: string) {
  const day = parseDate(dateKey).getDay()
  return day === 0 || day === 6
}

function getMarketingParams(searchParams?: Record<string, string | string[] | undefined>) {
  const params: Record<string, string> = {}
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const

  for (const key of keys) {
    const rawValue = searchParams?.[key]
    const value = (Array.isArray(rawValue) ? rawValue[0] : rawValue)?.trim()
    if (value && value.length <= 120) params[key] = value
  }

  return params
}

function buildCalendarDays(
  availabilitySlots: AvailabilitySlot[],
  serviceType: BookingServiceType,
  problem: ProblemType,
  serviceQuery: BookingServiceType | null,
  qaBooking: boolean,
  requestedSpecies: 'pies' | 'kot' | null,
  marketingParams: Record<string, string>,
  now = new Date(),
): { days: CalendarDay[]; label: string; slotCount: number } {
  const visibleDates = buildScheduleDateKeys(now, getServiceScheduleHorizonDays(serviceType))
  const fallbackDate = new Date()
  fallbackDate.setHours(12, 0, 0, 0)
  const firstDate = visibleDates[0] ? parseDate(visibleDates[0]) : fallbackDate
  const lastDate = visibleDates[visibleDates.length - 1] ? parseDate(visibleDates[visibleDates.length - 1]) : fallbackDate
  const primaryMonth = firstDate.getMonth()
  const primaryYear = firstDate.getFullYear()
  const isUrgentService = serviceType === 'kwadrans-na-juz'
  const visibleRangeStart = isUrgentService ? firstDate : new Date(primaryYear, primaryMonth, 1, 12)
  const visibleRangeEnd = isUrgentService ? lastDate : new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0, 12)
  const calendarStart = getMondayStart(visibleRangeStart)
  const calendarEnd = getSundayEnd(visibleRangeEnd)
  const days: CalendarDay[] = []
  const visibleDateSet = new Set(visibleDates)

  const loopStart = isUrgentService ? visibleRangeStart : calendarStart
  const loopEnd = isUrgentService ? visibleRangeEnd : calendarEnd

  for (const cursor = new Date(loopStart); cursor <= loopEnd; cursor.setDate(cursor.getDate() + 1)) {
    const date = new Date(cursor)
    const dateKey = formatDateKey(date)
    if (isUrgentService && isWeekendDateKey(dateKey)) {
      continue
    }

    const scheduleSlots = visibleDateSet.has(dateKey)
      ? buildVisibleServiceSlotsForDate(availabilitySlots, dateKey, serviceType, now)
      : []
    const availableSlotCount = scheduleSlots.filter((slot) => slot.isBookable).length
    const hasBusySlots = scheduleSlots.some((slot) => slot.statusLabel === 'ZajÄ™te')

    days.push({
      date: dateKey,
      dayNumber: date.getDate(),
      monthLabel: date.toLocaleDateString('pl-PL', { month: 'short' }),
      isInPrimaryMonth: date >= visibleRangeStart && date <= visibleRangeEnd,
      label: formatReadableDate(parseDate(dateKey)),
      availableSlotCount,
      statusLabel: availableSlotCount > 0 ? `${availableSlotCount} terminĂłw` : hasBusySlots ? 'ZajÄ™te' : 'NiedostÄ™pne',
      slots: scheduleSlots.map((slot) => ({
        id: slot.id,
        date: dateKey,
        dateLabel: formatReadableDate(parseDate(dateKey)),
        time: slot.time,
        href: slot.isBookable
          ? appendSearchParams(buildFormHref(problem, slot.id, serviceQuery, qaBooking, requestedSpecies), marketingParams)
          : null,
        serviceType,
        serviceTitle: FUNNEL_SERVICE_CONFIG[serviceType].title,
        state: slot.state,
        statusLabel: slot.statusLabel,
        reasonLabel: slot.reasonLabel,
        isBookable: slot.isBookable,
      })),
    })
  }

  const label =
    firstDate.getMonth() === lastDate.getMonth() && firstDate.getFullYear() === lastDate.getFullYear()
      ? formatMonthTitle(firstDate)
      : `${formatMonthTitle(firstDate)} - ${formatMonthTitle(lastDate)}`

  return {
    days,
    label,
    slotCount: days.reduce((total, day) => total + day.availableSlotCount, 0),
  }
}

function getServiceQuery(serviceType: BookingServiceType) {
  return serviceType === DEFAULT_BOOKING_SERVICE ? null : serviceType
}

export async function BookingSlotCalendar({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  noStore()

  const requestedProblem = readProblemTypeSearchParam(searchParams?.problem)
  const problem = requestedProblem ?? 'szczeniak'
  const serviceType = normalizeBookingServiceType(readBookingServiceSearchParam(searchParams?.service))
  const serviceQuery = getServiceQuery(serviceType)
  const qaBooking = readQaBookingSearchParam(searchParams?.qa)
  const requestedSpecies = readBookingSpeciesSearchParam(searchParams?.species)
  const marketingParams = getMarketingParams(searchParams)
  const serviceConfig = FUNNEL_SERVICE_CONFIG[serviceType]

  const retryHref = appendSearchParams(buildSlotHref(problem, serviceQuery, qaBooking, requestedSpecies), marketingParams)
  const dataMode = getDataModeStatus()
  let availabilitySlots: AvailabilitySlot[] = []
  let publicFlowMessage: string | null = null

  if (dataMode.isValid) {
    try {
      availabilitySlots = await listAvailabilityAdmin()
    } catch (error) {
      console.warn('[regulski][termin] failed to load availability', {
        dataMode: dataMode.summary,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      })
      publicFlowMessage = 'Terminy chwilowo siÄ™ odĹ›wieĹĽajÄ…. SprĂłbuj ponownie za moment.'
    }
  } else {
    console.warn('[regulski][termin] booking data mode is invalid', dataMode.summary)
    publicFlowMessage = 'Terminy chwilowo siÄ™ odĹ›wieĹĽajÄ…. SprĂłbuj ponownie za moment.'
  }

  const calendar = buildCalendarDays(availabilitySlots, serviceType, problem, serviceQuery, qaBooking, requestedSpecies, marketingParams)
  const problemSpecies = requestedSpecies ?? getProblemSpecies(problem)
  const isUrgentBooking = serviceType === 'kwadrans-na-juz'
  const petVisualSrc = isUrgentBooking
    ? '/branding/regulski-web/hero/hero-home.png'
    : problemSpecies === 'kot'
      ? '/wybor/cat-choice-avatar.png'
      : '/wybor/dog-choice-avatar.png'
  const petVisualAlt = isUrgentBooking ? 'Spokojny pies i kot w jasnym, domowym Ĺ›wietle' : problemSpecies === 'kot' ? 'Spokojny kot' : 'Spokojny pies'
  const contactHref = `/kontakt?species=${problemSpecies}#formularz`
  const pageClassName = isUrgentBooking ? 'termin-page termin-urgent-page' : `termin-page termin-${problemSpecies}-page`
  const sideVisualVariant = 'booking'
  const modeLabel =
    serviceType === 'konsultacja-behawioralna-online'
      ? 'Audio lub video online'
      : serviceConfig.mode === 'audio'
        ? 'Online (audio)'
        : 'Online'
  const processOutcomeCopy =
    serviceType === 'konsultacja-behawioralna-online'
      ? 'W peĹ‚nej konsultacji dostajesz analizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.'
      : serviceType === 'konsultacja-30-min'
        ? 'W DwĂłch kwadransach masz wiÄ™cej czasu na kontekst, spokojniejsze zalecenia i decyzjÄ™, czy potrzebna jest peĹ‚na konsultacja.'
        : 'W Kwadransie porzÄ…dkujesz jedno gĹ‚Ăłwne pytanie i dostajesz pierwszy kierunek dziaĹ‚ania.'
  const calendarDays: PickerCalendarDay[] = calendar.days
  const bookingAmount = getBookingServicePrice(serviceType, serviceConfig.priceAmount)
  const manualPayment = getPublicManualPaymentConfig()
  const onlinePayment = getOnlinePaymentRuntimeForConsultation(serviceType)
  const inlineChoicePanel = (
    <div className="termin-inline-choice-panel" aria-label="Szybka zmiana wyboru">
      <div>
        <span>Gatunek</span>
        <div className="termin-inline-choice-options">
          <Link href={buildSlotHref('separacja', serviceQuery, qaBooking, 'pies')} prefetch={false} className={problemSpecies === 'pies' ? 'is-selected' : ''}>
            <Dog size={18} strokeWidth={1.9} aria-hidden="true" />
            Pies
          </Link>
          <Link href={buildSlotHref('kot-stres', serviceQuery, qaBooking, 'kot')} prefetch={false} className={problemSpecies === 'kot' ? 'is-selected' : ''}>
            <Cat size={18} strokeWidth={1.9} aria-hidden="true" />
            Kot
          </Link>
        </div>
        <Link href="/wybor" prefetch={false} className="termin-inline-topic-select">
          <PawPrint size={18} strokeWidth={1.9} aria-hidden="true" />
          ZmieĹ„ wybĂłr
        </Link>
      </div>
      <div>
        <span>Temat konsultacji</span>
        <Link href="/wybor" prefetch={false} className="termin-inline-topic-select">
          {getProblemLabel(problem)}
          <ChevronDown size={18} strokeWidth={1.9} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )

  return (
    <NotatnikPageShell
      tag="Regulski"
      navItems={PUBLIC_SITE_NAV_ITEMS}
      ctaHref="/quiz"
      ctaLabel="Quiz"
      footerPrimaryHref="/wybor"
      footerPrimaryLabel="WrĂłÄ‡ do wyboru"
      sideVisualVariant={sideVisualVariant}
      pageClassName={pageClassName}
      shellClassName="termin-shell"
      showFooterReviews={false}
      analyticsDisabled={qaBooking}
    >
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona gĹ‚Ăłwna', path: '/' },
          { name: 'Quiz', path: '/quiz' },
          { name: 'Termin', path: '/book' },
        ])}
      />
      <section className="termin-calendar-section">
          <div className="termin-calendar-head">
            <div className="termin-breadcrumb">
              <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>WybĂłr terminu</span>
            </div>
            {isUrgentBooking ? (
              <h1>Rezerwacja Kwadrans na juĹĽ</h1>
            ) : (
              <h1>Wybierz termin konsultacji</h1>
            )}
            <p>
              {isUrgentBooking
                ? 'Wybierz najbliĹĽszy dostÄ™pny termin krĂłtkiej konsultacji. W kolejnym kroku wpiszesz dane, opĹ‚acisz rezerwacjÄ™ i dostaniesz e-mail z potwierdzeniem.'
                : 'Wybierz dogodny dzieĹ„ i godzinÄ™. W kolejnym kroku wpiszesz dane, opĹ‚acisz rezerwacjÄ™ i dostaniesz e-mail z potwierdzeniem.'}
            </p>
            <MobileFirstStepCta
              eyebrow="NajbliĹĽszy krok"
              title={serviceConfig.shortTitle}
              copy={getBookingServiceSlotSummary(serviceType)}
              meta={`${formatPricePln(serviceConfig.priceAmount)} / ${getBookingServiceDurationLabel(serviceType)}`}
              primaryHref="#najblizsze-terminy"
              primaryLabel="Zobacz terminy"
              secondaryHref="/cennik"
              secondaryLabel="PorĂłwnaj opcje"
            />
          </div>

          <figure className="termin-hero-photo" aria-hidden="true">
            <Image src={petVisualSrc} alt={petVisualAlt} fill priority sizes="(max-width: 680px) 340px, 430px" />
          </figure>

          <div className="termin-step-track" aria-label="Etapy rezerwacji" data-urgent={isUrgentBooking ? 'true' : undefined}>
            {(isUrgentBooking ? urgentTerminSteps : terminSteps).map((step, index) => (
              <span key={step} className={index === 0 ? 'is-active' : ''}>
                <strong>{index + 1}</strong>
                {step}
              </span>
            ))}
          </div>

          <div className="termin-calendar-shell" id="najblizsze-terminy">
            <div className="notatnik-callout termin-calendar-callout">
              Prosty proces: wybierasz termin, wpisujesz dane, przechodzisz do pĹ‚atnoĹ›ci i dostajesz potwierdzenie e-mailem.
              Wybrany termin trzymamy przez 15 minut na czas spokojnego dokoĹ„czenia rezerwacji.
            </div>

            {publicFlowMessage ? (
              <div className="notatnik-callout termin-calendar-callout">
                {publicFlowMessage}{' '}
                <Link href={retryHref} prefetch={false}>
                  OdĹ›wieĹĽ terminy
                </Link>
                .
              </div>
            ) : null}

            {!publicFlowMessage && calendar.slotCount === 0 ? (
              <div className="notatnik-callout termin-calendar-callout">
                {serviceConfig.noAvailabilityMessage}{' '}
                <Link href={contactHref} prefetch={false}>
                  {FUNNEL_CTA_LABELS.contact}
                </Link>
                .
              </div>
            ) : null}

            <AnalyticsEventOnMount
              eventName="booking_start"
              params={{
                source_page: '/book',
                service_type: serviceType,
                problem_type: problem,
                species: problemSpecies,
                qa_booking: qaBooking,
              }}
            />
            <AnalyticsEventOnMount
              eventName="booking_service_selected"
              params={{
                source_page: '/book',
                service_type: serviceType,
                problem_type: problem,
                species: problemSpecies,
                qa_booking: qaBooking,
              }}
            />
            <TerminCalendarPicker
              monthLabel={calendar.label}
              slotCount={calendar.slotCount}
              days={calendarDays}
              summary={{
                serviceTitle: serviceConfig.title,
                serviceShortTitle: serviceConfig.shortTitle,
                serviceBadge: getBookingServiceSlotBadge(serviceType),
                serviceType,
                problemType: problem,
                problemLabel: getProblemLabel(problem),
                species: problemSpecies,
                animalType: problemSpecies === 'kot' ? 'Kot' : 'Pies',
                modeLabel,
                priceLabel: formatPricePln(serviceConfig.priceAmount),
                priceAmount: bookingAmount,
                slotSummary: getBookingServiceSlotSummary(serviceType),
                contactHref,
                roomAccessLabel: getBookingServiceRoomAccessLabel(serviceType),
                qaBooking,
              }}
              paymentConfig={{
                manualAvailable: manualPayment.isAvailable,
                manualPhoneDisplay: manualPayment.phoneDisplay,
                manualAccountName: manualPayment.accountName,
                manualInstructions: manualPayment.instructions,
                manualSummary: manualPayment.summary,
                onlinePayment,
              }}
              choicePanel={inlineChoicePanel}
            />
          </div>
        </section>

        {!isUrgentBooking ? (
          <>
            <section className="termin-process-section compact-home-section">
              <h2>Jak to dziaĹ‚a?</h2>
              <div className="termin-process-grid">
                <article>
                  <CalendarDays size={30} strokeWidth={1.7} aria-hidden="true" />
                  <strong>1. Wybierz termin</strong>
                  <span>Wybierz datÄ™ i godzinÄ™, ktĂłra Ci odpowiada.</span>
                </article>
                <article>
                  <Headphones size={30} strokeWidth={1.7} aria-hidden="true" />
                  <strong>2. WejdĹş w konsultacjÄ™</strong>
                  <span>PoĹ‚Ä…czymy siÄ™ online w formie audio lub wideo.</span>
                </article>
                <article>
                  <Check size={30} strokeWidth={1.7} aria-hidden="true" />
                  <strong>
                    3. Otrzymaj
                    <br />
                    analizÄ™ zachowania
                  </strong>
                  <span>{processOutcomeCopy}</span>
                </article>
              </div>
            </section>

          </>
        ) : null}

        <section className="termin-bottom-section compact-home-section">
          <div className="termin-faq-card">
            <h2>NajczÄ™Ĺ›ciej zadawane pytania</h2>
            {bookingFaqItems.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
            <Link href="/faq" prefetch={false}>Zobacz wszystkie pytania</Link>
          </div>
      </section>
    </NotatnikPageShell>
  )
}

export default function TerminRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  redirect(appendSearchParams('/book', searchParams))
}

