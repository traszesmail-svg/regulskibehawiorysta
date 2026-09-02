# Plan uporządkowania strony po audycie biznesowym

Data: 31.08.2026

## Status i zasada pracy

Plan zapisany do późniejszej dyskusji. Nie rozpoczęto wdrażania żadnego punktu.

Prace wykonujemy sekwencyjnie, punkt po punkcie. Przed rozpoczęciem każdego następnego punktu najpierw omawiamy jego wygląd, układ, teksty, zachowanie na telefonie i komputerze oraz kryteria akceptacji. Dopiero po akceptacji zakresu i wyglądu rozpoczyna się implementacja. Nie przechodzę automatycznie do następnego punktu.

Istniejący `plan2908.md` pozostaje bez zmian.

## Kolejność punktów

### 0. Decyzja strategiczna

Ustalić, czy głównym biznesem są konsultacje, czy konsultacje i materiały cyfrowe; jaka jest rola Mapy, bloga, PDF-ów, newslettera oraz czterech produktów konsultacyjnych.

Przed punktem 1 omawiamy ogólną hierarchię strony i wygląd głównej ścieżki klienta.

### 1. Bezpieczeństwo Mapy zachowania — priorytet krytyczny

Wprowadzić rzeczywisty triage dotyczący zagrożenia, urazu człowieka, nagłego problemu zdrowotnego, ucieczki, samookaleczenia i objawów weterynaryjnych. Przypadki alarmowe mają otrzymać odpowiednią rekomendację pomocy, a nie zwykłe przejście do płatnej konsultacji.

Do omówienia: kolejność pytań, wygląd ostrzeżeń, wynik Mapy i przyciski końcowe.

### 2. Prawda o cenie, płatności i rezerwacji

Ujednolicić copy z rzeczywistym procesem: wybór terminu, dane, płatność, potwierdzenie. Wyjaśnić 15-minutowy hold, zwykły BLIK po instrukcji e-mail oraz BLIK na telefon w ścieżce lecznicy. Zdecydować, czy „Cena promocyjna” i termin niedzielny oznaczają realną promocję.

Do omówienia: stepper, karta ceny, hold, oczekiwanie na BLIK i potwierdzenie.

### 3. Kwadrans na już

Zdecydować, czy jest to rozmowa live, callback czy pilne ręczne ustalenie terminu. Dopasować nazwę, cenę i obietnicę do realnego czasu reakcji. Rozdzielić formularz kontaktowy od właściwej ścieżki pilnej.

Do omówienia: karta dostępności, ekran oczekiwania, panel operatora i stany dostępny / rezerwacja / rozmowa / niedostępny.

### 4. Architektura produktów i ceny

Policzyć rzeczywisty czas obsługi, przygotowanie, notatki, płatności i komunikację po rozmowie. Ocenić rolę Kwadransa, Kwadransa na już, Dwóch kwadransów i Pełnej konsultacji. Nie zmieniać cen bez danych o marży, konwersji i kolejnych zakupach.

Do omówienia: porównanie produktów, zakres, kanał, wsparcie i sposób wyróżnienia oferty.

### 5. Zaufanie i kwalifikacje

Ustalić jedną dokładną wersję opisu kwalifikacji. Uporządkować opinie według daty, usługi, problemu, zgody i źródła. Nie sugerować niezależnego rankingu, jeśli opinie są zbierane bezpośrednio.

Do omówienia: moduł kwalifikacji, karta opinii, anonimowość i kontekst rezultatu.

### 6. Główna ścieżka i nawigacja

Rozdzielić ścieżkę osoby gotowej do zakupu, osoby niezdecydowanej, ruchu z Google, edukacji i lead magnetu. Sprawdzić domyślnego psa/szczeniaka w `/wybor` i `/book`, obecność „Twój pokój”, CTA topbara i stopki oraz duplikację `/cennik` i `/cennik/pelny`.

Do omówienia: menu desktop/mobile, hierarchia CTA, stopka i wygląd ścieżki „kupuję” versus „nie wiem”.

### 7. Model materiałów PDF

Wybrać jeden model: darmowe PDF-y jako lead magnety wspierające konsultacje albo pełny sklep cyfrowy. Następnie uporządkować rozjazd katalogu, ukryte pakiety, niedziałające adresy, kotwice, sitemapę, podgląd stron, automatyczną dostawę i CTA do konsultacji.

Do omówienia: katalog, karta PDF-a, podgląd, pakiety i miejsce materiałów w nawigacji.

### 8. Blog i strony problemów

Sprawdzić ruch organiczny, przejścia do ofert i konwersje wspomagane. Blog ma wspierać model `artykuł → strona problemu → oferta → rezerwacja`, a nie tworzyć osobny sklep. Uporządkować CTA i samoodwołujący link na stronie lęku separacyjnego.

Do omówienia: karta artykułu, CTA, przejście do problemu i obecność Bloga w głównej nawigacji.

### 9. Kontakt, Newsletter, Instagram, Pokój i lecznica

Rozdzielić funkcje: Kontakt dla spraw niepilnych, Kwadrans na już dla pilnych, Newsletter dla retencji, Instagram jako link hub, Pokój jako wartość po zakupie, lecznica jako osobny kanał partnerski.

Do omówienia: widoczność tych elementów, komunikaty czasu odpowiedzi i odseparowanie B2C od B2B.

### 10. SEO, wydajność i analityka

Uporządkować kanoniczne strony Cennika, indeksowanie stron transakcyjnych, sitemapę, daty aktualizacji, szczegółowe materiały, stare przekierowania, obrazy zewnętrzne, identyfikatory wydań i pomiar konwersji.

### 11. Testy i bramka wydania

Na końcu sprawdzić triage, ceny, płatności, hold, zwykły booking, Kwadrans na już, lecznicę, blog, problemy, PDF-y, mobile, desktop, `tsc`, testy, lint, build, smoke test produkcyjny i analitykę.

Punkt uznajemy za zakończony dopiero po weryfikacji rzeczywistego zachowania publicznej strony, nie po samym buildzie.

## Czego nie robić automatycznie

- nie zmieniać cen bez danych;
- nie usuwać bloga bez sprawdzenia ruchu i konwersji wspomaganych;
- nie rozwijać PDF-ów bez ustalenia modelu biznesowego;
- nie wyłączać Zadarmy ani ścieżki lecznicy bez osobnej decyzji;
- nie dodawać kolejnych produktów, landingów ani CTA przed uporządkowaniem obecnych;
- nie rozpoczynać kolejnego punktu bez omówienia jego wyglądu i zakresu.

## Pierwszy temat do omówienia

Punkt 0: ogólna hierarchia strony i wygląd głównej ścieżki klienta. Dopiero po jego omówieniu można rozpocząć projektowanie Punktu 1.

## Punkt 0 — decyzja strategiczna: propozycja robocza

Status: opracowane do dyskusji; nie wdrożono zmian w stronie. Punkt 1 pozostaje zablokowany do czasu omówienia wyglądu i akceptacji tej hierarchii.

### 0.1. Główny model biznesowy

Rekomendacja: konsultacje są głównym biznesem. Blog, darmowe PDF-y i newsletter mają pozyskiwać oraz ogrzewać osoby zainteresowane, a nie tworzyć równoległy sklep ważniejszy od konsultacji.

Powód: konsultacja i pełna konsultacja z pokojem klienta są główną wartością ekspercką. Płatne PDF-y po 19 zł oraz ręczna obsługa płatności mogą mieć zbyt małą marżę, aby uzasadnić osobną złożoną gałąź biznesu.

### 0.2. Rola produktów konsultacyjnych

Na tym etapie nie zmieniam cen. Przyjmuję roboczo następujące role:

- Kwadrans — domyślny produkt dla jednego głównego pytania;
- Dwa kwadranse — produkt pośredni dla kilku wątków;
- Pełna konsultacja — produkt dla złożonego lub długotrwałego problemu, z planem i 14 dniami komunikacji;
- Kwadrans na już — priorytet dostępności, a nie czwarty równorzędny zakres usługi; powinien być oferowany tylko wtedy, gdy realny czas reakcji jest możliwy.

Cena 104 zł wymaga prawdziwej przewagi czasowej. Bez realnego SLA jest tylko droższym formularzem kontaktowym.

### 0.3. Rola Mapy zachowania

Mapa ma być opcjonalnym doradcą dla osoby, która nie wie, którą usługę wybrać. Nie powinna być obowiązkową bramką dla osoby gotowej do zakupu.

Jednocześnie przed rekomendacją produktu musi powstać prawdziwa bramka bezpieczeństwa. To będzie Punkt 1.

### 0.4. Rola bloga

Blog zostaje jako warstwa SEO, edukacji i zaufania, ale nie jako główny produkt ani główna ścieżka zakupu. Nie planować seryjnej produkcji nowych artykułów bez danych o wejściach jakościowych i konwersjach wspomaganych.

Docelowa funkcja treści: artykuł → strona konkretnego problemu → właściwa konsultacja.

### 0.5. Rola PDF-ów i newslettera

Darmowe PDF-y traktować jako lead magnety prowadzące do konsultacji. Płatny katalog PDF-ów i pakiety pozostają wstrzymane strategicznie do czasu policzenia marży, automatyzacji dostawy i uporządkowania dostępnych produktów.

Newsletter ma być kanałem dalszego kontaktu z osobą, która jeszcze nie kupiła. Nie jest osobnym produktem i nie powinien konkurować z konsultacją.

### 0.6. Proponowana hierarchia strony

Główna strona powinna prowadzić do dwóch podstawowych decyzji:

1. Wiem, czego potrzebuję — przejście do konsultacji, ceny i terminów.
2. Nie wiem, od czego zacząć — przejście do Mapy zachowania.

Ścieżka pilna powinna być trzecim, wyraźnie warunkowym komunikatem, widocznym tylko przy realnej dostępności i jasno opisanym czasie reakcji.

Proponowana hierarchia informacji:

1. obietnica pomocy dla opiekuna psa lub kota;
2. dwa główne wybory: zakup albo Mapa;
3. warunkowy Kwadrans na już;
4. konkretne problemy i przykłady sytuacji;
5. dowód kompetencji i wiarygodne opinie;
6. krótki opis procesu;
7. FAQ i kontakt;
8. blog, PDF-y i newsletter jako warstwa wspierająca.

### 0.7. Proponowana hierarchia nawigacji

Pierwszeństwo powinny mieć: Konsultacje/Cennik, Mapa zachowania, Problemy i O mnie. FAQ oraz Kontakt mogą pozostać drugorzędne. Blog powinien być dostępny, ale nie musi być głównym CTA. Pokój klienta powinien mieć charakter użytkowy po zakupie, a lecznica osobną ścieżkę partnerską.

To jest koncepcja do omówienia, nie wdrożony projekt menu.

### 0.8. Decyzje świadomie odłożone

- nie zmieniać jeszcze cen;
- nie usuwać bloga;
- nie rozwijać katalogu płatnych PDF-ów;
- nie wyłączać Zadarmy;
- nie przebudowywać jeszcze Mapy;
- nie zaczynać Punktu 1 przed omówieniem wyglądu głównej hierarchii.

### 0.9. Kryterium zakończenia Punktu 0

Punkt 0 będzie uznany za zakończony po zaakceptowaniu albo zakwestionowaniu przez właściciela strony:

- modelu konsultacje-first;
- roli każdego produktu;
- roli Mapy, bloga, PDF-ów i newslettera;
- dwóch głównych wyborów na stronie głównej;
- warunkowej roli Kwadransa na już;
- ogólnej hierarchii informacji i nawigacji.

Dopiero po tej dyskusji można przygotować wygląd Punktu 1 — bezpiecznej Mapy zachowania.

## Aktualizacja Punktu 0 po dalszej dyskusji — pipeline klienta

Status: decyzja robocza do omówienia. Nie rozpoczęto implementacji.

### Model usługi

`Zapytaj behawiorystę — 15 min` jest samodzielną, płatną usługą. Klient płaci za rozmowę i pierwszy konkretny kierunek. Nie jest to zaliczka ani automatyczny upgrade do konsultacji.

Po rozmowie behawiorysta sam decyduje, czy przyznać klientowi indywidualny dostęp do terminarza konsultacji. Konsultacja jest osobną usługą i osobną płatnością.

### Dostępność tej samej usługi

Zwykły termin i rozmowa live są dwoma sposobami skorzystania z tej samej usługi:

- zwykły termin ma standardową cenę;
- `Zapytaj teraz` pojawia się tylko przy rzeczywistej dostępności i może mieć dopłatę za priorytet;
- gdy trwa rozmowa, klient widzi realny stan oraz zwykłe terminy albo powiadomienie;
- nie uruchamiać od razu otwartej, płatnej kolejki.

### Rola Pokoju klienta

Istniejący Pokój powinien być centrum obsługi po zakupie, a nie kolejnym produktem. Na górze ma pokazywać najbliższy krok, a dalej:

- dane klienta i zwierzęcia;
- historię usług i rozmów;
- krótkie podsumowanie rozmowy;
- liczbę pytań uzupełniających i termin ich wykorzystania;
- przyznany link do terminarza konsultacji;
- widoczne opisy pozostałych usług bez terminarza;
- dopasowane materiały PDF i ewentualnie jeden konkretny artykuł.

Dla każdego wykupionego `Zapytaj` roboczo przyjąć na początku 1–2 pytania uzupełniające. Ich zakres, czas ważności i sposób odpowiedzi trzeba później jednoznacznie opisać.

Nie budować równocześnie rozbudowanego czatu w Pokoju i pełnego kanału WhatsApp. Panel powinien przechowywać historię i uprawnienia, a kanał kontaktu musi być przypisany do konkretnej usługi.

### Rekomendacja po rozmowie

Nie trzeba tworzyć rozbudowanych statusów decyzji. Wystarczy najbliższy krok ustalony przez behawiorystę:

- przyznany dostęp do konsultacji;
- zalecany materiał lub artykuł zamiast konsultacji;
- zalecenie kontaktu z weterynarzem albo inną pomocą, gdy temat tego wymaga.

Zasada „zawsze poleć PDF” nie może dotyczyć przypadków bezpieczeństwa ani zdrowia. W takich sytuacjach pierwszeństwo ma właściwa pomoc, nie cross-selling. W pozostałych przypadkach powinien pojawić się jeden trafny materiał, a artykuł blogowy może być dodatkiem, nie kolejnym równorzędnym wyborem.

### Pozostałe usługi

Konsultacja, terapia, socjalizacja i hotel terapeutyczny mogą być widoczne w Pokoju oraz na stronach informacyjnych, ale ich terminarze pozostają kontrolowane przez behawiorystę. Samo ukrycie kalendarza nie wystarczy: każda usługa musi mieć publiczny opis zakresu, ceny lub zasad wyceny, kwalifikacji i kolejnego kroku.

### Wybór gatunku, problemu i rasy — właściwe miejsce w planie

Decyzja architektoniczna należy do Punktu 6 — główna ścieżka i nawigacja. Implementacja pól należy później do Punktu 2/3 — procesu rezerwacji i formularzy.

Rekomendacja:

- gatunek psa lub kota pytać wcześnie, ponieważ wpływa na treści, triage i rekomendacje PDF;
- problemu nie wymagać jako dokładnej etykiety przed 15-minutową rozmową; klient ma móc opisać sytuację własnymi słowami;
- rasa nie powinna być warunkiem wejścia do rozmowy i nie powinna sugerować diagnozy; można zebrać ją później jako dane kontekstowe, szczególnie przy konsultacji, terapii lub hotelu;
- po rozmowie problem powinien być oznaczany przez behawiorystę w Pokoju, aby rekomendacja PDF-u lub artykułu wynikała z rzeczywistej oceny, a nie z błędnej samoidentyfikacji klienta;
- obecny długi wybór problemów w `/wybor` nie powinien być obowiązkowym krokiem dla usługi `Zapytaj`; może pozostać opcjonalnym wejściem SEO lub uproszczonym filtrem.

### Następny etap

Najpierw omawiamy wygląd jednej ścieżki: strona `Zapytaj` z wyborem terminu zwykłego albo `Zapytaj teraz`, a następnie widok Pokoju po rozmowie. Dopiero po akceptacji tego wyglądu przechodzimy do projektowania Punktu 1, czyli bezpiecznego triage Mapy.

## Doprecyzowanie Punktu 0 — terapia po pełnej konsultacji

Data ustalenia: 31.08.2026

Terapia behawioralna nie jest przyznawana bezpośrednio po usłudze `Zapytaj behawiorystę — 15 min`. Zawsze wymaga wcześniejszej pełnej konsultacji.

Aktualny model ścieżki:

```text
Zapytaj behawiorystę — 15 min
├── rekomendacja PDF lub artykułu
└── dostęp do pełnej konsultacji
    ├── zakończenie na planie samodzielnej pracy
    └── dostęp do terapii behawioralnej
```

Pełna konsultacja jest osobną, płatną usługą i nie jest ukrytym formularzem kwalifikacyjnym. Jej publiczny opis, zakres, czas i cena powinny być widoczne. Ukryty pozostaje wyłącznie terminarz dostępny po decyzji behawiorysty.

Terapia może być publicznie pokazana jako możliwa dalsza ścieżka, ale jej terminarz pozostaje zamknięty do czasu ukończenia pełnej konsultacji i przyznania dostępu.

Do późniejszego omówienia: czy pełna konsultacja pozostaje zawsze osobno płatna przed terapią, czy jej koszt może być w przyszłości częścią pakietu terapii. Nie zmieniać tego bez osobnej decyzji.

## Doprecyzowanie Punktu 0 — hotel warunkowo po Zapytaniu

Ustalenie: hotel socjalizacyjno-terapeutyczny może być możliwą ścieżką po `Zapytaj behawiorystę — 15 min`, ale nie powinien otrzymywać automatycznie otwartego terminarza.

Proponowany model:

```text
Zapytaj behawiorystę — 15 min
└── jeśli przypadek może pasować do hotelu
    └── dostęp do wstępnej kwalifikacji hotelowej
        └── po sprawdzeniu warunków: dostęp do właściwego terminarza
```

Po krótkiej rozmowie można przyznać dostęp do formularza lub zgłoszenia kwalifikacyjnego. Dopiero po zebraniu informacji o zdrowiu, bezpieczeństwie, zachowaniu, zgodności z innymi zwierzętami, wymaganiach pobytu i logistyce behawiorysta decyduje o terminie.

W Pokoju klienta hotel może być widoczny jako warunkowa możliwość. Komunikat nie powinien brzmieć „umów hotel”, tylko „sprawdź, czy pobyt jest odpowiedni dla Twojego zwierzęcia”.

Hotel pozostaje osobną usługą operacyjną od konsultacji i terapii. Należy osobno ustalić, czy dotyczy psów, kotów czy obu gatunków, jakie są wymagania zdrowotne, zakres pracy, cena, długość pobytu i procedura przyjęcia.

Zasada ścieżek po aktualizacji:

- `Zapytaj` → PDF/artykul albo dostęp do konsultacji;
- `Zapytaj` → warunkowa kwalifikacja hotelu;
- pełna konsultacja → ewentualny dostęp do terapii;
- każdy terminarz pozostaje kontrolowany przez behawiorystę.

## Doprecyzowanie Punktu 0 — formularz hotelu bez uznaniowego odrzucania

Ustalenie: po `Zapytaj behawiorystę — 15 min` można przydzielić klientowi standardowy formularz kwalifikacji hotelowej. Formularz nie jest rezerwacją, przyjęciem ani gwarancją miejsca.

Zasada:

- klient zainteresowany hotelem otrzymuje możliwość wypełnienia tego samego formularza;
- po formularzu można odpowiedzieć, że obecnie nie ma miejsc;
- dostęp do terminarza powstaje dopiero po sprawdzeniu formularza, warunków pobytu i realnej dostępności;
- decyzja nie może opierać się na uznaniowej niechęci ani samej rasie; musi wynikać z bezpieczeństwa, dobrostanu, zgodności zwierząt, zakresu usługi i pojemności;
- przypadki zdrowotne lub niebezpieczne nadal wymagają najpierw właściwej pomocy, a nie formularza hotelowego;
- jeśli problemem jest brak miejsc, komunikat powinien mówić o braku miejsc; jeśli problemem jest bezpieczeństwo albo niedopasowanie, klient powinien otrzymać uczciwy następny krok.

Proponowane stany wewnętrzne: formularz przydzielony, formularz otrzymany, weryfikacja, brak miejsc, potrzebne informacje, zakwalifikowany, dostęp do terminarza. Klientowi należy pokazywać tylko prosty następny krok.

W Pokoju hotel powinien być pokazany jako możliwość rozpoczęcia kwalifikacji, a nie jako obietnica pobytu.

## Doprecyzowanie Punktu 0 — hotel dla psów i kotów

Ustalenie: hotel socjalizacyjno-terapeutyczny ma być widoczną i realnie dostępną możliwością zarówno dla psów, jak i kotów.

Rdzeń formularza może być wspólny, ale po wyborze gatunku formularz powinien pokazywać sekcję właściwą dla psa albo kota. Nie należy udawać, że te przypadki mają identyczne wymagania.

Wspólne obszary: zdrowie, szczepienia, leki, bezpieczeństwo, zachowanie, ucieczki, stres, daty pobytu, karmienie i wymagania opiekuna.

Obszary gatunkowe powinny uwzględniać m.in. spacery i kontakty z psami dla psa oraz transport, kuwetę, kryjówki, środowisko i tolerancję pobytu dla kota.

Usługa może być publicznie pokazana dla obu gatunków, ale po `Zapytaniu` klient otrzymuje formularz kwalifikacyjny. Terminarz pozostaje dostępny dopiero po ocenie formularza, bezpieczeństwa i realnej pojemności.

## Doprecyzowanie Punktu 0 — hierarchia uwagi na stronie

Główna usługa `Zapytaj behawiorystę — 15 min` otrzymuje około 70% uwagi pierwszego ekranu i głównej ścieżki. Oznacza to dominującą pozycję komunikatu, statusu dostępności i CTA, a nie ścisły podział powierzchni strony.

Pozostałe możliwości są pokazane niżej jako sekcja dalszych ścieżek. Konsultacja, terapia i hotel mogą mieć estetycznie spójne karty, ale nie konkurują z głównym przyciskiem `Zapytaj`. Każda karta musi informować, na jakim etapie staje się dostępna:

- konsultacja — po Zapytaniu;
- terapia — po pełnej konsultacji;
- hotel — po formularzu kwalifikacyjnym.

Nie stosować wielu równorzędnych CTA na pierwszym ekranie. Ciepły i ekspercki opis nie może ukrywać ceny, zakresu ani warunku dostępu.

## Doprecyzowanie Punktu 0 — cena na głównej karcie

Cena usługi `Zapytaj behawiorystę — 15 min` ma być widoczna od razu na głównej karcie, razem z czasem, kanałem rozmowy i zakresem.

Jeżeli dostępna jest rozmowa natychmiastowa, karta ma pokazywać osobno standardową cenę usługi oraz cenę z dopłatą za dostępność `Zapytaj teraz`. Dopłata ma być opisana jako priorytet/dostępność, nie jako promocja.

## Doprecyzowanie Punktu 0 — potwierdzone ceny usługi

Data ustalenia: 31.08.2026

Ustalone ceny bazowe dla `Zapytaj behawiorystę — 15 min`:

- zwykły, umówiony termin: **79 zł**;
- `Zapytaj teraz`, jeśli behawiorysta jest rzeczywiście dostępny: **104 zł**.

Cena 104 zł jest dopłatą za natychmiastową dostępność, a nie promocją ani sztucznym komunikatem o pilności. Gdy rozmowa live jest niedostępna, klient powinien zobaczyć prawdziwy status oraz możliwość umówienia zwykłego terminu.

### Promocja ceny podstawowej — propozycja do dalszej decyzji

Do omówienia pozostaje czasowa cena promocyjna zwykłego terminu, np. **39,99 zł**. Nie zapisywać jej jako stałego elementu oferty bez ustalenia:

- celu i czasu trwania promocji;
- limitu wykorzystań lub zasady pierwszego zakupu;
- zakresu 1–2 pytań uzupełniających w cenie promocyjnej;
- komunikatu, który nie sugeruje, że pełna konsultacja jest ukrytą dopłatą;
- sposobu pokazania ceny regularnej i warunków promocji.

Wstępna ocena: 39,99 zł może być skutecznym testem wejścia, ale jako stała lub zbyt częsta cena może obniżyć zaufanie do ceny 79 zł i zwiększyć liczbę klientów oczekujących pełnej pomocy za minimalną opłatę. Promocję należy traktować jako kontrolowany eksperyment, nie jako nową wartość usługi.

### Wariant kampanii grupowej — propozycja

Zamiast pokazywać 39,99 zł na stronie głównej, można przygotować osobny link dla grup na Facebooku z pulą **10 rzeczywiście jednorazowych użyć** ceny 39,99 zł za zwykły termin `Zapytaj`. Cena regularna na stronie pozostaje 79 zł, a kampania służy do sprawdzenia, czy tani pierwszy kontakt prowadzi do wartościowych dalszych ścieżek.

Warunki pilotażu:

- limit 10 zrealizowanych rezerwacji, a nie tylko 10 kliknięć;
- jeden kod na klienta i jedna usługa w cenie promocyjnej;
- data wygaśnięcia oraz jasny zakres rozmowy i pytań uzupełniających;
- osobny link z oznaczeniem źródła, aby mierzyć grupy, rezerwacje, odbyte rozmowy i przejścia do konsultacji;
- brak obniżonej ceny dla `Zapytaj teraz` — dopłata za natychmiastową dostępność pozostaje osobnym warunkiem;
- po wyczerpaniu puli link pokazuje zakończenie kampanii i cenę regularną, bez udawania dalszej niedostępności.

Nie należy reklamować promocji jako „taniej o 50%” bez sprawdzenia zasad prezentowania ceny odniesienia. Jeżeli komunikat sugeruje obniżkę, należy uwzględnić najniższą cenę z 30 dni przed promocją i warunki obowiązujące dla usług.

Wynik pilotażu należy oceniać nie po liczbie kodów, lecz po: odsetku odbytych rozmów, liczbie i czasie pytań uzupełniających, jakości przypadków, przejściach do pełnej konsultacji oraz przychodzie po odjęciu czasu obsługi.

## Doprecyzowanie Punktu 0 — powiadomienie o dostępności `Zapytaj teraz`

Ustalenie: gdy `Zapytaj teraz` jest niedostępne, klient musi mieć możliwość zapisania się na powiadomienie o ponownej dostępności. Powiadomienie jest ważnym elementem tej usługi, a nie dodatkiem ukrytym w formularzu kontaktowym.

Proponowany model:

- przy statusie niedostępności pokazujemy `Powiadom mnie, gdy będzie można zapytać teraz`;
- klient wybiera kanał powiadomienia i wyraża zgodę na konkretny komunikat;
- powiadomienie informuje o możliwości rozpoczęcia rozmowy, ale nie rezerwuje automatycznie miejsca;
- po wysłaniu powiadomienia klient przechodzi do aktualnego ekranu zakupu, a miejsce może zostać zajęte przez inną osobę;
- należy pokazać także zwykłe terminy, aby powiadomienie nie było jedyną ścieżką;
- zgłoszenie powinno wygasać po określonym czasie lub po skorzystaniu z usługi, z ochroną przed wielokrotnymi powiadomieniami.

Nie uruchamiać otwartej, płatnej kolejki bez osobnej decyzji. Wymaga omówienia: kanał powiadomienia, czas ważności zgłoszenia, limit aktywnych zgłoszeń oraz sposób obsługi sytuacji, gdy wiele osób otrzyma powiadomienie jednocześnie.

## Doprecyzowanie Punktu 0 — Mapa jako pomoc dla niezdecydowanych

Ustalenie: Mapa zachowania nie jest główną ścieżką strony ani równorzędnym produktem. Ma być lekkim, opcjonalnym narzędziem dla osoby, która nie wie, od czego zacząć, podczas gdy główna strona sprzedaje `Zapytaj behawiorystę — 15 min`.

W komunikacji publicznej nie używać słowa „zabawka”, ponieważ przy problemach dotyczących zdrowia i bezpieczeństwa zwierzęcia może obniżać powagę marki. Można ją przedstawić jako pomocnika lub przewodnik wyboru.

Mapa nie powinna udawać diagnozy. Musi zawierać podstawową bramkę bezpieczeństwa, a wynik powinien prowadzić przede wszystkim do właściwego następnego kroku, najczęściej `Zapytaj`, a w sytuacjach zdrowotnych lub pilnych do właściwej pomocy.

## Potwierdzenie decyzji Punktu 0 — powiadomienie i rola Mapy

Data potwierdzenia: 31.08.2026

Potwierdzono:

- przy niedostępności `Zapytaj teraz` klient zawsze otrzymuje możliwość zapisania się na powiadomienie;
- powiadomienie nie tworzy automatycznej ani płatnej kolejki i nie gwarantuje miejsca;
- zwykłe terminy pozostają widoczne jako alternatywa;
- Mapa jest opcjonalnym, drugorzędnym pomocnikiem dla niezdecydowanych;
- Mapa nie jest obowiązkową bramką, głównym CTA ani narzędziem diagnozy;
- publiczny komunikat powinien mówić raczej `Pomóż mi wybrać` niż `zabawka`;
- wynik Mapy powinien prowadzić przede wszystkim do `Zapytaj`, z wyjątkiem sytuacji wymagających innej pomocy.

