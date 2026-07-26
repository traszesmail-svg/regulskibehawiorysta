import type { Metadata } from 'next'
import { LegalPageLayout, type LegalSection, type LegalSummaryItem } from '@/components/LegalPageLayout'
import { PUBLIC_OFFER_PAYMENT_METHODS } from '@/lib/public-offer-copy'
import { getBreadcrumbJsonLd } from '@/lib/schema'
import { buildLegalMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildLegalMetadata(
  'Regulamin',
  '/regulamin',
  'Regulamin serwisu, newslettera, materiałów bezpłatnych, rezerwacji, płatności, zmian terminu i reklamacji w serwisie Regulski.',
)

const summaryItems: LegalSummaryItem[] = [
  {
    label: 'Usługi objęte dokumentem',
    value: 'Kwadrans, Kwadrans na już, Dwa kwadranse, newsletter, materiały bezpłatne oraz podstawowe zasady korzystania z serwisu.',
  },
  {
    label: 'Model płatności',
    value: `${PUBLIC_OFFER_PAYMENT_METHODS}. Termin jest pewny dopiero po potwierdzeniu płatności.`,
  },
  {
    label: 'Kontakt w sprawach dokumentu',
    value: 'Kontakt prowadzony jest przez formularz kontaktowy oraz e-mail.',
  },
]

const sections: LegalSection[] = [
  {
    title: '1. Postanowienia ogólne',
    body: (
      <>
        <p>
          Regulamin określa zasady korzystania z serwisu, składania rezerwacji oraz realizacji usług świadczonych na
          odległość przez Krzysztofa Regulskiego w ramach marki Regulski Behawiorysta.
        </p>
        <p>
          Dokument dotyczy usług publicznie dostępnych w serwisie oraz procesów kontaktu, rezerwacji, potwierdzenia
          terminu i reklamacji.
        </p>
      </>
    ),
  },
  {
    title: '2. Zakres usług',
    body: (
      <>
        <ul className="premium-bullet-list">
          <li>Kwadrans to 15 min połączenia telefonicznego na jedno główne pytanie.</li>
          <li>Kwadrans na już ma ten sam zakres co Kwadrans, ale z priorytetem i najbliższym realnym terminem.</li>
          <li>Dwa kwadranse to 30 min połączenia telefonicznego dla tematów szerszych niż sam Kwadrans.</li>
          <li>Pełna konsultacja ma osobny regulamin i osobną stronę warunków.</li>
        </ul>
        <p>
          Usługi mają charakter konsultacji behawioralnych świadczonych na odległość. W uzasadnionych przypadkach klient
          może zostać poproszony o wcześniejsze wykluczenie tła zdrowotnego lub konsultację weterynaryjną.
        </p>
        <p>
          Konsultacja behawioralna nie jest poradą weterynaryjną, diagnozą medyczną ani leczeniem zwierzęcia na odległość.
          Jeżeli opis sytuacji wskazuje na ból, chorobę, nagłą zmianę stanu albo potrzebę diagnostyki lekarskiej, pierwszym
          krokiem jest kontakt z lekarzem weterynarii.
        </p>
      </>
    ),
  },
  {
    title: '3. Wymagania techniczne',
    body: (
      <>
        <p>
          Do korzystania z serwisu i realizacji usług niezbędne są: urządzenie z dostępem do internetu, aktualna
          przeglądarka internetowa, aktywny adres e-mail oraz możliwość odebrania połączenia audio albo dołączenia do
          konsultacji online.
        </p>
        <p>
          Klient powinien zapewnić warunki umożliwiające spokojny udział w rozmowie oraz samodzielny dostęp do linku
          przekazanego po potwierdzeniu rezerwacji.
        </p>
      </>
    ),
  },
  {
    title: '4. Rezerwacja',
    body: (
      <>
        <p>
          Rezerwacja następuje po wyborze usługi, dostępnego terminu oraz podaniu podstawowych danych kontaktowych przez
          formularz rezerwacyjny albo inną ścieżkę udostępnioną w serwisie.
        </p>
        <p>
          Po wysłaniu danych w formularzu wybrany slot jest wstępnie blokowany na czas przejścia do płatności. Standardowe
          okno blokady wynosi 15 minut. Rezerwacja staje się pewna dopiero po potwierdzeniu płatności.
        </p>
        <p>Wiadomość wysłana przez formularz kontaktowy ma charakter wstępny i nie zastępuje rezerwacji usługi.</p>
      </>
    ),
  },
  {
    title: '5. Płatność i potwierdzenie',
    body: (
      <>
        <p>
          Publicznie komunikowany model płatności to {PUBLIC_OFFER_PAYMENT_METHODS}. Jeżeli aktywna jest płatność online,
          klient przechodzi do niej bezpośrednio po utworzeniu rezerwacji. Jeżeli aktywna jest płatność BLIK według
          instrukcji, klient otrzymuje dane potrzebne do wykonania wpłaty.
        </p>
        <p>
          Termin zostaje ostatecznie zablokowany dopiero po potwierdzeniu płatności. Przy płatności BLIK według instrukcji
          wpłatę potwierdza usługodawca w godzinach 9-21, poza dniami ustawowo wolnymi od pracy.
        </p>
        <p>Nieopłacona lub niepotwierdzona rezerwacja może wygasnąć, a termin może wrócić do puli dostępnych terminów.</p>
      </>
    ),
  },
  {
    title: '6. Kody od lecznic i wybór kanału',
    body: (
      <>
        <p>
          Jednorazowy kod przekazany przez lecznicę dotyczy tej samej usługi Kwadrans i nie tworzy odrębnej usługi ani
          nie omija terminarza. Po sprawdzeniu kodu klient wybiera gatunek, temat, dostępny termin i uzupełnia formularz rezerwacji.
        </p>
        <p>
          Po potwierdzeniu kodu klient wybiera kanał realizacji: rozmowę przez Jitsi bez dopłaty albo rozmowę telefoniczną
          jako odpłatną usługę dodatkową. Wysokość dopłaty jest pokazywana przed wyborem telefonu i przed złożeniem zamówienia.
          Dla wariantu telefonicznego podanie prawidłowego numeru telefonu jest obowiązkowe.
        </p>
        <p>
          Brak zapłaty albo brak potwierdzenia dopłaty telefonicznej nie odbiera prawa do wariantu Jitsi uzyskanego kodem.
          Kanał zostaje zmieniony na telefon dopiero po potwierdzeniu dopłaty. Połączenie telefoniczne może być realizowane
          technicznie przez Zadarma na numer podany przez klienta.
        </p>
        <p>
          Kod jest zużywany przy potwierdzeniu rezerwacji, ma limit jednego użycia i może mieć termin ważności. W razie
          odwołania terminu lub awarii po stronie usługodawcy klient powinien skontaktować się w celu przeniesienia uprawnienia
          albo ustalenia nowego terminu. Nieodebranie prawidłowo zestawionego połączenia przez klienta może zostać uznane za
          niestawienie się na usługę; awaria po stronie usługodawcy lub operatora nie obciąża klienta.
        </p>
        <p>
          Jeżeli termin przypada przed upływem 14 dni od zawarcia umowy, klient składa w formularzu wyraźne żądanie rozpoczęcia
          świadczenia przed upływem tego terminu i przyjmuje do wiadomości skutki pełnego wykonania usługi dla prawa odstąpienia.
        </p>
      </>
    ),
  },  {
    title: '7. Realizacja usługi',
    body: (
      <>
        <p>
          Po potwierdzeniu wpłaty klient otrzymuje dalszą instrukcję, a jeżeli usługa tego wymaga, także link do rozmowy
          albo informacje o kolejnym kroku.
        </p>
        <p>
          Przed rozmową klient może dobrowolnie dodać materiały przygotowawcze, w szczególności krótki opis sprawy, linki
          lub nagrania. Materiały te mają charakter pomocniczy.
        </p>
      </>
    ),
  },
  {
    title: '8. Zmiana terminu i rezygnacja',
    body: (
      <>
        <p>Po potwierdzeniu wpłaty klient ma 24 godziny na zgłoszenie rezygnacji albo wniosku o zmianę terminu.</p>
        <p>
          Ewentualny zwrot środków wymaga kontaktu i jest rozpatrywany indywidualnie z uwzględnieniem etapu realizacji
          usługi oraz przebiegu rezerwacji.
        </p>
        <p>Po upływie wskazanego terminu zmiana lub odwołanie rezerwacji może nie być możliwe bez poniesienia kosztu usługi.</p>
      </>
    ),
  },
  {
    title: '9. Nieobecność i wygaśnięcie rezerwacji',
    body: (
      <>
        <p>Jeżeli klient nie opłaci rezerwacji albo wpłata nie zostanie potwierdzona, rezerwacja może zostać zamknięta jako nieaktywna.</p>
        <p>Jeżeli klient nie stawi się na opłaconą usługę bez wcześniejszego kontaktu, rezerwacja może zostać uznana za zrealizowaną.</p>
      </>
    ),
  },
  {
    title: '10. Ograniczenie odpowiedzialności i siła wyższa',
    body: (
      <>
        <p>
          Usługa ma charakter konsultacji behawioralnej i nie stanowi porady weterynaryjnej ani diagnozy medycznej. Usługodawca nie ponosi
          odpowiedzialności za brak konkretnych efektów terapeutycznych, jeżeli klient nie wdrożył uzgodnionych zaleceń lub zachowanie zwierzęcia
          wynika z przyczyn zdrowotnych wymagających interwencji weterynaryjnej.
        </p>
        <p>
          W przypadku siły wyższej (awaria łączności po stronie usługodawcy, zdarzenia losowe, niedostępność platformy technicznej niezależna od
          usługodawcy) realizacja usługi zostanie przełożona na najbliższy możliwy termin albo klient otrzyma pełny zwrot wpłaty.
        </p>
      </>
    ),
  },
  {
    title: '11. Reklamacje',
    body: (
      <>
        <p>Reklamacje dotyczące działania serwisu, procesu rezerwacji albo realizacji usługi można zgłaszać przez formularz kontaktowy lub e-mail.</p>
        <p>Zgłoszenie powinno zawierać dane pozwalające zidentyfikować sprawę oraz krótki opis zastrzeżeń. Reklamacje są rozpatrywane bez zbędnej zwłoki.</p>
        <p>
          Konsument może skorzystać z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń, w tym z pomocy
          miejskiego lub powiatowego rzecznika konsumentów oraz informacji dostępnych na stronie UOKiK.
        </p>
      </>
    ),
  },
  {
    title: '12. Dane osobowe',
    body: (
      <>
        <p>Zasady przetwarzania danych osobowych związanych z serwisem, kontaktem, rezerwacją i realizacją usług określa odrębna Polityka prywatności.</p>
      </>
    ),
  },
  {
    title: '13. Newsletter i materiały bezpłatne',
    body: (
      <>
        <p>
          Zapis do newslettera jest dobrowolny i bezpłatny. Wymaga podania aktywnego adresu e-mail, wybrania
          segmentu tematycznego oraz potwierdzenia zgody na otrzymywanie wiadomości.
        </p>
        <p>
          Newsletter jest planowany co do zasady raz w miesiącu. Może zawierać wskazówki dotyczące zachowania psów
          i kotów, odnośniki do artykułów, informacje o aktualnych materiałach oraz treści związane z ofertą serwisu.
          Częstotliwość może zostać czasowo zmieniona z przyczyn redakcyjnych lub technicznych.
        </p>
        <p>
          Po prawidłowym zapisie użytkownik może otrzymać materiał startowy dobrany do wybranego segmentu: pies,
          kot albo oba. Materiał jest dostępny także przez bezpośredni link pokazany po zapisie, jeżeli dodatkowa
          wiadomość e-mail nie zostanie dostarczona.
        </p>
        <p>
          Materiały i newsletter mają charakter edukacyjny. Nie stanowią diagnozy medycznej, porady weterynaryjnej
          ani indywidualnego planu terapii i nie zastępują konsultacji dotyczącej konkretnego zwierzęcia.
        </p>
        <p>
          Z newslettera można zrezygnować w każdym czasie, bez opłat i bez negatywnych konsekwencji, korzystając
          z linku rezygnacji umieszczonego w wiadomości albo kontaktując się przez formularz lub e-mail. Wycofanie
          zgody nie wpływa na zgodność z prawem działań wykonanych przed jej wycofaniem.
        </p>
      </>
    ),
  },
  {
    title: '14. Postanowienia końcowe',
    body: (
      <>
        <p>Regulamin obowiązuje od dnia jego opublikowania w serwisie i ma zastosowanie do rezerwacji składanych po tej dacie.</p>
        <p>W sprawach nieuregulowanych w regulaminie zastosowanie mają odpowiednie przepisy prawa polskiego.</p>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Regulamin"
      title="Regulamin świadczenia usług"
      intro="Dokument określa zasady korzystania z serwisu, newslettera, materiałów bezpłatnych, rezerwacji usług, dokonywania płatności, potwierdzeń, zmian terminu oraz trybu składania reklamacji."
      summaryItems={summaryItems}
      sections={sections}
      structuredData={[
        getBreadcrumbJsonLd([
          { name: 'Strona główna', path: '/' },
          { name: 'Regulamin', path: '/regulamin' },
        ]),
      ]}
    />
  )
}
