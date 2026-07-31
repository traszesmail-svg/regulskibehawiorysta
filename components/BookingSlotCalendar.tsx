import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { CalendarDays, Cat, Check, ChevronDown, Dog, Headphones, PawPrint } from 'lucide-react'
import { AnalyticsEventOnMount } from '@/components/AnalyticsEventOnMount'
import { CaseMapBookingAnalytics } from '@/components/CaseMapBookingAnalytics'
import { ClinicBookingIdentity } from '@/components/ClinicBookingIdentity'
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
  readClinicFlowSearchParam,
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

export const metadata: Metadata = {
  ...buildMarketingMetadata({
    title: 'Wybierz termin konsultacji',
    path: '/termin',
    description: 'Prosty widok wyboru terminu po krótkim wyborze tematu psa albo kota.',
  }),
  robots: { index: false, follow: true },
}

const terminSteps = ['Termin', 'Godzina', 'Dane', 'Płatność'] as const
const clinicTerminSteps = ['Termin', 'Godzina', 'Dane', 'Potwierdzenie'] as const
const urgentTerminSteps = ['Najbliższe terminy', 'Dane', 'Płatność'] as const

const bookingFaqItems = [
  {
    question: 'Jak wygląda konsultacja online?',
    answer:
      'Kwadrans i Dwa kwadranse odbywają się jako połączenie telefoniczne. Pełna konsultacja odbywa się przez Jitsi; kamera nie jest obowiązkowa.',
  },
  {
    question: 'Czy muszę instalować jakąś aplikację?',
    answer:
      'Nie musisz instalować aplikacji ani zakładać konta. Po potwierdzeniu płatności dostaniesz e-mail z linkiem do Jitsi albo pokoju rozmowy w serwisie.',
  },
  {
    question: 'Kiedy termin jest pewny?',
    answer:
      'Wybrany termin trzymamy przez 15 minut na dokończenie rezerwacji. Termin jest pewny po opłaceniu i potwierdzeniu płatności. Przy płatności BLIK po instrukcji e-mail potwierdzenie wymaga obsługi w godzinach 9-21.',
  },
  {
    question: 'Czy mogę zmienić lub odwołać termin?',
    answer:
      'Po potwierdzeniu wpłaty możesz w ciągu 24 godzin napisać przez formularz albo odpowiedzieć na e-mail i zgłosić zmianę terminu lub rezygnację.',
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
  clinicFlow: boolean,
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
    const hasBusySlots = scheduleSlots.some((slot) => slot.statusLabel === 'Zajęte')

    days.push({
      date: dateKey,
      dayNumber: date.getDate(),
      monthLabel: date.toLocaleDateString('pl-PL', { month: 'short' }),
      isInPrimaryMonth: date >= visibleRangeStart && date <= visibleRangeEnd,
      label: formatReadableDate(parseDate(dateKey)),
      availableSlotCount,
      statusLabel: availableSlotCount > 0 ? `${availableSlotCount} terminów` : hasBusySlots ? 'Zajęte' : 'Niedostępne',
      slots: scheduleSlots.map((slot) => ({
        id: slot.id,
        date: dateKey,
        dateLabel: formatReadableDate(parseDate(dateKey)),
        time: slot.time,
        href: slot.isBookable
          ? appendSearchParams(buildFormHref(problem, slot.id, serviceQuery, qaBooking, requestedSpecies, clinicFlow), marketingParams)
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
  const clinicFlow = readClinicFlowSearchParam(searchParams?.clinic)
  const marketingParams = getMarketingParams(searchParams)
  const serviceConfig = FUNNEL_SERVICE_CONFIG[serviceType]

  const retryHref = appendSearchParams(buildSlotHref(problem, serviceQuery, qaBooking, requestedSpecies, clinicFlow), marketingParams)
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
      if (process.env.NODE_ENV !== 'production') {
        const { buildSeedAvailabilitySlots } = await import('@/lib/server/availability-seed')
        availabilitySlots = buildSeedAvailabilitySlots(new Date(), new Date().toISOString())
      } else {
        publicFlowMessage = 'Terminy chwilowo się odświeżają. Spróbuj ponownie za moment.'
      }
    }
  } else {
    console.warn('[regulski][termin] booking data mode is invalid', dataMode.summary)
    if (process.env.NODE_ENV !== 'production') {
      const { buildSeedAvailabilitySlots } = await import('@/lib/server/availability-seed')
      availabilitySlots = buildSeedAvailabilitySlots(new Date(), new Date().toISOString())
    } else {
      publicFlowMessage = 'Terminy chwilowo się odświeżają. Spróbuj ponownie za moment.'
    }
  }

  if (availabilitySlots.length === 0 && process.env.NODE_ENV !== 'production') {
    const { buildSeedAvailabilitySlots } = await import('@/lib/server/availability-seed')
    availabilitySlots = buildSeedAvailabilitySlots(new Date(), new Date().toISOString())
  }

  const calendar = buildCalendarDays(availabilitySlots, serviceType, problem, serviceQuery, qaBooking, requestedSpecies, clinicFlow, marketingParams)
  const problemSpecies = requestedSpecies ?? getProblemSpecies(problem)
  const isUrgentBooking = serviceType === 'kwadrans-na-juz'
  const petVisualSrc = isUrgentBooking
    ? '/branding/regulski-web/hero/hero-home.png'
    : problemSpecies === 'kot'
      ? '/wybor/cat-choice-avatar.png'
      : '/wybor/dog-choice-avatar.png'
  const petVisualAlt = isUrgentBooking ? 'Spokojny pies i kot w jasnym, domowym świetle' : problemSpecies === 'kot' ? 'Spokojny kot' : 'Spokojny pies'
  const contactHref = `/kontakt?species=${problemSpecies}#formularz`
  const pageClassName = isUrgentBooking ? 'termin-page termin-urgent-page' : `termin-page termin-${problemSpecies}-page`
  const sideVisualVariant = 'booking'
  const modeLabel = clinicFlow ? 'Jitsi (audio lub wideo)' : serviceConfig.mode === 'phone' ? 'Połączenie telefoniczne' : 'Jitsi (audio lub wideo)'
  const processOutcomeCopy =
    serviceType === 'konsultacja-behawioralna-online'
      ? 'W pełnej konsultacji dostajesz analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 14 dni komunikacji w pokoju klienta.'
      : serviceType === 'konsultacja-30-min'
        ? 'W Dwóch kwadransach masz więcej czasu na kontekst, spokojniejsze zalecenia i decyzję, czy potrzebna jest pełna konsultacja.'
        : 'W Kwadransie porządkujesz jedno główne pytanie i dostajesz pierwszy kierunek działania.'
  const calendarDays: PickerCalendarDay[] = calendar.days
  const bookingAmount = getBookingServicePrice(serviceType, serviceConfig.priceAmount)
  const manualPayment = getPublicManualPaymentConfig()
  const onlinePayment = getOnlinePaymentRuntimeForConsultation(serviceType)
  const inlineChoicePanel = (
    <div className="termin-inline-choice-panel" aria-label="Szybka zmiana wyboru">
      <div>
        <span>Gatunek</span>
        <div className="termin-inline-choice-options">
          <Link href={buildSlotHref('separacja', serviceQuery, qaBooking, 'pies', clinicFlow)} prefetch={false} className={problemSpecies === 'pies' ? 'is-selected' : ''}>
            <Dog size={18} strokeWidth={1.9} aria-hidden="true" />
            Pies
          </Link>
          <Link href={buildSlotHref('kot-stres', serviceQuery, qaBooking, 'kot', clinicFlow)} prefetch={false} className={problemSpecies === 'kot' ? 'is-selected' : ''}>
            <Cat size={18} strokeWidth={1.9} aria-hidden="true" />
            Kot
          </Link>
        </div>
        <Link href={clinicFlow ? '/wybor?clinic=1' : '/wybor'} prefetch={false} className="termin-inline-topic-select">
          <PawPrint size={18} strokeWidth={1.9} aria-hidden="true" />
          Zmień wybór
        </Link>
      </div>
      <div>
        <span>Temat konsultacji</span>
        <Link href={clinicFlow ? '/wybor?clinic=1' : '/wybor'} prefetch={false} className="termin-inline-topic-select">
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
      ctaHref="/mapa-sprawy"
      ctaLabel="Mapa zachowania"
      footerPrimaryHref={clinicFlow ? '/wybor?clinic=1' : '/wybor'}
      footerPrimaryLabel="Wróć do wyboru"
      sideVisualVariant={sideVisualVariant}
      pageClassName={pageClassName}
      shellClassName="termin-shell"
      showFooterReviews={false}
      analyticsDisabled={qaBooking}
    >
      <Schema
        data={getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Mapa zachowania', path: '/mapa-sprawy' },
          { name: 'Termin', path: '/book' },
        ])}
      />
      <section className="termin-calendar-section">
          <div className="termin-calendar-head">
            <div className="termin-breadcrumb">
              <CalendarDays size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>Wybór terminu</span>
            </div>
            {isUrgentBooking ? (
              <h1>Rezerwacja Kwadrans na już</h1>
            ) : (
              <h1>{clinicFlow ? 'Wybierz termin z lecznicy' : 'Wybierz termin konsultacji'}</h1>
            )}
            <p>
              {clinicFlow
                ? 'Wybierz dogodny dzień i godzinę. Konsultacja jest bezpłatna dzięki kodowi przekazanemu przez lecznicę — nie pobieramy opłaty za rezerwację.'
                : isUrgentBooking
                  ? 'Wybierz najbliższy dostępny termin krótkiej konsultacji. W kolejnym kroku wpiszesz dane, opłacisz rezerwację i dostaniesz e-mail z potwierdzeniem.'
                  : 'Wybierz dogodny dzień i godzinę. W kolejnym kroku wpiszesz dane, opłacisz rezerwację i dostaniesz e-mail z potwierdzeniem.'}
            </p>
            {clinicFlow ? <ClinicBookingIdentity /> : null}
            <MobileFirstStepCta
              eyebrow={clinicFlow ? 'Kod lecznicy aktywny' : 'Najbliższy krok'}
              title={clinicFlow ? 'Darmowa konsultacja z lecznicy' : serviceConfig.shortTitle}
              copy={clinicFlow ? 'Wybierz termin, wpisz dane i potwierdź rezerwację. Kod pokrywa koszt rozmowy.' : getBookingServiceSlotSummary(serviceType)}
              meta={clinicFlow ? `0 zł / ${getBookingServiceDurationLabel(serviceType)} online` : `${formatPricePln(serviceConfig.priceAmount)} / ${getBookingServiceDurationLabel(serviceType)}`}
              primaryHref="#najblizsze-terminy"
              primaryLabel="Zobacz terminy"
              secondaryHref={clinicFlow ? '/wybor?clinic=1' : '/cennik'}
              secondaryLabel={clinicFlow ? 'Zmień wybór' : 'Porównaj opcje'}
            />
          </div>

          <figure className="termin-hero-photo" aria-hidden="true">
            <Image src={petVisualSrc} alt={petVisualAlt} fill priority sizes="(max-width: 680px) 340px, 430px" />
          </figure>

          <div className="termin-step-track" aria-label="Etapy rezerwacji" data-urgent={isUrgentBooking ? 'true' : undefined}>
            {(isUrgentBooking ? urgentTerminSteps : clinicFlow ? clinicTerminSteps : terminSteps).map((step, index) => (
              <span key={step} className={index === 0 ? 'is-active' : ''}>
                <strong>{index + 1}</strong>
                {step}
              </span>
            ))}
          </div>

          <div className="termin-calendar-shell" id="najblizsze-terminy">
            <div className="notatnik-callout termin-calendar-callout">
              {clinicFlow
                ? 'Prosty proces: wybierasz termin, wpisujesz dane i aktywujesz kod lecznicy. Nie pobieramy płatności; potwierdzenie rezerwacji dostaniesz e-mailem.'
                : 'Prosty proces: wybierasz termin, wpisujesz dane, przechodzisz do płatności i dostajesz potwierdzenie e-mailem.'}{' '}
              Wybrany termin trzymamy przez 15 minut na czas spokojnego dokończenia rezerwacji.
            </div>

            {publicFlowMessage ? (
              <div className="notatnik-callout termin-calendar-callout">
                {publicFlowMessage}{' '}
                <Link href={retryHref} prefetch={false}>
                  Odśwież terminy
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
            <CaseMapBookingAnalytics
              problemType={problem}
              serviceType={serviceType}
              species={problemSpecies}
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
                clinicFlow,
                animalType: problemSpecies === 'kot' ? 'Kot' : 'Pies',
                modeLabel,
                priceLabel: clinicFlow ? '0 zł' : formatPricePln(serviceConfig.priceAmount),
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
              <h2>Jak to działa?</h2>
              <div className="termin-process-grid">
                <article>
                  <CalendarDays size={30} strokeWidth={1.7} aria-hidden="true" />
                  <strong>1. Wybierz termin</strong>
                  <span>Wybierz datę i godzinę, która Ci odpowiada.</span>
                </article>
                <article>
                  <Headphones size={30} strokeWidth={1.7} aria-hidden="true" />
                  <strong>2. Wejdź w konsultację</strong>
                  <span>Przy krótkich formatach otrzymasz połączenie telefoniczne. Pełna konsultacja odbywa się przez Jitsi.</span>
                </article>
                <article>
                  <Check size={30} strokeWidth={1.7} aria-hidden="true" />
                  <strong>
                    3. Otrzymaj
                    <br />
                    analizę zachowania
                  </strong>
                  <span>{processOutcomeCopy}</span>
                </article>
              </div>
            </section>

          </>
        ) : null}

        <section className="termin-bottom-section compact-home-section">
          <div className="termin-faq-card">
            <h2>Najczęściej zadawane pytania</h2>
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