Roboczo przyjęto e-mail lub Pokój jako podstawowy kanał powiadomień. SMS pozostaje opcją do oceny pod kątem kosztu i rzeczywistej potrzeby natychmiastowej reakcji.

## Potwierdzenie decyzji Punktu 0 — obietnica pierwszego ekranu

Data potwierdzenia: 31.08.2026

Zaakceptowano kierunek komunikatu głównej usługi:

> **Zapytaj behawiorystę, żeby zrozumieć, co może stać za zachowaniem Twojego psa lub kota.**

Opis usługi:

> W 15-minutowej rozmowie opowiesz o sytuacji, lepiej zrozumiesz, co może stać za zachowaniem zwierzęcia, i dowiesz się, co możesz zrobić dalej.

Opis nie powinien sugerować, że celem rozmowy jest przejście do pełnej konsultacji. „Co możesz zrobić dalej” pozostawia miejsce na samodzielną pracę, materiał, artykuł, konsultację, hotel albo inną właściwą pomoc — zależnie od sytuacji.

## Doprecyzowanie decyzji Punktu 0 — sens codziennej dostępności `Zapytaj teraz`

Ustalenie: dostępność rozmowy live będzie możliwa niemal codziennie i ma znaczenie zarówno finansowe, jak i wizerunkowe. Idea usługi brzmi: jeśli opiekun ma problem i właśnie ma gotowość, żeby o nim porozmawiać, nie powinien odkładać pierwszego kroku do momentu, w którym zabraknie mu energii lub motywacji.

W aktywnym statusie `Zapytaj teraz` powinno być głównym wariantem działania. Zwykły termin za 79 zł pozostaje widoczną, tańszą alternatywą dla osoby, która nie chce lub nie może rozmawiać od razu.

Proponowany kierunek komunikatu:

> **Nie czekaj, aż Ci się odechce. Zapytaj teraz.**

Wersja bezpieczniejsza dla głównego, eksperckiego ekranu:

> **Jeśli właśnie chcesz o tym porozmawiać, możesz zapytać teraz.**

Pierwsze hasło jest bardziej charakterystyczne i może działać jako mocny komunikat kampanii lub przycisku. Drugie lepiej pasuje do głównej, ciepłej komunikacji, ponieważ mobilizuje bez wywoływania poczucia winy.

Natychmiastowa dostępność musi być prawdziwa. Nie używać presji typu „ostatnia szansa”, jeśli nie wynika ona z realnego statusu i czasu pracy behawiorysty.

## Potwierdzenie decyzji Punktu 0 — hasło dostępności teraz

Data potwierdzenia: 31.08.2026

Potwierdzono umiejscowienie komunikatu na pierwszym ekranie:

> **Zapytaj behawiorystę, żeby zrozumieć, co może stać za zachowaniem Twojego psa lub kota.**

> **Nie czekaj, aż Ci się odechce. Zapytaj teraz.**

Pierwsza linia pozostaje głównym, eksperckim nagłówkiem. Druga jest mocnym, bardziej emocjonalnym komunikatem wspierającym wariant natychmiastowej rozmowy. Przy dostępności pokazuje się CTA `Zapytaj teraz — 104 zł`, a `Umów termin — 79 zł` pozostaje widoczną alternatywą.

Przy braku dostępności komunikat zmienia się na możliwość zapisania się na powiadomienie, bez obietnicy automatycznej rezerwacji.

## Weryfikacja techniczna Punktu 0 — telefonia ZADARMA i granica czasu

Sprawdzono w kodzie projektu: obecny system posiada integrację ZADARMA do zestawiania callbacku telefonicznego, odbioru statusów połączenia, wysyłki SMS-a na minutę przed końcem oraz automatycznego rozłączenia po limicie czasu. Zaplanowane połączenia telefoniczne są uruchamiane przez system w pobliżu wybranego terminu, a pokój rozmowy może również uruchomić połączenie po odblokowaniu dostępu.

Obecna strona `Kwadrans na już` nie jest jeszcze tym samym co docelowe `Zapytaj teraz`: obecnie zbiera pilne zgłoszenie i proponowane godziny, po czym behawiorysta ręcznie ustala termin. To jest rozbieżność między istniejącym przepływem a planowaną usługą live, którą trzeba później świadomie zamknąć.

Przyszły telefon z kartą SIM i systemem Android należy traktować jako możliwą warstwę techniczną, nie jako obietnicę marketingową. Klientowi obiecujemy połączenie telefoniczne i określony sposób obsługi, bez uzależniania komunikatu od nazwy dostawcy technologii.

### Rekomendacja dotycząca czasu rozmowy

Nie używać na głównej karcie sformułowania „około 15 minut”. Jest niejasne dla klienta, utrudnia zarządzanie płatną usługą i koliduje z obecnym automatycznym limitem.

Rekomendowane sformułowanie:

> **Rozmowa telefoniczna do 15 minut.**

Zakres należy ograniczyć nie przez niejasny czas, lecz przez obietnicę: jedna główna sytuacja, pierwszy kierunek i wskazówka, co zrobić dalej. Jeśli temat wymaga dłuższego omówienia, nie należy obiecywać jego pełnego rozwiązania w tym formacie.

## Potwierdzenie trybu pracy — plan przed audytem i wdrożeniem

Data ustalenia: 31.08.2026

Najpierw należy dokończyć planowanie punkt po punkcie i zaakceptować model biznesowy, komunikaty, ścieżki klienta oraz wygląd kluczowych ekranów. Na tym etapie nie przerabiać kodu na podstawie założeń roboczych.

Po domknięciu planu należy wykonać osobny audyt istniejącego systemu, obejmujący co najmniej: ZADARMA i automatyczne połączenia, limity oraz statusy rozmów, rezerwacje i płatności, powiadomienia, Pokój klienta, aktualne strony usług, Mapę, blog i materiały.

Audyt ma rozdzielić elementy:

- już zgodne z planem;
- częściowo zgodne i wymagające korekty;
- brakujące;
- działające technicznie, ale sprzeczne z nowym modelem biznesowym.

Dopiero po tym porównaniu można przygotować kolejność wdrożenia i zmieniać system. Istniejące działające mechanizmy, zwłaszcza ZADARMA, płatności i normalne rezerwacje, należy zachować tam, gdzie nie kolidują z zaakceptowanym modelem.

## Potwierdzenie decyzji Punktu 0 — automatyczne połączenie i bufor czasu

Data ustalenia: 31.08.2026

W wariancie `Zapytaj teraz` po opłaceniu usługi system ma automatycznie uruchomić połączenie telefoniczne przez ZADARMA. Klient nie ma wykonywać dodatkowego telefonu ani czekać na ręczne oddzwonienie.

Potwierdzono również ustawienie technicznego maksymalnego czasu połączenia na **17 minut**, aby zostawić około 2 minut na spokojne zakończenie rozmowy i ograniczyć wrażenie gwałtownego odcięcia.

Należy rozdzielić w systemie:

- format merytoryczny komunikowany klientowi: rozmowa do 15 minut;
- techniczny limit połączenia: 17 minut;
- moment ostrzeżenia i komunikat końcowy, aby klient wiedział, że zasadniczy czas rozmowy się kończy, ale ma chwilę na podsumowanie.

Nie pokazywać klientowi bez wyjaśnienia samego zegara 17 minut jako „długości usługi”, bo powstałaby rozbieżność między ofertą a realizacją. Wymaga omówienia, czy interfejs ma pokazywać 15 minut rozmowy oraz osobny bufor końcowy, czy jeden zegar opisany jako czas połączenia.

## Potwierdzenie decyzji Punktu 0 — wyjątki w automatycznym połączeniu

Data ustalenia: 31.08.2026

Ustalony model obsługi wariantu `Zapytaj teraz`:

- po płatności miejsce jest blokowane na około 5 minut, aby umożliwić zestawienie połączenia;
- blokada musi być egzekwowana po stronie serwera i atomowo, tak aby nie dopuścić do podwójnego bookingu;
- połączenie jest uruchamiane automatycznie przez ZADARMA;
- w razie zerwania połączenia klient może połączyć się ponownie, ale czas rozmowy biegnie dalej i nie jest zerowany;
- błędny numer telefonu skutkuje automatycznym mailem z informacją i jedną możliwością ustalenia dodatkowego terminu;
- przy braku odpowiedzi system wykonuje dwie próby połączenia;
- po dwóch nieodebranych próbach klient otrzymuje jeden dodatkowy termin; kolejny brak odpowiedzi oznacza realizację opłaconej usługi zgodnie z wcześniej ujawnionymi zasadami;
- dodatkowy termin w sytuacjach wyjątkowych może przyznać operator, ale powinien być wyjątkiem rejestrowanym w systemie, a nie automatycznym prawem bez limitu;
- awaria ZADARMA nie może być traktowana jako brak odpowiedzi klienta ani jako zrealizowana usługa; w pierwszym etapie behawiorysta kontaktuje się ręcznie;
- docelowy telefon z kartą SIM i Androidem ma być zapasową warstwą telefoniczną na wypadek awarii ZADARMA.

Trzeba odróżnić nieprawidłowy numer lub brak odpowiedzi po stronie klienta od błędu dostawcy telefonii. W pierwszym przypadku obowiązuje limit prób i jednego dodatkowego terminu. W drugim przypadku klient nie powinien tracić świadczenia, a system musi oznaczyć ręczny fallback lub inną formę realizacji.

Reguły prób połączenia, 5-minutowej blokady, dodatkowego terminu i skutków braku odpowiedzi muszą być pokazane przed płatnością. Nie należy uzależniać ich wyłącznie od informacji w regulaminie.

## Doprecyzowanie decyzji Punktu 0 — harmonogram prób i ręczny fallback

Data ustalenia: 31.08.2026

Ustalony przebieg czasowy:

- po wybraniu `Zapytaj teraz` miejsce jest blokowane na 5 minut na dokończenie płatności;
- jeśli płatność nie zostanie potwierdzona w tym czasie, blokada wygasa i termin wraca do puli;
- po skutecznej płatności termin nie wraca do puli z powodu nieodebrania telefonu — rezerwacja przechodzi w obsługę połączenia;
- pierwsza próba telefonu jest automatyczna;
- druga próba jest wykonywana po 1 minucie;
- 1 minutę po drugiej próbie klient otrzymuje automatyczny e-mail z informacją i linkiem do jednego dodatkowego terminu;
- po wykorzystaniu lub odrzuceniu dodatkowego terminu nie tworzyć kolejnych automatycznych prób; wyjątek może przyznać operator;
- po dwóch nieodebranych próbach oraz niewykorzystaniu jednego dodatkowego terminu płatność oznacza zrealizowaną usługę, o ile zasady były widoczne przed zakupem i nie wystąpiła awaria systemu;
- po zerwaniu połączenia klient może uruchomić ponowne połączenie, ale wspólny zegar 17 minut biegnie dalej.

### Kolejka ręcznego kontaktu

Awaria ZADARMA tworzy zadanie w osobnej kolejce operatora `Telefon ręczny — pilne`, zamiast mieszać je z rezerwacjami wymagającymi zwykłej obsługi.

Każda pozycja powinna pokazywać: imię klienta, numer telefonu, gatunek, krótki opis sytuacji, cenę i status płatności, czas utworzenia, status ZADARMA, liczbę prób, najważniejsze znaczniki czasu oraz pozostały czas obsługi. Operator otrzymuje przyciski: `Zadzwoń ręcznie`, `Połączono`, `Nie odebrano`, `Zakończono`, `Przyznaj dodatkowy termin` i `Awaria techniczna`.

Po przejęciu pozycji przez operatora należy ją oznaczyć jako `w obsłudze`, aby nie została obsłużona ponownie. Każdy telefon i wynik powinien być zapisany w historii rezerwacji. Przy ręcznym połączeniu panel powinien pokazywać odliczanie do końca 17-minutowego limitu i przypomnienie o zakończeniu, ponieważ zwykły telefon nie wykona automatycznego rozłączenia.

Nie należy uznawać awarii ZADARMA za brak odpowiedzi klienta. Awaria zużywa zasób operatora, ale nie może zużywać prawa klienta do rozmowy.

## Potwierdzenie decyzji Punktu 0 — harmonogram i ręczny kontakt

Data potwierdzenia: 31.08.2026

Potwierdzono bez zmian:

- druga próba połączenia po 1 minucie;
- automatyczny e-mail po 1 minucie od drugiej próby;
- e-mail zawiera link do jednego dodatkowego terminu;
- nieopłacona rezerwacja zwalnia miejsce po 5 minutach;
- opłacona rezerwacja nie wraca do puli z powodu problemu z połączeniem;
- zerwane połączenie można wznowić, ale wspólny czas nadal biegnie;
- po dwóch nieodebranych próbach przysługuje jeden dodatkowy termin;
- awaria ZADARMA trafia do kolejki `Telefon ręczny — pilne`, z przejęciem zgłoszenia, historią prób i ręcznym odnotowaniem wyniku;
- awaria ZADARMA nie jest klasyfikowana jako brak odpowiedzi klienta.

Kolejnym obszarem Punktu 0 do omówienia jest widok klienta po rozmowie w Pokoju: podsumowanie, pytania uzupełniające, rekomendowany następny krok i dostęp do dalszych usług.

## Potwierdzenie decyzji Punktu 0 — ręczne podsumowanie po rozmowie

Data potwierdzenia: 31.08.2026

Podsumowanie po usłudze `Zapytaj behawiorystę — 15 min` nie jest generowane automatycznie. Pojawia się w Pokoju dopiero po ręcznym wpisaniu i opublikowaniu go przez behawiorystę.

Rekomendowana struktura podsumowania:

- najważniejsze informacje usłyszane od opiekuna;
- co może stać za zachowaniem — bez udawania pełnej diagnozy;
- co opiekun może zrobić teraz;
- jeden najbliższy krok, jeśli jest potrzebny.

System ma przechowywać historię i uprawnienia, ale treść oceny, zaleceń i rekomendacji pozostaje decyzją behawiorysty.

## Potwierdzenie decyzji Punktu 0 — jedna rekomendacja po rozmowie

Data potwierdzenia: 31.08.2026

Po opublikowaniu ręcznego podsumowania klient ma widzieć jeden wyraźny `Najbliższy krok`, wybrany przez behawiorystę. Pozostałe usługi i materiały pozostają widoczne niżej jako możliwe dalsze ścieżki, ale nie konkurują z główną rekomendacją.

Zasada prezentacji:

- jedna rekomendacja na górze;
- konsultacja, hotel, terapia i materiały niżej, ze statusem dostępu i właściwym CTA;
- brak wielu równorzędnych przycisków po rozmowie;
- brak komunikatu sugerującego, że klient musi kupić kolejną usługę;
- w sytuacji zdrowotnej lub bezpieczeństwa pierwszy krok prowadzi do właściwej pomocy, a nie do sprzedaży materiału.

## Potwierdzenie decyzji Punktu 0 — opis klienta w panelu behawiorysty

Data ustalenia: 31.08.2026

Panel behawiorysty musi pokazywać pełny, oryginalny opis sytuacji podany przez klienta przed rozmową. Opis ma być dostępny jako kontekst do rozmowy i jako materiał pomocniczy przy pisaniu ręcznego podsumowania.

Zasady widoku:

- opis klienta jest wyraźnie oddzielony od podsumowania behawiorysty;
- oryginalny opis jest tylko do odczytu i nie może zostać przypadkowo nadpisany;
- panel pokazuje obok podstawowe dane: gatunek, dane kontaktowe, czas rezerwacji, źródło zgłoszenia i wcześniejszą historię usług, jeśli istnieje;
- przy rozmowie live najważniejsze informacje są widoczne od razu, a dłuższy opis można rozwinąć;
- behawiorysta może skopiować fragment opisu do własnych notatek, ale system nie tworzy automatycznie oceny ani podsumowania;
- własne podsumowanie jest osobnym edytorem z wyborem `Najbliższego kroku` i publikacją dopiero po ręcznej decyzji.

Proponowany układ panelu:

```text
LEWA KOLUMNA                         PRAWA KOLUMNA
Opis klienta — oryginalny           Moje podsumowanie
Gatunek / kontakt / rezerwacja       [edytor]
Historia usług                       Najbliższy krok
Status połączenia                    [wybór]
                                     [Opublikuj w Pokoju]
```

Widok ma wspierać szybką pracę podczas telefonu, dlatego nie należy ukrywać opisu klienta w osobnej podstronie ani mieszać go z tekstem publikowanym klientowi.

## Potwierdzenie decyzji Punktu 0 — warstwy widoku panelu behawiorysty

Data potwierdzenia: 31.08.2026

Potwierdzono podział widoku pracy:

- stale widoczne: status połączenia i czas, imię klienta, telefon, gatunek, dane zwierzęcia, usługa, status płatności oraz pełny oryginalny opis klienta;
- widoczne w skrócie: ostatni kontakt, ostatnie podsumowanie, liczba wykorzystanych pytań i aktywne uprawnienia;
- po rozwinięciu: pełna historia usług, rozmów, podsumowań, pytań, formularzy, załączników i pozostałych danych;
- temat wskazany przez klienta nie może być prezentowany jako rozpoznany problem;
- własne podsumowanie behawiorysty pozostaje osobnym edytorem i nie nadpisuje opisu klienta;
- po rozmowie ten sam widok udostępnia wybór jednego `Najbliższego kroku` oraz publikację podsumowania w Pokoju.

Głównym kryterium układu jest szybkość i bezpieczeństwo pracy podczas rozmowy, a nie pokazanie wszystkich danych jednocześnie.

## Potwierdzenie decyzji Punktu 0 — widoczność dalszych ścieżek w Pokoju

Data potwierdzenia: 31.08.2026

W Pokoju klienta pełna konsultacja pozostaje widoczna zawsze jako możliwa dalsza usługa, nawet jeśli po `Zapytaniu` behawiorysta rekomenduje samodzielną pracę, PDF lub artykuł.

Zasady:

- rekomendowany `Najbliższy krok` jest wizualnie i funkcjonalnie najważniejszy;
- pełna konsultacja ma publiczny opis, zakres, czas i cenę;
- gdy dostęp do terminarza nie został przyznany, karta konsultacji ma charakter informacyjny i nie pokazuje aktywnego terminarza;
- gdy behawiorysta przyzna dostęp, karta otrzymuje CTA `Umów konsultację`;
- hotel pozostaje kartą kwalifikacji, bez bezpośredniego terminarza;
- terapia jest widoczna jako dalsza możliwość po pełnej konsultacji;
- jeden PDF lub artykuł może być rekomendowany jako konkretny materiał, ale nie tworzymy w Pokoju katalogu sprzedażowego;
- nie używać języka `odblokuj`, który sugeruje mechanikę gry lub ukrytą sprzedaż.

## Potwierdzenie decyzji Punktu 0 — indywidualny dostęp do terminarza konsultacji

Data potwierdzenia: 31.08.2026

Publiczny opis pełnej konsultacji, jej zakres, czas i cena pozostają widoczne niezależnie od statusu dostępu do terminarza.

Terminarz pełnej konsultacji jest dostępny dopiero po ręcznym przyznaniu klientowi indywidualnego dostępu przez behawiorystę. Preferowanym sposobem przekazania dostępu jest bezpieczny, indywidualny link w Pokoju klienta; kod może pozostać rozwiązaniem awaryjnym.

Przed przyznaniem dostępu klient widzi informację, że terminarz jest udostępniany indywidualnie po rozmowie, gdy pełna konsultacja jest właściwym kolejnym krokiem. Po przyznaniu dostępu pojawia się CTA `Umów konsultację`.

Nie używać komunikatów `zakwalifikowano`, `odblokuj`, `musisz kupić` ani `poczekaj na decyzję`. Proces ma być kontrolowany przez behawiorystę, ale komunikowany spokojnie i bez wrażenia ukrytej bramki sprzedażowej.

## Potwierdzenie decyzji Punktu 0 — jeden obiekt, osobne strefy hotelu

Data potwierdzenia: 31.08.2026

Hotel dla psów i kotów działa w jednym obiekcie, ale psy i koty przebywają w osobnych, zabezpieczonych strefach. Nie jest to wspólne, otwarte pomieszczenie dla obcych zwierząt.

Model zakłada:

- osobną strefę dla psów;
- osobną strefę dla kotów;
- brak bezpośredniego kontaktu psów i kotów jako domyślnej zasady;
- indywidualną ocenę, czy jakikolwiek kontrolowany kontakt jest bezpieczny i potrzebny;
- osobne zasady wyposażenia, odpoczynku, karmienia i obserwacji dla każdego gatunku;
- możliwość czasowej izolacji zwierzęcia, jeśli wymaga tego zdrowie, bezpieczeństwo albo poziom stresu.

Publiczny opis może mówić o jednym hotelu dla psów i kotów, ale powinien jasno informować o osobnych strefach i kwalifikacji pobytu.

## Doprecyzowanie decyzji Punktu 0 — indywidualne boksy i decyzja o pobycie

Data potwierdzenia: 31.08.2026

Nie ustalamy na stronie publicznej stałej liczby miejsc ani prostego limitu rezerwacji. Boksy/pobyty są indywidualne, a behawiorysta każdorazowo ustala, czy dane zwierzę może zostać przyjęte, w jakiej strefie, na jakich warunkach i w jakim terminie.

Nie oznacza to jednak pełnej dowolności operacyjnej. Decyzja powinna być oparta na formularzu, bezpieczeństwie, dobrostanie zwierzęcia, możliwościach opieki, wymaganiach pobytu oraz aktualnym obłożeniu. W panelu warto zapisać krótką przyczynę decyzji, np. „brak odpowiednich warunków w tym terminie”, „potrzebne dodatkowe informacje” albo „pobyt możliwy po spełnieniu warunków”. Ogranicza to ryzyko niespójnych decyzji i pozwala uczciwie wyjaśnić klientowi odmowę bez oceniania rasy lub osoby.

Hotel nie pokazuje więc publicznego terminarza. Klient wysyła formularz, a w Pokoju widzi prosty status i kolejny krok: formularz do uzupełnienia, weryfikacja, potrzebne informacje, brak możliwości w danym terminie albo indywidualnie przekazany termin/łącze do rezerwacji.

## Potwierdzenie decyzji Punktu 0 — komunikat po formularzu hotelowym

Data potwierdzenia: 31.08.2026

Po wysłaniu formularza klient widzi w Pokoju prosty komunikat:

> **Sprawdzam możliwość pobytu dla Twojego zwierzęcia.**

Komunikat nie obiecuje miejsca, terminu ani przyjęcia. Nie pokazujemy na tym etapie publicznego terminarza; dalsza informacja pojawia się dopiero po indywidualnej decyzji behawiorysty.

## Potwierdzenie decyzji Punktu 0 — osobisty kontakt w sprawie hotelu

Data potwierdzenia: 31.08.2026

Po sprawdzeniu możliwości pobytu behawiorysta kontaktuje się z klientem osobiście. System nie wysyła automatycznie ceny, terminu ani linku do rezerwacji przed tym kontaktem. Podczas rozmowy można omówić warunki pobytu, dopasowanie do zwierzęcia, dostępny termin i dalszy sposób rezerwacji.

Dopiero po kontakcie behawiorysta aktualizuje sprawę w panelu i może przekazać klientowi konkretny kolejny krok. Należy rozdzielić wewnętrzne statusy pracy, takie jak „próba kontaktu” lub „omówione”, od prostych komunikatów widocznych w Pokoju, żeby klient nie widział technicznego procesu ani nie pozostawał bez informacji.

### Korekta zakresu hotelu — etap obecny

Na obecnym etapie nie projektujemy ani nie wdrażamy osobnego panelu hotelowego, automatycznych statusów ani szczegółowej ścieżki rezerwacji hotelu. Hotel pozostaje indywidualnie ustalaną możliwością, a decyzję, kontakt i warunki pobytu prowadzi behawiorysta ręcznie. Wcześniejsze propozycje dotyczące panelu i automatyzacji hotelu są odłożone i nie stanowią bieżącego zakresu realizacji.

## Potwierdzenie decyzji Punktu 0 — minimalny formularz usługi `Zapytaj`

Data potwierdzenia: 31.08.2026

Przed płatnością klient wypełnia krótki formularz zawierający:

- imię;
- numer telefonu;
- adres e-mail;
- gatunek zwierzęcia: pies albo kot;
- krótki, wymagany opis sytuacji własnymi słowami.

Wybór gotowej kategorii problemu ani rasa nie są wymagane. Rasa, wiek i imię zwierzęcia mogą pozostać polami opcjonalnymi, jeśli później okażą się przydatne. Formularz ma zebrać kontekst do rozmowy, a nie wymuszać na kliencie samodzielną diagnozę. Przy formularzu należy umieścić jasną informację, że nagłe zagrożenie zdrowia lub bezpieczeństwa wymaga pilnej pomocy weterynaryjnej albo ratunkowej.

## Potwierdzenie decyzji Punktu 0 — e-mail po podsumowaniu

Data potwierdzenia: 31.08.2026

Po ręcznym opublikowaniu podsumowania klient otrzymuje jeden automatyczny e-mail z linkiem do Pokoju klienta.

Zasady:

- e-mail informuje, że podsumowanie jest gotowe;
- e-mail ma jeden główny przycisk prowadzący do Pokoju;
- pełna ocena, rekomendacja i dane dalszych usług nie są rozwijane w treści wiadomości;
- przyznany dostęp do konsultacji, formularz hotelowy, materiał lub informacja o właściwej pomocy są widoczne dopiero w Pokoju;
- nie wysyłać osobnych wiadomości sprzedażowych dla każdej dalszej ścieżki;
- wyjątkiem pozostaje osobny e-mail po nieudanych próbach połączenia, zawierający link do jednego dodatkowego terminu.

Pokój jest źródłem prawdy dla podsumowania, uprawnień i kolejnych kroków, a e-mail pełni funkcję bezpiecznego powiadomienia i wejścia do panelu.

## Potwierdzenie decyzji Punktu 0 — zakres pytań i kanałów wsparcia

Data potwierdzenia: 31.08.2026

Po `Zapytaj behawiorystę — 15 min` klient otrzymuje:

- 2 pytania uzupełniające;
- możliwość zadania ich w Pokoju klienta;
- 7 dni na wykorzystanie limitu;
- odpowiedzi dotyczące tej samej sytuacji omówionej podczas rozmowy;
- widoczny licznik pozostałych pytań i termin ich wykorzystania.

Pytania dotyczące nowych problemów, długich analiz albo tematów wykraczających poza rozmowę nie są traktowane jako pytania uzupełniające z tej usługi.

WhatsApp pozostaje kanałem bieżącego wsparcia dopiero przy pełnej konsultacji i terapii. Dla tych usług należy każdorazowo pokazać zakres, okres aktywności i oczekiwany czas odpowiedzi. Pokój przechowuje podsumowanie, historię i uprawnienia, ale nie tworzymy dwóch równoległych, nieograniczonych kanałów obsługi.

## Potwierdzenie decyzji Punktu 0 — pierwszy ekran strony `Zapytaj`

Data potwierdzenia: 31.08.2026

Zatwierdzony kierunek pierwszego ekranu:

- ekspercka obietnica: „Zapytaj behawiorystę, żeby zrozumieć, co może stać za zachowaniem Twojego psa lub kota”;
- emocjonalne, krótkie dopowiedzenie: „Nie czekaj, aż Ci się odechce. Zapytaj teraz”;
- wyraźnie widoczny zakres: rozmowa telefoniczna do 15 minut;
- widoczna cena standardowa 79 zł;
- widoczna cena `Zapytaj teraz` 104 zł wyłącznie przy realnej dostępności;
- możliwość wyboru zwykłego terminu;
- informacja o 2 krótkich pytaniach po rozmowie w Pokoju klienta, ważnych przez 7 dni;
- prosty opis trzech kroków: opis sytuacji, rozmowa, wskazówka co można zrobić dalej.

Na pierwszym ekranie nie eksponować hotelu, PDF-ów ani wielu pozostałych usług. Pełna konsultacja może być opisana niżej, z jasnym zaznaczeniem, że `Zapytaj` nie jest pełną konsultacją ani terapią i nie tworzy obowiązku zakupu kolejnej usługi.

## Potwierdzenie decyzji Punktu 0 — dalsza część strony `Zapytaj`

Data potwierdzenia: 31.08.2026

Po pierwszym ekranie strona przedstawia kolejno:

1. dla kogo jest rozmowa — dla osoby, która ma konkretną sytuację i chce ją spokojnie zrozumieć;
2. co klient otrzyma — uporządkowanie problemu, pierwszą wskazówkę i informację, co można zrobić dalej;
3. jak wygląda rozmowa — opis sytuacji, rozmowa telefoniczna i 2 krótkie pytania w Pokoju klienta;
4. ważną granicę zakresu — `Zapytaj` nie obejmuje pełnego planu terapii ani stałego wsparcia; jeśli potrzebna będzie szersza praca, klient otrzyma informację o możliwym kolejnym kroku;
5. FAQ i ponowne przejście do rezerwacji.

Pełna konsultacja nie jest ukrywana, ale nie otrzymuje na stronie `Zapytaj` drugiego dominującego CTA. Powinna być dostępna przez spokojny link do osobnego opisu i ceny. Komunikacja ma wyjaśniać różnicę między usługami bez sugerowania, że `Zapytaj` jest obowiązkowym etapem sprzedażowym.

## Potwierdzenie decyzji Punktu 0 — wybór trybu i ceny `Zapytaj`

