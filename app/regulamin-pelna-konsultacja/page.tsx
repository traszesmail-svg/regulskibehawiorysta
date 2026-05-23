import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection, type LegalSummaryItem } from '@/components/LegalPageLayout'
import { PUBLIC_OFFER_PAYMENT_METHODS } from '@/lib/public-offer-copy'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildLegalMetadata } from '@/lib/seo'

export const metadata: Metadata = buildLegalMetadata(
  'Regulamin Pełnej konsultacji',
  '/regulamin-pelna-konsultacja',
  'Zasady rezerwacji, płatności, realizacji i reklamacji pełnej konsultacji behawioralnej online.',
)

const summaryItems: LegalSummaryItem[] = [
  {
    label: 'Produkt objęty dokumentem',
    value: 'Pełna konsultacja behawioralna online: 470 zł, około 2h online, analiza zachowania, plan działania i 7 dni wsparcia przez WhatsApp.',
  },
  {
    label: 'Płatność',
    value: `${PUBLIC_OFFER_PAYMENT_METHODS}. Termin jest pewny dopiero po potwierdzeniu płatności.`,
  },
]

const sections: LegalSection[] = [
  {
    title: '1. Postanowienia ogólne',
    body: (
      <>
        <p>
          Regulamin określa zasady rezerwacji, płatności, realizacji i reklamacji usługi Pełna konsultacja behawioralna
          online.
        </p>
        <p>
          Usługodawca: Krzysztof Regulski, e-mail: kontakt@regulskibehawiorysta.pl.
        </p>
        <p>Konsultacja jest usługą cyfrową świadczoną przez internet. Nie ma charakteru porady weterynaryjnej ani diagnozy medycznej.</p>
      </>
    ),
  },
  {
    title: '2. Przedmiot i zakres usługi',
    body: (
      <>
        <ul className="premium-bullet-list">
          <li>Konsultacja trwa około 2h i odbywa się online w formie rozmowy audio lub audio/video.</li>
          <li>W ramach konsultacji usługodawca analizuje opisaną sytuację psa lub kota, porządkuje priorytety i przekazuje analizę zachowania opartą na danych od klienta.</li>
          <li>Po konsultacji klient otrzymuje analizę zachowania opartą na danych od klienta i indywidualny plan działania.</li>
          <li>Przez 7 dni od konsultacji klient może przez WhatsApp zadawać pytania, wysyłać wiadomości tekstowe i filmy oraz konsultować wdrażanie planu.</li>
          <li>Jeśli po 7 dniach brak postępu albo nie ma poczucia, że to skuteczna droga do rozwiązania, usługodawca może wskazać zasadność wizyty domowej i terapii ustalanej indywidualnie.</li>
          <li>Konsultacja nie obejmuje diagnostyki weterynaryjnej, zaleceń farmakologicznych ani interwencji w stanach nagłych.</li>
        </ul>
        <p>
          Jeżeli opisana sytuacja wymaga interwencji weterynarza lub innego specjalisty, usługodawca informuje o tym
          klienta i może odmówić dalszej realizacji konsultacji, zwracając 100% wpłaty.
        </p>
      </>
    ),
  },
  {
    title: '3. Cena i płatność',
    body: (
      <>
        <p>Cena konsultacji: 470 zł brutto.</p>
        <p>Metody płatności: {PUBLIC_OFFER_PAYMENT_METHODS}. Jeżeli aktywna jest płatność online, klient przechodzi do niej bezpośrednio po utworzeniu rezerwacji. Jeżeli aktywna jest płatność ręczna, klient otrzymuje dalszą instrukcję dla wybranej metody.</p>
        <p>Termin jest wstępnie blokowany na czas płatności. Standardowe okno blokady wynosi 15 minut.</p>
        <p>Termin zostaje ostatecznie zablokowany dopiero po potwierdzeniu płatności. Przy płatności ręcznej potwierdzenie może wymagać obsługi przez usługodawcę w godzinach 9:00-21:00, poza dniami ustawowo wolnymi od pracy.</p>
        <p>Rezerwacja bez dokonanej lub potwierdzonej płatności nie jest wiążąca, a termin może wrócić do puli dostępnych terminów.</p>
      </>
    ),
  },
  {
    title: '4. Wymagania techniczne',
    body: (
      <>
        <p>
          Konsultacja odbywa się przez Jitsi Meet — nie wymaga instalacji aplikacji ani konta. Wystarczy kliknąć link przesłany e-mailem przed rozmową.
        </p>
        <p>
          Przy formacie 15 i 30 minut potrzebne jest tylko audio (mikrofon i głośnik albo słuchawki). Przy Pełnej konsultacji kamera może pomóc, ale nie jest obowiązkowa.
        </p>
        <p>Wymagany jest dostęp do internetu, aktualna przeglądarka (Chrome, Firefox, Safari, Edge) oraz aktywny adres e-mail.</p>
      </>
    ),
  },
  {
    title: '5. Rezerwacja terminu',
    body: (
      <>
          <p>Klient inicjuje rezerwację przez formularz na stronie /book, wybierając dostępny termin i opisując sytuację.</p>
          <p>Po wysłaniu danych w formularzu wybrany slot jest wstępnie blokowany na czas płatności. Standardowe okno blokady wynosi 15 minut.</p>
          <p>Konsultacja jest zarezerwowana dopiero po potwierdzeniu płatności.</p>
          <p>Na 24 godziny przed konsultacją klient otrzymuje e-mail z linkiem do rozmowy i listą materiałów do przygotowania, jeżeli są potrzebne.</p>
          <p>Po zakończeniu konsultacji dalszy 7-dniowy kontakt tekstowy odbywa się przez WhatsApp, chyba że strony ustalą inny kanał pisemny.</p>
        </>
      ),
  },
  {
    title: '6. Zmiana terminu i anulacja',
    body: (
      <>
        <p>Do 48 godzin przed konsultacją klient może bezpłatnie zmienić termin albo zrezygnować i otrzymać zwrot 100% wpłaty.</p>
        <p>Pomiędzy 48 a 24 godzinami przed terminem możliwa jest bezpłatna zmiana terminu albo zwrot 50% wpłaty.</p>
        <p>Krócej niż 24 godziny przed terminem wpłata nie podlega zwrotowi, chyba że przyczyną jest siła wyższa lub niedostępność usługodawcy.</p>
      </>
    ),
  },
  {
    title: '7. No-show i odwołanie przez usługodawcę',
    body: (
      <>
        <p>Jeśli klient nie dołączy do rozmowy w ciągu 15 minut od planowanego początku i nie skontaktuje się z usługodawcą, konsultacja uznawana jest za zrealizowaną bez prawa do zwrotu.</p>
        <p>W przypadku problemów technicznych udokumentowanych przez klienta usługodawca proponuje nowy termin bez dopłaty.</p>
        <p>W sytuacjach wyjątkowych usługodawca może odwołać konsultację. W takim przypadku klient otrzymuje wybór: nowy termin w ciągu 30 dni albo pełny zwrot wpłaty.</p>
      </>
    ),
  },
  {
    title: '8. Prawo odstąpienia od umowy',
    body: (
      <>
        <p>Konsument ma prawo odstąpić od umowy zawartej na odległość w terminie 14 dni bez podania przyczyny, z zastrzeżeniem przepisów szczególnych o usługach wykonanych za zgodą klienta.</p>
        <p>Przy rezerwacji klient składa osobną zgodę na rozpoczęcie świadczenia usługi przed upływem 14-dniowego terminu i przyjmuje do wiadomości, że po zakończonej konsultacji traci prawo odstąpienia od umowy w zakresie wykonanej usługi.</p>
        <p>Do momentu rozpoczęcia konsultacji klient zachowuje prawo odstąpienia na zasadach ogólnych. Zgłoszenie e-mailem jest wystarczające.</p>
      </>
    ),
  },
  {
    title: '9. Reklamacje',
    body: (
      <>
        <p>Klient może złożyć reklamację e-mailem na kontakt@regulskibehawiorysta.pl w ciągu 14 dni od konsultacji.</p>
        <p>Reklamacja powinna zawierać imię i nazwisko, datę konsultacji oraz opis nieprawidłowości.</p>
        <p>Usługodawca rozpatruje reklamację w ciągu 14 dni roboczych. Jeżeli reklamacja jest zasadna, klient otrzymuje zwrot części lub całości wpłaty albo darmową konsultację uzupełniającą.</p>
        <p>
          Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń, w tym z pomocy
          miejskiego lub powiatowego rzecznika konsumentów oraz informacji dostępnych na stronie UOKiK.
        </p>
      </>
    ),
  },
  {
    title: '10. Ochrona danych osobowych i poufność',
    body: (
      <>
        <p>Administratorem danych osobowych klienta jest usługodawca wskazany w nagłówku dokumentu.</p>
        <p>Dane są przetwarzane w celu realizacji konsultacji, wystawienia dokumentu sprzedażowego i kontaktu zwrotnego. Szczegóły znajdują się w Polityce prywatności.</p>
        <p>Usługodawca zachowuje poufność informacji przekazanych przez klienta podczas konsultacji. Konsultacja nie jest nagrywana bez wyraźnej zgody klienta.</p>
      </>
    ),
  },
  {
    title: '11. Postanowienia końcowe',
    body: (
      <>
        <p>W sprawach nieuregulowanych regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego i ustawy o prawach konsumenta.</p>
        <p>Usługodawca zastrzega prawo do zmiany regulaminu. Rezerwacje opłacone przed zmianą regulaminu są realizowane na zasadach obowiązujących w momencie rezerwacji.</p>
        <p>Regulamin wchodzi w życie z dniem opublikowania na stronie /regulamin-pelna-konsultacja.</p>
      </>
    ),
  },
]

export default function FullConsultationTermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Regulamin / pełna konsultacja"
      title="Regulamin Pełnej konsultacji behawioralnej online"
      intro="Dokument opisuje zasady rezerwacji, płatności, zmian terminu, realizacji około 2h online, 7 dni wsparcia przez WhatsApp i reklamacji dla Pełnej konsultacji online."
      summaryItems={summaryItems}
      sections={sections}
      structuredData={[
        getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Regulamin Pełnej konsultacji', path: '/regulamin-pelna-konsultacja' },
        ]),
      ]}
    />
  )
}
