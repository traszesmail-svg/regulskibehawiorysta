import type { Metadata } from 'next'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { LegalPageLayout, type LegalSection, type LegalSummaryItem } from '@/components/LegalPageLayout'
import { buildLegalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildLegalMetadata(
  'Polityka prywatności',
  '/polityka-prywatnosci',
  'Polityka prywatności serwisu Regulski Behawiorysta: zakres danych, cele przetwarzania i prawa użytkownika.',
)

const summaryItems: LegalSummaryItem[] = [
  {
    label: 'Punkty styku danych',
    value: 'Formularz kontaktowy, rezerwacja, płatność, potwierdzenie, materiały przygotowawcze, materiały bezpłatne oraz newsletter.',
  },
  {
    label: 'Podstawowe narzędzia',
    value: 'Supabase, Resend, Jitsi, WhatsApp/Meta, Naffy, obsługa BLIK na telefon oraz narzędzia analityczne uruchamiane wyłącznie po wyrażeniu zgody.',
  },
  {
    label: 'Publiczny kontakt',
    value: 'Publiczny kontakt odbywa się przez formularz i e-mail. Serwis nie publikuje dodatkowego numeru kontaktowego.',
  },
]

const sections: LegalSection[] = [
  {
    title: '1. Administrator danych',
    body: (
      <>
        <p>
          Administratorem danych osobowych przetwarzanych w związku z działaniem serwisu, kontaktem, rezerwacją i
          realizacją usług jest Krzysztof Regulski, autor serwisu Regulski Behawiorysta.
        </p>
      </>
    ),
  },
  {
    title: '2. Zakres danych',
    body: (
      <>
        <ul className="premium-bullet-list">
          <li>W formularzu kontaktowym: imię, e-mail, gatunek, temat i treść wiadomości.</li>
          <li>Przy rezerwacji: dane identyfikacyjne i kontaktowe, temat, termin, status rezerwacji oraz status płatności.</li>
          <li>Przy realizacji usługi: dane potrzebne do potwierdzenia rezerwacji, wysyłki wiadomości oraz dostępu do pokoju rozmowy.</li>
          <li>W materiałach przygotowawczych: notatki, linki i pliki dodane dobrowolnie przez klienta.</li>
          <li>W formularzach materiałów bezpłatnych i newslettera: adres e-mail, segment tematyczny oraz identyfikator materiału lub źródła zapisu.</li>
        </ul>
      </>
    ),
  },
  {
    title: '3. Cele przetwarzania danych',
    body: (
      <>
        <p>Dane są przetwarzane w celu:</p>
        <ul className="premium-bullet-list">
          <li>udzielenia odpowiedzi na wiadomość przesłana przez formularz kontaktowy,</li>
          <li>przyjęcia i obsługi rezerwacji usługi,</li>
          <li>potwierdzenia płatności i obsługi strony potwierdzenia,</li>
          <li>realizacji konsultacji oraz przygotowania się do rozmowy na podstawie przekazanych materiałów,</li>
          <li>obsługi formularzy materiałów bezpłatnych i newslettera,</li>
          <li>zapewnienia bezpieczeństwa serwisu, rozliczeń oraz dochodzenia lub obrony roszczeń.</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Podstawa przetwarzania',
    body: (
      <>
        <p>
          Dane są przetwarzane w zakresie niezbędnym do zawarcia i wykonania umowy, udzielenia odpowiedzi na zgłoszenie,
          wypełnienia obowiązków prawnych związanych z rozliczeniami oraz na podstawie prawnie uzasadnionego interesu
          administratora polegającego na zapewnieniu bezpieczeństwa serwisu i obsługi zgłoszeń.
        </p>
        <p>
          W zakresie analityki oraz w tych przypadkach, w których wymaga tego charakter formularza, przetwarzanie może
          odbywać się także na podstawie zgody użytkownika.
        </p>
      </>
    ),
  },
  {
    title: '5. Odbiorcy danych',
    body: (
      <>
        <p>
          Dane mogą być przekazywane wyłącznie w zakresie niezbędnym do działania serwisu i realizacji usług, w
          szczególności dostawcom obsługującym bazę danych, wysyłkę wiadomości e-mail, pokój rozmowy online oraz
          narzędzia analityczne.
        </p>
        <p>
          W aktualnym modelu technicznym serwis korzysta z usług Supabase, Resend i Jitsi. Jeżeli dla danej rezerwacji
          aktywna jest obsługa SMS lub inna funkcja powiadomień, dane mogą zostać przekazane także operatorowi tej
          wiadomości.
        </p>
        <p>
          Przy 7-dniowym wsparciu po Pełnej konsultacji dane kontaktowe i treść wiadomości mogą być przetwarzane w
          WhatsApp, czyli usłudze należącej do Meta. Jeżeli klient nie chce korzystać z WhatsAppa, może ustalić kontakt
          e-mailowy jako alternatywny kanał pisemny.
        </p>
        <p>
          Przy płatnościach dane mogą być przetwarzane przez operatora płatności online (Naffy) albo w ramach ręcznej
          obsługi BLIK na telefon, zależnie od metody aktywnej dla danej rezerwacji lub zamówienia materiału.
        </p>
        <p>
          Część dostawców, w szczególności Meta, Naffy lub narzędzia analityczne, może przetwarzać dane poza Europejskim
          Obszarem Gospodarczym. W takim przypadku podstawą przekazania są mechanizmy stosowane przez danego dostawcę,
          w szczególności standardowe klauzule umowne albo inne zabezpieczenia przewidziane w RODO.
        </p>
      </>
    ),
  },
  {
    title: '6. Kontakt publiczny',
    body: (
      <>
        <p>
          Serwis nie publikuje dodatkowego numeru kontaktowego. Publiczny kontakt odbywa się przez formularz i e-mail.
        </p>
      </>
    ),
  },
  {
    title: '7. Materiały bezpłatne, newsletter i analityka',
    body: (
      <>
        <p>
          Formularze materiałów bezpłatnych i newslettera służą do przyjęcia zgłoszenia, przypisania go do właściwej
          strony, materiału lub segmentu tematycznego oraz obsługi dalszego kroku wynikającego z danego formularza.
        </p>
        <p>
          Serwis zapisuje decyzję dotyczącą analityki w pamięci przeglądarki (localStorage) i pliku cookie. Narzędzia analityczne nie są
          uruchamiane przed wyrażeniem zgody.
        </p>
        <p>
          Serwis może ustawiać następujące rodzaje cookies:
        </p>
        <ul className="premium-bullet-list">
          <li><strong>Niezbędne technicznie</strong> — zapisują decyzje o motywie (jasny/ciemny), sesję użytkownika oraz token dostępu do strony rezerwacji. Czas ważności: sesja przeglądarki albo do 30 dni (trwałe).</li>
          <li><strong>Analityczne (za zgodą)</strong> — uruchamiane wyłącznie po wyrażeniu zgody w banerze; służą do pomiaru ruchu i źródeł odwiedzin. Czas ważności: do 13 miesięcy.</li>
        </ul>
        <p>
          Użytkownik może w każdej chwili usunąć pliki cookie przez ustawienia przeglądarki lub wycofać zgodę na analitykę
          ponownie otwierając baner zgody.
        </p>
      </>
    ),
  },
  {
    title: '8. Okres przechowywania danych',
    body: (
      <>
        <p>
          Dane są przechowywane przez okres niezbędny do obsługi kontaktu, rezerwacji, realizacji usługi, rozliczeń oraz
          wykonania obowiązków prawnych, a także przez okres potrzebny do dochodzenia lub obrony roszczeń.
        </p>
        <p>
          Dane przetwarzane na podstawie zgody są przechowywane do czasu jej cofnięcia albo utraty celu, dla którego były
          przetwarzane.
        </p>
      </>
    ),
  },
  {
    title: '9. Prawa osoby, której dane dotyczą',
    body: (
      <>
        <p>
          Osobie, której dane dotyczą, przysługuje prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia
          przetwarzania, przenoszenia danych, wniesienia sprzeciwu oraz cofnięcia zgody, jeżeli przetwarzanie odbywa się
          na jej podstawie.
        </p>
        <p>
          Osobie, której dane dotyczą, przysługuje również prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych
          Osobowych.
        </p>
      </>
    ),
  },
  {
    title: '10. Postanowienia końcowe',
    body: (
      <>
        <p>
          Polityka prywatności obowiązuje od dnia jej opublikowania w serwisie. Zmiany polityki są publikowane w tej samej
          zakładce.
        </p>
      </>
    ),
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Polityka prywatności"
      title="Polityka prywatności"
      intro="Dokument opisuje zasady przetwarzania danych osobowych w związku z korzystaniem z serwisu, formularza kontaktowego, rezerwacji usług, potwierdzeń, materiałów przygotowawczych oraz formularzy materiałów bezpłatnych i newslettera."
      summaryItems={summaryItems}
      sections={sections}
      structuredData={[
        getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Polityka prywatności', path: '/polityka-prywatności' },
        ]),
      ]}
    />
  )
}