Data potwierdzenia: 31.08.2026

Cena 79 zł i cena 104 zł oznaczają dwa sposoby skorzystania z tej samej usługi, a nie dwa różne produkty:

- `Umów zwykły termin — 79 zł` — klient wybiera termin z kalendarza;
- `Zapytaj teraz — 104 zł` — przy aktywnej dostępności po opłaceniu system rozpoczyna próbę połączenia.

Gdy `Zapytaj teraz` jest niedostępne, karta pozostaje widoczna z komunikatem o niedostępności, możliwością zapisania się na powiadomienie oraz dostępnymi zwykłymi terminami. Cena 104 zł jest ceną za natychmiastową dostępność, a nie promocją ani ukrytą dopłatą.

Ustalona kolejność:

- zwykły termin: wybór terminu → krótki formularz → płatność → potwierdzenie;
- `Zapytaj teraz`: krótki formularz → płatność → automatyczne połączenie.

## Potwierdzenie decyzji Punktu 0 — ekran płatności i stan po zakupie

Data potwierdzenia: 31.08.2026

Przed zatwierdzeniem płatności klient widzi podsumowanie:

- usługę `Zapytaj behawiorystę — 15 min`;
- wybrany tryb: zwykły termin albo `Zapytaj teraz`;
- wybrany termin, jeśli dotyczy;
- numer telefonu, na który nastąpi połączenie;
- całkowitą cenę 79 zł albo 104 zł;
- informację, że w trybie `Zapytaj teraz` po opłaceniu rozpocznie się próba połączenia;
- 2 pytania uzupełniające w Pokoju klienta przez 7 dni;
- informację, że pełna konsultacja jest osobną usługą.

Po płatności:

- zwykły termin pokazuje potwierdzoną rezerwację;
- `Zapytaj teraz` przechodzi bezpośrednio do stanu oczekiwania na automatyczne połączenie.

Komunikat nie może sugerować, że po płatności dopiero rozpocznie się ręczne ustalanie terminu lub że klient ma czekać na nieokreślony kontakt.

## Potwierdzenie decyzji Punktu 0 — komunikat po zakończeniu rozmowy

Data potwierdzenia: 31.08.2026

Bezpośrednio po zakończeniu rozmowy klient widzi w Pokoju komunikat:

> **Rozmowa zakończona. Przygotuję teraz Twoje podsumowanie.**

Podsumowanie nie jest publikowane automatycznie. Po ręcznym wpisaniu i opublikowaniu przez behawiorystę klient otrzymuje e-mail z linkiem do gotowego podsumowania. Rozdzielenie tych etapów ma jasno pokazywać, że usługa jest jeszcze opracowywana, a klient nie trafia na pusty albo nieokreślony ekran.

## Potwierdzenie decyzji Punktu 0 — format podsumowania dla klienta

Data potwierdzenia: 31.08.2026

Ręczne podsumowanie w Pokoju klienta zawiera cztery sekcje:

1. **Co usłyszałem** — najważniejsze fakty z opisu klienta;
2. **Co może mieć znaczenie** — ostrożna interpretacja bez udawania pełnej diagnozy;
3. **Co możesz zrobić teraz** — kilka praktycznych działań;
4. **Najbliższy krok** — jedna rekomendacja wybrana przez behawiorystę.

Podsumowanie nie jest pełnym planem terapii. Nie pokazujemy klientowi surowych notatek ani kilku równorzędnych rekomendacji. Język ma być ekspercki, spokojny i zrozumiały.

## Potwierdzenie decyzji Punktu 0 — hierarchia Pokoju klienta

Data potwierdzenia: 31.08.2026

Po opublikowaniu podsumowania Pokój klienta pokazuje w następującej kolejności:

1. jedną, największą kartę `Najbliższy krok`, wybraną przez behawiorystę;
2. podsumowanie rozmowy;
3. licznik 2 pytań uzupełniających oraz termin ich wykorzystania;
4. pozostałe możliwości: pełną konsultację z opisem i ceną, terapię jako ścieżkę po konsultacji, hotel jako indywidualnie ustalaną możliwość oraz jeden dopasowany PDF albo artykuł;
5. historię usług i dane klienta.

Pozostałe usługi nie mają takiej samej wagi wizualnej jak `Najbliższy krok`. Pokój nie jest katalogiem sprzedażowym. Nie używać języka `odblokuj` ani komunikatów sugerujących obowiązkowy zakup kolejnej usługi.

## Potwierdzenie decyzji Punktu 0 — format karty `Najbliższy krok`

Data potwierdzenia: 31.08.2026

Karta `Najbliższy krok` ma stały, prosty format:

- nazwa kroku;
- krótkie wyjaśnienie, dlaczego behawiorysta go proponuje;
- jedno konkretne działanie;
- jeden przycisk albo brak przycisku, jeśli wystarczy sama informacja.

Przy pełnej konsultacji przycisk prowadzi do rezerwacji dopiero po przyznaniu dostępu. Przy materiale prowadzi do jednego PDF-u albo artykułu. W sytuacji zdrowotnej lub niebezpiecznej prowadzi do właściwej pomocy, nie do sprzedaży.

Nie pokazujemy kilku równorzędnych rekomendacji pod hasłem `Najbliższy krok`.

## Potwierdzenie decyzji Punktu 0 — karta pełnej konsultacji w Pokoju

Data potwierdzenia: 31.08.2026

Pełna konsultacja pozostaje w Pokoju widoczna jako spokojna, informacyjna karta zawierająca nazwę, ciepły opis, czas trwania, cenę i zakres usługi. Terminarz jest udostępniany indywidualnie po rozmowie, jeśli behawiorysta uzna konsultację za właściwy krok.

Przed przyznaniem dostępu karta nie pokazuje terminarza i nie używa komunikatów `odblokuj` ani `zakwalifikowano`. Po decyzji behawiorysty karta otrzymuje przycisk `Umów konsultację` oraz indywidualny dostęp do rezerwacji.

## Potwierdzenie decyzji Punktu 0 — karta terapii behawioralnej

Data potwierdzenia: 31.08.2026

Terapia behawioralna jest widoczna jako możliwa dalsza ścieżka, ale nie jest dostępna po samym `Zapytaj`. Karta opisuje ją jako dłuższą, prowadzoną pracę dopasowaną do sytuacji zwierzęcia i informuje, że dostęp wymaga wcześniejszej pełnej konsultacji oraz decyzji behawiorysty.

Przed spełnieniem tego warunku karta nie pokazuje terminarza ani aktywnego CTA. Nie obiecujemy naprawienia zachowania ani konkretnego rezultatu. Sposób prezentacji ceny terapii pozostaje do osobnego ustalenia.

### Doprecyzowanie ceny terapii

Terapia behawioralna jest wyceniana indywidualnie po pełnej konsultacji. Publiczna karta pokazuje zakres usługi i informację o indywidualnej wycenie, ale nie prezentuje jednej pozornej ceny końcowej.

## Potwierdzenie decyzji Punktu 0 — zakres WhatsApp przy konsultacji i terapii

Data potwierdzenia: 31.08.2026

WhatsApp przy pełnej konsultacji i terapii nie jest nielimitowaną obsługą ani kanałem do dowolnych tematów.

- przy pełnej konsultacji działa przez określony czas po konsultacji;
- przy terapii działa podczas aktywnej współpracy;
- służy do pytań związanych z omówionym przypadkiem i wdrażaniem zaleceń;
- nie służy do sytuacji nagłych ani weterynaryjnych;
- nowy, niezwiązany problem wymaga osobnej usługi.

Publiczna komunikacja ma zachować przyjazny ton, ale nie może obiecywać „pytań o wszystko” bez limitu zakresu i czasu.

### Doprecyzowanie czasu wsparcia

Pełna konsultacja obejmuje 14 dni dostępu do WhatsApp liczonych od dnia konsultacji. Terapia obejmuje WhatsApp przez czas aktywnej współpracy. W obu przypadkach deklarowany maksymalny czas odpowiedzi wynosi 48 godzin.

### Zakończenie dostępu do WhatsApp

Po wygaśnięciu okresu wsparcia WhatsApp nie znika z Pokoju. Klient widzi datę zakończenia, a 48 godzin wcześniej otrzymuje spokojne przypomnienie. Po terminie wątek przechodzi w tryb tylko do odczytu, natomiast historia rozmowy i zaleceń pozostaje dostępna. Zasada dotyczy pełnej konsultacji oraz zakończenia aktywnej terapii.

## Potwierdzenie decyzji Punktu 0 — historia i dane w Pokoju klienta

Data potwierdzenia: 31.08.2026

Pokój klienta pokazuje na górze aktualną sprawę, jej status, podsumowanie, rekomendację i aktywne pytania. Niżej znajdują się sekcje:

- `Moje dane` — imię, e-mail i telefon;
- `Moje zwierzę` — gatunek oraz opcjonalne dane;
- `Historia usług` — daty, opłacone usługi, podsumowania, pytania i uprawnienia;
- `Wsparcie` — aktualny status WhatsApp albo pytań uzupełniających.

Historia jest domyślnie zwinięta, ale pozostaje dostępna po wygaśnięciu wsparcia. Klient widzi swoje dane i materiały przeznaczone dla niego, lecz nie surowe notatki behawiorysty, wewnętrzne decyzje ani techniczne statusy systemu.

## Potwierdzenie decyzji Punktu 0 — dostęp i prywatność Pokoju

Data potwierdzenia: 31.08.2026

Pokój klienta jest dostępny przez prywatny, czasowy link wysłany na zweryfikowany adres e-mail. Link może zostać odnowiony, a dostęp ręcznie odebrany. E-mail nie zawiera podsumowania ani danych wrażliwych — zawiera wyłącznie bezpieczne wejście do Pokoju.

Pokój nie może być indeksowany przez wyszukiwarki. Zmiana numeru telefonu lub adresu e-mail wymaga dodatkowego potwierdzenia. Na obecnym etapie nie wprowadzamy ciężkiego systemu haseł, ale nie stosujemy stałych, publicznych linków.

## Potwierdzenie decyzji Punktu 0 — minimalna komunikacja e-mailowa

Data potwierdzenia: 31.08.2026

Komunikacja e-mailowa pozostaje ograniczona do wiadomości transakcyjnych i pomocnych:

1. po płatności — potwierdzenie usługi, trybu, ceny, terminu i numeru telefonu;
2. po dwóch nieudanych próbach — informacja i link do jednego dodatkowego terminu;
3. po publikacji podsumowania — link do Pokoju;
4. 48 godzin przed końcem WhatsApp — przypomnienie o dacie wygaśnięcia;
5. po wygaśnięciu wsparcia — informacja o przejściu wątku w tryb tylko do odczytu.

Status przygotowywania podsumowania pozostaje widoczny w Pokoju i nie generuje osobnego e-maila. PDF-y, konsultacja i pozostałe usługi nie uruchamiają osobnych wiadomości sprzedażowych.

## Potwierdzenie decyzji Punktu 0 — pytania uzupełniające w Pokoju

Data potwierdzenia: 31.08.2026

Po rozmowie klient otrzymuje w Pokoju prostą funkcję dwóch krótkich pytań dotyczących tej samej sytuacji. Widzi licznik pozostałych pytań oraz datę wygaśnięcia uprawnienia po 7 dniach od rozmowy.

Pytania nie obejmują nowych problemów, długich analiz ani prowadzenia terapii. Funkcja ma działać jako ograniczony wątek rozmowy, a nie nieograniczony kanał WhatsApp. Behawiorysta odpowiada w czasie do 48 godzin.

## Potwierdzenie decyzji Punktu 0 — usunięcie pozycji `Problemy` z nawigacji

Data potwierdzenia: 31.08.2026

Pozycja `Problemy` zostaje usunięta z głównej nawigacji. Strony dotyczące konkretnych tematów zachowania mogą nadal istnieć jako wejścia z Google, bloga i odpowiednich treści, ale klient nie ma być zmuszany do samodzielnego klasyfikowania ani diagnozowania sytuacji przed usługą `Zapytaj`.

Nie zastępujemy jej automatycznie nową nazwą w menu. Ewentualny hub edukacyjny wymaga osobnej decyzji dotyczącej nazwy i roli.

## Potwierdzenie decyzji Punktu 0 — blog w nawigacji

Data potwierdzenia: 31.08.2026

Blog zostaje jako drugorzędna pozycja menu oraz zaplecze SEO, edukacji i budowania zaufania. Nie jest głównym CTA ani elementem dominującym pierwszego ekranu. Artykuły mają prowadzić naturalnie do `Zapytaj`, Mapy albo właściwej pomocy, bez masowej produkcji treści bez danych o ich skuteczności.

## Potwierdzenie decyzji Punktu 0 — rola Mapy zachowania

Data potwierdzenia: 31.08.2026

Mapa zachowania jest opcjonalną, drugorzędną ścieżką dla osoby, która nie wie, od czego zacząć. Nie jest obowiązkowa przed `Zapytaj` i nie konkuruje z główną usługą.

Mapa ma:

- zadawać kilka prostych pytań;
- nie wymagać rasy ani precyzyjnej diagnozy problemu;
- najczęściej kierować do `Zapytaj`;
- przy zagrożeniu zdrowia lub bezpieczeństwa kierować do właściwej pilnej pomocy;
- nie udawać diagnozy ani automatycznie nie rekomendować terapii.

Jej publiczna komunikacja może brzmieć: „Nie wiesz, od czego zacząć? Odpowiedz na kilka krótkich pytań, a podpowiem Ci właściwy pierwszy krok”. Mapa ma pomagać rozpocząć drogę, a nie zastępować behawiorystę.

## Potwierdzenie decyzji Punktu 1 — dwa pierwsze pytania bezpieczeństwa

Data potwierdzenia: 31.08.2026

Na wejściu do Mapy zachowania pojawiają się tylko dwa pytania bezpieczeństwa:

1. „Czy teraz istnieje bezpośrednie zagrożenie dla człowieka lub zwierzęcia?”;
2. „Czy doszło do pogryzienia, urazu albo nagłego pogorszenia zdrowia?”

Jeśli odpowiedź wskazuje na zagrożenie, Mapa przerywa zwykłą ścieżkę i kieruje do właściwej pilnej pomocy, bez płatnego CTA i bez udawania diagnozy. Dodatkowe obszary, takie jak ucieczka, samookaleczenie lub poważna agresja bez urazu, nie są teraz dodawane jako osobne pytania; stanowią ryzyko do weryfikacji podczas projektowania i testów Punktu 1.

### Doprecyzowanie odpowiedzi w bramce bezpieczeństwa

Odpowiedzi na oba pytania mają wyłącznie formę `Tak` albo `Nie`. Nie dodajemy odpowiedzi `Nie wiem`. Pytania i komunikat bezpieczeństwa muszą być sformułowane jednoznacznie, aby klient rozumiał, kiedy należy przerwać Mapę i skorzystać z pilnej pomocy.

## Potwierdzenie decyzji Punktu 1 — wynik Mapy po dwóch odpowiedziach „Nie”

Data potwierdzenia: 31.08.2026

Jeśli klient odpowie `Nie` na oba pytania bezpieczeństwa, Mapa nie uruchamia dalszego quizu. Pokazuje od razu wynik:

> **Najlepszy pierwszy krok to spokojna rozmowa z behawiorystą.**
>
> Opowiesz o sytuacji i dowiesz się, co możesz zrobić dalej.

Z wyniku klient przechodzi do wyboru zwykłego terminu albo `Zapytaj teraz`. Blog lub PDF mogą być wyłącznie drugorzędnym linkiem dla osoby, która chce najpierw poczytać. Mapa nie powtarza rozbudowanego formularza usługi.

## Potwierdzenie decyzji Punktu 1 — wynik Mapy przy odpowiedzi „Tak”

Data potwierdzenia: 31.08.2026

Jeśli klient odpowie `Tak` na którekolwiek pytanie bezpieczeństwa, Mapa natychmiast przerywa zwykłą ścieżkę i pokazuje spokojny komunikat, że sytuacja wymaga pilnej pomocy, a nie dalszego korzystania z Mapy.

- przy zagrożeniu człowieka klient otrzymuje wskazanie kontaktu z numerem 112;
- przy urazie, pogryzieniu albo nagłym pogorszeniu stanu zwierzęcia klient otrzymuje wskazanie pilnego kontaktu z weterynarzem lub kliniką całodobową;
- nie pokazujemy płatnego CTA, PDF-u, bloga ani zwykłego formularza;
- do ścieżki behawioralnej można wrócić dopiero po zakończeniu sytuacji nagłej.

Komunikat ma być stanowczy, ale nie alarmistyczny. Mapa nie diagnozuje i nie zastępuje pilnej pomocy.

## Potwierdzenie decyzji Punktu 1 — dwuekranowy wygląd Mapy

Data potwierdzenia: 31.08.2026

Mapa zachowania ma dwa etapy:

1. ekran `Zanim zaczniemy` z dwoma pytaniami bezpieczeństwa widocznymi razem, odpowiedziami `Tak`/`Nie` i przyciskiem `Dalej` aktywnym po udzieleniu obu odpowiedzi;
2. ekran wyniku — przy dwóch odpowiedziach `Nie` prowadzi do wyboru zwykłego terminu albo `Zapytaj teraz`, a przy odpowiedzi `Tak` kieruje do pilnej pomocy bez formularza i sprzedażowego CTA.

Nie używamy określeń `test`, `diagnoza` ani `wynik medyczny`. Mapa ma być krótkim przewodnikiem, nie rozbudowanym quizem.

## Potwierdzenie decyzji Punktu 2 — czasowej blokady zwykłego terminu

Data potwierdzenia: 31.08.2026

Zwykły termin jest blokowany na 15 minut od chwili wybrania go przez klienta. Odliczanie jest widoczne podczas formularza i płatności. Jeśli płatność nie zostanie potwierdzona w tym czasie, termin wraca do puli.

Płatność potwierdzona po wygaśnięciu blokady nie może automatycznie odzyskać zajętego terminu ani zająć innego terminu bez świadomego rozstrzygnięcia. Dla `Zapytaj teraz` pozostaje osobna blokada 5 minut.

## Potwierdzenie decyzji Punktu 2 — przełożenie zwykłego terminu przez klienta

Data potwierdzenia: 31.08.2026

Klient może samodzielnie zgłosić przełożenie zwykłego terminu przed rozpoczęciem rozmowy. Zasada nie dotyczy wariantu `Zapytaj teraz` po uruchomieniu prób połączenia.

Liczba możliwych przełożeń oraz graniczny czas przed rozmową pozostają do osobnego ustalenia. System musi zachować historię zmiany i zwolnić pierwotny termin dopiero po poprawnym przydzieleniu nowego.

### Doprecyzowanie limitu przełożenia

Klient może samodzielnie przełożyć zwykły termin tylko 1 raz. Graniczny moment, do którego można wykonać tę zmianę, pozostaje do osobnego ustalenia.

### Doprecyzowanie granicy samodzielnej zmiany

Jednorazowe samodzielne przełożenie zwykłego terminu jest dostępne do 24 godzin przed rozpoczęciem rozmowy. Późniejsza prośba wymaga ręcznego rozpatrzenia.

## Potwierdzenie decyzji Punktu 2 — odwołanie lub awaria po stronie behawiorysty

Data potwierdzenia: 31.08.2026

Jeśli rozmowa nie może się odbyć z powodu behawiorysty albo awarii systemu, usługa nie jest oznaczana jako zrealizowana. Klient otrzymuje informację w Pokoju i e-mail z możliwością ustalenia nowego terminu albo uzyskania zwrotu. Termin nie jest przenoszony automatycznie bez zgody klienta.

W przypadku awarii ZADARMA ręczny kontakt pozostaje próbą realizacji, ale jeśli nie doprowadzi do faktycznej rozmowy, klient zachowuje możliwość nowego terminu albo zwrotu. Okres 14 dni WhatsApp rozpoczyna się dopiero po faktycznie przeprowadzonej pełnej konsultacji.

## Potwierdzenie decyzji Punktu 2 — anulowanie po granicy 24 godzin

Data potwierdzenia: 31.08.2026

Po przekroczeniu granicy 24 godzin przed zwykłym terminem klient nie może samodzielnie przełożyć rezerwacji. Może skontaktować się w sprawie anulowania, zmiany albo zwrotu, ale każda taka prośba jest rozpatrywana ręcznie. System nie wykonuje automatycznego zwrotu ani automatycznego przeniesienia.

Reguła nie zastępuje praw konsumenta i wymaga późniejszego sprawdzenia w ostatecznych warunkach sprzedaży.

## Potwierdzenie decyzji Punktu 2 — potwierdzenie faktycznej płatności

Data potwierdzenia: 31.08.2026

Po faktycznym potwierdzeniu płatności klient otrzymuje jedno potwierdzenie zawierające nazwę usługi, kwotę, wybrany tryb, termin (jeśli dotyczy), numer telefonu, informację o potwierdzeniu oraz link do Pokoju klienta. Wiadomość przypomina również o zakresie rozmowy i 2 pytaniach uzupełniających.

Komunikat dla `Zapytaj teraz` informuje, że po potwierdzeniu rozpocznie się próba połączenia. Komunikat dla zwykłego terminu informuje, że termin został zarezerwowany. Potwierdzenie płatności nie zawiera podsumowania rozmowy, rekomendacji ani sprzedaży kolejnych usług. Dokument sprzedaży lub potwierdzenie księgowe jest przekazywane zgodnie ze sposobem rozliczeń.

## Potwierdzenie decyzji Punktu 2 — zamknięcie checkoutu i zgody

Data potwierdzenia: 31.08.2026

Przed zakończeniem checkoutu klient widzi cenę końcową, wybrany tryb i termin, zasady blokady, przełożenia i anulowania, informację o automatycznym połączeniu w `Zapytaj teraz`, regulamin oraz politykę prywatności.

Przycisk płatności jednoznacznie informuje o obowiązku zapłaty, np. `Kupuję i płacę 79 zł` albo `Kupuję i płacę 104 zł`. Nie używać samego `Rezerwuję` jako finalnego przycisku. Zgody marketingowe są dobrowolne i domyślnie niezaznaczone.

Dla `Zapytaj teraz` należy osobno zweryfikować prawidłowy zapis dotyczący rozpoczęcia usługi od razu po płatności i związanych z tym praw konsumenta.

## Potwierdzenie decyzji Punktu 3 — statusy live `Zapytaj teraz`

Data potwierdzenia: 31.08.2026

Wewnętrzne stany usługi live:

- `Dostępny teraz` — behawiorysta może przyjąć rozmowę;
- `Blokada płatności` — klient kończy zakup;
- `Łączenie` — system zestawia połączenie;
- `W rozmowie` — kolejny klient nie jest przyjmowany;
- `Niedostępny` — rozmowa live jest zamknięta;
- `Awaria` — uruchamiany jest ręczny kontakt.

Publiczne komunikaty są prostsze: `Możesz zapytać teraz`, `Trwa rozmowa`, `Zapytaj teraz jest niedostępne` albo `Chwilowa przerwa techniczna`. Klient nie widzi technicznych stanów blokady płatności ani łączenia. Przy niedostępności zachowuje możliwość wybrania zwykłego terminu i zapisania się na powiadomienie, które nie gwarantuje miejsca.

## Potwierdzenie decyzji Punktu 3 — ręczne sterowanie dostępnością live

Data potwierdzenia: 31.08.2026

Behawiorysta ręcznie włącza przełącznik `Jestem dostępny`, który uruchamia publiczną możliwość zakupu `Zapytaj teraz`. System automatycznie blokuje nowe wejścia po rozpoczęciu płatności i zmienia stan na `W rozmowie` po rozpoczęciu połączenia.

Wyłączenie dostępności natychmiast zatrzymuje nowe zakupy live, ale nie anuluje opłaconej rozmowy. Przy utracie połączenia z systemem usługa przechodzi bezpiecznie na `Niedostępny`. Po zakończeniu rozmowy dostępność nie włącza się automatycznie — behawiorysta decyduje o ponownym uruchomieniu.

## Potwierdzenie decyzji Punktu 3 — równoczesny zakup `Zapytaj teraz`

Data potwierdzenia: 31.08.2026

W danym momencie może być aktywna tylko jedna rozmowa live. Przy kilku osobach korzystających ze strony pierwsza potwierdzona płatność uzyskuje usługę, a pierwsza osoba rozpoczynająca checkout otrzymuje 5-minutową blokadę na dokończenie płatności.

Pozostałe osoby nie mogą utworzyć podwójnego bookingu. Po zajęciu rozmowy widzą komunikat o zakończeniu dostępności, zwykłe terminy oraz możliwość zapisania się na powiadomienie. Nie uruchamiamiamy płatnej kolejki, a powiadomienie nie rezerwuje miejsca.

Reguła musi być egzekwowana atomowo po stronie serwera, niezależnie od tego, czy otwarta strona klienta nadal pokazuje stary status.

## Potwierdzenie decyzji Punktu 3 — komunikat po zajęciu rozmowy live

Data potwierdzenia: 31.08.2026

Jeśli inna osoba zajmie rozmowę live, klient widzi jasny komunikat: „Ta rozmowa została właśnie zajęta”. Następnie otrzymuje dwa realne kroki: `Umów zwykły termin — 79 zł` oraz `Powiadom mnie, gdy będzie można zapytać teraz`.

Nie pokazujemy błędu technicznego ani komunikatu obciążającego klienta. Jeśli mimo przegrania wyścigu o dostępność płatność została pobrana, sprawa trafia do ręcznego rozstrzygnięcia i system nie tworzy samowolnie innej rezerwacji.

## Potwierdzenie decyzji Punktu 3 — jednorazowe powiadomienie o dostępności

Data potwierdzenia: 31.08.2026

`Powiadom mnie` tworzy jednorazowe zgłoszenie dotyczące najbliższej ponownej dostępności `Zapytaj teraz`, a nie stałą kolejkę.

- klient podaje e-mail; SMS może być dodatkowym kanałem wybranym świadomie;
- zgłoszenie wygasa po wysłaniu powiadomienia;
- wiadomość jasno informuje, że nie rezerwuje miejsca, a decyduje pierwsza potwierdzona płatność;
- klient może zapisać się ponownie, jeśli nadal chce czekać;
- zgłoszenie nie uruchamia marketingu ani serii reklam.

## Potwierdzenie decyzji Punktu 2 — płatność dla `Zapytaj teraz`

Data potwierdzenia: 31.08.2026

`Zapytaj teraz` wymaga płatności potwierdzanej automatycznie. Ręczne zgłoszenie płatności nie może blokować krótkiego, 5-minutowego okna na rozpoczęcie połączenia.

Oba warianty korzystają z jednego checkoutu, ale rezerwacja nie jest oznaczana jako potwierdzona, dopóki system nie otrzyma faktycznego potwierdzenia płatności. Status „płatność zgłoszona” nie jest równoznaczny ze statusem „opłacone”.

## Potwierdzenie decyzji Punktu 2 — ręczny BLIK w zwykłym terminie

Data potwierdzenia: 31.08.2026

Ręczny BLIK pozostaje dostępny w ścieżce zwykłego terminu. Nie dotyczy wariantu `Zapytaj teraz`, który wymaga automatycznie potwierdzanej płatności.

W zwykłym terminie ręczny BLIK działa w ramach 15-minutowej blokady. Do czasu faktycznego potwierdzenia płatności klient widzi stan oczekiwania, a termin nie jest uznawany za ostatecznie zarezerwowany. Późne potwierdzenie nie przywraca automatycznie wygasłego terminu.

## Potwierdzenie decyzji Punktu 2 — statusy ręcznego BLIK-a

Data potwierdzenia: 31.08.2026

W zwykłym terminie klient widzi następujące rozróżnione stany:

1. `Oczekuje na płatność` — termin jest wstępnie blokowany do wskazanej godziny;
2. `Płatność zgłoszona` — płatność jest sprawdzana, ale termin nie jest jeszcze ostatecznie potwierdzony;
3. `Płatność potwierdzona` — termin jest zarezerwowany;
4. `Czas na płatność minął` — termin wrócił do puli.

Nie pokazujemy potwierdzonej rezerwacji bez faktycznego potwierdzenia płatności. Po wygaśnięciu blokady klient otrzymuje jasną informację, że spóźniona płatność nie przywraca automatycznie terminu i wymaga kontaktu w celu rozstrzygnięcia.

## Potwierdzenie decyzji Punktu 2 — spóźniona płatność

Data potwierdzenia: 31.08.2026

Po wygaśnięciu blokady klient widzi komunikat: „Czas na płatność minął. Termin nie jest już zarezerwowany. Jeśli płatność została wysłana, skontaktujemy się z Tobą w sprawie dalszego rozwiązania”.

Spóźniona płatność trafia do ręcznego rozstrzygnięcia. Jeśli pierwotny termin nadal jest wolny, behawiorysta może go potwierdzić. Jeśli termin został zajęty, klient otrzymuje alternatywny termin albo zwrot. System nie przenosi klienta automatycznie do innego terminu i nie oznacza takiej usługi jako zrealizowanej.

## Potwierdzenie decyzji Punktu 3 — dane i zgoda dla `Powiadom mnie`

Data potwierdzenia: 31.08.2026

Dla jednorazowego powiadomienia zbieramy tylko adres e-mail, a numer telefonu wyłącznie wtedy, gdy klient wybierze SMS. Zapisywany jest również wybrany kanał, data zgłoszenia i status wysłania.

