import { FUNNEL_CTA_LABELS } from '@/lib/funnel'

export const COPY_SERVICE_NAMES = {
  primary: 'Zapytaj behawiorystę',
  primaryShort: 'Zapytaj behawiorystę',
  primaryDescriptor: 'do 15 min połączenia telefonicznego',
  primaryOperational: 'Zapytaj behawiorystę: rozmowa telefoniczna do 15 minut',
  bridge: 'Zapytaj teraz',
  bridgeOperational: 'Zapytaj teraz: rozmowa telefoniczna do 15 minut',
  consultation: 'pełna konsultacja behawioralna',
  consultationOperational: 'pełna konsultacja behawioralna przez Jitsi: około 90 minut, analiza zachowania, plan działania + 14 dni komunikacji w pokoju klienta',
  toolkit: 'Materiały PDF',
  toolkitOperational: 'Materiały PDF do samodzielnej pracy',
  contact: 'wiadomość',
} as const

export const COPY_CTA = {
  primary: FUNNEL_CTA_LABELS.primary,
  bridge: FUNNEL_CTA_LABELS.bridge,
  consultation: FUNNEL_CTA_LABELS.consultation,
  toolkit: FUNNEL_CTA_LABELS.secondary,
  contact: FUNNEL_CTA_LABELS.contact,
} as const

export const COPY_HELPERS = {
  primaryLead: 'Zapytaj behawiorystę to rozmowa telefoniczna do 15 minut: opisujesz sytuację, a dostajesz pierwszy kierunek i dwa pytania po rozmowie.',
  startFromAudio: 'Jeśli nie wiesz, od czego zacząć, wybierz Zapytaj behawiorystę.',
  startComparison:
    'Zapytaj behawiorystę to rozmowa telefoniczna do 15 minut. Zapytaj teraz ma ten sam zakres, ale działa tylko przy ręcznie włączonej dostępności. Pełna konsultacja przez Jitsi obejmuje około 90 minut, plan działania i 14 dni komunikacji w pokoju klienta.',
  contactResponseWindow: 'Staram się odpowiadać w ciągu 1-2 dni roboczych.',
  toolkitIntro:
    'Materiały PDF to zasoby, do których możesz wrócić przed rozmową, po rozmowie albo wtedy, gdy chcesz spokojnie uporządkować temat.',
  reviewLead:
    'Jeśli konsultacja była pomocna, możesz zostawić krótką opinię. Wystarczy kilka zdań o samej rozmowie.',
  reviewPrivacy:
    'Opinie publikowane są z inicjalami, opcjonalnie z imieniem zwierzęcia albo miastem, jeśli chcesz to podać.',
  reviewInternalNote: 'To ukryty formularz do zebrania krótkiej opinii po konsultacji.',
  aftercareConfirmation:
    'Po potwierdzeniu wpłaty zobaczysz termin, link do rozmowy i dalszą instrukcję.',
  paymentNoSales: 'Na tej stronie opłacasz rezerwację i sprawdzasz jej status.',
} as const

