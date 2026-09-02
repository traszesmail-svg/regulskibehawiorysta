import { RouteFallbackPage } from '@/components/RouteFallbackPage'
export default function NotFound() {
  return (
    <RouteFallbackPage
      code="404"
      eyebrow="Strona nie istnieje"
      title="Nie znaleźliśmy tej strony"
      description="Ten adres nie prowadzi już do publicznej podstrony. Wróć do sprawdzonej ścieżki i wybierz najkrótszy kolejny krok."
      highlights={['Co możesz zrobić', 'Wrócić do strony głównej albo przejść do krótkiej rozmowy z behawiorystą.']}
      actions={[
        { href: '/', label: 'Strona główna', primary: true },
        { href: '/zapytaj', label: 'Zapytaj behawiorystę' },
        { href: '/konsultacja', label: 'Konsultacja' },
      ]}
      footerCtaHref="/zapytaj"
      footerCtaLabel="Zapytaj behawiorystę"
      footerHeadline="Nie musisz szukać dalej"
      footerDescription="Najprościej wrócić do strony głównej albo opisać sytuację przed krótką rozmową z behawiorystą."
    />
  )
}