Nie zbieramy na tym etapie gatunku, rasy ani opisu problemu, ponieważ powiadomienie nie jest rezerwacją. Zgłoszenie o dostępności jest oddzielone od newslettera i marketingu, nie jest domyślnie zaznaczone i może zostać wycofane. Po zapisaniu klient widzi informację: „Zapisano. Otrzymasz jednorazowe powiadomienie, gdy będzie można zapytać teraz. Powiadomienie nie rezerwuje miejsca”.

## Potwierdzenie decyzji Punktu 4 — uproszczony katalog usług

Data potwierdzenia: 31.08.2026

Publicznie pozostają cztery główne ścieżki:

1. `Zapytaj behawiorystę — 15 min` — 79 zł albo 104 zł za natychmiastową dostępność;
2. `Pełna konsultacja` — osobna płatna usługa z terminarzem udostępnianym indywidualnie;
3. `Terapia behawioralna` — dostępna po pełnej konsultacji, z wyceną indywidualną;
4. `Hotel socjalizacyjno-terapeutyczny` — ustalany indywidualnie, bez publicznego terminarza.

Stare nazwy i dawne produkty mogą pozostać technicznie dla historii wcześniejszych zakupów, ale nie są proponowane nowym klientom i nie konkurują z `Zapytaj`.

## Korekta zakresu pełnej konsultacji — plan przekazywany codziennie

Data ustalenia: 31.08.2026

Pełna konsultacja nie kończy się długim pisemnym elaboratem. Klient otrzymuje krótkie podsumowanie, a plan pracy jest przekazywany etapami, codziennie w WhatsApp, w małych i praktycznych wiadomościach. Nie tworzymy obszernego dokumentu tylko po to, aby zastąpić nim bieżące prowadzenie klienta.

Ustalone 14 dni WhatsApp pozostają okresem wsparcia. Przy opisie usługi trzeba jasno pokazać, że codzienny plan oznacza realne, etapowe prowadzenie, a nie obietnicę nieograniczonego czatu ani dowolnych tematów.

### Doprecyzowanie codziennego planu

Przez 14 dni behawiorysta przekazuje w WhatsApp jeden krótki, praktyczny krok albo obserwację na każdy dzień wsparcia. Klient może odpowiadać i zadawać pytania dotyczące tego kroku, a maksymalny czas odpowiedzi wynosi 48 godzin. Nie jest to długi raport ani nieograniczony czat.

### Doprecyzowanie ceny pełnej konsultacji

Pełna konsultacja kosztuje 475 zł. Cena obejmuje faktyczne spotkanie, krótkie podsumowanie oraz 14 dni codziennego, indywidualnego prowadzenia w WhatsApp. Cena jest uzasadniona wyłącznie wtedy, gdy codzienny plan jest rzeczywiście realizowany, a nie zastępowany samym ogólnym podsumowaniem.

### Doprecyzowanie czasu pełnej konsultacji

Pełna konsultacja trwa **około 90 minut**. Publiczne określenie pozostawia naturalny margines dla przebiegu rozmowy, ale przed wdrożeniem trzeba ustalić wewnętrzną granicę operacyjną, aby czas usługi nie rozciągał się bez kontroli.

## Potwierdzenie decyzji Punktu 4 — formularz pogłębiający po przyznaniu konsultacji

Data potwierdzenia: 31.08.2026

Przed pełną konsultacją klient nie przechodzi ponownie całej ścieżki problemu i rasy. Po ręcznym przyznaniu dostępu otrzymuje w Pokoju osobny formularz pogłębiający, który wykorzystuje dane z `Zapytaj` i zbiera tylko informacje potrzebne do jakościowej konsultacji.

Formularz nie jest publiczną bramką sprzedażową ani dodatkową kwalifikacją do zakupu. Może zawierać dokładniejszy cel, historię problemu, dotychczasowe próby, warunki w domu oraz informacje o zdrowiu i lekach. Nagrania i zdjęcia pozostają opcjonalnym dodatkiem.

Ustalona kolejność: przyznanie dostępu → formularz pogłębiający → wybór terminu.

### Zakres formularza pogłębiającego

Formularz obejmuje sześć krótkich bloków:

- co klient chce zmienić lub lepiej zrozumieć;
- od kiedy i w jakich sytuacjach pojawia się zachowanie;
- co je wywołuje i jak często występuje;
- co już było próbowane i z jakim skutkiem;
- warunki życia, domownicy i inne zwierzęta;
- zdrowie, leki i ewentualna konsultacja weterynaryjna.

Rasa, wiek, zdjęcia i krótkie nagrania są opcjonalne. Nie wymuszamy gotowej kategorii problemu, a formularz nie powinien zajmować klientowi więcej niż kilka minut.

## Potwierdzenie decyzji Punktu 4 — ważność dostępu do terminarza konsultacji

Data potwierdzenia: 31.08.2026

Po przyznaniu dostępu klient wypełnia formularz pogłębiający, a następnie otrzymuje indywidualny terminarz. Sam dostęp nie rezerwuje miejsca; rezerwacja powstaje dopiero po wyborze i opłaceniu terminu.

Indywidualny dostęp do terminarza jest ważny przez 30 dni od przyznania. Po tym czasie klient nie widzi martwego lub nieaktualnego kalendarza, lecz informację o wygaśnięciu i możliwość ponownego kontaktu. 14 dni WhatsApp rozpoczyna się dopiero po faktycznie przeprowadzonej pełnej konsultacji.

## Potwierdzenie decyzji Punktu 4 — wygaśnięcie dostępu do terminarza

Data potwierdzenia: 31.08.2026

Po 30 dniach klient nie widzi pustego ani nieaktualnego kalendarza. W Pokoju pojawia się komunikat: „Dostęp do terminarza konsultacji wygasł. Jeśli nadal chcesz umówić konsultację, skontaktuj się ze mną” oraz jeden przycisk `Skontaktuj się`.

Podsumowanie `Zapytaj`, historia i wcześniejsze dane pozostają dostępne. Ponowne udostępnienie terminarza odbywa się wyłącznie ręcznie przez behawiorystę; system nie odnawia dostępu automatycznie.

## Potwierdzenie decyzji Punktu 4 — publiczne rozróżnienie `Zapytaj` i pełnej konsultacji

Data potwierdzenia: 31.08.2026

`Zapytaj behawiorystę` za 79 zł lub 104 zł oznacza rozmowę do 15 minut, pierwsze zrozumienie sytuacji, wskazówkę co zrobić dalej oraz 2 pytania uzupełniające przez 7 dni.

`Pełna konsultacja` za 475 zł oznacza około 90 minut dokładniejszej pracy, krótkie podsumowanie oraz indywidualny plan przekazywany etapami — jeden praktyczny krok dziennie przez 14 dni w WhatsApp, z odpowiedzią do 48 godzin.

Różnica cen wynika z zakresu i czasu prowadzenia, a nie z ukrytego obowiązku przejścia z tańszej usługi do droższej.

## Potwierdzenie decyzji Punktu 4 — sposób prezentacji cen

Data potwierdzenia: 31.08.2026

Na pierwszym ekranie pokazujemy ceny 79 zł i 104 zł za `Zapytaj`. Pełna konsultacja jest prezentowana niżej albo na osobnej stronie z ceną 475 zł i jasnym zakresem około 90 minut oraz 14 dni codziennego prowadzenia w WhatsApp.

Nie stosujemy przekreślonej ceny, zaliczki, automatycznego upgrade’u ani odejmowania ceny `Zapytaj` od pełnej konsultacji. Cena 475 zł pozostaje widoczna w Pokoju także przed przyznaniem dostępu do terminarza. `Zapytaj` pozostaje samodzielną usługą, a różnica cen wynika z zakresu pracy.

## Potwierdzenie decyzji Punktu 4 — pilotaż ceny 39,99 zł

Data potwierdzenia: 31.08.2026

Cena 39,99 zł jest ograniczonym pilotażem pozyskania klientów, a nie stałą ceną ani elementem strony głównej. Kampania działa przez osobny link kierowany do grup na Facebooku i obejmuje 10 faktycznie opłaconych rezerwacji zwykłego terminu `Zapytaj`.

Warunki pilotażu: jedna promocja na klienta, data wygaśnięcia, ten sam zakres usługi i 2 pytania uzupełniające, bez `Zapytaj teraz`. Po wyczerpaniu limitu wraca cena 79 zł. Należy mierzyć odbyte rozmowy, czas obsługi i przejścia do pełnej konsultacji.

## Potwierdzenie decyzji Punktu 4 — jeden dopasowany PDF w Pokoju

Data potwierdzenia: 31.08.2026

Po `Zapytaj` w Pokoju może pojawić się jeden PDF dobrany do rzeczywistej sytuacji opisanej w podsumowaniu. Jeśli materiał jest `Najbliższym krokiem`, otrzymuje główną kartę; jeśli behawiorysta rekomenduje konsultację albo inną pomoc, PDF pozostaje niżej jako opcjonalna możliwość.

Karta materiału zawiera tytuł, krótki opis, cenę (jeśli jest płatny), podgląd i informację o zakresie. Nie tworzymy w Pokoju katalogu, pakietów ani automatycznego polecania przypadkowych PDF-ów. Materiał nie zastępuje właściwej pomocy w sytuacjach zdrowotnych lub niebezpiecznych.

### Model płatnego materiału

## Potwierdzenie decyzji Punktu 4 — dostarczanie płatnego PDF-u

Data potwierdzenia: 31.08.2026

Płatny PDF jest udostępniany automatycznie dopiero po faktycznym potwierdzeniu płatności. Klient otrzymuje go przez przycisk `Pobierz PDF` w Pokoju. Nie publikujemy stałego, publicznego adresu do pliku.

Link do pobrania może być czasowy, ale uprawnienie klienta pozostaje aktywne i umożliwia ponowne pobranie. E-mail informuje wyłącznie o dostępności materiału i prowadzi do Pokoju. Nie stosujemy ciężkiego DRM, który utrudniałby korzystanie z opłaconego zakupu.

## Potwierdzenie decyzji Punktu 8 — CTA artykułów blogowych

Data potwierdzenia: 31.08.2026

Artykuł blogowy prowadzi do jednego adekwatnego kroku zależnego od treści: najczęściej do `Zapytaj`, jednego dopasowanego PDF-u albo właściwej pomocy. Nie kierujemy automatycznie każdego artykułu do pełnej konsultacji.

Unikamy pytania „czy potrzebna jest konsultacja?”. Lepszy jest język „co możesz zrobić dalej?”. Blog ma prowadzić od zrozumienia sytuacji do działania, a nie działać jak nachalna reklama.

PDF jest opcjonalnym produktem płatnym, którego zakup nie jest konieczny po `Zapytaj`. Bezpłatny artykuł może być alternatywą. Płatny materiał powinien oferować uporządkowane ćwiczenia albo plan pracy i nie może jedynie powtarzać treści bloga ani udawać zamiennika pełnej konsultacji. Cena zostanie ustalona po sprawdzeniu jakości i objętości istniejących materiałów.

## Potwierdzenie decyzji Punktu 5 — transparentny status COAPE/CAPBT

Data potwierdzenia: 31.08.2026

Publiczne określenie kwalifikacji behawioralnej brzmi: `Dyplomant COAPE`. Nie używamy określenia `certyfikowany behawiorysta COAPE/CAPBT`, dopóki taki status nie wynika jednoznacznie z aktualnego publicznego źródła. Profil CAPBT pozostaje linkowanym dowodem obecności i statusu, a nie podstawą do dopisywania szerszego tytułu.

Podstawowa wersja do komunikacji:

`Behawiorysta psów i kotów · Dyplomant COAPE · Technik weterynarii`

`Technik weterynarii`, `dietetyk`, `dogoterapeuta` oraz doświadczenie `ponad 10 lat` mogą być pokazywane jako osobne informacje o wykształceniu lub doświadczeniu, ale nie należy przedstawiać ich jako kwalifikacji potwierdzonych przez CAPBT, jeśli profil CAPBT ich nie wymienia.

Farmakoterapia nie jest elementem głównej obietnicy ani pierwszego ekranu. Jeśli temat pozostanie w opisie, wymaga precyzyjnego sformułowania, jasnego wskazania roli lekarza weterynarii i osobnej weryfikacji przed publikacją.

Przed wdrożeniem Punktu 5 trzeba ujednolicić tę zasadę we wszystkich miejscach: stronie `O mnie`, pierwszym ekranie, SEO, schema, stopce, profilach społecznościowych i generowanych PDF-ach. Należy także ujednolicić dane kontaktowe strony i profilu CAPBT, ponieważ obecnie różnią się między źródłami.

## Potwierdzenie decyzji Punktu 5 — hierarchia ekspertckości na pierwszym ekranie

Data potwierdzenia: 31.08.2026

Pierwszy ekran pozostaje przede wszystkim ekranem głównej usługi `Zapytaj behawiorystę — 15 min`. Ekspertckość ma wzmacniać decyzję klienta, ale nie może konkurować z opisem usługi, ceną, dostępnością i przyciskiem działania.

Bezpośrednio przy głównej ofercie pokazujemy tylko:

`Krzysztof Regulski · Dyplomant COAPE · Technik weterynarii`

oraz spokojny link `Sprawdź publiczny profil CAPBT`.

Na pierwszym ekranie nie eksponujemy pełnej listy dodatkowych kompetencji, publikacji, modelu MHERA ani kilku dużych logotypów. Te elementy pozostają dowodami na stronie `O mnie` i w dalszych sekcjach serwisu.

Po komunikacie eksperckim najważniejsze są cena i realna dostępność: `Zapytaj teraz — 104 zł`, gdy rozmowa live jest rzeczywiście dostępna, `Wybierz termin — 79 zł` dla zwykłej rezerwacji oraz `Powiadom mnie`, gdy tryb live jest niedostępny.

Na stronie `O mnie` informacje dzielimy na dwie grupy: `Status i kwalifikacje możliwe do sprawdzenia` oraz `Doświadczenie i dodatkowe kompetencje`. Określenie `Technik weterynarii` pozostaje dokładne i nie może sugerować, że behawiorysta jest lekarzem weterynarii.

## Potwierdzenie decyzji Punktu 9 — newsletter odłożony

Data potwierdzenia: 31.08.2026

Na obecnym etapie newsletter jest zbędny, ponieważ behawiorysta nie planuje regularnej wysyłki. Nie dodajemy formularza zapisu, osobnego kanału ani automatycznego zapisywania klientów po zakupie.

Blog pozostaje niezależną warstwą edukacyjną, a `Powiadom mnie` służy wyłącznie jednorazowemu alertowi o dostępności `Zapytaj teraz`. Ewentualna istniejąca lista lub wcześniejsze zgody nie są automatycznie wykorzystywane do nowych wysyłek; powrót do newslettera wymaga osobnej decyzji.

## Potwierdzenie decyzji Punktu 1 — budżet czasu dla `Zapytaj`

Data potwierdzenia: 31.08.2026

Jedno opłacone `Zapytaj behawiorystę — 15 min` powinno mieścić się w wewnętrznym budżecie około 30 minut aktywnej pracy. Budżet obejmuje przeczytanie krótkiego opisu, rozmowę do 15 minut, krótkie podsumowanie, przekazanie dostępu do Pokoju, podstawową obsługę płatności oraz standardową obsługę nieudanego połączenia zgodnie z ustalonymi zasadami.

Limit dotyczy zarówno zwykłego terminu za 79 zł, jak i trybu `Zapytaj teraz` za 104 zł. Wyższa cena oznacza priorytet i rzeczywistą dostępność live, a nie szerszy zakres merytoryczny ani nieograniczoną obsługę po rozmowie.

Czas oczekiwania behawiorysty na klienta podczas włączonej dostępności live jest osobnym kosztem operacyjnym. Należy go mierzyć oddzielnie i oceniać przy ustalaniu długości okien `Zapytaj teraz`; nie wolno udawać, że każda godzina dostępności jest w pełni płatnym czasem pracy.

Promocja 39,99 zł pozostaje pilotażem pozyskania klientów. Ma ten sam zakres usługi, ale jej opłacalność trzeba ocenić na podstawie rzeczywistego czasu obsługi, kosztów i późniejszych zakupów. Nie zakładamy, że klient przejdzie do pełnej konsultacji.

## Potwierdzenie decyzji Punktu 1 — wewnętrzny blok terminu `Zapytaj`

Data potwierdzenia: 31.08.2026

Każdy zwykły termin `Zapytaj behawiorystę — 15 min` zajmuje w wewnętrznym grafiku blok około 30 minut, mimo że klient widzi i kupuje rozmowę do 15 minut. Druga część bloku chroni czas na przeczytanie opisu, podsumowanie, przekazanie dostępu do Pokoju i podstawową obsługę.

System nie powinien udostępniać zwykłych rozmów co 15 minut przez cały dzień. Terminy muszą uwzględniać rzeczywistą pojemność jednej osoby i nie mogą doprowadzać do nakładania się rozmów ani narastania nieobsłużonych podsumowań.

Tryb `Zapytaj teraz` nie korzysta z publicznej serii sztywnych terminów. Działa w ręcznie włączonym oknie, gdy behawiorysta rzeczywiście jest gotowy do rozmowy. Po zakończeniu rozmowy behawiorysta sam decyduje, czy ponownie włączyć dostępność.

## Potwierdzenie decyzji Punktu 1 — granice WhatsApp w pełnej konsultacji

Data potwierdzenia: 31.08.2026

Cena pełnej konsultacji obejmuje około 90-minutową rozmowę, krótkie podsumowanie oraz 14 dni codziennego, indywidualnego prowadzenia w WhatsApp. Każdego dnia behawiorysta przekazuje jeden krótki, praktyczny krok albo obserwację.

Klient może zadawać pytania dotyczące wdrażania ustaleń i tej konkretnej sprawy, a odpowiedź jest udzielana do 48 godzin. Nie używamy obietnicy `pytania o wszystko` ani `nieograniczonego czatu`, ponieważ sugerowałaby bezterminową i nieograniczoną dostępność.

Wsparcie nie obejmuje nowych, niezwiązanych problemów, nagłych przypadków ani zastępowania pomocy weterynaryjnej. Jeśli temat wymaga dodatkowej pracy poza ustalonym zakresem, klient otrzymuje jasną informację o kolejnym kroku lub osobnej usłudze.

## Potwierdzenie decyzji Punktu 5 — przypisanie i urealnienie opinii klientów

Data potwierdzenia: 01.09.2026

Opinie znajdujące się w `lib/opinion-reviews.ts` są opiniami klientów i mogą być wykorzystywane publicznie zgodnie z potwierdzeniem właściciela serwisu. Każda opinia ma zostać rozdzielona na temat problemu oraz usługę, której dotyczy.

Przypisanie usługi wykonujemy redakcyjnie na podstawie treści, bez dopisywania klientowi niepotwierdzonego produktu:

- wzmianka o 15 minutach, `Kwadransie`, krótkiej rozmowie albo pierwszym kroku → `Zapytaj behawiorystę — 15 min`;
- szersza analiza, plan pracy, spotkania albo dłuższe prowadzenie → `Pełna konsultacja`;
- istniejące `Dwa kwadranse` → `Dwa kwadranse (archiwalna usługa)`;
- brak wystarczającej informacji → ogólne `Konsultacja behawioralna`, bez udawania konkretnej historii zakupu.

Redakcja opinii ma zachować ich sens i zwykły ton klienta. Usuwamy przesadne obietnice, absolutne rezultaty i reklamowe superlatywy, ale nie dopisujemy nowych faktów, czasu efektu ani gwarancji.

Temat problemu pokazujemy obok usługi. Nie przypisujemy automatycznie wszystkim opiniom oceny 5/5 ani nie pokazujemy zdjęć z biblioteki jako fotografii klientów. Jeśli opinia nie ma osobno potwierdzonej oceny lub zdjęcia, używamy samej wypowiedzi, nazwy i kontekstu usługi.

## Potwierdzenie decyzji Punktu 4 — nowe ceny bez okresu przejściowego

Data potwierdzenia: 01.09.2026

Nie ma wcześniejszych ani aktywnych rezerwacji, które wymagałyby zachowania starej ceny. Wszystkie nowe i przyszłe rezerwacje mają korzystać wyłącznie z aktualnego cennika:

- zwykły termin `Zapytaj behawiorystę — 15 min`: 79 zł;
- tryb `Zapytaj teraz`: 104 zł, wyłącznie przy rzeczywistej dostępności live;
- promocja 39,99 zł: tylko przez osobny kod lub link kampanii, zgodnie z limitem pilotażu;
- `Pełna konsultacja`: 475 zł.

Nie utrzymujemy stawki 74 zł, nie pokazujemy okresu przejściowego i nie tworzymy wyjątków dla nieistniejących starych rezerwacji. Ceny, nazwy usług, płatność, e-maile i potwierdzenia muszą korzystać z tego samego źródła.

## Potwierdzenie decyzji Punktu 4 — jedna publiczna nazwa usługi

Data potwierdzenia: 01.09.2026

Na całej stronie i we wszystkich komunikatach dla klienta używamy jednej aktualnej nazwy: `Zapytaj behawiorystę — 15 min`. Nie pokazujemy publicznie nazw `Kwadrans`, `Kwadrans na już`, `szybka konsultacja` ani innych wcześniejszych określeń.

Istniejące techniczne klucze usług mogą pozostać w kodzie, jeśli ogranicza to ryzyko niepotrzebnego grzebania w integracjach. Są wewnętrznym szczegółem implementacji i nie mogą przedostać się do interfejsu, adresów publicznych, e-maili, potwierdzeń, płatności ani SEO.

Nie utrzymujemy starych publicznych adresów ani przekierowań wyłącznie z powodu dawnych nazw, ponieważ nie ma starej bazy rezerwacji ani aktywnej grupy klientów wymagającej takiej ciągłości.

## Potwierdzenie decyzji Punktu 4 — kanoniczny adres `Zapytaj`

Data potwierdzenia: 01.09.2026

Jedynym publicznym adresem usługi `Zapytaj behawiorystę — 15 min` jest `/zapytaj`. Nazwa strony, tytuł, opisy, przyciski, SEO, e-maile i płatność mają używać aktualnej nazwy usługi.

Adresy zawierające wcześniejsze nazwy nie są utrzymywane jako publiczna warstwa serwisu ani jako przekierowania. Techniczne klucze mogą pozostać wewnątrz kodu wyłącznie dla ograniczenia zakresu zmian w integracjach.

## Potwierdzenie decyzji Punktu 0 — kierunek pierwszego ekranu `/zapytaj`

Data potwierdzenia: 01.09.2026

Pierwszy ekran ma prowadzić przede wszystkim do głównej usługi `Zapytaj behawiorystę — 15 min`. W górnej części pokazujemy kolejno: nazwę usługi, prostą obietnicę pierwszego kierunku działania, krótki opis rozmowy, zwięzły komunikat ekspercki, publiczny profil CAPBT, aktualny status dostępności oraz cenę.

Przy statusie dostępności pokazujemy właściwe działanie: `Zapytaj teraz — 104 zł`, gdy rozmowa live jest rzeczywiście dostępna, `Wybierz termin — 79 zł` dla rezerwacji zwykłego terminu oraz `Powiadom mnie`, gdy tryb live jest niedostępny. Przyciski i ceny nie mogą być schowane pod opisem ani zastąpione ogólnym CTA.

Układ desktopowy może mieć główną treść po lewej i jedno spokojne, ciepłe zdjęcie po prawej. Na telefonie treść, status, cena i przyciski mają pozostać przed zdjęciem. Nie stosujemy pełnoekranowego zdjęcia w tle, karuzeli ani kilku równorzędnych kafelków usług na pierwszym ekranie.

Pełna konsultacja, terapia i mapa zachowania są pokazywane niżej jako kolejne możliwości, bez konkurowania z głównym działaniem. Akceptacja dotyczy kierunku i hierarchii ekranu; dokładne brzmienie tekstów zostanie dopracowane przed wdrożeniem.

## Potwierdzenie decyzji Punktu 0 — zakres obietnicy usługi `/zapytaj`

Data potwierdzenia: 01.09.2026

Na stronie wyjaśniamy, że `Zapytaj behawiorystę — 15 min` obejmuje rozmowę o jednej sytuacji, uporządkowanie najważniejszych informacji, pierwszy praktyczny kierunek działania, krótkie podsumowanie w Pokoju klienta oraz dwa pytania uzupełniające przez 7 dni.

Nie obiecujemy pełnej diagnozy ani rozwiązania problemu w 15 minut. Nie używamy sformułowań sugerujących gwarantowany efekt, natychmiastową naprawę zachowania ani konieczność zakupu pełnej konsultacji.

Jeśli sprawa wymaga szerszej pracy, behawiorysta może po rozmowie indywidualnie udostępnić klientowi możliwość rezerwacji pełnej konsultacji. Jest to decyzja po ocenie sytuacji, a nie automatyczny etap sprzedażowy.

## Potwierdzenie decyzji Punktu 0 — blok `Jak to działa` i status CTA

Data potwierdzenia: 01.09.2026

Pod główną ofertą pokazujemy krótki przebieg w trzech krokach: wybór rozmowy teraz albo terminu, podanie numeru i krótkiego opisu oraz opłacenie usługi, a następnie rozmowa i podsumowanie z dwoma pytaniami uzupełniającymi.

Status dostępności steruje głównym działaniem strony. Przy faktycznej dostępności live pokazujemy `Zapytaj teraz — 104 zł`; przy trwającej rozmowie możliwość wyboru terminu albo powiadomienia; przy niedostępności live głównym działaniem jest `Wybierz termin — 79 zł`; przy przerwie technicznej informujemy o niedostępności i pokazujemy termin. Nie pokazujemy CTA prowadzącego do niedziałającej ścieżki.

Na stronie marketingowej nie eksponujemy technicznych szczegółów rezerwacji, takich jak pięciominutowa blokada, druga próba połączenia ani techniczny limit 17 minut. Te informacje pojawiają się w odpowiednim momencie procesu.

## Potwierdzenie decyzji Punktu 0 — minimalny formularz rezerwacji

Data potwierdzenia: 01.09.2026

Formularz rezerwacji `Zapytaj` zawiera tylko imię, numer telefonu, e-mail, wybór pies/kot oraz jedno wymagane pole krótkiego opisu sytuacji. Opis ma pomóc przygotować rozmowę, ale nie jest diagnozą ani rozbudowanym wywiadem.

Nie wymagamy wyboru rasy, kategorii problemu, rozbudowanego quizu, zdjęć, filmów ani zakładania konta. Dodatkowe materiały mogą zostać przekazane później, jeśli okażą się potrzebne.

Formularz zawiera zgodę potrzebną do realizacji usługi, link do polityki prywatności oraz akceptację warunków przed płatnością. Nie zawiera domyślnego zapisu do newslettera ani ukrytej zgody marketingowej.

## Potwierdzenie decyzji Punktu 4 — uproszczona obsługa płatności przez Revolut

Data potwierdzenia: 01.09.2026

Właściciel serwisu nie planuje zakładać firmy ani korzystać z Revolut Business. Nie uzależniamy projektu od firmowej integracji bankowej.

Rozważany wariant uproszczony wykorzystuje obecny Revolut i dedykowaną skrzynkę odbierającą powiadomienia o wpływach. Odczyt e-maila może być przejściowym skrótem, ale system nie może uznawać samego tematu lub treści wiadomości za wystarczający dowód płatności.

Jeśli wariant zostanie wdrożony, potwierdzenie wymaga co najmniej zgodności kwoty, waluty, numeru zamówienia w tytule, czasu oraz braku wcześniejszego zaksięgowania. System musi być odporny na duplikaty i mieć ręczny tryb awaryjny. Przy braku pewnego potwierdzenia nie uruchamiamy automatycznie połączenia `Zapytaj teraz`.

Nie udostępniamy stronie pełnej prywatnej skrzynki. Do automatyzacji przeznaczamy osobny adres wyłącznie do powiadomień płatniczych. Techniczne możliwości takiego rozwiązania nie rozstrzygają osobno kwestii podatkowych, regulaminowych ani warunków korzystania z prywatnego rachunku.

## Potwierdzenie decyzji Punktu 4 — ręczne potwierdzenie wpływu na starcie

Data potwierdzenia: 01.09.2026

Przy skali około 40 klientów tygodniowo dopuszczamy uproszczony obieg płatności przez powiadomienia e-mail z obecnego Revoluta. Na początku każde automatycznie rozpoznane dopasowanie pozostaje statusem `wpływ wykryty` i wymaga jednego ręcznego potwierdzenia przez właściciela przed uznaniem płatności za potwierdzoną.

Każde zamówienie otrzymuje losowy, nieoczywisty identyfikator przekazywany klientowi do tytułu wpłaty. System sprawdza identyfikator, dokładną kwotę, walutę, kierunek wpływu, orientacyjny czas oraz to, czy dana transakcja nie została już użyta. Brak zgodności nie uruchamia usługi i trafia do ręcznego wyjaśnienia.

Po ręcznym potwierdzeniu zwykły termin zostaje opłacony, a przy `Zapytaj teraz` system może uruchomić automatyczne połączenie ZADARMA, jeśli okno dostępności nadal trwa. Brak maila, opóźnienie, duplikat lub niejasny wpływ mają prowadzić do ręcznej kontroli, nie do automatycznego uznania płatności.

Właściciel akceptuje ten wariant jako rozwiązanie początkowe. Integracja API/webhook i pełna automatyzacja mogą zostać rozważone dopiero po pojawieniu się realnego obciążenia albo powtarzalnych problemów z ręczną obsługą.

