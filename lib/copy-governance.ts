import { FUNNEL_CTA_LABELS } from '@/lib/funnel'

export const COPY_SERVICE_NAMES = {
  primary: '15-minutowa konsultacja behawioralna',
  primaryShort: 'Kwadrans',
  primaryDescriptor: '15 min audio bez kamery',
  primaryOperational: '15-minutowa konsultacja behawioralna: 15 min audio bez kamery',
  bridge: 'Dwa kwadranse z behawiorysta',
  bridgeOperational: 'Dwa kwadranse z behawiorysta: 30 min online',
  consultation: 'peĹ‚na konsultacja behawioralna',
  consultationOperational: 'peĹ‚na konsultacja behawioralna online: okoĹ‚o 2h, analiza zachowania, plan dziaĹ‚ania + 14 dni komunikacji w pokoju klienta',
  toolkit: 'MateriaĹ‚y PDF',
  toolkitOperational: 'MateriaĹ‚y PDF do samodzielnej pracy',
  contact: 'wiadomoĹ›Ä‡',
} as const

export const COPY_CTA = {
  primary: FUNNEL_CTA_LABELS.primary,
  bridge: FUNNEL_CTA_LABELS.bridge,
  consultation: FUNNEL_CTA_LABELS.consultation,
  toolkit: FUNNEL_CTA_LABELS.secondary,
  contact: FUNNEL_CTA_LABELS.contact,
} as const

export const COPY_HELPERS = {
  primaryLead: '15-minutowa konsultacja behawioralna to 15 min audio bez kamery.',
  startFromAudio: 'JeĹ›li nie wiesz, od czego zaczÄ…Ä‡, wybierz 15-minutowa konsultacja behawioralna.',
  startComparison:
    '15-minutowa konsultacja behawioralna jest nazwÄ… usĹ‚ugi. 15 min audio bez kamery opisuje tylko jej formÄ™. Kwadrans na juĹĽ to ta sama rozmowa, ale z priorytetem. Dwa kwadranse dajÄ… spokojniejszy start online, a peĹ‚na konsultacja behawioralna obejmuje okoĹ‚o 2h online, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
  contactResponseWindow: 'Staram siÄ™ odpowiadaÄ‡ w ciÄ…gu 1-2 dni roboczych.',
  toolkitIntro:
    'MateriaĹ‚y PDF to zasoby, do ktĂłrych moĹĽesz wrĂłciÄ‡ przed rozmowÄ…, po rozmowie albo wtedy, gdy chcesz spokojnie uporzÄ…dkowaÄ‡ temat.',
  reviewLead:
    'JeĹ›li konsultacja byĹ‚a pomocna, moĹĽesz zostawiÄ‡ krĂłtkÄ… opiniÄ™. Wystarczy kilka zdaĹ„ o samej rozmowie.',
  reviewPrivacy:
    'Opinie publikowane sÄ… z inicjalami, opcjonalnie z imieniem zwierzÄ™cia albo miastem, jeĹ›li chcesz to podaÄ‡.',
  reviewInternalNote: 'To ukryty formularz do zebrania krĂłtkiej opinii po konsultacji.',
  aftercareConfirmation:
    'Po potwierdzeniu wpĹ‚aty zobaczysz termin, link do rozmowy i dalszÄ… instrukcjÄ™.',
  paymentNoSales: 'Na tej stronie opĹ‚acasz rezerwacjÄ™ i sprawdzasz jej status.',
} as const

