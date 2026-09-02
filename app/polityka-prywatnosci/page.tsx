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
    value: 'Formularz kontaktowy, Mapa zachowania, rezerwacja, płatność, prywatny Pokój, potwierdzenie, materiały przygotowawcze oraz materiały bezpłatne.',
  },
  {
    label: 'Podstawowe narzędzia',
    value: 'Supabase, Resend, Jitsi, Zadarma, WhatsApp/Meta, ręczna obsługa BLIK na telefon oraz narzędzia analityczne uruchamiane wyłącznie po wyrażeniu zgody.',
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
          <li>W Mapie zachowania: odpowiedzi wpisane lub wybrane przez użytkownika; pełna Mapa jest zapisywana w prywatnym Pokoju wyłącznie po osobnej, dobrowolnej zgodzie. Do oczekiwania na odbiór przechowujemy skrót e-maila i skrót jednorazowego potwierdzenia.</li>
          <li>Przy realizacji usługi: dane potrzebne do potwierdzenia rezerwacji, wysyłki wiadomości oraz dostępu do pokoju rozmowy.</li>
          <li>W materiałach przygotowawczych: notatki, linki i pliki dodane dobrowolnie przez klienta.</li>
          <li>
            W formularzach materiałów bezpłatnych: adres e-mail, temat materiału, identyfikator materiału lub źródła
            zapisu oraz status i czas zgody.
          </li>
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
          <li>prywatnego zapisania pełnej Mapy zachowania w Pokoju po osobnej zgodzie i zalogowaniu na ten sam adres e-mail,</li>
          <li>obsługi formularzy materiałów bezpłatnych,</li>
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
        <p>
          Dobrowolny zapis pełnej Mapy zachowania w prywatnym Pokoju jest niezależny od marketingu i od udostępnienia Mapy
          specjaliście. Bez tej zgody do rezerwacji trafia wyłącznie krótki brief przygotowujący rozmowę.
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
          Przy płatnościach dane mogą być przetwarzane w ramach ręcznej obsługi BLIK na telefon, zgodnie z aktualnym
          modelem przyjmowania wpłat.
        </p>
        <p>
          Część dostawców, w szczególności Meta lub narzędzia analityczne, może przetwarzać dane poza Europejskim
          Obszarem Gospodarczym. W takim przypadku podstawą przekazania są mechanizmy stosowane przez danego dostawcę,
          w szczególności standardowe klauzule umowne albo inne zabezpieczenia przewidziane w RODO.
        </p>
      </>
    ),
  },
  {
    title: '6. Program kodów dla klientów lecznic',
    body: (
      <>
        <p>
          W programie przetwarzany jest skrót jednorazowego kodu, identyfikator kampanii i lecznicy, status wykorzystania,
          identyfikator rezerwacji oraz wybrany kanał rozmowy. Jawny kod nie jest przechowywany po wygenerowaniu puli.
        </p>
        <p>
          Numer telefonu jest wymagany i zapisywany wyłącznie wtedy, gdy klient wybierze odpłatny wariant telefoniczny.
          Przy wariancie Jitsi numer telefonu nie jest potrzebny do realizacji rozmowy. Dla połączenia telefonicznego numer,
          identyfikator połączenia i techniczne statusy mogą być przetwarzane przez Zadarma jako dostawcę telefonii.
        </p>
        <p>
          Lecznica, która przekazała kod, nie otrzymuje automatycznie danych klienta, treści formularza ani informacji o
          zachowaniu zwierzęcia. Przekazanie takich danych wymagałoby odrębnej podstawy prawnej lub zgody. Nazwa i logotyp
          lecznicy są publikowane wyłącznie po potwierdzeniu udziału i uzgodnieniu zasad wykorzystania oznaczeń.
        </p>
        <p>
          Dane kampanii, wykorzystania kodu, rezerwacji i dopłaty są przechowywane przez okres niezbędny do wykonania usługi,
          rozliczeń, obsługi reklamacji oraz dochodzenia lub obrony roszczeń, a następnie usuwane albo ograniczane zgodnie z
          obowiązkami prawnymi administratora.
        </p>
      </>
    ),
  },  {
    title: '7. Kontakt publiczny',
    body: (
      <>
        <p>
          Serwis nie publikuje dodatkowego numeru kontaktowego. Publiczny kontakt odbywa się przez formularz i e-mail.
        </p>
      </>
    ),
  },
  {
    title: '8. Materiały bezpłatne i analityka',
    body: (
      <>
        <p>
          Formularze materiałów bezpłatnych służą do przyjęcia zgłoszenia, przypisania go do właściwej strony lub
          materiału oraz wysłania wybranego materiału startowego.
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
    title: '9. Okres przechowywania danych',
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
        <p>
          Jeżeli użytkownik zaznaczy dobrowolny zapis Mapy przy rezerwacji, ale nie zaloguje się ani nie utworzy Pokoju na
          ten sam adres e-mail, oczekujący prywatny zapis jest przechowywany maksymalnie przez 30 dni, a następnie usuwany.
          Odbiór wymaga jednorazowego potwierdzenia przekazanego w wiadomości e-mail.
        </p>
      </>
    ),
  },
  {
    title: '10. Prawa osoby, której dane dotyczą',
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
    title: '11. Postanowienia końcowe',
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
      intro="Dokument opisuje zasady przetwarzania danych osobowych w związku z korzystaniem z serwisu, formularza kontaktowego, rezerwacji usług, potwierdzeń, materiałów przygotowawczych oraz formularzy materiałów bezpłatnych."
      summaryItems={summaryItems}
      sections={sections}
      structuredData={[
        getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Polityka prywatności', path: '/polityka-prywatnosci' },
        ]),
      ]}
    />
  )
}