## Potwierdzenie decyzji Punktu 4 — blokada terminu przy ręcznej płatności

Data potwierdzenia: 01.09.2026

Po zgłoszeniu ręcznej płatności wybrany termin otrzymuje status `oczekuje na potwierdzenie` i jest wyłączony z publicznej puli. Nie może zostać równocześnie wybrany ani zarezerwowany przez inną osobę.

Rezerwacja przechodzi w stan potwierdzony dopiero po ręcznym działaniu właściciela. `Potwierdź` uznaje wpłatę i utrzymuje termin; `Odrzuć` odrzuca zgłoszenie i natychmiast zwalnia termin do puli. System nie może sam uznać niejednoznacznego wpływu za opłacenie.

Nie wprowadzamy automatycznego limitu czasu blokady. Oczekujący termin pozostaje zablokowany do ręcznego działania właściciela: `Potwierdź` albo `Odrzuć`. Brak działania nie może samoczynnie potwierdzić, odrzucić ani zwolnić terminu. Ochrona przed wielokrotnym blokowaniem wielu terminów przez jednego klienta wymaga osobnej reguły.

## Potwierdzenie decyzji Punktu 4 — odrzucenie bez powodu

Data potwierdzenia: 01.09.2026

Odrzucenie oczekującej płatności nie wymaga wpisywania ani wybierania powodu. Właściciel może szybko użyć `Odrzuć`; system zapisuje jedynie techniczny fakt działania i czas, zwalnia termin oraz wysyła klientowi neutralny komunikat.

## Potwierdzenie decyzji Punktu 4 — zabezpieczenie przy decyzji administratora

Data potwierdzenia: 01.09.2026

`Potwierdź` i `Odrzuć` nie wymagają dodatkowego uzasadnienia, ale przed wykonaniem pokazują krótkie potwierdzenie bezpieczeństwa z informacją, jaka akcja nastąpi. Potwierdzenie płatności może uruchomić połączenie `Zapytaj teraz`, a odrzucenie zwalnia termin i wysyła klientowi neutralny komunikat.

Po wykonaniu decyzji status staje się końcowy, a przyciski są blokowane. Ponowne kliknięcie ani ponowienie żądania nie może wykonać drugiego potwierdzenia, wysłać kolejnego e-maila, uruchomić drugiego połączenia ani utworzyć podwójnej rezerwacji.

## Potwierdzenie decyzji Punktu 4 — komunikaty e-mail po statusie płatności

Data potwierdzenia: 01.09.2026

Po wykryciu wpływu, ale przed ręczną decyzją, klient otrzymuje wyłącznie informację, że zgłoszenie płatności dotarło, a termin jest zablokowany i czeka na sprawdzenie. Wiadomość nie może na tym etapie nazywać płatności potwierdzoną ani obiecywać telefonu.

Po `Potwierdź` klient otrzymuje potwierdzenie usługi. Dla zwykłego terminu wiadomość zawiera potwierdzoną datę i godzinę; dla `Zapytaj teraz` informuje o rozpoczęciu próby połączenia.

Po `Odrzuć` klient otrzymuje neutralny komunikat o braku potwierdzenia wpłaty i zwolnieniu terminu, bez ujawniania wewnętrznego powodu decyzji. Każdy komunikat danego etapu jest wysyłany najwyżej raz, niezależnie od ponowień i duplikatów zdarzenia.

## Potwierdzenie decyzji Punktu 0 — ekran potwierdzenia i statusu klienta

Data potwierdzenia: 01.09.2026

Po potwierdzeniu zwykłego terminu klient widzi prosty ekran `Termin potwierdzony` z usługą, kwotą, datą, godziną, krótkim przygotowaniem do rozmowy oraz bezpiecznym linkiem do jednorazowej zmiany terminu maksymalnie do 24 godzin przed spotkaniem.

Po potwierdzeniu `Zapytaj teraz` klient widzi status `Płatność potwierdzona` i `Przygotowujemy połączenie`, a następnie oczekuje na telefon pod podany numer. Po rozmowie ten sam bezpieczny link prowadzi do podsumowania i dwóch pytań uzupełniających.

W przypadku nieudanego połączenia ekran pokazuje aktualny etap próby, a po drugiej próbie kieruje do jednego dodatkowego terminu zgodnie z ustalonymi zasadami. Klient widzi sformułowanie `rozmowa do 15 minut`; techniczny limit 17 minut nie jest komunikowany publicznie. Ekran nie sugeruje przed rozmową konieczności zakupu pełnej konsultacji.

## Potwierdzenie decyzji Punktu 0 — start zegara rozmowy

Data potwierdzenia: 01.09.2026

Zegar 15-minutowej rozmowy nie startuje w chwili płatności ani rozpoczęcia wybierania numeru. Startuje około 20 sekund po faktycznym połączeniu i sygnale rozpoczęcia rozmowy, aby pozostawić krótki margines na odebranie, przywitanie i sprawdzenie jakości połączenia.

Jeśli połączenie zostanie zerwane przed upływem tego marginesu, czas rozmowy nie zostaje rozpoczęty. Po przekroczeniu 20 sekund zegar biegnie dalej według jednego czasu serwerowego także po ponownym połączeniu; klient nie otrzymuje nowego, osobnego limitu.

## Potwierdzenie decyzji Punktu 0 — termin podsumowania i pytań

Data potwierdzenia: 01.09.2026

Podsumowanie po `Zapytaj` ma być udostępnione klientowi w ciągu 24 godzin od zakończenia rozmowy. Jeśli w rozmowie pojawi się sytuacja pilna, najważniejsza wskazówka jest przekazywana już telefonicznie; podsumowanie nie zastępuje natychmiastowej pomocy.

Dwa pytania uzupełniające są aktywne przez 7 dni od momentu udostępnienia podsumowania, a nie od końca rozmowy. Jeśli podsumowanie się opóźnia, system przypomina właścicielowi o zadaniu i nie wysyła klientowi nieprawdziwego komunikatu o jego gotowości.

## Potwierdzenie decyzji Punktu 0 — szablon podsumowania po `/zapytaj`

Data potwierdzenia: 01.09.2026

Podsumowanie ma cztery krótkie części: `Co usłyszałem`, `Co może mieć znaczenie`, `Co zrób teraz` oraz `Co dalej`. Powinno mieścić się na jednym ekranie i mieć orientacyjnie 200–350 słów.

Treść ma streszczać sytuację bez diagnozowania, obietnic efektu i przepisywania całej rozmowy. Zawiera jeden główny praktyczny krok zamiast długiej listy zaleceń. Rekomendacja pełnej konsultacji lub jednego PDF-u może pojawić się tylko wtedy, gdy wynika z oceny behawiorysty; nie jest dodawana automatycznie.

Informacja o zdrowiu lub bezpieczeństwie, jeśli jest potrzebna, ma być przekazana przede wszystkim podczas rozmowy. W Pokoju można ją krótko przypomnieć, ale podsumowanie nie zastępuje pilnej pomocy.

## Potwierdzenie decyzji Punktu 0 — dwa pytania w Pokoju

Data potwierdzenia: 01.09.2026

Po udostępnieniu podsumowania klient otrzymuje prosty moduł z komunikatem, że ma dwa pytania dotyczące tej samej sytuacji, licznikiem pozostałych pytań, jednym polem tekstowym i przyciskiem `Wyślij pytanie`. Odpowiedź pojawia się w tym samym Pokoju.

Pytania są liczone jako wysłane wiadomości, nie jako każde kliknięcie lub odświeżenie formularza. Moduł działa przez 7 dni od udostępnienia podsumowania, a później przechodzi w tryb tylko do odczytu.

Nie tworzymy otwartego czatu ani stałego kanału kontaktu. Pytania dotyczą wyłącznie sytuacji omówionej w `Zapytaj`; nowy, niezwiązany problem wymaga osobnej pracy i nie może być obsługiwany jako ukryta kontynuacja usługi.

## Potwierdzenie decyzji Punktu 0 — czas odpowiedzi na pytania po `/zapytaj`

Data potwierdzenia: 01.09.2026

Na każde z dwóch pytań właściciel odpowiada w ciągu 48 godzin. Termin dotyczy wdrażania ustaleń z rozmowy i nie oznacza nowej, pełnej analizy ani obsługi niezwiązanego problemu.

Jeśli pytanie dotyczy bólu, zdrowia, zagrożenia lub bezpieczeństwa, klient nie powinien czekać na odpowiedź w Pokoju. Otrzymuje jasne skierowanie do lekarza weterynarii albo właściwej pilnej pomocy.

## Potwierdzenie decyzji Punktu 0 — jedna rekomendacja po `/zapytaj`

Data potwierdzenia: 01.09.2026

Po `Zapytaj` behawiorysta wybiera ręcznie jedną główną rekomendację. W sytuacji zdrowotnej lub związanej z bezpieczeństwem jest nią właściwa pomoc weterynaryjna albo pilna; przy szerszym problemie może nią być pełna konsultacja; jeśli dalsza usługa nie jest potrzebna, klient otrzymuje jeden dopasowany PDF jako opcję do samodzielnej pracy.

PDF pokazujemy jako `Polecany materiał do dalszej pracy`, z ceną, zakresem i jasnym zastrzeżeniem, że nie zastępuje konsultacji. Nie tworzymy po rozmowie katalogu wielu materiałów ani równoczesnej oferty terapii i hotelu.

Jeden adekwatny artykuł blogowy może być dodatkiem edukacyjnym, ale nie konkuruje z główną rekomendacją. Rekomendacja nie jest automatycznym etapem sprzedaży i nie sugeruje obowiązku zakupu kolejnej usługi.

## Potwierdzenie decyzji Punktu 0 — PDF jako jeden ręcznie dobrany następny krok

Data potwierdzenia: 01.09.2026

Po `Zapytaj` klient nie otrzymuje katalogu ani kilku konkurujących propozycji. Behawiorysta wybiera ręcznie jeden materiał z wewnętrznej biblioteki aktualnych PDF-ów, tylko jeśli ten materiał rzeczywiście pasuje do omówionej sytuacji.

Do dalszej pracy bierzemy pod uwagę aktualną serię materiałów po 19 zł, ponieważ jest technicznie kompletna, spójna wizualnie i zawiera praktyczne plany, ćwiczenia oraz checklisty. Starsze materiały z wyższych poziomów cenowych nie są obecnie traktowane jako gotowe produkty.

Publiczny katalog materiałów może istnieć osobno, ale nie może zastępować indywidualnej rekomendacji w Pokoju. Przed uruchomieniem sprzedaży trzeba uporządkować duplikaty nazw i ról produktów, szczególnie przypadek `Pies sam w domu`, który występuje w wersji bezpłatnej i płatnej.
## Potwierdzenie decyzji Punktu 0 — rozdzielenie darmowych i płatnych PDF-ów

Data potwierdzenia: 01.09.2026

Płatna seria aktualnych materiałów po 19 zł pozostaje główną biblioteką produktów dodatkowych. Po `Zapytaj` można z niej wskazać jeden ręcznie dobrany materiał.

Darmowe PDF-y nie tworzą masowego katalogu konkurującego z płatnymi materiałami. Zostają tylko wybrane materiały pełniące funkcję edukacyjną, zaufaniową i SEO. Nie mogą powtarzać płatnych tematów pod tą samą lub prawie tą samą nazwą.

Materiał bezpłatny ma być krótkim wprowadzeniem i pomóc rozpoznać problem, natomiast płatny ma dawać uporządkowany plan pracy, ćwiczenia, arkusze lub checklisty. Duplikaty i stare wersje trzeba wycofać z publicznych ścieżek albo nadać im jednoznacznie inną rolę.

## Potwierdzenie decyzji Punktu 0 — pilotażowa sprzedaż PDF-u za 19 zł

Data potwierdzenia: 01.09.2026

Cena 19 zł zostaje przyjęta jako cena pilotażowa aktualnej serii płatnych PDF-ów. Ma być prostym zakupem dodatkowym po `Zapytaj`, a nie osobną rozbudowaną usługą.

Zakup odbywa się w tym samym Pokoju, bez ponownego długiego formularza. Klient widzi jeden polecony materiał, jego zakres i cenę, otrzymuje indywidualny kod oraz instrukcję płatności, a po ręcznym potwierdzeniu wpływu uzyskuje dostęp do pobrania.

Zakup PDF-u nie obejmuje dodatkowych pytań, konsultacji ani indywidualnej obsługi. Na etapie pilotażu nie dodajemy pakietów, rabatów ani ręcznego tworzenia osobnych ofert. Jeśli obsługa zacznie zajmować zbyt dużo czasu w stosunku do przychodu, model wymaga ponownej oceny.
## Potwierdzenie decyzji Punktu 0 — limit darmowych PDF-ów

Data potwierdzenia: 01.09.2026

Publicznie pozostaje najwyżej sześć darmowych PDF-ów: maksymalnie trzy dotyczące psów i trzy dotyczące kotów. Są osobną, drugorzędną warstwą edukacyjną, zaufaniową i SEO, a nie główną ofertą sprzedażową.

Do pozostawienia kwalifikują się materiały wąskie, bezpieczne i niedublujące płatnych produktów. Darmowy PDF ma pomagać zrozumieć pierwszy krok, ale nie może udawać pełnego planu dla złożonego problemu.

Materiały powtarzające płatny temat, stare duplikaty oraz treści mogące skłaniać do ryzykownego samodzielnego działania nie są automatycznie utrzymywane w darmowej półce. Dokładny zestaw sześciu materiałów zostanie wybrany po osobnej ocenie kandydatów.

## Potwierdzenie decyzji Punktu 0 — zakres darmowej półki

Data potwierdzenia: 01.09.2026

Darmowa półka ma wspierać główną specjalizację behawioralną: zachowanie, rutynę, środowisko i bezpieczne pierwsze kroki. Nie wypełniamy limitu materiałami przypadkowymi tylko po to, aby zachować równą liczbę PDF-ów dla obu gatunków.

Materiały o upale nie wchodzą do podstawowego zestawu, ponieważ są przede wszystkim treściami opiekuńczo-weterynaryjnymi. Materiał `Pies warczał lub ugryzł` również nie jest podstawowym darmowym produktem, ponieważ temat wymaga szczególnej oceny ryzyka i nie powinien być sprowadzany do ogólnej instrukcji do samodzielnego działania.
## Potwierdzenie decyzji Punktu 0 — jedna aktywna wersja produktu na problem

Data potwierdzenia: 01.09.2026

Każdy problem może mieć tylko jedną aktywną, publiczną wersję produktu. Aktualny PDF po 19 zł jest wersją kanoniczną dla płatnych tematów. Starsze wersje i wyższe poziomy cenowe nie mogą być widoczne, kupowalne ani rekomendowane.

Techniczne identyfikatory i stare nazwy mogą pozostać w kodzie, jeśli ułatwi to bezpieczne uporządkowanie systemu, ale nie mogą tworzyć równoległej oferty. Darmowy materiał może pozostać tylko wtedy, gdy ma wyraźnie inną nazwę, zakres i obietnicę niż produkt płatny.

Dotyczy to w szczególności tematów `Pies sam w domu`, `Kot i kuweta` oraz `Konflikt między kotami`, dla których istnieją duplikaty w kilku warstwach katalogu.

## Potwierdzenie decyzji Punktu 0 — zatwierdzony zestaw darmowych PDF-ów

Data potwierdzenia: 01.09.2026

Podstawowa darmowa półka obejmuje sześć materiałów:

- dla psa: `Burza i nagły hałas`, `Wakacyjna opieka nad psem`, `Powrót do rutyny po urlopie`;
- dla kota: `Kot zostaje w domu podczas urlopu`, `Transporter bez paniki`, `Kot drapie meble`.

Nie włączamy do podstawowej półki materiałów o upale, materiału `Pies warczał lub ugryzł`, materiału `Kot po zmianie w domu` ani starszego materiału o lęku przed gośćmi. Powodem jest odpowiednio zbyt weterynaryjny zakres, ryzyko bezpieczeństwa, dublowanie płatnej oferty albo wadliwa wersja techniczna.

## Potwierdzenie decyzji Punktu 0 — wycofanie pakietów z oferty publicznej

Data potwierdzenia: 01.09.2026

Pakiety materiałów za 69–99 zł zostają wycofane z publicznej oferty na start. Nie są pokazywane, sprzedawane ani rekomendowane po `Zapytaj`, ponieważ obecnie łączą stare wersje PDF-ów, mają niejasną logikę cenową i zwiększają wybór kosztem prostoty.

Ich pliki i techniczne identyfikatory mogą pozostać wewnętrznie, ale nie są traktowane jako aktywne produkty. Do pakietów można wrócić dopiero po sprawdzeniu, czy klienci faktycznie chcą kupować więcej niż jeden aktualny PDF.
## Potwierdzenie decyzji Punktu 0 — hierarchia publicznej strony `/materialy`

Data potwierdzenia: 01.09.2026

`/materialy` pozostaje osobnym, drugorzędnym katalogiem dla osób szukających samodzielnej pracy. Nie jest głównym wezwaniem strony i nie zastępuje indywidualnej rekomendacji po `Zapytaj`.

Na stronie najpierw pokazujemy aktualne płatne PDF-y po 19 zł, a niżej wybrane materiały bezpłatne. Dopuszczamy prosty podział na `Pies` i `Kot`, ale nie rozbudowany filtr, quiz ani wieloetapowe dopasowanie.

Katalog nie pokazuje pakietów, sztucznych ocen, fałszywej presji zakupowej ani kilku rekomendacji po rozmowie. Po `Zapytaj` klient trafia do jednego ręcznie dobranego materiału w Pokoju, a nie do całej półki.
## Potwierdzenie decyzji Punktu 0 — standard strony szczegółowej PDF-u

Data potwierdzenia: 01.09.2026

Każdy PDF otrzymuje krótką, ciepłą i ekspercką stronę szczegółową. Strona wyjaśnia problem, odbiorcę, trzy konkretne elementy zawartości, granice materiału, autora i kompetencje, pokazuje kilka stron podglądu oraz podaje cenę i jedno główne działanie.

Opis nie obiecuje rozwiązania problemu w określonym czasie, nie zastępuje konsultacji i nie używa sztucznych ocen, gwiazdek, presji zakupowej ani niezweryfikowanych opinii. Płatny materiał ma CTA `Kup PDF za 19 zł`, a bezpłatny `Pobierz bezpłatnie`.
## Potwierdzenie decyzji Punktu 0 — stały dostęp do kupionego PDF-u

Data potwierdzenia: 01.09.2026

Po ręcznym potwierdzeniu płatności kupiony PDF zostaje odblokowany w tym samym Pokoju i jest dostępny bez krótkiego terminu wygaśnięcia. Klient otrzymuje również bezpieczny link e-mailowy prowadzący do dostępu.

Nie budujemy skomplikowanego DRM. Link ma być losowy, trudny do odgadnięcia i powiązany z potwierdzonym zamówieniem, a sam plik nie może być wystawiony pod prostym publicznym adresem. Zakup PDF-u nie daje dodatkowego kontaktu z behawiorystą.

Bezpłatne materiały nie wymagają płatności ani zapisu do newslettera. Przed wdrożeniem należy odłączyć stare pliki i dopilnować, aby API akceptowało wyłącznie aktywne produkty.
## Potwierdzenie decyzji Punktu 0 — pobieranie darmowych PDF-ów

Data potwierdzenia: 01.09.2026

Bezpłatne PDF-y można pobrać bez imienia, telefonu, konta i obowiązkowego adresu e-mail. Nie łączymy pobrania z newsletterem ani ukrytą zgodą marketingową.

E-mail może być podany wyłącznie opcjonalnie do wysłania linku do materiału. Zainteresowanie mierzymy anonimowo przez zliczanie pobrań. W samym PDF-ie może znaleźć się spokojne, jawne CTA do `Zapytaj behawiorystę` z aktualną ceną.
## Potwierdzenie decyzji Punktu 0 — kontrola PDF-u przed publikacją

Data potwierdzenia: 01.09.2026

Żaden PDF nie trafia do sprzedaży ani publicznego katalogu przed kontrolą techniczną, wizualną i treściową. Kontrola obejmuje rzeczywistą liczbę stron, brak pustych lub uszkodzonych stron, poprawne polskie znaki, zgodność podglądu z plikiem, aktualne nazwy usług i ceny, właściwe CTA oraz ostrzeżenia zdrowotne i bezpieczeństwa.

Nie publikujemy materiału zawierającego dawne nazwy (`Kwadrans`, `Dwa Kwadranse`, `szybka konsultacja`), stare adresy, nieaktualne ceny, duplikaty ani obietnice zastępujące indywidualną konsultację. Każdy aktywny PDF ma jedną wersję kanoniczną.
## Potwierdzenie decyzji Punktu 0 — moment pokazania rekomendacji

Data potwierdzenia: 01.09.2026

Rekomendacja nie jest wyskakującą ofertą bezpośrednio po zakończeniu rozmowy. Najpierw klient otrzymuje wartość z rozmowy, a następnie w ciągu 24 godzin podsumowanie.

W części `Co dalej` podsumowania pojawia się jedna ręcznie wybrana ścieżka: właściwa pomoc weterynaryjna lub pilna, pełna konsultacja z kodem albo jeden dopasowany PDF za 19 zł. Artykuł blogowy może być wyłącznie dodatkiem. Jeśli sytuacja jest pilna, informacja jest przekazywana już telefonicznie.
## Potwierdzenie decyzji Punktu 0 — czterotygodniowy pilotaż PDF-ów

Data potwierdzenia: 01.09.2026

Sprzedaż i rekomendowanie PDF-ów oceniamy w czterotygodniowym pilotażu. Przy każdym `Zapytaj` zapisujemy typ następnego kroku, polecony materiał, otwarcie oferty, zakup, czas ręcznej obsługi oraz ewentualne dodatkowe pytania lub problemy.

Dla darmowych materiałów mierzymy anonimowo pobrania i przejścia do `Zapytaj`. Nie budujemy rozbudowanego systemu analitycznego — wystarczy prosty zapis operacyjny w panelu lub tabeli.

Po pilotażu oceniamy nie tylko liczbę sprzedaży, ale również opłacalność czasu, wpływ na sprzedaż pełnej konsultacji i to, czy PDF nie tworzy ukrytej dodatkowej obsługi.
## Potwierdzenie decyzji Punktu 0 — PDF nie zastępuje pełnej konsultacji

Data potwierdzenia: 01.09.2026

PDF jest rekomendowany wyłącznie przy wąskim, rozpoznanym i bezpiecznym problemie, który można rozsądnie rozpocząć samodzielnie. Pełna konsultacja ma pierwszeństwo przy problemach złożonych, długotrwałych, wielowątkowych, po nieudanych próbach albo wymagających dokładnego wywiadu.

Podczas `Zapytaj` klient zawsze otrzymuje realny pierwszy klucz, niezależnie od tego, czy kupi PDF. PDF jest opcjonalnym narzędziem dalszej pracy, a nie ukrytym etapem sprzedaży ani tańszym zamiennikiem pełnej konsultacji.
## Potwierdzenie decyzji Punktu 0 — brak produktu jest prawidłowym wynikiem

Data potwierdzenia: 01.09.2026

Jeśli po `Zapytaj` nie ma odpowiedniego PDF-u, system nie pokazuje automatycznie innego materiału ani katalogu. Pokój może wyświetlić jeden konkretny krok z rozmowy, pełną konsultację albo komunikat `Na ten moment bez dodatkowego produktu`.

Brak sprzedaży PDF-u jest prawidłowym wynikiem, gdy materiał nie pasuje do sytuacji. Katalog `/materialy` pozostaje dostępny osobno i nie jest dokładany do modułu rekomendacji.
## Potwierdzenie decyzji Punktu 0 — ręczny moduł rekomendacji w panelu właściciela

Data potwierdzenia: 01.09.2026

Panel właściciela pokazuje pełny opis klienta z formularza, miejsce na prywatne notatki oraz jedno pole `Następny krok`. Właściciel wybiera tylko jedną opcję: pomoc weterynaryjną lub pilną, pełną konsultację, jeden aktywny PDF albo brak dodatkowego produktu.

Przy wyborze PDF-u panel pokazuje wyłącznie aktywne materiały. Właściciel dodaje krótkie uzasadnienie widoczne dla klienta, ogląda podgląd Pokoju i dopiero wtedy publikuje podsumowanie. System nie wybiera automatycznie materiału ani nie pokazuje właścicielowi katalogu jako gotowej rekomendacji.
## Potwierdzenie decyzji Punktu 0 — rozdzielenie notatek prywatnych i treści klienta

Data potwierdzenia: 01.09.2026

Panel rozdziela informacje wewnętrzne od treści publikowanej klientowi. Część prywatna obejmuje pełny opis z formularza, notatki właściciela, ocenę sytuacji i ocenę ryzyka. Część klienta obejmuje wyłącznie podsumowanie, praktyczny krok, jedną rekomendację, potrzebne ostrzeżenie oraz moduł pytań.

Pola, uprawnienia i zapis danych muszą uniemożliwiać przypadkowe opublikowanie notatek wewnętrznych. Podgląd przed publikacją pokazuje tylko wersję przeznaczoną dla klienta.
## Potwierdzenie decyzji Punktu 0 — ograniczenie bezpośredniej sprzedaży PDF-ów

Data potwierdzenia: 01.09.2026

PDF-y dotyczące wąskich i względnie bezpiecznych problemów mogą mieć bezpośredni zakup. Materiały dotyczące zdrowia, pogryzienia, konfliktu, silnego napięcia albo złożonej sytuacji domowej są dostępne dopiero po wcześniejszym `Zapytaj` i ręcznej ocenie behawiorysty.

W katalogu materiał ograniczony może być widoczny informacyjnie, ale zamiast przycisku `Kup PDF` pokazuje `Najpierw zapytaj behawiorystę`. Po rozmowie może zostać wskazany jako jeden indywidualny następny krok. Dokładna klasyfikacja każdego aktywnego PDF-u musi zostać zapisana w katalogu i respektowana przez zakup oraz API.
## Potwierdzenie decyzji Punktu 0 — komunikat przy materiale wymagającym rozmowy

Data potwierdzenia: 01.09.2026

Przy materiale niedostępnym do bezpośredniego zakupu nie używamy określenia `zablokowany`. Karta pokazuje oznaczenie `Wymaga wcześniejszej rozmowy`, krótkie wyjaśnienie o możliwych przyczynach i potrzebie oceny sytuacji oraz bezpieczeństwa, opis materiału, podgląd i przycisk `Zapytaj behawiorystę`.

Materiał może być polecony dopiero po rozmowie, ale karta nie obiecuje, że tak się stanie. Cena rozmowy jest pokazywana zgodnie z aktualnym statusem usługi, a klasyfikacja produktu musi być respektowana przez katalog, zakup i API.
## Potwierdzenie decyzji Punktu 0 — trzystronicowy podgląd PDF-u

Data potwierdzenia: 01.09.2026

Każdy PDF, również materiał wymagający wcześniejszego `Zapytaj`, otrzymuje trzystronicowy podgląd: okładkę, fragment struktury lub arkusza pracy oraz stronę pokazującą poziom konkretu. Podgląd nie udostępnia całego protokołu działania.

Podgląd musi pochodzić z aktualnej, zatwierdzonej i kanonicznej wersji PDF-u. Nie wolno używać zrzutów ze starych lub równoległych plików.
## Potwierdzenie decyzji Punktu 0 — rozdzielenie cen PDF-u i rozmowy

Data potwierdzenia: 01.09.2026

Płatny PDF ma widoczną cenę `19 zł`, a bezpłatny oznaczenie `Bezpłatny`. Materiał wymagający wcześniejszej rozmowy komunikuje `PDF — 19 zł, dostępny po wcześniejszym Zapytaj`, bez sugerowania, że zakup PDF-u i rozmowa tworzą obowiązkowy pakiet.

Cena rozmowy jest pokazywana osobno i zgodnie ze statusem usługi: 79 zł za termin albo 104 zł za faktycznie dostępne `Zapytaj teraz`. Nie łączymy tych kwot na jednej karcie i nie używamy niejasnego `od 19 zł`.
## Potwierdzenie decyzji Punktu 0 — stała cena PDF-u podczas pilotażu

Data potwierdzenia: 01.09.2026

Przez cały czterotygodniowy pilotaż wszystkie aktywne płatne PDF-y mają stałą cenę 19 zł. Nie stosujemy w tym czasie rabatów, kodów promocyjnych, promocji czasowych ani sztucznego komunikatu o popularności.

Po pilotażu ewentualna zmiana ceny wymaga oceny konwersji, czasu ręcznej obsługi, problemów z dostępem oraz wpływu na sprzedaż pełnej konsultacji. Przy niskiej sprzedaży najpierw sprawdzamy dopasowanie i opis, zamiast automatycznie obniżać cenę.
## Potwierdzenie decyzji Punktu 0 — procedura wyjątków przy zakupie PDF-u

Data potwierdzenia: 01.09.2026

Przy błędnej kwocie lub kodzie zamówienie pozostaje oczekujące i nie daje dostępu do pliku do czasu ręcznego wyjaśnienia. Przy podwójnej wpłacie utrzymujemy jedno zamówienie, a nadpłatę rozliczamy ręcznie.

Jeśli płatność została potwierdzona, ale dostęp nie działa, klient otrzymuje ponowne odblokowanie albo nowy bezpieczny link bez ponownej płatności. Błąd systemu nie może obciążać klienta. Komunikaty wyjątków są krótkie i neutralne; zasady prawne dotyczące zwrotów wymagają osobnej weryfikacji.
## Potwierdzenie decyzji Punktu 0 — jedno źródło aktywnego katalogu PDF-ów

