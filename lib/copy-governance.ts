import { FUNNEL_CTA_LABELS } from '@/lib/funnel'

export const COPY_SERVICE_NAMES = {
  primary: '15-minutowa konsultacja behawioralna',
  primaryShort: 'Kwadrans',
  primaryDescriptor: '15 min połączenia telefonicznego',
  primaryOperational: '15-minutowa konsultacja behawioralna: połączenie telefoniczne',
  bridge: 'Dwa kwadranse z behawiorysta',
  bridgeOperational: 'Dwa kwadranse z behawiorystą: 30 min połączenia telefonicznego',
  consultation: 'pełna konsultacja behawioralna',
  consultationOperational: 'pełna konsultacja behawioralna przez Jitsi: około 2h, analiza zachowania, plan działania + 14 dni komunikacji w pokoju klienta',
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
  primaryLead: '15-minutowa konsultacja behawioralna to połączenie telefoniczne na jedno główne pytanie.',
  startFromAudio: 'Jeśli nie wiesz, od czego zacząć, wybierz 15-minutowa konsultacja behawioralna.',
  startComparison:
    '15-minutowa konsultacja behawioralna to telefoniczne omówienie jednego głównego pytania. Kwadrans na już to ta sama rozmowa, ale z priorytetem. Dwa kwadranse dają więcej czasu telefonicznie, a pełna konsultacja przez Jitsi obejmuje około 2h, plan działania i 14 dni komunikacji w pokoju klienta.',
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

