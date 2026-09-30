import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection, type LegalSummaryItem } from '@/components/LegalPageLayout'
import { PUBLIC_OFFER_PAYMENT_METHODS, PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy'
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
    value: `Pełna konsultacja behawioralna przez Jitsi: ${PUBLIC_OFFER_PRICE_LABELS.premium}, około 90 minut, analiza zachowania, plan działania i 14 dni wsparcia przez WhatsApp. Pokój przechowuje podsumowanie i historię.`,
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
          <li>Konsultacja trwa około 90 minut i odbywa się przez Jitsi w formie rozmowy audio lub audio/wideo.</li>
          <li>W ramach konsultacji usługodawca analizuje opisaną sytuację psa lub kota, porządkuje priorytety i przekazuje analizę zachowania opartą na danych od klienta.</li>
          <li>Po konsultacji klient otrzymuje analizę zachowania opartą na danych od klienta i indywidualny plan działania.</li>
          <li>Przez 14 dni od konsultacji klient otrzymuje wsparcie przez WhatsApp dotyczące tej samej sprawy i wdrażania planu. Pokój przechowuje podsumowanie i historię; nie zastępuje WhatsAppa.</li>
          <li>Jeśli po 14 dniach brak postępu albo nie ma poczucia, że to skuteczna droga do rozwiązania, usługodawca może wskazać zasadność wizyty domowej i terapii ustalanej indywidualnie.</li>
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
        <p>Cena konsultacji: {PUBLIC_OFFER_PRICE_LABELS.premium} brutto.</p>
        <p>Podstawowa metoda płatności: {PUBLIC_OFFER_PAYMENT_METHODS}. Jeżeli checkout dla danej rezerwacji udostępnia płatność online, pokazuje dostępne metody przed przekierowaniem do operatora. W przeciwnym razie klient otrzymuje instrukcję wpłaty BLIK e-mailem.</p>
        <p>Termin jest wstępnie blokowany na czas płatności. Standardowe okno blokady wynosi 5 minut.</p>
        <p>Termin zostaje ostatecznie zablokowany dopiero po potwierdzeniu płatności. Przy płatności BLIK według instrukcji wpłatę potwierdza usługodawca w godzinach 9:00-21:00, poza dniami ustawowo wolnymi od pracy.</p>
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
          Przy Zapytaj behawiorystę potrzebne jest tylko audio (mikrofon i głośnik albo słuchawki). Przy Pełnej konsultacji kamera może pomóc, ale nie jest obowiązkowa.
        </p>
        <p>Wymagany jest dostęp do internetu, aktualna przeglądarka (Chrome, Firefox, Safari, Edge) oraz aktywny adres e-mail.</p>
      </>
    ),
  },
  {
    title: '5. Rezerwacja terminu',
    body: (
      <>
          <p>Klient otrzymuje indywidualny link do rezerwacji po wcześniejszym Zapytaj behawiorystę i rekomendacji Pełnej konsultacji.</p>
          <p>Po wysłaniu danych w formularzu wybrany slot jest wstępnie blokowany na czas płatności. Standardowe okno blokady wynosi 5 minut.</p>
          <p>Konsultacja jest zarezerwowana dopiero po potwierdzeniu płatności.</p>
          <p>Na 24 godziny przed konsultacją klient otrzymuje e-mail z linkiem do rozmowy i listą materiałów do przygotowania, jeżeli są potrzebne.</p>
          <p>Po zakończeniu konsultacji dalsze 14-dniowe wsparcie tekstowe odbywa się przez WhatsApp. Kontakt WhatsApp jest ustalany indywidualnie po konsultacji, a Pokój przechowuje podsumowanie, historię i informacje o uprawnieniach.</p>
        </>
      ),
  },
  {
    title: '6. Zmiana terminu i anulacja',
    body: (
      <>
        <p>Prośbę o zmianę terminu lub rezygnację należy przesłać na kontakt@regulskibehawiorysta.pl możliwie szybko.</p>
        <p>
          Przy rezygnacji zgłoszonej co najmniej 48 godzin przed spotkaniem usługodawca zwraca całą wpłatę albo — na
          życzenie klienta — przenosi termin. Przy późniejszej rezygnacji strony ustalają zmianę terminu lub rozliczenie
          z uwzględnieniem poniesionych kosztów i zakresu przygotowania; nie wyłącza to praw ustawowych klienta.
        </p>
      </>
    ),
  },
  {
    title: '7. No-show i odwołanie przez usługodawcę',
    body: (
      <>
        <p>
          Jeśli klient nie może dołączyć do rozmowy, powinien skontaktować się z usługodawcą. Nieobecność, problem z
          połączeniem ani spóźnienie są rozpatrywane indywidualnie; jeśli problem leży po stronie usługodawcy lub
          platformy, klient wybiera nowy termin albo zwrot wpłaty.
        </p>
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
        <p>
          Jeżeli klient zażąda rozpoczęcia świadczenia przed upływem 14 dni i odstąpi od umowy przed pełnym wykonaniem,
          może być zobowiązany do zapłaty za część świadczenia spełnioną do chwili odstąpienia, zgodnie z ustawą.
          Oświadczenie można przesłać e-mailem na kontakt@regulskibehawiorysta.pl.
        </p>
      </>
    ),
  },
  {
    title: '9. Reklamacje',
    body: (
      <>
        <p>Klient może złożyć reklamację e-mailem na kontakt@regulskibehawiorysta.pl. Regulamin nie skraca ustawowych terminów ani uprawnień konsumenta.</p>
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
      intro="Dokument opisuje zasady rezerwacji, płatności, zmian terminu, realizacji około 90 minut online, 14 dni wsparcia przez WhatsApp oraz reklamacji dla Pełnej konsultacji online. Pokój przechowuje podsumowanie i historię."
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