Data potwierdzenia: 01.09.2026

`lib/materialy-catalog.ts` staje się jedynym źródłem aktywnej, publicznej oferty PDF-ów. Katalog zawiera wyłącznie 10 aktualnych produktów płatnych i 6 zatwierdzonych materiałów bezpłatnych, bez pakietów i starych wersji.

Każdy produkt musi mieć określony tryb dostępu: bezpośredni zakup albo `wymaga wcześniejszego Zapytaj`. Katalog, panel, zamówienia, pobieranie i publiczne strony korzystają z tej samej listy. Stare katalogi, pliki i identyfikatory mogą pozostać technicznie, ale nie mogą być zwracane przez ścieżki klienta ani przyjmowane przez API jako aktywne produkty.
## Potwierdzenie decyzji Punktu 0 — minimalne pola produktu PDF

Data potwierdzenia: 01.09.2026

Centralny katalog każdego aktywnego PDF-u przechowuje: techniczny slug, jedną publiczną nazwę i opis, gatunek, cenę, status aktywności, tryb dostępu, kanoniczny plik, trzy strony podglądu, rzeczywistą liczbę stron, datę kontroli oraz informację o ostrzeżeniach zdrowotnych lub bezpieczeństwa.

Nie budujemy na tym etapie automatycznego dopasowywania po rasie, problemie ani słowach z formularza. Behawiorysta wybiera materiał ręcznie, a system pilnuje wyłącznie poprawnego produktu, dostępu i publikacji.
## Potwierdzenie decyzji Punktu 0 — wszystkie płatne PDF-y po wcześniejszym `Zapytaj` na starcie

Data potwierdzenia: 01.09.2026

Na początku wszystkie 10 płatnych PDF-ów wymagają wcześniejszego `Zapytaj`. Publiczna strona `/materialy` prezentuje je informacyjnie, ale nie umożliwia bezpośredniego zakupu żadnego z nich.

Po rozmowie behawiorysta może ręcznie polecić jeden materiał, a klient kupuje go w Pokoju za 19 zł. Dopiero po zakończeniu pilotażu można rozważyć bezpośredni zakup wybranych materiałów o potwierdzonym niskim ryzyku.
## Potwierdzenie decyzji Punktu 0 — zakup PDF-u z podsumowania

Data potwierdzenia: 01.09.2026

Jeśli w podsumowaniu znajduje się PDF, klient kupuje go bezpośrednio z jednego polecenia w Pokoju, bez powrotu do katalogu i bez ponownego formularza. Zamówienie otrzymuje własny kod, oczekuje na ręczne potwierdzenie, a po potwierdzeniu odblokowuje stały dostęp w Pokoju oraz link e-mailowy.

Jeśli rekomendacją jest pełna konsultacja lub pomoc pilna, karta PDF-u nie jest pokazywana. Podsumowanie nie prowadzi klienta do katalogu wielu produktów.
## Potwierdzenie decyzji Punktu 0 — jeden PDF na jedno `Zapytaj`

Data potwierdzenia: 01.09.2026

Jedno `Zapytaj` może wygenerować najwyżej jedno polecenie PDF-u. Wielokrotne kliknięcie nie tworzy kolejnych zamówień, kodów ani wiadomości — system zwraca ten sam stan istniejącego zamówienia.

Po potwierdzeniu płatności karta pokazuje `Dostęp aktywny`, a klient nie otrzymuje automatycznej propozycji innych PDF-ów. Kolejny materiał może zostać dodany wyłącznie przez ręczną decyzję właściciela po ocenie tej samej sprawy.
## Potwierdzenie decyzji Punktu 0 — wersjonowanie PDF-u bez tworzenia nowego produktu

Data potwierdzenia: 01.09.2026

Każdy publiczny PDF zachowuje stałą tożsamość, nazwę i cenę. Zwykłe poprawki treści, nazw usług, ostrzeżeń lub składu aktualizują ten sam produkt i nie tworzą nowej oferty.

Wcześniejsi kupujący otrzymują poprawioną wersję w tym samym Pokoju bez ponownej płatności. Stary plik zostaje odłączony od publicznego dostępu, a podgląd i liczba stron są aktualizowane razem z kanonicznym plikiem. W katalogu przechowujemy wewnętrzny numer wersji i datę kontroli.
## Potwierdzenie decyzji Punktu 0 — podział ról bloga, PDF-u i konsultacji

Data potwierdzenia: 01.09.2026

Blog pozostaje warstwą edukacyjną i SEO: wyjaśnia mechanizm, sygnały, pierwszy bezpieczny krok i moment szukania pomocy. Nie kopiuje całego planu wdrożenia z PDF-u.

PDF jest narzędziem do samodzielnej pracy z planem, ćwiczeniami, arkuszami i checklistami. Pełna konsultacja służy indywidualnej analizie i ustaleniu procesu. W Pokoju można dodać najwyżej jeden powiązany artykuł jako uzupełnienie.

Starych artykułów nie usuwamy automatycznie. Najpierw rozdzielamy duplikaty i ustalamy jeden główny artykuł dla każdego tematu. Prawdziwa rekomendacja po `Zapytaj` pozostaje ważniejsza niż dodatkowy link do bloga.
## Potwierdzenie decyzji Punktu 0 — jedno główne CTA na artykuł

Data potwierdzenia: 01.09.2026

Każdy artykuł ma jedno główne wezwanie do działania dopasowane do tematu i poziomu ryzyka. Najczęściej jest to `Zapytaj behawiorystę — 79 zł`, przy temacie zdrowia lub bezpieczeństwa skierowanie do właściwej pomocy, a przy artykule o darmowym materiale `Pobierz bezpłatnie`.

Artykuły o płatnych PDF-ach nie mają bezpośredniego zakupu, ponieważ wszystkie płatne materiały na starcie wymagają wcześniejszego `Zapytaj`. Nie pokazujemy w jednym artykule równorzędnych przycisków do rozmowy, konsultacji, PDF-u, terapii i hotelu.
## Potwierdzenie decyzji Punktu 0 — kierunek wizualny `/materialy`

Data potwierdzenia: 01.09.2026

`/materialy` ma wyglądać jak spokojna, ekspercka biblioteka, a nie typowy sklep. Na górze znajduje się krótki opis roli materiałów oraz mały moduł prowadzący do `Zapytaj behawiorystę`. Dalej pokazujemy prosty przełącznik `Pies` / `Kot`, najpierw płatną bibliotekę, a niżej wybrane materiały bezpłatne.

Karty mają być czytelne i ciepłe: okładka, gatunek, konkretny problem, jednozdaniowy zakres, cena lub oznaczenie bezpłatności, podgląd i właściwe CTA. Nie używamy gwiazdek, sztucznej popularności, rabatów, liczników ani presji zakupowej. Zdjęcia i ilustracje wspierają treść, ale nie wypierają oferty `Zapytaj`.
## Potwierdzenie decyzji Punktu 0 — struktura karty PDF-u

Data potwierdzenia: 01.09.2026

Karta PDF-u pokazuje okładkę, gatunek, krótki tytuł problemu, jedno zdanie zakresu, najwyżej trzy korzyści, cenę lub oznaczenie bezpłatności, właściwy tryb dostępu oraz jedno główne CTA. Działanie podglądu jest drugorzędne i prowadzi do trzech stron.

Dla płatnego materiału głównym CTA jest `Najpierw Zapytaj`, a dla bezpłatnego `Pobierz bezpłatnie`. Karta nie zawiera długiego opisu, kilku równorzędnych przycisków, sztucznych obietnic ani komunikatów presji.
## Potwierdzenie decyzji Punktu 0 — mobilny układ `/materialy`

Data potwierdzenia: 01.09.2026

Na telefonie pokazujemy jedną kartę w jednym wierszu, bez karuzeli i ukrywania produktów w poziomym przewijaniu. Przełącznik `Pies` / `Kot` znajduje się nad listą. Okładka nie zajmuje całego ekranu, opis i cena nie są nakładane na zdjęcie, a główne CTA jest szerokie i łatwe do kliknięcia.

Na stronie szczegółowej problem, odbiorca, cena i następny krok są widoczne przed długim opisem i podglądem. Stałe CTA do `Zapytaj` może być delikatnie dostępne na mobile, ale nie może zasłaniać treści.
## Potwierdzenie decyzji Punktu 0 — język wizualny kart PDF-ów

Data potwierdzenia: 01.09.2026

`/materialy` korzysta z obecnego ciepłego i eksperckiego stylu PDF-ów: jasnego tła, czytelnej typografii, jednego akcentu marki oraz rzeczywistych okładek i podglądów. Materiały bezpłatne i płatne zachowują porównywalną jakość wizualną.

Tryb produktu komunikujemy spokojnymi etykietami `Bezpłatny`, `19 zł` i `Wymaga wcześniejszej rozmowy`. Nie używamy czerwonej kłódki, określenia `zablokowany` ani wizualnej presji. Ograniczenie ma wyglądać na świadomą decyzję merytoryczną, nie na błąd techniczny.
## Potwierdzenie decyzji Punktu 0 — hierarchia nawigacji

Data potwierdzenia: 01.09.2026

W głównej nawigacji pierwszoplanowe jest `Zapytaj behawiorystę`, następnie `Konsultacja`. `Materiały` pozostają zwykłym, drugorzędnym linkiem, a `Blog` i `O mnie` pełnią funkcję wspierającą.

Na stronie głównej nie pokazujemy siatki PDF-ów. Można umieścić jedynie krótkie, nienachalne przejście do `/materialy`. Na stronie materiałów znajduje się delikatne przypomnienie o `Zapytaj`. Cena rozmowy jest eksponowana na stronie usługi, nie musi obciążać małego przycisku nawigacji.
## Potwierdzenie decyzji Punktu 0 — układ pierwszego ekranu i strony głównej

Data potwierdzenia: 01.09.2026

Pierwszy ekran komunikuje problem i prosty następny krok: `Masz problem z zachowaniem psa lub kota? Zapytaj behawiorystę.` Pokazuje podpis `Krzysztof Regulski · Dyplomant COAPE · Technik weterynarii`, informację o rozmowie do 15 minut, aktualny status oraz właściwą cenę i CTA: `Zapytaj teraz — 104 zł` albo `Wybierz termin — 79 zł`.

Układ korzysta z jednego ciepłego, prawdziwego zdjęcia i nie pokazuje na pierwszym ekranie PDF-ów, hotelu, wyboru rasy, quizu ani kilku równorzędnych usług. Około 70% uwagi strony przeznaczamy na `Zapytaj`.

Kolejność niżej: jak działa `Zapytaj`, czego klient oczekuje po rozmowie, opinie przypisane do usługi, pełna konsultacja, terapia oraz dopiero potem blog i materiały.
## Potwierdzenie decyzji Punktu 0 — konsultacja i terapia jako dalsze ścieżki

Data potwierdzenia: 01.09.2026

`Konsultacja behawioralna — około 90 min` jest widoczna po głównej usłudze i opiniach. Pokazuje cenę 475 zł, charakter pogłębionej indywidualnej pracy oraz sytuacje, w których może być właściwa. Nie ma publicznego terminarza ani przycisku obiecującego natychmiastową rezerwację; klient może zobaczyć opis procesu, a dostęp do terminów pojawia się dopiero po `Zapytaj` i otrzymaniu indywidualnego kodu.

`Terapia behawioralna` jest pokazana jeszcze niżej jako możliwa dalsza ścieżka po konsultacji, bez publicznego terminarza i bez sugerowania, że każdy klient jej potrzebuje. Hotel nie jest eksponowany na stronie głównej.
## Potwierdzenie decyzji Punktu 0 — układ strony pełnej konsultacji

Data potwierdzenia: 01.09.2026

Strona pełnej konsultacji ma być bardziej rozbudowana niż strona `Zapytaj`, ale od początku jasno komunikuje, że konsultacja jest dostępna dopiero po wcześniejszej rozmowie z behawiorystą.

Pokazuje ciepłe zdjęcie, cenę 475 zł, czas około 90 minut, odbiorcę usługi, przebieg od `Zapytaj` przez indywidualny kod i płatność do wyboru terminu, a także 14 dni kontaktu przez WhatsApp. Wyjaśnia również granice usługi i nie obiecuje konkretnego efektu.

Główne CTA brzmi `Najpierw Zapytaj`. Osoba posiadająca kod może mieć osobny link `Mam kod dostępu`, ale terminarz nie jest publiczny. Nie używamy na górze przycisku `Umów konsultację` bez tego kontekstu.
## Potwierdzenie decyzji Punktu 0 — zdjęcia na stronie konsultacji

Data potwierdzenia: 01.09.2026

Na stronie konsultacji używamy najwyżej trzech spokojnych, autentycznych zdjęć: jednego głównego i maksymalnie dwóch pomocniczych. Zdjęcia mają wspierać treść, nie przedstawiać zwierząt w stresie ani udawać prawdziwej pracy z klientami.

Nie tworzymy galerii ani karuzeli i nie zastępujemy brakujących własnych fotografii przypadkowym stockiem lub wygenerowanym obrazem udającym dokumentację. Obrazy muszą być zoptymalizowane mobilnie i opisane tekstem alternatywnym.
## Potwierdzenie decyzji Punktu 0 — opinie przypisane do usług

Data potwierdzenia: 01.09.2026

Na stronie głównej pokazujemy najwyżej trzy lub cztery krótkie, konkretne opinie dotyczące przede wszystkim `Zapytaj`. Każda opinia ma oznaczenie usługi. Na stronie konsultacji i terapii pokazujemy wyłącznie opinie odnoszące się do właściwej usługi.

Imię, inicjał i zdjęcie klienta lub zwierzęcia są używane tylko za zgodą. Nie dodajemy sztucznych gwiazdek, ocen, dat ani obietnic efektu. Opinie mają pokazywać sposób pracy i atmosferę, a nie gwarantować rezultat.
## Potwierdzenie decyzji Punktu 0 — FAQ strony głównej

Data potwierdzenia: 01.09.2026

FAQ odpowiada na sześć kluczowych pytań: czym `Zapytaj` różni się od pełnej konsultacji, czy trzeba znać rasę lub kategorię problemu, kiedy rozmowa jest natychmiastowa, co klient otrzymuje po rozmowie, dlaczego pełna konsultacja wymaga wcześniejszego kodu oraz co zrobić w sytuacji zdrowotnej lub zagrożenia.

FAQ może być rozwijane, ale cena, czas rozmowy i warunek dostępu do konsultacji muszą być widoczne wcześniej. Nie ukrywamy kluczowych ograniczeń wyłącznie w akordeonie.
## Potwierdzenie decyzji Punktu 0 — sekcja `O mnie` i kompetencje

Data potwierdzenia: 01.09.2026

Na stronie głównej sekcja `O mnie` pokazuje prawdziwe zdjęcie, imię i nazwisko, dokładny podpis `Dyplomant COAPE · Technik weterynarii`, krótki opis sposobu pracy oraz link do właściwego źródła potwierdzającego kompetencje, w tym CAPBT, jeśli jest właściwy dla danego odnośnika.

Pełna biografia jest dostępna osobno. Nie używamy określeń sugerujących szersze uprawnienia niż rzeczywiste, ściany odznak, niesprawdzonych lat doświadczenia ani obietnic rozwiązania każdego problemu.
## Potwierdzenie decyzji Punktu 0 — jedna główna ścieżka kontaktu

Data potwierdzenia: 01.09.2026

Główną drogą kontaktu i rozpoczęcia obsługi jest `Zapytaj behawiorystę`. Publicznie nie tworzymy równoległych kanałów do spontanicznych porad, takich jak otwarty WhatsApp, dodatkowy numer telefonu czy kilka formularzy.

W stopce może znajdować się jeden kontakt techniczny lub płatniczy, ale nie jest on kanałem bezpłatnej pomocy behawioralnej. Adres do powiadomień płatniczych pozostaje prywatny. WhatsApp jest dostępny dopiero w ramach pełnej konsultacji. Stopka zawiera również odnośniki do polityki prywatności, warunków usługi i zasad płatności.
## Potwierdzenie decyzji Punktu 0 — prywatność i zgody bez marketingowego śledzenia

Data potwierdzenia: 01.09.2026

Formularze wyjaśniają cel każdego wymaganego pola: telefon służy do rozmowy, a e-mail do potwierdzeń, statusów i dostępu. Zgody nie są zaznaczone z góry, nie dodajemy newslettera ani ukrytej zgody marketingowej.

Pokój korzysta tylko z niezbędnej sesji i losowego bezpiecznego linku, bez danych osobowych w adresie. Pobrania można liczyć anonimowo. Do obsługi płatności przechowujemy dane konkretnego zamówienia i wpływu, a nie pełną prywatną skrzynkę płatniczą. Polityka prywatności, warunki usługi i zasady płatności są dostępne przed płatnością; szczegóły prawne wymagają osobnej weryfikacji przed publikacją.
## Potwierdzenie decyzji Punktu 0 — dostęp po zakończeniu obsługi

Data potwierdzenia: 01.09.2026

Po zakończeniu aktywnej obsługi podsumowanie `Zapytaj`, historia usługi i kupiony PDF pozostają dostępne w Pokoju. Po 7 dniach moduł dwóch pytań przechodzi w tryb tylko do odczytu. Po 14 dniach kończy się kontakt WhatsApp po pełnej konsultacji.

Klient nie traci kupionego materiału po zakończeniu okresu pytań, ale Pokój nie staje się bezterminowym otwartym czatem ani bezpłatną kontynuacją konsultacji. Zasady retencji danych wymagają osobnego opisania i weryfikacji.
## Potwierdzenie decyzji Punktu 0 — bezpieczny dostęp do Pokoju

Data potwierdzenia: 01.09.2026

Link do Pokoju jest losowy, trudny do odgadnięcia i nie zawiera danych osobowych. Po otwarciu system zamienia go na sesję i usuwa token z widocznego adresu. Dostęp nie jest indeksowany, może być unieważniony i ponownie wygenerowany na zweryfikowany e-mail.

Stały dostęp do podsumowania i kupionego PDF-u nie oznacza wiecznego tokenu w adresie URL. System ogranicza próby dostępu, zapisuje podstawowe zdarzenia techniczne i nie pokazuje danych Pokoju osobie bez właściwego linku.
## Potwierdzenie decyzji Punktu 0 — Pokój jako jedna karta sprawy

Data potwierdzenia: 01.09.2026

Pokój klienta jest spokojną kartą jednej sprawy, a nie panelem sklepu. Najpierw pokazuje status usługi, najbliższy krok, termin lub płatność, a po rozmowie kolejno: `Podsumowanie`, `Co dalej`, licznik dwóch pytań, materiały i niżej historię tej usługi.

Jeśli nie ma produktu do polecenia, pokazuje `Na ten moment bez dodatkowego produktu`, a nie pusty ekran ani automatyczny katalog. Pozostałe usługi mogą być zwykłym linkiem poza bieżącą sprawą, ale nie są równorzędnymi przyciskami.
## Potwierdzenie decyzji Punktu 0 — stany Pokoju klienta

Data potwierdzenia: 01.09.2026

Pokój używa jasnych stanów: `Oczekuje na płatność`, `Wpłata zgłoszona — czekamy na potwierdzenie`, `Termin potwierdzony`, `Przygotowujemy połączenie`, `Rozmowa zakończona — podsumowanie do 24 godzin`, `Podsumowanie gotowe` oraz `Pytania zamknięte`.

W każdym stanie jedna karta odpowiada, co się dzieje, co klient ma zrobić i czego oczekiwać dalej. Nie pokazujemy technicznych szczegółów zegara, blokad, ponowień ani limitów systemowych. Kolory statusów mają być spokojne i nie alarmować przy zwykłym oczekiwaniu.
## Potwierdzenie decyzji Punktu 0 — jednorazowe powiadomienie o dostępności live

Data potwierdzenia: 01.09.2026

Przy niedostępności `Zapytaj teraz` klient może podać e-mail i użyć `Powiadom mnie, gdy będzie dostępny`. Otrzymuje najwyżej jedno powiadomienie po zmianie statusu na dostępny, bez zapisu do newslettera.

Powiadomienie prowadzi do aktualnej strony usługi i nie rezerwuje rozmowy ani nie gwarantuje miejsca. Klient sam wybiera i opłaca rozmowę po otrzymaniu informacji. Na starcie nie wdrażamy kolejki; przy statusie `Trwa rozmowa` wystarcza powiadomienie po zakończeniu.
## Potwierdzenie decyzji Punktu 0 — mapa jako opcjonalna pomoc

Data potwierdzenia: 01.09.2026

`Mapa zachowania` jest krótką, opcjonalną pomocą dla osoby, która nie wie, jak nazwać sytuację. Nie jest wymagana przed formularzem, nie diagnozuje, nie wybiera automatycznie PDF-u, konsultacji ani terapii i nie prowadzi do terminarza.

Mapa ma maksymalnie 3–4 proste kroki i kończy się jednym CTA do `Zapytaj behawiorystę`. Jej rolą jest uporządkowanie pierwszych obserwacji i zmniejszenie niepewności, a nie zastępowanie rozmowy eksperckiej. Stare automatyczne rekomendacje i stare typy usług muszą zostać odłączone.
## Potwierdzenie decyzji Punktu 0 — wygląd mapy zachowania

Data potwierdzenia: 01.09.2026

Mapa jest wizualnie spokojnym notatnikiem, nie dziecięcą grą ani testem. Wejście ma formę małego linku pod głównym CTA, a każdy ekran pokazuje jedno pytanie, postęp `Krok 1 z 4` i proste odpowiedzi z jedną delikatną ilustracją psa lub kota.

Na końcu klient widzi krótkie podsumowanie obserwacji, komunikat `To nie jest diagnoza` i jedno CTA `Zapytaj behawiorystę` z aktualną ceną. Mapa nie wymaga konta, logowania ani zapisywania wyniku. Przy sygnale zagrożenia lub problemu zdrowotnego kieruje do weterynarza albo pilnej pomocy bez próby sprzedaży usługi.
## Potwierdzenie decyzji Punktu 0 — wygląd płatności i rezerwacji

Data potwierdzenia: 01.09.2026

Płatność i rezerwacja przebiegają etapowo: klient widzi usługę, wariant i cenę, wypełnia krótki formularz, otrzymuje instrukcję płatności z indywidualnym kodem, a po zgłoszeniu wpłaty status `Oczekuje na potwierdzenie`. Dopiero ręczna decyzja właściciela może zmienić go na `Termin potwierdzony` albo odrzucić zgłoszenie.

Ekran nie pokazuje przedwcześnie zakończonej rezerwacji ani potwierdzonej płatności. Na desktopie podsumowanie może być obok formularza, a na telefonie nad nim. Używamy aktualnej nazwy `Zapytaj behawiorystę — 15 min`, ceny 79 zł lub 104 zł, jednego głównego przycisku i żadnych technicznych szczegółów.
## Potwierdzenie decyzji Punktu 0 — formularz i komunikaty błędów

Data potwierdzenia: 01.09.2026

Formularz ma etykiety nad polami, jasno oznaczone wymagania, elastyczną walidację polskiego numeru telefonu i zachowuje wpisany opis po błędzie lub chwilowym problemie z siecią. Komunikaty wyjaśniają, co należy poprawić, a przy płatności mówią o ręcznym sprawdzeniu zamiast udawać automatyczne potwierdzenie.

Podczas wysyłania przycisk jest blokowany, aby nie tworzyć duplikatów. Zajęty termin daje możliwość wyboru innego, a opis sytuacji pozostaje krótki i służy przygotowaniu rozmowy, nie zastępuje pełnego wywiadu.
## Potwierdzenie decyzji Punktu 0 — długość opisu sytuacji w formularzu

Data potwierdzenia: 01.09.2026

Formularz ma jedno wymagane, otwarte pole opisu o limicie około 800 znaków. Podpowiedź prosi o informację, co się dzieje, od kiedy, w jakich sytuacjach i czego próbowano do tej pory.

Nie wymagamy rasy, kategorii problemu, zdjęć, filmów ani osobnych pól pełnego wywiadu. Pod polem przypominamy, że przy nagłym zagrożeniu, pogryzieniu lub problemie zdrowotnym klient nie powinien czekać na rozmowę online.
## Potwierdzenie decyzji Punktu 0 — jednostronicowy formularz `Zapytaj`

Data potwierdzenia: 01.09.2026

Formularz `Zapytaj` znajduje się na jednym ekranie: najpierw nazwa usługi i aktualny status, następnie wybór `Pies` / `Kot`, imię, telefon, e-mail, krótki opis, zgody, podsumowanie ceny i przejście do instrukcji płatności.

Płatność jest osobnym etapem, ale wpisane dane nie mogą zniknąć. Jeśli `Zapytaj teraz` jest niedostępne, przycisk nie jest wyświetlany; klient widzi termin, powiadomienie albo informację o przerwie technicznej zgodnie ze statusem.
## Potwierdzenie decyzji Punktu 0 — ekrany po formularzu i płatności

Data potwierdzenia: 01.09.2026

Po formularzu klient widzi usługę, wybraną opcję, cenę, indywidualny kod oraz instrukcję płatności. Po zgłoszeniu wpłaty otrzymuje status `Wpłata dotarła do sprawdzenia. Termin jest zablokowany i czeka na potwierdzenie.`

Po ręcznym potwierdzeniu pojawia się `Termin potwierdzony`, a po odrzuceniu neutralny komunikat o braku potwierdzenia i zwolnieniu terminu. Nie pokazujemy numerów wewnętrznych, technicznych błędów ani komunikatów sugerujących winę klienta przy trwającej weryfikacji.
## Potwierdzenie decyzji Punktu 0 — wybór terminów zwykłego `Zapytaj`

Data potwierdzenia: 01.09.2026

Zwykły `Zapytaj` korzysta z prostej listy najbliższych, ręcznie udostępnionych terminów, a nie z rozbudowanego kalendarza miesięcznego. Klient wybiera jeden dzień i godzinę, widzi informację `Rozmowa do 15 minut` oraz lokalną strefę czasową.

Po wyborze termin znika z publicznej listy i przechodzi do ręcznego potwierdzenia płatności. Przy braku terminów pokazujemy `Sprawdź jutro` oraz jednorazowe powiadomienie. Nie używamy sztucznej presji ani komunikatu o ostatnim miejscu. Terminarz pełnej konsultacji pozostaje ukryty do czasu kodu.
## Potwierdzenie decyzji Punktu 0 — przełącznik dostępności live

Data potwierdzenia: 01.09.2026

Panel właściciela ma jeden główny przełącznik statusu: `Dostępny teraz`, `Trwa rozmowa`, `Niedostępny` albo `Przerwa techniczna`. Włączenie dostępności pokazuje klientom możliwość płatnego `Zapytaj teraz — 104 zł` i wymaga krótkiego potwierdzenia.

Po przyjęciu połączenia status zmienia się automatycznie na `Trwa rozmowa`, a serwer blokuje drugiego klienta. Po zakończeniu właściciel jednym działaniem ponownie włącza dostępność albo pozostawia ją wyłączoną. Nie tworzymy kolejki.
## Potwierdzenie decyzji Punktu 0 — lista połączeń w panelu właściciela

Data potwierdzenia: 01.09.2026

Panel pokazuje kolejno: opłacone `Zapytaj teraz` gotowe do połączenia, rozmowy zaplanowane na dziś, zgłoszenia wymagające ponowienia, zakończone rozmowy bez podsumowania oraz oczekujące płatności.

Wiersz zawiera imię, numer z działaniem `Zadzwoń`, usługę, termin, status płatności, status prób i krótki podgląd opisu. Po wejściu w klienta właściciel widzi pełny opis, może wykonać połączenie ręczne, oznaczyć start i koniec rozmowy oraz przejść do podsumowania.

Tryb `Zadzwoń ręcznie` jest dostępny przy awarii ZADARMA. Nie uruchamia drugiego automatycznego telefonu i nie resetuje wspólnego zegara rozmowy.
## Potwierdzenie decyzji Punktu 0 — workflow podsumowania w panelu

Data potwierdzenia: 01.09.2026

Po zakończeniu rozmowy panel tworzy jedno zadanie `Przygotuj podsumowanie`. Widok rozdziela opis klienta i prywatne notatki od edytora wersji dla klienta. Podsumowanie ma cztery stałe części, licznik orientacyjny 200–350 słów, wybór jednej rekomendacji, krótkie uzasadnienie, zapis wersji roboczej, podgląd i publikację.

Publikacja uruchamia siedmiodniowy okres dwóch pytań. Korekta aktualizuje tę samą sprawę i nie tworzy nowego przypadku ani nie resetuje licznika pytań.
## Potwierdzenie decyzji Punktu 0 — granice dwóch pytań po `Zapytaj`

Data potwierdzenia: 01.09.2026

Moduł nazywa się `Dwa pytania do podsumowania`. Każde pytanie dotyczy tej samej sytuacji i ma limit około 500 znaków. Obsługiwany jest wyłącznie tekst, bez zdjęć, filmów i wiadomości głosowych.

Na jedno pytanie właściciel wysyła jedną krótką odpowiedź, bez dalszej wymiany wiadomości. Jeśli treść otwiera nowy lub złożony problem, klient otrzymuje informację, że potrzebna jest osobna konsultacja. Termin odpowiedzi pozostaje do 48 godzin.
## Potwierdzenie decyzji Punktu 0 — lista zadań i przypomnienia właściciela

