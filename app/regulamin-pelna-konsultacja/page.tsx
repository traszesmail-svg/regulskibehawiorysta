import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection, type LegalSummaryItem } from '@/components/LegalPageLayout'
import { PUBLIC_OFFER_PAYMENT_METHODS } from '@/lib/public-offer-copy'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildLegalMetadata } from '@/lib/seo'

export const metadata: Metadata = buildLegalMetadata(
  'Regulamin PeĹ‚nej konsultacji',
  '/regulamin-pelna-konsultacja',
  'Zasady rezerwacji, pĹ‚atnoĹ›ci, realizacji i reklamacji peĹ‚nej konsultacji behawioralnej online.',
)

const summaryItems: LegalSummaryItem[] = [
  {
    label: 'Produkt objÄ™ty dokumentem',
    value: 'PeĹ‚na konsultacja behawioralna online: 470 zĹ‚, okoĹ‚o 2h online, analiza zachowania, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
  },
  {
    label: 'PĹ‚atnoĹ›Ä‡',
    value: `${PUBLIC_OFFER_PAYMENT_METHODS}. Termin jest pewny dopiero po potwierdzeniu pĹ‚atnoĹ›ci.`,
  },
]

const sections: LegalSection[] = [
  {
    title: '1. Postanowienia ogĂłlne',
    body: (
      <>
        <p>
          Regulamin okreĹ›la zasady rezerwacji, pĹ‚atnoĹ›ci, realizacji i reklamacji usĹ‚ugi PeĹ‚na konsultacja behawioralna
          online.
        </p>
        <p>
          UsĹ‚ugodawca: Krzysztof Regulski, e-mail: kontakt@regulskibehawiorysta.pl.
        </p>
        <p>Konsultacja jest usĹ‚ugÄ… cyfrowÄ… Ĺ›wiadczonÄ… przez internet. Nie ma charakteru porady weterynaryjnej ani diagnozy medycznej.</p>
      </>
    ),
  },
  {
    title: '2. Przedmiot i zakres usĹ‚ugi',
    body: (
      <>
        <ul className="premium-bullet-list">
          <li>Konsultacja trwa okoĹ‚o 2h i odbywa siÄ™ online w formie rozmowy audio lub audio/video.</li>
          <li>W ramach konsultacji usĹ‚ugodawca analizuje opisanÄ… sytuacjÄ™ psa lub kota, porzÄ…dkuje priorytety i przekazuje analizÄ™ zachowania opartÄ… na danych od klienta.</li>
          <li>Po konsultacji klient otrzymuje analizÄ™ zachowania opartÄ… na danych od klienta i indywidualny plan dziaĹ‚ania.</li>
          <li>Przez 7 dni od konsultacji klient moĹĽe w pokoju klienta zadawaÄ‡ pytania, wysyĹ‚aÄ‡ wiadomoĹ›ci tekstowe i filmy oraz konsultowaÄ‡ wdraĹĽanie planu.</li>
          <li>JeĹ›li po 7 dniach brak postÄ™pu albo nie ma poczucia, ĹĽe to skuteczna droga do rozwiÄ…zania, usĹ‚ugodawca moĹĽe wskazaÄ‡ zasadnoĹ›Ä‡ wizyty domowej i terapii ustalanej indywidualnie.</li>
          <li>Konsultacja nie obejmuje diagnostyki weterynaryjnej, zaleceĹ„ farmakologicznych ani interwencji w stanach nagĹ‚ych.</li>
        </ul>
        <p>
          JeĹĽeli opisana sytuacja wymaga interwencji weterynarza lub innego specjalisty, usĹ‚ugodawca informuje o tym
          klienta i moĹĽe odmĂłwiÄ‡ dalszej realizacji konsultacji, zwracajÄ…c 100% wpĹ‚aty.
        </p>
      </>
    ),
  },
  {
    title: '3. Cena i pĹ‚atnoĹ›Ä‡',
    body: (
      <>
        <p>Cena konsultacji: 470 zĹ‚ brutto.</p>
        <p>Metody pĹ‚atnoĹ›ci: {PUBLIC_OFFER_PAYMENT_METHODS}. JeĹĽeli aktywna jest pĹ‚atnoĹ›Ä‡ online, klient przechodzi do niej bezpoĹ›rednio po utworzeniu rezerwacji. JeĹĽeli aktywna jest pĹ‚atnoĹ›Ä‡ rÄ™czna, klient otrzymuje dalszÄ… instrukcjÄ™ dla wybranej metody.</p>
        <p>Termin jest wstÄ™pnie blokowany na czas pĹ‚atnoĹ›ci. Standardowe okno blokady wynosi 15 minut.</p>
        <p>Termin zostaje ostatecznie zablokowany dopiero po potwierdzeniu pĹ‚atnoĹ›ci. Przy pĹ‚atnoĹ›ci rÄ™cznej potwierdzenie moĹĽe wymagaÄ‡ obsĹ‚ugi przez usĹ‚ugodawcÄ™ w godzinach 9:00-21:00, poza dniami ustawowo wolnymi od pracy.</p>
        <p>Rezerwacja bez dokonanej lub potwierdzonej pĹ‚atnoĹ›ci nie jest wiÄ…ĹĽÄ…ca, a termin moĹĽe wrĂłciÄ‡ do puli dostÄ™pnych terminĂłw.</p>
      </>
    ),
  },
  {
    title: '4. Wymagania techniczne',
    body: (
      <>
        <p>
          Konsultacja odbywa siÄ™ przez Jitsi Meet â€” nie wymaga instalacji aplikacji ani konta. Wystarczy kliknÄ…Ä‡ link przesĹ‚any e-mailem przed rozmowÄ….
        </p>
        <p>
          Przy formacie 15 i 30 minut potrzebne jest tylko audio (mikrofon i gĹ‚oĹ›nik albo sĹ‚uchawki). Przy PeĹ‚nej konsultacji kamera moĹĽe pomĂłc, ale nie jest obowiÄ…zkowa.
        </p>
        <p>Wymagany jest dostÄ™p do internetu, aktualna przeglÄ…darka (Chrome, Firefox, Safari, Edge) oraz aktywny adres e-mail.</p>
      </>
    ),
  },
  {
    title: '5. Rezerwacja terminu',
    body: (
      <>
          <p>Klient inicjuje rezerwacjÄ™ przez formularz na stronie /book, wybierajÄ…c dostÄ™pny termin i opisujÄ…c sytuacjÄ™.</p>
          <p>Po wysĹ‚aniu danych w formularzu wybrany slot jest wstÄ™pnie blokowany na czas pĹ‚atnoĹ›ci. Standardowe okno blokady wynosi 15 minut.</p>
          <p>Konsultacja jest zarezerwowana dopiero po potwierdzeniu pĹ‚atnoĹ›ci.</p>
          <p>Na 24 godziny przed konsultacjÄ… klient otrzymuje e-mail z linkiem do rozmowy i listÄ… materiaĹ‚Ăłw do przygotowania, jeĹĽeli sÄ… potrzebne.</p>
          <p>Po zakoĹ„czeniu konsultacji dalszy 7-dniowy kontakt tekstowy odbywa siÄ™ w pokoju klienta, chyba ĹĽe strony ustalÄ… inny kanaĹ‚ pisemny.</p>
        </>
      ),
  },
  {
    title: '6. Zmiana terminu i anulacja',
    body: (
      <>
        <p>Do 48 godzin przed konsultacjÄ… klient moĹĽe bezpĹ‚atnie zmieniÄ‡ termin albo zrezygnowaÄ‡ i otrzymaÄ‡ zwrot 100% wpĹ‚aty.</p>
        <p>PomiÄ™dzy 48 a 24 godzinami przed terminem moĹĽliwa jest bezpĹ‚atna zmiana terminu albo zwrot 50% wpĹ‚aty.</p>
        <p>KrĂłcej niĹĽ 24 godziny przed terminem wpĹ‚ata nie podlega zwrotowi, chyba ĹĽe przyczynÄ… jest siĹ‚a wyĹĽsza lub niedostÄ™pnoĹ›Ä‡ usĹ‚ugodawcy.</p>
      </>
    ),
  },
  {
    title: '7. No-show i odwoĹ‚anie przez usĹ‚ugodawcÄ™',
    body: (
      <>
        <p>JeĹ›li klient nie doĹ‚Ä…czy do rozmowy w ciÄ…gu 15 minut od planowanego poczÄ…tku i nie skontaktuje siÄ™ z usĹ‚ugodawcÄ…, konsultacja uznawana jest za zrealizowanÄ… bez prawa do zwrotu.</p>
        <p>W przypadku problemĂłw technicznych udokumentowanych przez klienta usĹ‚ugodawca proponuje nowy termin bez dopĹ‚aty.</p>
        <p>W sytuacjach wyjÄ…tkowych usĹ‚ugodawca moĹĽe odwoĹ‚aÄ‡ konsultacjÄ™. W takim przypadku klient otrzymuje wybĂłr: nowy termin w ciÄ…gu 30 dni albo peĹ‚ny zwrot wpĹ‚aty.</p>
      </>
    ),
  },
  {
    title: '8. Prawo odstÄ…pienia od umowy',
    body: (
      <>
        <p>Konsument ma prawo odstÄ…piÄ‡ od umowy zawartej na odlegĹ‚oĹ›Ä‡ w terminie 14 dni bez podania przyczyny, z zastrzeĹĽeniem przepisĂłw szczegĂłlnych o usĹ‚ugach wykonanych za zgodÄ… klienta.</p>
        <p>Przy rezerwacji klient skĹ‚ada osobnÄ… zgodÄ™ na rozpoczÄ™cie Ĺ›wiadczenia usĹ‚ugi przed upĹ‚ywem 14-dniowego terminu i przyjmuje do wiadomoĹ›ci, ĹĽe po zakoĹ„czonej konsultacji traci prawo odstÄ…pienia od umowy w zakresie wykonanej usĹ‚ugi.</p>
        <p>Do momentu rozpoczÄ™cia konsultacji klient zachowuje prawo odstÄ…pienia na zasadach ogĂłlnych. ZgĹ‚oszenie e-mailem jest wystarczajÄ…ce.</p>
      </>
    ),
  },
  {
    title: '9. Reklamacje',
    body: (
      <>
        <p>Klient moĹĽe zĹ‚oĹĽyÄ‡ reklamacjÄ™ e-mailem na kontakt@regulskibehawiorysta.pl w ciÄ…gu 14 dni od konsultacji.</p>
        <p>Reklamacja powinna zawieraÄ‡ imiÄ™ i nazwisko, datÄ™ konsultacji oraz opis nieprawidĹ‚owoĹ›ci.</p>
        <p>UsĹ‚ugodawca rozpatruje reklamacjÄ™ w ciÄ…gu 14 dni roboczych. JeĹĽeli reklamacja jest zasadna, klient otrzymuje zwrot czÄ™Ĺ›ci lub caĹ‚oĹ›ci wpĹ‚aty albo darmowÄ… konsultacjÄ™ uzupeĹ‚niajÄ…cÄ….</p>
        <p>
          Konsument moĹĽe skorzystaÄ‡ z pozasÄ…dowych sposobĂłw rozpatrywania reklamacji i dochodzenia roszczeĹ„, w tym z pomocy
          miejskiego lub powiatowego rzecznika konsumentĂłw oraz informacji dostÄ™pnych na stronie UOKiK.
        </p>
      </>
    ),
  },
  {
    title: '10. Ochrona danych osobowych i poufnoĹ›Ä‡',
    body: (
      <>
        <p>Administratorem danych osobowych klienta jest usĹ‚ugodawca wskazany w nagĹ‚Ăłwku dokumentu.</p>
        <p>Dane sÄ… przetwarzane w celu realizacji konsultacji, wystawienia dokumentu sprzedaĹĽowego i kontaktu zwrotnego. SzczegĂłĹ‚y znajdujÄ… siÄ™ w Polityce prywatnoĹ›ci.</p>
        <p>UsĹ‚ugodawca zachowuje poufnoĹ›Ä‡ informacji przekazanych przez klienta podczas konsultacji. Konsultacja nie jest nagrywana bez wyraĹşnej zgody klienta.</p>
      </>
    ),
  },
  {
    title: '11. Postanowienia koĹ„cowe',
    body: (
      <>
        <p>W sprawach nieuregulowanych regulaminem zastosowanie majÄ… przepisy prawa polskiego, w szczegĂłlnoĹ›ci Kodeksu cywilnego i ustawy o prawach konsumenta.</p>
        <p>UsĹ‚ugodawca zastrzega prawo do zmiany regulaminu. Rezerwacje opĹ‚acone przed zmianÄ… regulaminu sÄ… realizowane na zasadach obowiÄ…zujÄ…cych w momencie rezerwacji.</p>
        <p>Regulamin wchodzi w ĹĽycie z dniem opublikowania na stronie /regulamin-pelna-konsultacja.</p>
      </>
    ),
  },
]

export default function FullConsultationTermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Regulamin / peĹ‚na konsultacja"
      title="Regulamin PeĹ‚nej konsultacji behawioralnej online"
      intro="Dokument opisuje zasady rezerwacji, pĹ‚atnoĹ›ci, zmian terminu, realizacji okoĹ‚o 2h online, 14 dni komunikacji w pokoju klienta i reklamacji dla PeĹ‚nej konsultacji online."
      summaryItems={summaryItems}
      sections={sections}
      structuredData={[
        getBreadcrumbJsonLd([
          { name: 'Strona gĹ‚Ăłwna', path: '/' },
          { name: 'Regulamin PeĹ‚nej konsultacji', path: '/regulamin-pelna-konsultacja' },
        ]),
      ]}
    />
  )
}

