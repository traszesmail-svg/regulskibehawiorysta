import { RouteFallbackPage } from '@/components/RouteFallbackPage'
import { FUNNEL_CTA_LABELS } from '@/lib/funnel'

export default function NotFound() {
  return (
    <RouteFallbackPage
      code="404"
      eyebrow="Strona nie istnieje"
      title="Nie znaleźliśmy tej strony"
      description="Ten adres nie prowadzi już do publicznej podstrony. Wróć do sprawdzićonej ścieżki i wybierz najkrótszy kolejny krok."
      highlights={['Co możesz zrobić', 'Wrócić do strony głównej, ścieżki psa lub kota albo przejść od razu do 15 min audio.']}
      actions={[
        { href: '/', label: 'Strona główna', primary: true },
        { href: '/quiz', label: 'Quiz' },
        { href: '/cennik', label: 'Cennik' },
        { href: '/book?service=szybka-konsultacja-15-min', label: FUNNEL_CTA_LABELS.primary },
      ]}
      footerCtaHref="/book?service=szybka-konsultacja-15-min"
      footerCtaLabel={FUNNEL_CTA_LABELS.primary}
      footerHeadline="Nie musisz szukać dalej"
      footerDescription="Najprościej wrócić do strony głównej albo wybrać od razu 15 min audio, jeśli chcesz szybko uporządkować temat."
    />
  )
}