Data potwierdzenia: 01.09.2026

Panel właściciela ma sekcję `Dziś do zrobienia`, która priorytetyzuje aktywne `Zapytaj teraz`, rozmowy na dziś, podsumowania z terminem 24 godzin, pytania z terminem 48 godzin, oczekujące płatności i zgłoszenia po nieudanej próbie.

System wysyła jedno wewnętrzne przypomnienie przed terminem i oznacza zadanie po jego przekroczeniu. Nie publikuje automatycznie podsumowania, nie odpowiada za właściciela i nie wysyła klientowi komunikatu `gotowe`, dopóki treść faktycznie nie zostanie opublikowana. Każde zadanie zamyka właściciel.
## Potwierdzenie decyzji Punktu 0 — operacyjne e-maile klienta

Data potwierdzenia: 01.09.2026

Klient otrzymuje tylko krótkie e-maile potrzebne do realizacji procesu: instrukcję płatności, informację o otrzymaniu zgłoszenia, potwierdzenie lub odrzucenie, informację o gotowym podsumowaniu, odpowiedzi na pytanie oraz dostęp do kupionego PDF-u.

Każdy etap wysyłamy najwyżej raz, także po ponowieniu zdarzenia. Wiadomości zawierają status, usługę, termin lub bezpieczny link, ale nie pełny opis sytuacji ani prywatne dane płatnicze. Nie dodajemy treści marketingowych, newslettera ani kilku maili o tym samym zdarzeniu.
## Potwierdzenie decyzji Punktu 0 — przypomnienie o zwykłym terminie

Data potwierdzenia: 01.09.2026

Przy zwykłym terminie wysyłamy jedno operacyjne przypomnienie e-mailowe 24 godziny przed rozmową. Zawiera usługę, datę, godzinę, link do Pokoju i informację o rozmowie do 15 minut. Zmiana terminu jest możliwa tylko zgodnie z ustaloną granicą 24 godzin.

Jeśli rezerwacja została wykonana mniej niż 24 godziny przed rozmową, e-mail potwierdzający pełni również funkcję przypomnienia. Na starcie nie wysyłamy SMS-ów.
## Potwierdzenie decyzji Punktu 0 — nieodebrana rozmowa i dodatkowy termin

Data potwierdzenia: 01.09.2026

Przy nieodebranej rozmowie system wykonuje pierwszą próbę, drugą próbę po minucie, a minutę później wysyła e-mail z linkiem do jednego dodatkowego terminu. Błędny numer prowadzi do tego samego wariantu naprawczego. Po niewykorzystaniu dodatkowego terminu sprawa otrzymuje końcowy status zgodny z warunkami usługi i nie tworzy kolejnych rezerwacji.

Awaria ZADARMA trafia do listy właściciela jako zadanie `Zadzwoń ręcznie`; ręczne połączenie nie jest automatycznie liczone jako druga próba ani nie resetuje zegara rozmowy.
## Potwierdzenie decyzji Punktu 0 — kod dostępu do pełnej konsultacji

Data potwierdzenia: 01.09.2026

Po `Zapytaj` właściciel może wygenerować indywidualny kod dostępu do pełnej konsultacji. Kod jest przepustką powiązaną z konkretnym klientem i Pokój, a nie rabatem ani publicznym kuponem.

Po poprawnym użyciu kodu klient widzi listę dostępnych terminów. Wybiera termin, opłaca konsultację za 475 zł, a rezerwacja pozostaje oczekująca na ręczne potwierdzenie. Ponowne użycie kodu pokazuje istniejący status i nie tworzy drugiej rezerwacji. Kod nie daje dostępu do terapii, hotelu ani innych usług.
## Potwierdzenie decyzji Punktu 0 — terapia jako ścieżka po konsultacji

Data potwierdzenia: 01.09.2026

`Terapia behawioralna` jest publicznie widoczna jako możliwa dalsza, indywidualna praca po pełnej konsultacji. Strona wyjaśnia, dla jakich sytuacji może być potrzebna, ale nie pokazuje publicznego terminarza ani bezpośredniego zakupu.

Publiczne CTA brzmi `Zobacz, jak wygląda dalsza praca`, a po konsultacji zaproszenie i ustalenia terapii trafiają do Pokoju. Zakres, częstotliwość i sposób wyceny są ustalane indywidualnie, ale sama zasada cenowa wymaga później jasnego opisania, aby nie ukrywać kosztu.
## Potwierdzenie decyzji Punktu 0 — nowe adresy publiczne i przekierowania

Data potwierdzenia: 01.09.2026

Publiczna oferta korzysta wyłącznie z nowych, jednolitych nazw i adresów. Stare nazwy nie pojawiają się w menu, sitemapie, canonicalach, danych SEO ani treści stron.

Stare adresy usług mogą otrzymać niewidoczne dla klienta przekierowanie do bezpośredniego nowego odpowiednika, aby nie tworzyć martwych linków. Stare adresy PDF-ów przekierowujemy tylko przy identycznym zakresie; wadliwe lub niezgodne materiały wyłączamy zamiast kierować do innego produktu. Techniczne identyfikatory mogą pozostać wewnętrznie.
## Potwierdzenie decyzji Punktu 0 — selektywne indeksowanie SEO

Data potwierdzenia: 01.09.2026

Indeksujemy wyłącznie nowe, kanoniczne strony z unikalną wartością: stronę główną, `/zapytaj`, stronę pełnej konsultacji, dopracowany katalog i strony PDF-ów, wybrane strony informacyjne oraz unikalne artykuły blogowe.

Pokój klienta, formularze, płatności, statusy, panel właściciela, stare katalogi, powielone strony i niedopracowana mapa nie są przeznaczone do indeksowania. Każda publiczna strona musi mieć jeden sens, unikalną treść i jeden główny CTA. Sama liczba adresów nie jest celem SEO.
## Potwierdzenie decyzji Punktu 0 — wydajność strony i materiałów

Data potwierdzenia: 01.09.2026

Priorytetowo ładowane jest tylko jedno zdjęcie hero. Pozostałe zdjęcia, okładki i podglądy są ładowane leniwie i zoptymalizowane do WebP lub AVIF. Katalog nie ładuje całych PDF-ów, a podgląd otwiera się dopiero po działaniu klienta.

Nie używamy ciężkich filmów, autoplayu ani animowanych teł. Status dostępności jest pobierany niezależnie od ciężkich elementów wizualnych, a formularz, cena i CTA `Zapytaj` nie mogą czekać na załadowanie dekoracji.
## Potwierdzenie decyzji Punktu 0 — dostępność interfejsu

Data potwierdzenia: 01.09.2026

Cała ścieżka klienta ma widoczne etykiety pól, komunikaty błędów zachowujące wpisane dane, wysoki kontrast, obsługę klawiaturą, widoczny fokus, przyciski odpowiednie na telefon oraz statusy rozpoznawalne także bez koloru. Przełącznik gatunku, status Pokoju i zmiany płatności muszą być czytelne dla czytnika ekranu.

Ilustracje dekoracyjne nie są odczytywane, a znaczące zdjęcia mają tekst alternatywny. Animacje można ograniczyć. Dostępność dotyczy przede wszystkim formularza, statusu płatności, połączenia i komunikatów błędów.
## Potwierdzenie decyzji Punktu 0 — minimalne bezpieczeństwo operacyjne

Data potwierdzenia: 01.09.2026

Panel właściciela wymaga uwierzytelnienia, a dane płatnicze i prywatne skrzynki nie trafiają do frontendu. Działania `Potwierdź`, `Odrzuć`, ręczny telefon i publikacja są odporne na ponowienie i zapisywane w logu.

System wymusza jeden aktywny status live, jedno połączenie i brak podwójnej rezerwacji po stronie serwera. Kody zamówień i linki Pokoju są losowe, próby ich zgadywania są ograniczone, dane osobowe nie trafiają do URL-i ani analityki, a API przyjmuje wyłącznie aktywne produkty i usługi z centralnego katalogu.
## Potwierdzenie decyzji Punktu 0 — testy przed uruchomieniem

Data potwierdzenia: 01.09.2026

Przed uruchomieniem wykonujemy testy całej ścieżki: zwykły termin, ręczne potwierdzenie i odrzucenie płatności, duplikaty, konflikt terminów, `Zapytaj teraz`, obie próby połączenia, rozłączenie i ponowne połączenie, dodatkowy termin, awaria ZADARMA, podsumowanie, dwa pytania, zakup i aktualizacja PDF-u oraz blokada starych produktów.

Osobno sprawdzamy telefon, klawiaturę, czytnik ekranu, wolne łącze, wydajność i SEO. Testy odbywają się na danych testowych, bez prawdziwych klientów, płatności i połączeń.
## Potwierdzenie decyzji Punktu 0 — etapowe uruchomienie

Data potwierdzenia: 01.09.2026

Uruchomienie przebiega w trzech etapach: wersja testowa na danych fikcyjnych, ograniczony pilot z ręczną obsługą oraz pełne otwarcie po przejściu testów i ocenie obciążenia.

W każdym etapie musi istnieć ręczny tryb awaryjny dla płatności, połączeń i dostępu do materiałów. Nie uruchamiamy automatyzacji, której właściciel nie może zatrzymać ani skorygować. Najpierw wdrażamy działającą ścieżkę `Zapytaj`, potem Pokój, PDF-y i dopiero na końcu dopracowanie kosmetyczne oraz SEO.
## Potwierdzenie decyzji Punktu 0 — kryteria przejścia z pilota do pełnego otwarcia

Data potwierdzenia: 01.09.2026

Pełne otwarcie wymaga braku krytycznych błędów: podwójnych rezerwacji, rozmów bez potwierdzonej płatności, dostępu do PDF-u przed potwierdzeniem, ujawnienia prywatnych notatek, możliwości zakupu starych produktów oraz błędów prób połączenia i dodatkowego terminu.

Wymagane jest również dotrzymywanie terminów podsumowania i odpowiedzi bez narastających zaległości oraz obsługa możliwa bez przeciążenia właściciela. Nie ustalamy minimalnej liczby sprzedaży PDF-ów; po czterech tygodniach decydujemy na podstawie jakości, dopasowania, czasu i wpływu na pełną konsultację, czy model pozostawić, poprawić lub ograniczyć.

## Potwierdzenie decyzji Punktu 0 — pierwszy ekran serwisu `Zapytaj`

Data potwierdzenia: 01.09.2026

Pierwszy ekran otrzymuje bezpośredni, ekspercki nagłówek: `Masz problem z zachowaniem psa lub kota? Zapytaj behawiorystę.`

Na ekranie jest jeden dominujący przycisk zależny od dostępności oraz pomocnicza opcja drugiego trybu. Przy dostępności: `Zapytaj teraz — 104 zł` jako główna akcja i `Wybierz konkretny termin — 79 zł` jako akcja drugorzędna. Przy braku dostępności: `Wybierz termin — 79 zł` jako główna akcja oraz `Powiadom mnie, gdy będzie dostępny`. Nie stosujemy dwóch równorzędnych, dużych przycisków.

Pierwszy ekran wykorzystuje jedno prawdziwe, ciepłe zdjęcie — preferencyjnie właściciela z psem lub kotem, ewentualnie zwierzęcia w naturalnym kontekście. Nie stosujemy kolażu ani wielu konkurujących zdjęć.

## Potwierdzenie decyzji Punktu 0 — formularz usługi `Zapytaj`

Data potwierdzenia: 01.09.2026

Na stronie `/zapytaj` formularz znajduje się na tej samej stronie, niżej za krótkim opisem usługi. Główne przyciski przewijają do formularza zamiast tworzyć dodatkowy ekran pośredni.

Pole opisu nosi nazwę `Opisz krótko, co dzieje się z Twoim psem lub kotem`, a pomocniczy tekst brzmi: `Co się dzieje, od kiedy i w jakich sytuacjach? Napisz też, co zostało już wypróbowane.` Nie używamy pytania `czy potrzebna jest konsultacja`.

Przed płatnością pokazujemy krótkie wyjaśnienie zakresu: `To krótka rozmowa, podczas której uporządkujesz problem i dowiesz się, co możesz zrobić dalej. Nie zastępuje pełnej konsultacji ani pilnej pomocy weterynaryjnej.`

## Potwierdzenie decyzji Punktu 0 — płatność i blokada usługi `Zapytaj teraz`

Data potwierdzenia: 01.09.2026

Przed formularzem pokazujemy krótki schemat: `1. Opisz problem 2. Opłać rozmowę 3. Porozmawiaj z behawiorystą i dowiedz się, co robić dalej.`

Po wysłaniu formularza klient otrzymuje instrukcję płatności na ekranie oraz mailem. Instrukcja zawiera kwotę, indywidualny kod zamówienia, dane do płatności oraz jasną informację, że płatność wymaga ręcznego potwierdzenia i samo wysłanie formularza nie potwierdza rozmowy.

Przy wyborze `Zapytaj teraz` dostępność jest tymczasowo blokowana na 5 minut od przejścia do płatności. Jeżeli klient w tym czasie nie zgłosi płatności, blokada wygasa i usługa wraca do puli.

## Potwierdzenie decyzji Punktu 0 — status po zgłoszeniu płatności

Data potwierdzenia: 01.09.2026

Klient widzi trzy podstawowe statusy: `Oczekuje na potwierdzenie płatności`, `Płatność potwierdzona — przygotowujemy rozmowę` oraz `Płatność odrzucona — skontaktuj się, jeśli uważasz, że to pomyłka`. Nie pokazujemy potwierdzenia rezerwacji przed faktyczną akceptacją płatności.

Po potwierdzeniu usługi `Zapytaj teraz` klient nie wykonuje dodatkowego kliknięcia. Widzi komunikat `Płatność potwierdzona. Przygotowujemy połączenie — proszę pozostać przy telefonie`, a następnie Zadarma automatycznie wykonuje połączenie. Ten sam komunikat jest wysyłany mailem.

Płatność zgłoszona po wygaśnięciu pięciominutowej blokady albo po zajęciu usługi przez inną osobę otrzymuje status `Płatność wymaga wyjaśnienia`. Nie uruchamiamy automatycznego połączenia; właściciel ręcznie decyduje o propozycji terminu albo odrzuceniu płatności, a klient otrzymuje neutralny mail.

## Potwierdzenie decyzji Punktu 0 — dostępność i powiadomienie

Data potwierdzenia: 01.09.2026

Powiadomienia o dostępności nie są wysyłane według zgadywanego harmonogramu. Są uruchamiane dopiero wtedy, gdy właściciel włączy status dostępności, przy czym deklarowane okno dostępności trwa co najmniej godzinę.

Preferowanym kanałem powiadomienia jest SMS, ponieważ może szybciej doprowadzić do płatnej rezerwacji. Przed wdrożeniem sprawdzamy koszt, dostawcę, zgodę klienta i wariant awaryjny z mailem; SMS nie jest automatycznie uznany za tańszy ani niezawodny.

Terminy planowane zaczynają się w interwałach 30-minutowych, aby zostawić bufor połączenia, opóźnienia i krótkiej notatki po rozmowie.

## Doprecyzowanie decyzji Punktu 0 — okno dostępności

Właściciel, włączając dostępność live, przyjmuje co najmniej godzinne okno gotowości do rozmów. Późniejsze zasady wysyłki powiadomień, liczby odbiorców i zachowania statusu po zakończeniu rozmowy wymagają osobnego dopięcia.

## Potwierdzenie decyzji Punktu 0 — zasady powiadomień live

Data potwierdzenia: 01.09.2026

Po włączeniu dostępności powiadomienie jest wysyłane wszystkim osobom oczekującym. Wiadomość wyraźnie informuje, że nie stanowi rezerwacji, a rozmowę otrzyma osoba z potwierdzoną płatnością.

SMS jest podstawowym kanałem powiadomienia. Mail służy jako fallback, gdy SMS nie może zostać wysłany. Nie wysyłamy obu kanałów równolegle bez potrzeby i nie łączymy tego z newsletterem ani marketingiem.

Włączenie dostępności nie oznacza ustawienia jednej sztywnej godziny końcowej. Oznacza przyjęcie przez właściciela zasady, że pozostaje dostępny co najmniej godzinę. Podczas rozmowy status zmienia się na `Trwa rozmowa`, a po jej zakończeniu automatycznie wraca do `Dostępny teraz`, przy zachowaniu minimalnego godzinnego zobowiązania.

## Korekta decyzji Punktu 0 — ręczne zakończenie dostępności i miejsce przy zajętym live

Data potwierdzenia: 01.09.2026

Dostępność nie wyłącza się automatycznie po godzinie. Właściciel wyłącza ją ręcznie po zakończeniu własnego okna gotowości. Po ręcznym wyłączeniu działa jeszcze 10-minutowy bufor dla osób, które były już w rozpoczętej ścieżce live; dokładny zakres tego bufora trzeba doprecyzować, aby system nie obiecywał nowym osobom rozmowy po zamknięciu dostępności.

Gdy status ma wartość `Trwa rozmowa`, klient musi otrzymać możliwość zabezpieczenia sobie miejsca, a nie tylko biernego oczekiwania lub ponownego klikania powiadomienia. Model rezerwacji miejsca i limit takiej kolejki pozostają do doprecyzowania.

Terminy planowane pozostają widoczne również przy statusach `Trwa rozmowa` i `Niedostępny`, o ile są wolne.

## Potwierdzenie decyzji Punktu 0 — następne miejsce live

Data potwierdzenia: 01.09.2026

Przy statusie `Trwa rozmowa` klient może wybrać `Zarezerwuj następną rozmowę live`. Rezerwacja oznacza obsługę po zakończeniu bieżącej rozmowy, a nie obietnicę konkretnej godziny; klient widzi orientacyjny czas około 20–30 minut.

System dopuszcza maksymalnie jedno oczekujące miejsce live. Po jego zajęciu kolejni klienci wybierają zwykły termin za 79 zł albo proszą o powiadomienie przy kolejnej dostępności.

Dziesięciominutowy bufor po ręcznym wyłączeniu dostępności obejmuje wyłącznie osoby z rozpoczętą ścieżką płatności oraz osoby z potwierdzoną rezerwacją następnego miejsca. Nie przyjmujemy w tym czasie nowych osób jako live.

## Potwierdzenie decyzji Punktu 0 — cena i zakończenie następnego miejsca live

Data potwierdzenia: 01.09.2026

Rezerwacja następnego miejsca live kosztuje 104 zł. Jest opisana jako priorytetowa rozmowa po zakończeniu bieżącej rozmowy, zwykle w orientacyjnym czasie około 20–30 minut.

Miejsce jest faktycznie zarezerwowane dopiero po ręcznym potwierdzeniu zgłoszonej płatności. Do tego czasu działa wyłącznie pięciominutowa blokada ścieżki płatności i nie wykonujemy połączenia.

Rozmowa ma twardy techniczny limit 17 minut i po jego osiągnięciu zostaje zakończona, więc nie tworzymy osobnej procedury na jej przedłużenie. Następne miejsce może zostać obsłużone po zakończeniu bieżącego połączenia; wyjątki dotyczą wyłącznie wcześniej ustalonych awarii lub nieudanej próby połączenia.

## Korekta decyzji Punktu 0 — telefon do następnego miejsca live

Data potwierdzenia: 01.09.2026

Do osoby z następnym miejscem live nie wykonujemy telefonu przed płatnością i ręcznym potwierdzeniem płatności przez właściciela. Prawidłowa kolejność to: klient wybiera następne miejsce, opłaca 104 zł, zgłasza płatność, właściciel ją potwierdza, klient oczekuje na zakończenie bieżącej rozmowy, a dopiero wtedy system automatycznie uruchamia połączenie.

Samo rozpoczęcie płatności oznacza wyłącznie pięciominutową blokadę. Osoba, która nie opłaciła lub której płatność nie została potwierdzona, nie zajmuje miejsca i nie otrzymuje telefonu.

## Potwierdzenie decyzji Punktu 0 — kod konsultacji, WhatsApp i terapia

Data potwierdzenia: 01.09.2026

Kod dostępu do pełnej konsultacji jest ważny 14 dni od wydania, służy do jednorazowego odblokowania rezerwacji i może zostać ręcznie unieważniony lub wydany ponownie przez właściciela.

WhatsApp po pełnej konsultacji działa przez 14 dni od faktycznej konsultacji i obejmuje pytania związane z jej ustaleniami. Nie jest to nieograniczona obsługa; nowy, niezależny problem wymaga osobnej konsultacji.

Po zakończeniu pełnej konsultacji w Pokoju klienta pojawia się moduł `Terapia behawioralna` z opisem indywidualnej pracy, przyciskiem `Zapytaj o możliwość terapii`, bez publicznego terminarza i bez bezpośredniego zakupu.

## Potwierdzenie decyzji Punktu 0 — podsumowanie po rozmowie

Data potwierdzenia: 01.09.2026

Podsumowanie po `Zapytaj` jest przygotowywane i publikowane ręcznie przez właściciela. Klient otrzymuje mail dopiero po publikacji finalnej wersji, a nie dostęp do roboczej notatki.

Okres siedmiu dni na dwa pytania rozpoczyna się od publikacji podsumowania.

W Pokoju klienta pokazujemy jeden główny następny krok wybrany przez właściciela: pełną konsultację, jeden konkretny PDF, kontakt z weterynarzem lub pilną pomoc albo brak dalszej oferty. Pozostałe usługi mogą być widoczne informacyjnie niżej, ale bez równorzędnych przycisków i terminarza.

## Potwierdzenie decyzji Punktu 0 — rekomendacja materiału

Data potwierdzenia: 01.09.2026

Po `Zapytaj` PDF jest dodatkowo płatnym produktem za 19 zł; cena rozmowy nie obejmuje automatycznie materiału.

Polecony PDF jest kupowany z Pokoju klienta przez krótką ścieżkę płatności, bez ponownego rozbudowanego formularza. Dostęp do pliku pojawia się dopiero po ręcznym potwierdzeniu płatności.

Zasada rekomendacji brzmi: klient otrzymuje zawsze odpowiedni materiał, jeśli taki istnieje, ale nie zawsze jest to produkt płatny. Właściwy płatny PDF rekomendujemy tylko wtedy, gdy realnie pasuje do sytuacji; w innych bezpiecznych przypadkach wskazujemy materiał darmowy, a przy potrzebie weterynarza lub pilnej pomocy nie oferujemy produktu zamiast właściwego skierowania.

## Potwierdzenie decyzji Punktu 0 — prezentacja i dostęp do PDF-u

Data potwierdzenia: 01.09.2026

W Pokoju rekomendowany PDF jest przedstawiany jako `Materiał, który może Ci pomóc`, a dopiero dalej pokazujemy jego nazwę i cenę 19 zł. Nie stosujemy języka presji ani automatycznych przypomnień sprzedażowych.

Po rozpoczęciu, ale niedokończeniu płatności można wysłać wyłącznie techniczne przypomnienie dotyczące tej konkretnej płatności. Nie wysyłamy kampanii ani ponagleń marketingowych.

Po potwierdzeniu płatności klient otrzymuje stały dostęp do PDF-u w Pokoju oraz bezpieczny link w mailu. Dostęp nie wygasa po kilku dniach.

## Potwierdzenie decyzji Punktu 0 — blog, mapa i nawigacja

Data potwierdzenia: 01.09.2026

Blog pozostaje w głównym menu jako element drugorzędny, po usługach i materiałach. `Zapytaj` jest jedynym wyróżnionym elementem nawigacji.

Każdy artykuł otrzymuje jeden główny cel: zwykle `Zapytaj behawiorystę — 79 zł`, przy temacie zdrowotnym lub ryzykownym skierowanie do weterynarza albo pilnej pomocy, a przy bezpiecznym temacie dopasowany darmowy materiał. Nie pokazujemy kilku równorzędnych ofert naraz.

Mapa jest opcjonalnym linkiem `Nie wiesz, jak to nazwać? Otwórz mapę`, umieszczonym pod głównym przyciskiem. Nie jest obowiązkowym krokiem, elementem głównego menu ani automatycznym lejkiem sprzedażowym; ma maksymalnie 3–4 kroki i kończy się pojedynczym właściwym komunikatem.

## Potwierdzenie decyzji Punktu 0 — publiczne adresy i nazwy

Data potwierdzenia: 01.09.2026

Przyjmujemy prosty zestaw publicznych adresów: `/zapytaj`, `/konsultacja`, `/terapia`, `/materialy` i `/blog`. Mapa może zachować techniczny obecny adres, ale nie jest główną stroną oferty ani elementem głównej nawigacji.

Publiczne nazwy usług i produktów są jednolite z nowym modelem. Stare adresy usług mogą cicho przekierowywać wyłącznie do rzeczywiście odpowiadającej nowej usługi. Stare adresy produktów z innym opisem lub ceną są wyłączane albo zwracają 404; nie przekierowujemy ich do przypadkowo podobnych materiałów. Stare nazwy nie trafiają do menu, sitemap, SEO ani kart produktów.

Strona `/konsultacja` publicznie pokazuje `475 zł · około 90 minut` oraz wymóg wcześniejszej rozmowy i indywidualnego kodu. Terapia jest opisana jako dalsza, indywidualnie ustalana ścieżka bez publicznego terminarza i bez bezpośredniego zakupu.

## Potwierdzenie decyzji Punktu 0 — formalności i ręczne płatności

Data potwierdzenia: 01.09.2026

Przed płatnością klient widzi linki do zasad usługi, prywatności, płatności i odwołania oraz zasad dotyczących usług cyfrowych przy PDF-ach. Potwierdzenie zapoznania się z tymi zasadami jest wymagane, ale nie zawiera ukrytej zgody marketingowej. Poprawność prawna treści wymaga osobnej weryfikacji przed uruchomieniem.

Zgoda na SMS jest osobna i dobrowolna; dotyczy wyłącznie jednorazowego powiadomienia o dostępności. Przy braku zgody lub możliwości wysłania SMS-a stosujemy mail. Nie łączymy tego z newsletterem ani reklamą.

Ręczna weryfikacja płatności trwa maksymalnie 24 godziny. Klient widzi komunikat: `Płatność zostanie sprawdzona ręcznie maksymalnie w ciągu 24 godzin. Do czasu potwierdzenia rozmowa nie jest zarezerwowana.` Po tym czasie bez decyzji sprawa otrzymuje status `Wymaga wyjaśnienia`; system nie wykonuje połączenia.

## Potwierdzenie decyzji Punktu 0 — Pokój klienta i dane

Data potwierdzenia: 01.09.2026

Klient korzysta z Pokoju bez zakładania konta i hasła, przez bezpieczny losowy link otrzymany po potwierdzeniu usługi.

Po zgubieniu linku można wydać nowy po weryfikacji maila lub numeru telefonu. Poprzedni link zostaje unieważniony.

Stały dostęp do podsumowania i kupionego PDF-u nie oznacza bezterminowego przechowywania wszystkich danych osobowych. Klient może zażądać usunięcia Pokoju i danych, z wyjątkiem informacji, które muszą pozostać w dokumentacji płatności lub z innych uzasadnionych przyczyn formalnych.

## Potwierdzenie decyzji Punktu 0 — mapa problemu

Data potwierdzenia: 01.09.2026

Mapa zaczyna się od wyboru gatunku `Pies` albo `Kot`. Nie pytamy o rasę, ponieważ nie jest potrzebna do pierwszej rozmowy i mogłaby sugerować stereotypowe wnioski.

Klient może opisać, co najbardziej go niepokoi, a opcjonalne podpowiedzi obejmują między innymi samotność, lęk, reakcje na ludzi lub zwierzęta, konflikt, niszczenie i `Inne`. Kategorie nie są wymagane i nie stanowią diagnozy.

Mapa nie pokazuje wyniku punktowego, etykiety problemu ani automatycznej rekomendacji produktu. Kończy się komunikatem `To może być dobry temat do rozmowy z behawiorystą. Opisz sytuację i zapytaj, co możesz zrobić dalej.` oraz jednym przyciskiem `Zapytaj behawiorystę`.

## Potwierdzenie decyzji Punktu 0 — katalog materiałów

Data potwierdzenia: 01.09.2026

Na start publiczny katalog obejmuje 10 aktualnych płatnych PDF-ów po 19 zł oraz 6 wybranych darmowych materiałów. Płatne materiały są prezentowane wyżej, darmowe niżej, z prostymi zakładkami `Pies` i `Kot`. Nie pokazujemy starych, słabych ani dublujących się produktów.

W pierwszym pilotażu każdy płatny PDF wymaga wcześniejszej rozmowy `Zapytaj`. Cena 19 zł jest widoczna na karcie, ale główny przycisk brzmi `Najpierw zapytaj behawiorystę`; zakup odblokowuje dopiero ręczna rekomendacja w Pokoju.

Stare PDF-y i ceny są wyłączone z katalogu publicznego, API, wyszukiwarki i sitemap. Ich techniczne pliki mogą pozostać wyłącznie wtedy, gdy są potrzebne starej logice, ale klient nie może ich zobaczyć ani kupić. Niedopasowane stare adresy produktów zwracają 404.

## Potwierdzenie decyzji Punktu 0 — promocja, opinie i pilotaż

Data potwierdzenia: 01.09.2026

Promocja obejmuje 10 jednorazowych kodów po 39,99 zł, przeznaczonych do udostępniania w konkretnych grupach. Kod jest ważny 14 dni albo do wyczerpania puli, jeden kod przypada na jedną osobę, a cena promocyjna nie jest eksponowana na stronie głównej.

Opinie są przypisane do konkretnej usługi. Na stronie `Zapytaj` pokazujemy 3–4 wiarygodne opinie, a dalsze mogą pojawić się przy pełnej konsultacji. Nie używamy sztucznych gwiazdek, zdjęć bez zgody ani gwarancji efektu.

Uruchomienie przebiega przez testy fikcyjne, następnie czterotygodniowy ograniczony pilot z ręczną obsługą. Nie wymagamy minimalnej liczby sprzedaży; po pilocie oceniamy błędy, czas obsługi, pytania, sprzedaż PDF-ów i wpływ na pełne konsultacje.

## Potwierdzenie decyzji Punktu 0 — hero strony `Zapytaj`

Data potwierdzenia: 01.09.2026

Na pierwszym ekranie używamy istniejącego w projekcie zdjęcia właściciela trzymającego kota na rękach. Nie używamy w hero zdjęcia przedstawiającego pracę przy zabiegu.

Przyjmujemy podnagłówek: `Opowiedz, co dzieje się z Twoim psem lub kotem. W krótkiej rozmowie uporządkujemy problem i ustalimy, co możesz zrobić dalej.`

Blok ceny i dostępności pokazuje: `Do 15 minut · 79 zł` oraz dynamicznie `Dostępny teraz: 104 zł`, wyłącznie przy rzeczywistej dostępności. Przy jej braku główny komunikat prowadzi do wyboru terminu za 79 zł.

## Potwierdzenie decyzji Punktu 0 — układ pierwszego ekranu

Data potwierdzenia: 01.09.2026

Na komputerze po lewej stronie znajdują się nagłówek, podnagłówek, cena i przycisk, a po prawej istniejące zdjęcie właściciela z kotem na rękach. Tekst nie jest nakładany na fotografię; układ ma dużo spokojnej przestrzeni.

Na telefonie kolejność jest następująca: nagłówek, krótki opis, cena i status, główny przycisk, zdjęcie, a następnie formularz. Zdjęcie nie może zepchnąć głównej akcji zbyt nisko.

Bezpośrednio pod hero znajduje się krótki moduł `Jak to działa`: `Opisujesz problem → opłacasz rozmowę → rozmawiasz z behawiorystą → dowiadujesz się, co robić dalej`. Formularz nie jest częścią hero.

## Potwierdzenie decyzji Punktu 0 — wartość usługi i sekcje informacyjne

Data potwierdzenia: 01.09.2026

Wartość `Zapytaj` pokazujemy w trzech krótkich punktach: klient uporządkuje, co może stać za problemem; dostanie pierwszy praktyczny krok; dowie się, co robić dalej i czy potrzebna jest pełna konsultacja. Nie obiecujemy rozwiązania problemu ani gotowego planu terapii w 15 minut.

Pełna konsultacja i terapia pojawiają się dopiero pod główną usługą `Zapytaj`, formularzem i podstawowym wyjaśnieniem. Są widoczne jako dalsze możliwości, ale nie jako warunek zakupu taniej rozmowy.

Dodajemy krótkie FAQ obejmujące czas, cenę, opcję `teraz`, różnicę między rozmową a konsultacją, dalszy krok po rozmowie oraz sytuacje wymagające weterynarza. Cena, czas i zakres usługi pozostają widoczne także poza FAQ.

## Potwierdzenie decyzji Punktu 0 — formularz i CTA

Data potwierdzenia: 01.09.2026

Główny przycisk zwykłego trybu brzmi `Zapytaj behawiorystę — 79 zł`, a przy rzeczywistej dostępności live `Zapytaj teraz — 104 zł`. Nie używamy samego `Wyślij` ani `Zarezerwuj` przed płatnością i potwierdzeniem.

Po formularzu przycisk płatności brzmi dynamicznie `Przejdź do płatności — 79 zł` albo `Przejdź do płatności — 104 zł`.

Po wysłaniu formularza klient widzi: `Dane zostały zapisane. Przejdź teraz do instrukcji płatności. Rozmowa zostanie potwierdzona dopiero po sprawdzeniu płatności.` Nie używamy wtedy komunikatu o potwierdzonej rezerwacji ani obietnicy natychmiastowego telefonu.

## Potwierdzenie decyzji Punktu 0 — panel właściciela

Data potwierdzenia: 01.09.2026

Główny widok panelu właściciela to lista `Dziś do zrobienia`, obejmująca oczekujące płatności, rozmowy na dziś, aktywne live, podsumowania, pytania i nieudane połączenia. Sprawy są uporządkowane według pilności, terminu i statusu, bez potrzeby rozbudowanych wykresów.

Pełny opis klienta jest widoczny bezpośrednio przy sprawie przed rozmową i przygotowaniem podsumowania. Prywatne notatki właściciela są osobnym polem i nie trafiają automatycznie do klienta.

Przy sprawie dostępne są szybkie akcje `Potwierdź płatność`, `Odrzuć`, `Zadzwoń ręcznie`, `Przygotuj podsumowanie`, `Opublikuj podsumowanie` i `Wybierz następny krok`. Każda akcja ma krótkie potwierdzenie i ochronę przed podwójnym wykonaniem.

## Potwierdzenie decyzji Punktu 0 — komunikaty transakcyjne

Data potwierdzenia: 01.09.2026

Po potwierdzeniu płatności klient otrzymuje mail: `Płatność została potwierdzona. Twoja rozmowa z behawiorystą jest przygotowywana. Za chwilę otrzymasz połączenie lub szczegóły wybranego terminu.` Dla terminu mail zawiera datę i godzinę, a dla live informację o oczekiwaniu na automatyczne połączenie.

Po odrzuceniu płatności wysyłamy neutralny mail: `Nie mogliśmy potwierdzić tej płatności. Jeśli uważasz, że to pomyłka, skontaktuj się z nami, podając kod zamówienia.` Nie ujawniamy wewnętrznych szczegółów weryfikacji ani nie przypisujemy klientowi winy.

Po dwóch nieudanych próbach połączenia klient otrzymuje mail z informacją o jednym dodatkowym terminie i linkiem: `Nie udało nam się połączyć z podanym numerem. Możesz skorzystać z jednego dodatkowego terminu tutaj: [link]. Jeśli numer był błędny, popraw go przed ponowną próbą.` Nie tworzymy nieskończonej liczby prób.

## Potwierdzenie decyzji Punktu 0 — czas rozmowy i rozłączenie

Data potwierdzenia: 01.09.2026

Czas rozmowy zaczyna się około 20 sekund po faktycznym odebraniu połączenia. Wybieranie numeru, sygnał oczekiwania i nieodebrane połączenie nie zużywają czasu rozmowy.

Po 17 minutach połączenie kończy się automatycznie. Publicznie komunikujemy wyłącznie, że rozmowa trwa do 15 minut; techniczny limit 17 minut pozostaje niewidoczny.

Przy przypadkowym rozłączeniu klient może ponownie połączyć się w ramach tej samej usługi, ale zegar obejmuje łączny czas rozmowy i nie zeruje się.

## Potwierdzenie decyzji Punktu 0 — zmiana terminu i nieobecność

Data potwierdzenia: 01.09.2026

Klient może raz samodzielnie przełożyć termin, najpóźniej 24 godziny przed rozmową i wyłącznie na dostępne miejsce. Po zmianie otrzymuje nowe potwierdzenie. Późniejsza zmiana jest możliwa tylko wyjątkowo i ręcznie.

Przed ręcznym potwierdzeniem płatności termin wraca do puli bez osobnej procedury anulowania. Po potwierdzeniu klient nie anuluje terminu automatycznie; ewentualne odstępstwo jest rozpatrywane ręcznie.

Przy nieobecności klienta wykonujemy dwie próby połączenia, a następnie udostępniamy jeden dodatkowy termin. Po niewykorzystaniu dodatkowego terminu lub ponownym braku odpowiedzi sprawa zostaje zamknięta i nie powstają kolejne bezpłatne próby.

## Potwierdzenie decyzji Punktu 0 — poprawność danych i awarie

Data potwierdzenia: 01.09.2026

Klient może poprawić telefon, mail i opis przed zgłoszeniem płatności. Po zgłoszeniu płatności dane zmienia właściciel; przy błędnym numerze klient otrzymuje link do korekty przed dodatkową próbą.

Wielokrotne kliknięcie nie tworzy drugiej rezerwacji. Klient pozostaje przy tym samym statusie i kodzie zamówienia, a ewentualna druga płatność trafia do ręcznego wyjaśnienia. System nie wykonuje podwójnego telefonu ani nie wysyła zdublowanych potwierdzeń.

Awaria Zadarmy tworzy zadanie `Wymaga ręcznego telefonu`. Właściciel dzwoni ze swojego telefonu; awaria nie zużywa automatycznie próby, a sprawa zachowuje dotychczasowy status i historię. Klient otrzymuje informację o ręcznym połączeniu.

## Potwierdzenie decyzji Punktu 0 — przejście do audytu i wdrożenia

Data potwierdzenia: 01.09.2026

Najpierw wykonujemy wyłącznie odczytowy audyt obecnego systemu: adresów, nazw, formularzy, płatności, Zadarmy, statusów, rezerwacji, katalogu PDF-ów, mapy, Pokoju i panelu właściciela. Podczas pierwszego przejścia nie zmieniamy kodu; raportujemy rozbieżności między aktualnym stanem a przyjętym planem.

Po audycie wdrożenie przebiega etapami: działająca ścieżka `/zapytaj`, statusy i płatności, połączenia Zadarma z ręcznym fallbackiem, Pokój i podsumowania, PDF-y, a na końcu kosmetyka, blog, mapa i SEO.

Pierwszy etap jest testowany wyłącznie na danych fikcyjnych, w tym dla zwykłego terminu, `Zapytaj teraz`, ręcznego potwierdzenia i odrzucenia, duplikatów, braku odpowiedzi, rozłączenia, dodatkowego terminu i awarii Zadarmy. Dopiero po przejściu tych testów uruchamiamy ograniczony pilot z prawdziwymi klientami.
## Potwierdzenie decyzji Punktu 0 — wygląd pierwszego ekranu

Pierwszy ekran ma być ekspercki, ciepły i skoncentrowany na jednej głównej usłudze `Zapytaj behawiorystę`.

- Na górze pozostaje prosta nawigacja oraz wyraźny przycisk `Zapytaj`.
- Główny komunikat: `Masz problem z psem lub kotem? Zapytaj behawiorystę.`
- Pod komunikatem pokazujemy rezultat rozmowy, czas i cenę: `Do 15 minut · 79 zł`.
- Przy realnej dostępności live pokazujemy osobno `Dostępny teraz: 104 zł`; nie sugerujemy natychmiastowego połączenia, gdy właściciel faktycznie nie jest dostępny.
- Głównym zdjęciem jest istniejące zdjęcie specjalisty trzymającego kota (`public/branding/omnie.png`), umieszczone po prawej na desktopie i pod głównym komunikatem na telefonie.
- Nad pierwszym ekranem nie pokazujemy mapy, listy problemów, katalogu PDF ani kilku równorzędnych usług.
- Pod hero pojawia się krótka sekwencja czterech kroków, a następnie formularz tej samej usługi.

## Status wdrożenia po akceptacji Punktu 0 — 01.09.2026

Wdrożono pierwszy fragment zaakceptowanego kierunku:

- strona główna ma nowy, jednoznaczny hero skoncentrowany na `Zapytaj behawiorystę`;
- dodano kanoniczną stronę `/zapytaj` z ceną 79 zł, formularzem bez wymuszania rasy ani kategorii problemu oraz czterema krokami procesu;
- dodano publiczne opisy `/konsultacja` i `/terapia`, bez udawania publicznego terminarza ani bezpośredniego zakupu terapii;
- główna nawigacja wskazuje konsultację, terapię, materiały i blog, a wyróżnione CTA prowadzi do `Zapytaj`;
- stopka, fallback 404 i sitemap wskazują nowe publiczne adresy zamiast starego Cennika, bookingu i newslettera;
- formularz `/zapytaj` jest na razie warstwą przygotowawczą: nie zapisuje jeszcze płatnej rezerwacji, nie wysyła telefonu i nie potwierdza usługi;
- płatność, pięciominutowa blokada, ręczne potwierdzenie, statusy live i integracja Zadarmy pozostają następnym etapem i nie mogą zostać uznane za gotowe na podstawie samego wyglądu strony.

## Aktualny status wdrożenia po kolejnym kroku — 01.09.2026

Zrealizowano działający rdzeń usługi `Zapytaj behawiorystę — 15 min`:

- formularz zapisuje prawdziwą rezerwację na zwykły termin za 79 zł albo na realnie udostępnione okno live za 104 zł;
- zwykły termin i live mają osobne rozpoznanie techniczne, a live tworzy najwyżej jedno następne miejsce zamiast nieograniczonej kolejki;
- rezerwacja jest blokowana na 5 minut, a zgłoszona ręczna płatność utrzymuje ją do decyzji właściciela; dla `Zapytaj` limit tej decyzji wynosi 24 godziny;
- po potwierdzeniu płatności live system próbuje uruchomić Zadarmę, a brak konfiguracji, błąd lub zbyt późne okno oznacza zadanie ręcznego telefonu;
- panel właściciela ma ręczne włączanie dostępności live na minimum godzinę, wyłączenie przyjmowania nowych osób i akcję ręcznego telefonu;
- klient widzi rzeczywisty status: niedostępny, dostępny, trwa rozmowa, oczekiwanie na płatność albo bufor po zamknięciu;
- klient może zapisać jednorazowe powiadomienie SMS albo e-mail; SMS jest pierwszą próbą, a e-mail może być fallbackiem;
- dodano migracje `20260901001_zapytaj_flow.sql` oraz `20260901002_zapytaj_live_notifications.sql` i uwzględniono je w audycie schematu;
- stare nazwy techniczne pozostają wyłącznie jako kompatybilność kodu; publiczna ścieżka prowadzi przez `/zapytaj`.

Weryfikacja lokalna:

- `npm run lint` — zaliczone;
- `npm test` — 162 zaliczone, 0 niezaliczonych, 13 pominiętych;
- `npm run schema-audit` — zaliczone;
- lokalny smoke flow: włączenie live → rezerwacja 104 zł → oczekiwanie płatności → ręczne potwierdzenie → status rozmowy — zaliczony;
- lokalny smoke powiadomienia: deduplikacja zapisu i fallback SMS → e-mail — zaliczony;
- `tsc --noEmit` nadal zatrzymuje istniejący, niezwiązany z tym krokiem błąd w `tests/case-map-icons.test.ts:79`.

Przed użyciem produkcyjnym pozostaje zastosowanie obu migracji w Supabase i sprawdzenie konfiguracji Zadarmy, dostawcy SMS oraz maili. Przy obecnym środowisku z niezsynchronizowanym Supabase status live celowo pozostaje `niedostępny` — system nie udaje dostępności bez bezpiecznego storage.

## Status po wykonaniu migracji i testu wdrożeniowego — 01.09.2026

- CLI Supabase zastosował migracje `20260901001_zapytaj_flow.sql` i `20260901002_zapytaj_live_notifications.sql` w projekcie `beh2`; ponowna lista migracji potwierdziła zgodność lokalna = zdalna.
- Raport gotowości produkcyjnej przeszedł 5/5: Supabase runtime, publiczny HTTPS, schemat, maile klienta i świadomie wyłączone PayU.
- Publiczny smoke starszych tras przeszedł, ale `https://regulskibehawiorysta.pl/zapytaj` zwraca 404, a publiczny build jest starszy niż bieżący kod. Nowa usługa nie jest więc jeszcze opublikowana.
- Test lokalny Playwrightem przeszedł dla formularza, walidacji powiadomienia, zwykłej rezerwacji 79 zł, przejścia do płatności ręcznej, zgłoszenia BLIK oraz trybu live 104 zł.
- Test ujawnił i naprawił filtr, który pokazywał klientowi terminy widoczne w bazie, ale niedostępne dla zwykłego `Zapytaj` (np. terminy zarezerwowane dla pilnego trybu).
- Po poprawce `npm run build` przeszedł poprawnie. Nie wykonano prawdziwego telefonu Zadarma ani prawdziwej płatności; test używał wyłącznie lokalnego katalogu danych.
- Wdrożenie na Vercel jest zablokowane technicznie: zapisany token CLI Vercel jest nieważny. Następny krok: ponowne `vercel login`, wdrożenie aktualnego projektu i powtórzenie smoke na publicznym `/zapytaj`.

## Status po zalogowaniu i wdrożeniu produkcyjnym — 01.09.2026

- Logowanie do Vercel zakończone powodzeniem.
- Aktualny projekt został wdrożony produkcyjnie i przypięty do `https://regulskibehawiorysta.pl`.
- Nowa strona `https://regulskibehawiorysta.pl/zapytaj` zwraca HTTP 200 i pokazuje usługę `Zapytaj behawiorystę` za 79 zł, wybór zwykłego terminu, status live oraz informację o powiadomieniu.
- Publiczne `GET /api/zapytaj/availability` zwraca HTTP 200; live pozostaje celowo `offline`, a API pokazuje wyłącznie zwykłe terminy.
- Kontrola Playwrightem na desktopie i telefonie: formularz, cena, informacja o braku publicznego terminarza konsultacji oraz brak poziomego przepełnienia — zaliczone.
- Pełny stary smoke-test zakończył się błędem wyłącznie dlatego, że jego oczekiwania wobec strony głównej są nieaktualne względem przyjętego nowego tekstu hero; nowe `/zapytaj` zostało zweryfikowane osobno. Nie uruchamiano prawdziwej płatności, telefonu Zadarma ani trybu live na produkcji.

## Status po spięciu zwykłego `Zapytaj` z kanałem telefonu — 01.09.2026

- Zwykła rezerwacja `Zapytaj behawiorystę` zapisuje teraz jawnie `consultationMode: phone`, tak samo jak wymaga tego późniejsza obsługa Zadarmy. Wcześniej termin za 79 zł mógł zostać zapisany bez kanału telefonu, więc sprzedaż nie dawała pewności realizacji rozmowy.
- Sprawdzenie lokalnego API na fikcyjnych danych potwierdziło zapis kanału `phone`; nie wykonywano prawdziwej płatności ani połączenia.
- `npm test` po poprawce: 162 zaliczone, 0 niezaliczonych, 13 pominiętych. `npm run build` zakończył się powodzeniem.
- Poprawka została wdrożona produkcyjnie na `https://regulskibehawiorysta.pl`. Odczytowa kontrola produkcji potwierdziła HTTP 200 dla `/zapytaj` i `/api/zapytaj/availability`, cenę 79 zł, 24 zwykłe terminy oraz status live `offline`. Kontrola desktop/mobile nie wykazała poziomego przepełnienia.
- To nie jest jeszcze dowód pełnego automatycznego telefonu: nie testowano prawdziwej płatności, harmonogramu wywołania Zadarmy, opóźnienia około 20 sekund ani retry po braku odpowiedzi. Te elementy pozostają osobnym krokiem kontrolowanego testu integracyjnego.

## Status po domknięciu Punktu 0, rekomendacji i katalogu PDF — 01.09.2026

Wdrożono i zweryfikowano kolejny etap przyjętego modelu:

- panel właściciela pokazuje pełny opis klienta przy sprawie, a po rozmowie pozwala zapisać tekst `Co robić dalej` oraz najwyżej jeden rekomendowany PDF;
- rekomendację można zapisać również po automatycznym zakończeniu rozmowy — nie zależy ona od tego, czy klient zdążył wcześniej wejść do panelu;
- klient widzi rekomendację w Pokoju i może przejść do zakupu wyłącznie wskazanego materiału; endpoint sprawdza sesję, własność rezerwacji, opłacenie i zakończenie rozmowy;
- aktywny katalog publiczny został ograniczony do 16 materiałów: 6 bezpłatnych oraz 10 płatnych po 19 zł; płatne PDF-y są informacyjne na stronie i nie mają otwartego zakupu przed rozmową;
- bezpośrednie zamówienie płatnego PDF-u i pakietów z publicznych ścieżek jest zablokowane; stare rekordy i identyfikatory pozostają tylko dla kompatybilności historycznej;
- strony materiałów pokazują podgląd i CTA `Najpierw Zapytaj`, a bezpłatne materiały zachowują prosty zakup i pobranie;
- strona konsultacji dostała ciepłe zdjęcie specjalisty oraz jasne wyjaśnienie, że pełny proces otwiera indywidualny kod po pierwszej rozmowie;
- naprawiono link odzyskiwania terminu w mailu — zawiera token dostępu, więc dodatkowy termin prowadzi do działającej ścieżki;
- zastosowano w Supabase migracje `20260901006_reconcile_booking_sms_columns.sql` oraz `20260901007_recommendation_material.sql`; schema-audit potwierdza zgodność schematu lokalnego i zdalnego;
- aktualny deploy produkcyjny Vercel `dpl_KfKzHbjbNNR7hV6bcsQMpKLoKNHs` ma status `READY` i jest przypięty do `https://regulskibehawiorysta.pl`.

Weryfikacja po wdrożeniu:

- `npm test` — 164 zaliczone, 0 niezaliczonych, 13 pominiętych;
- `npm run materialy-smoke` — 78 zaliczonych, 0 niezaliczonych;
- `npm run lint`, `npm run schema-audit`, `npm run build` oraz `git diff --check` — zaliczone; ostrzeżenia `git diff --check` dotyczą wyłącznie konwersji końców linii CRLF;
- produkcyjny smoke: `/`, `/zapytaj`, `/konsultacja`, `/materialy` i płatny detal PDF zwracają 200; `/cennik` przekierowuje 301 do `/zapytaj`;
- produkcyjny smoke zabezpieczeń: pełna konsultacja bez kodu zwraca 403, rekomendacja bez sesji 401, endpoint admina bez autoryzacji 401, cron Zadarmy bez autoryzacji 401;
- publiczne `/api/zapytaj/availability` działa, lecz live pozostaje celowo offline, ponieważ nie wykonano jeszcze kontrolowanego prawdziwego telefonu ani nie aktywowano automatycznej płatności dla trybu `Zapytaj teraz`.

Pozostałe ograniczenia, których nie należy uznawać za wdrożone:

- prawdziwa płatność, realne połączenie Zadarma, pomiar 20 sekund, automatyczne rozłączenie po 17 minutach i retry wymagają testu z realnym numerem oraz dostawcą;
- obecny model ręcznego BLIK-u nadal wymaga decyzji właściciela; nie został zastąpiony odczytem maili Revolut;
- Vercel podczas instalacji nadal zgłasza 32 podatności zależności (2 niskie, 17 średnich, 13 wysokich) i ostrzeżenia o przestarzałych pakietach; nie wykonywałem ryzykownej aktualizacji automatycznej;
- po aktualizacji oczekiwań do nowej narracji `npm run live-smoke -- --url https://regulskibehawiorysta.pl` przechodzi; nie obejmuje on jednak prawdziwej płatności ani telefonu.

## Status po wdrożeniu kampanii grupowej i końcowej kontroli rezerwacji — 01.09.2026

- Dodano osobną, nieindeksowaną stronę `/zapytaj/promocja` przeznaczoną do linku publikowanego w grupach; nie jest ona dodana do głównej nawigacji ani sitemap.
- W panelu właściciela można tworzyć osobne kampanie `Grupa FB — Zapytaj za 39,99 zł`; domyślnie jest 10 jednorazowych kodów z 14-dniowym terminem ważności. Zwykłe kody lecznic pozostają odrębną ścieżką.
- Kod grupowy działa wyłącznie przez stronę promocji, dla zwykłego terminu telefonicznego, za 39,99 zł; nie może uruchomić trybu live ani zostać użyty w dotychczasowej ścieżce bezpłatnej lecznicy.
- System blokuje drugie wykorzystanie kodu przez ten sam adres e-mail w aktywnej kampanii. Kod wraca do puli po wygaśnięciu nieopłaconej rezerwacji; obsłużono również odrzucenie i wygaśnięcie rezerwacji po stronie Supabase.
- Cena promocyjna jest ustawiana po stronie serwera i nie może zostać zmieniona przez pole formularza; zwykła cena 79 zł i live 104 zł nie zostały obniżone.
- Błąd nieprawidłowego kodu w publicznym API został poprawiony: klient otrzymuje 400 z jasnym komunikatem, a nie mylące 503.
- Zastosowano migrację `20260901008_community_promo_campaigns.sql`; `npm run schema-audit` potwierdza zgodność schematu lokalnego i migracji.
- Zaktualizowano produkcyjne zmienne Supabase z istniejącego `.env.production`, ponieważ Vercel miał puste wartości kluczowych ustawień. Deploy `dpl_ChmBpJZiFF5Vry7Af89re4kgsDVJ` ma status `READY` i jest przypięty do `https://regulskibehawiorysta.pl`.

Weryfikacja po wdrożeniu:

- `npm test` — 165 zaliczonych, 0 niezaliczonych, 13 pominiętych (178 testów);
- `npm run lint`, `npm run build`, `npm run schema-audit`, `npm run materialy-smoke`, `npm run commerce-smoke` — zaliczone;
- `npm run live-smoke -- --url https://regulskibehawiorysta.pl` — zaliczony;
- produkcyjne strony `/`, `/zapytaj`, `/zapytaj/promocja`, `/konsultacja`, `/terapia`, `/materialy` zwracają 200; `/cennik` przekierowuje 301 do `/zapytaj`;
- produkcyjny test fałszywego kodu zwraca 400, dostępność zwraca 200 z 24 terminami i live `offline`, a niezabezpieczony endpoint panelu zwraca 401;
- lokalny test pozytywny potwierdza rezerwację promocyjną za 39,99 zł, limit jednego kodu na e-mail i zwolnienie kodu po wygaśnięciu rezerwacji.

Ograniczenia pozostają bez zmian: nie wykonano prawdziwej płatności, telefonu Zadarma ani automatycznego live; kampania grupowa jest gotowa do wygenerowania w panelu, ale nie utworzono ani nie rozpowszechniono jeszcze konkretnej partii kodów. Ręczny BLIK nadal wymaga decyzji właściciela.

## Status po końcowej kontroli aktywnej oferty i publikacji — 02.09.2026

- Ujednolicono aktywne ekrany, metadane, dane strukturalne, FAQ, strony problemowe, quiz, komunikaty e-mail/SMS, materiały PDF i blog do aktualnego modelu: `Zapytaj behawiorystę` za 79 zł, `Zapytaj teraz` za 104 zł oraz `Pełna konsultacja` za 475 zł.
- Publicznie pokazujemy trzy ścieżki; dawne nazwy, identyfikatory usług i stare adresy pozostały wyłącznie tam, gdzie są potrzebne do kompatybilności technicznej lub historii danych.
- Zwykły termin ma blokadę 5 minut, rozmowa telefoniczna ma techniczny licznik 17 minut, a limit ręcznego potwierdzenia płatności pozostaje ustawiony na 24 godziny.
- `/book`, `/wybor`, `/form` i `/format-konsultacji` bez kontekstu lecznicy lub istniejącej rezerwacji prowadzą do `/zapytaj`; warunkowa ścieżka kodu lecznicy została zachowana. Linki blogowe i PDF kierują do aktualnej ścieżki.
- Blog pozostaje kanałem pomocniczym i SEO, a nie główną drogą sprzedaży. Jego renderowane treści, metadane i linki nie pokazują już dawnej oferty; końcowy skan produkcyjny bloga nie wykazał starych nazw, cen ani dostawcy płatności.
- Kampania grupowa pozostaje gotowa do uruchomienia z panelu: 10 kodów, 39,99 zł, 14 dni, jeden kod na osobę. Nie wygenerowano ani nie rozpowszechniono kodów bez decyzji właściciela.

Weryfikacja końcowa:

- `npm test` — 165 zaliczonych, 0 niezaliczonych, 13 pominiętych (178 testów);
- `npm run lint`, `npm run schema-audit`, `npm run materialy-smoke`, `npm run commerce-smoke`, `npm run build` — zaliczone; build wygenerował 93 strony;
- `npm run live-smoke -- --url https://regulskibehawiorysta.pl` — zaliczony;
- produkcja: strony publiczne, ścieżka promocji, konsultacja, terapia, blog, opinie, FAQ, dane prawne, strony problemowe i API dostępności zwracają oczekiwane odpowiedzi; dostępność pokazuje 24 zwykłe terminy, blokadę 5 minut i `live: offline`;
- fałszywy kod promocji zwraca 400, niezabezpieczone endpointy panelu i cron zwracają 401, a stare publiczne wejścia przekierowują do aktualnej ścieżki;
- najnowszy deploy Vercel `dpl_7YkUhwzf6PLdTKmnYX8AqBAxArnu` ma status `READY` i jest przypięty do `https://regulskibehawiorysta.pl`.

Świadomie niewykonane elementy: prawdziwa płatność, automatyczne potwierdzanie z maila Revolut, połączenie Zadarma, automatyczne rozłączenie po 17 minutach, retry po braku odpowiedzi i uruchomienie trybu live. Ręczny BLIK pozostaje aktualnym mechanizmem płatności, a dostępność live jest celowo wyłączona. Nie aktualizowano automatycznie zależności mimo ostrzeżeń Vercela o 32 podatnościach; nie wykonywano też działań zewnętrznych w Gumroad ani kampanii bez wygenerowanych kodów. Istniejące niezwiązane zmiany w katalogu projektu pozostawiono bez resetowania.
