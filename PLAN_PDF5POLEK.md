# PLAN PDF5POLEK

Data rozpoczęcia: 2026-07-22  
Repozytorium: `C:\projekt\regulskibehawiorysta`

> Nazwa pliku pozostaje zgodna z ustaleniem roboczym `pdf5polek`. Docelowy system ma cztery półki: bezpłatną, 19 zł, 39 zł i 59 zł.

## Cel

Zbudować jeden rozpoznawalny system PDF marki Regulski Behawiorysta, w którym wszystkie materiały mają wspólny standard jakości, a rosnąca cena jest widoczna przez większą głębię, bogatszą strukturę, więcej narzędzi roboczych i ilustracji — nie przez celowe pogarszanie tańszych materiałów.

Najpierw powstaje kompletny system czterech półek i demonstratory do kontroli. Dopiero po jego akceptacji półki są uzupełniane kolejno pełnymi seriami po 10 PDF-ów: 5 psich i 5 kocich.

## Zasady stałe

- Jeden brand: Regulski Behawiorysta.
- Wspólna typografia, siatka, stopka, numeracja stron, disclaimer i końcowe CTA.
- Lekka, rysunkowa konwencja ilustracji, przyjazna wizualnie dla eksperckiej treści.
- Każda półka ma własny kolor, rytm i stopień rozbudowania.
- Tematy pełnych serii są wybierane na podstawie aktualnych trendów oraz roli w lejku.
- Plansze i ilustracje finalne powstają po zamknięciu treści, ale ich miejsca i typy są projektowane od początku.
- Głównym narzędziem do nowych ilustracji rastrowych jest najnowszy dostępny ImageGen.
- Pakiety zbiorcze powstają dopiero z zaakceptowanych PDF-ów.
- Postęp podczas długiej realizacji jest raportowany bez przerywania pracy, nie rzadziej niż co 20 minut.

## Cztery półki

| Półka | Rola | Docelowa objętość | Charakter |
| --- | --- | ---: | --- |
| Bezpłatna | bezpieczny start i segmentacja potrzeby | zwykle 4–8 stron | najlżejsza, bardzo czytelna, dużo oddechu |
| 19 zł | krótki poradnik jednego problemu | zwykle 8–14 stron | praktyczna instrukcja, checklisty, 2–3 ilustracje |
| 39 zł | pełny plan działania | zwykle 18–30 stron | rozdziały, diagramy, plan 7/14 dni, arkusze |
| 59 zł | kompendium premium | około 40–50 stron | rozbudowana nawigacja, przypadki, drzewa decyzji, plansze i narzędzia robocze |

## Kolejność wykonania

### Etap 1 — audyt i zabezpieczenie punktu startowego

- [x] Zidentyfikować istniejący generator, katalog, szablon i folder `do-przegladu`.
- [x] Potwierdzić, że repo ma niezależne niezacommitowane zmiany i nie wolno ich nadpisywać.
- [x] Zapisać niniejszy plan jako trwałe źródło kolejności prac.

### Etap 2 — wspólny system marki

- [x] Zdefiniować wspólne tokeny typografii, marginesów, stopki, numeracji i bezpieczeństwa.
- [x] Zdefiniować cztery palety oraz zasady wzrostu jakości między półkami.
- [x] Zdefiniować typy stron: tekst, otwarcie rozdziału, checklista, tabela, proces, drzewo decyzji, plan 7/14 dni, karta obserwacji i zakończenie.
- [x] Zdefiniować wspólną rysunkową konwencję ilustracji i zakazy stylistyczne.
- [x] Zdefiniować architekturę długiego PDF-u 59 zł: moduły, spis treści, rozdziały, ćwiczenia, załączniki i rytm stron dla około 40–50 stron.
- [x] Traktować objętość jako wynik zakresu i użyteczności: nie dopisywać sztucznego tekstu tylko po to, aby osiągnąć minimum półki.
- [x] Użyć oficjalnego znaku graficznego Regulski Behawiorysta w okładce, nagłówkach i stopce; nazwy techniczne systemu pozostają wyłącznie w dokumentacji roboczej.
- [x] Ustalić stopkę klientowską: logo, nazwa marki, typ materiału, numeracja oraz krótka informacja o granicach treści.

### Etap 3 — cztery demonstratory systemu

- [x] Rozszerzyć generator o cztery jawne warianty półek.
- [x] Przygotować po jednym demonstratorze każdej półki.
- [x] Każdy demonstrator ma pokazać: okładkę, stronę ekspercką, blok narzędziowy, miejsce na planszę i zakończenie.
- [x] Przygotować jedną planszę porównawczą czterech okładek.

### Etap 4 — ilustracje wzorcowe ImageGen

- [x] Wygenerować spójne ilustracje kot/pies dla każdej półki najnowszym dostępnym ImageGen.
- [x] Zachować ten sam język kreski i różnicować bogactwo kompozycji wraz z półką.
- [x] Umieścić wybrane finalne pliki w repo i zapisać użyte prompty.
- [x] Podłączyć ilustracje do demonstratorów bez osadzania tekstu w bitmapach.

### Etap 5 — pakiet kontrolny i QA

- [x] Wygenerować cztery demonstracyjne PDF-y i arkusz porównawczy.
- [x] Sprawdzić PDF-y przez `qpdf`, `pdfinfo`, `pdftotext` i render stron do PNG.
- [x] Sprawdzić brak pustych stron, przepełnień, błędów polskich znaków i niespójnych stopek.
- [x] Wykonać wizualną kontrolę okładek i reprezentatywnych stron.
- [x] Przekazać komplet użytkownikowi do akceptacji.

### Bramka przejścia po systemie — ETAP TEMATÓW OTWARTY

System czterech półek i demonstratory są gotowe do kontroli. Po poleceniu „wznów” rozpoczęto analizę tematów półki bezpłatnej. Nie rozpoczynać pisania pełnych treści ani produkcji 40 PDF-ów przed wspólnym zatwierdzeniem tematów; uwagi do demonstratorów można nadal nanieść przed składem serii.

### Etap 6 — półka bezpłatna

- [x] Zbadać aktualne trendy, sezonowość, istniejący katalog i luki tematyczne.
- [x] Przygotować roboczą shortlistę 5 tematów psich oraz 5 kocich.
- [x] Wspólnie zatwierdzić tytuły, zakresy i role tematów w lejku — zatwierdzone 2026-07-22.
- [x] Zbudować architekturę źródeł i konspekt dla każdego zaakceptowanego tematu.
- [x] Wykonać 10 kompletnych PDF-ów wraz z ilustracjami i QA.
- [x] Przekazać całą półkę do akceptacji.
- [x] Po uwadze z kontroli usunąć z PDF-ów techniczną nazwę `PDF5POLEK`, podłączyć oficjalne logo i poprawić stopkę; ponownie złożyć wszystkie 10 plików.
- [x] Po drugiej kontroli usunąć efekt „półpustych stron”: połączyć zbyt krótkie sekcje, zachować semantyczne nagłówki i wykorzystać ilustrację tematyczną na krótszych zakończeniach bez dopisywania sztucznej treści.
- [x] Półka bezpłatna zaakceptowana przez użytkownika 2026-07-22.

#### Zatwierdzona lista tematów

Każdy bezpłatny PDF ma mieć zwykle 4–8 stron i dawać bezpieczny pierwszy krok, nie udawać kompletnej terapii problemu. Tematy łączą aktualny sezon z tematami całorocznymi, aby półka nie zestarzała się po wakacjach.

**Pies — 5 propozycji**

| # | Roboczy tytuł | Typ | Rola w lejku |
| ---: | --- | --- | --- |
| 1 | Pies w upał: mniej ruchu, więcej bezpieczeństwa | nowy, sezonowy | szybki plan spaceru, odpoczynku i sygnałów alarmowych; dalszy krok do materiału o ruchu lub konsultacji weterynaryjnej |
| 2 | Burza i nagły hałas: plan pierwszej pomocy dla psa | gruntowna przebudowa istniejącego szkicu | zabezpieczenie psa w kryzysie; przejście do poradnika o lęku dźwiękowym lub konsultacji |
| 3 | Wakacyjna opieka nad psem: instrukcja przekazania psa | gruntowna przebudowa istniejącego szkicu | checklista dla opiekuna zastępczego; przejście do materiałów o samotności, napięciu i zmianie rytmu |
| 4 | Powrót do rutyny po urlopie: 7 dni przed pierwszym długim wyjściem | gruntowna przebudowa istniejącego szkicu | wczesne rozpoznanie problemu separacyjnego; przejście do pełnego planu zostawania samemu |
| 5 | Pies warczał lub ugryzł: co zrobić przez pierwsze 24 godziny | nowy, całoroczny | bezpieczeństwo, obserwacja i triage bez internetowej „terapii”; bezpośrednie przejście do pilnej konsultacji |

**Kot — 5 propozycji**

| # | Roboczy tytuł | Typ | Rola w lejku |
| ---: | --- | --- | --- |
| 1 | Kot w upał: bezpieczny dom, woda i odpoczynek | nowy, sezonowy | profilaktyka przegrzania i lista sygnałów alarmowych; rozdzielenie problemu medycznego od zachowania |
| 2 | Kot zostaje w domu podczas urlopu: instrukcja dla opiekuna | nowy na bazie ogólnego szkicu wakacyjnego | ograniczenie stresu przy zmianie opiekuna; przejście do materiałów o napięciu i środowisku |
| 3 | Transporter bez paniki: spokojne przygotowanie kota do podróży i weterynarza | nowy, sezonowy i całoroczny | krótki plan oswajania; przejście do materiałów o dotyku, pielęgnacji i obronie |
| 4 | Kot po zmianie w domu: adaptacja czy sygnał alarmowy? | nowy, całoroczny | filtr pierwszej decyzji po przeprowadzce, remoncie lub zmianie domowników; przejście do poradnika „Kot chowa się po zmianach” albo konsultacji |
| 5 | Kot drapie meble: mapa potrzeby i trzy poprawki środowiska | nowy, całoroczny | szybka diagnoza funkcji drapania; przejście do pełniejszego materiału o środowisku kota |

#### Podstawa shortlisty

- aktualny lipcowy sezon: upały, burze, wakacyjne wyjazdy, transport i zmiana opiekuna;
- lokalny radar sezonowy serwisu: burze i nagły hałas, wakacyjna opieka, powrót do rutyny oraz adopcja jesienią;
- luki względem istniejącego katalogu i materiały robocze, które warto przebudować zamiast dublować;
- aktualne raporty i wytyczne organizacji weterynaryjnych oraz dobrostanowych dotyczące transportu, stresu, wizyt weterynaryjnych, środowiska i problemów behawioralnych;
- lokalne zdarzenia lejka potraktowane wyłącznie jako słaby sygnał kierunkowy, ponieważ próbka jest mała i zawiera serie powtarzanych zdarzeń.

## Standard researchu i pisania treści

Każdy PDF przechodzi osobny etap redakcyjny przed składem:

1. Zdefiniowanie problemu, odbiorcy, obietnicy, granic bezpieczeństwa i roli w lejku.
2. Research kilku aktualnych, obcojęzycznych i polskojęzycznych źródeł, ze szczególnym priorytetem dla publikacji pierwotnych, wytycznych i materiałów instytucjonalnych.
3. Tłumaczenie robocze wybranych fragmentów wyłącznie do zrozumienia materiału.
4. Autorska polska synteza: własna kolejność, język, przykłady, scenariusze, checklisty i decyzje „co dalej?”.
5. Weryfikacja faktów, dat, terminologii, bezpieczeństwa weterynaryjnego i zgodności z ofertą Regulski.
6. Redakcja stylistyczna pod naturalny, spokojny język ekspercki: bez kalk językowych, szablonowych nagłówków, powtórzeń, sztucznego podsumowywania i innych cech mechanicznego tekstu.
7. Bibliografia i dziennik źródeł w dokumentacji roboczej; tekst końcowy pozostaje oryginalną syntezą, a nie tłumaczeniem jednego artykułu.
8. Dopiero po akceptacji treści powstają finalne plansze, ilustracje i ozdobniki dopasowane do rzeczywistego układu stron.

Nie używamy jednego artykułu jako ukrytego zamiennika całego PDF-u. Tłumaczenie może wspierać research, ale finalny materiał musi mieć własną strukturę, własne przykłady i jawnie kontrolowane źródła.

### Etap 7 — półka 19 zł

- [x] Zamknąć bramkę poprzedniej półki po akceptacji użytkownika.
- [x] Wygenerować w najnowszej dostępnej ścieżce ImageGen dedykowaną ilustrację półki 19 zł i zapisać prompt.
- [x] Zbudować 8-stronicowy layout kontrolny wyraźnie odmienny od półki bezpłatnej: organiczne plamy gwaszu, papierowe pola, otwarcie modułu, mapa, ścieżka planu, checklisty, arkusz i wizualne zakończenie; kierunek dopieszczony po kontroli „Publisher”.
- [ ] Uzyskać akceptację layoutu półki 19 zł.
- [ ] Po akceptacji layoutu wspólnie wybrać 5 tematów psich i 5 kocich.
- [ ] Wykonać 10 kompletnych PDF-ów wraz z ilustracjami i QA.
- [ ] Przekazać całą półkę do akceptacji.

### Etap 8 — półka 39 zł

- [ ] Po akceptacji poprzedniej półki wybrać 5 tematów psich i 5 kocich.
- [ ] Wykonać 10 kompletnych PDF-ów wraz z ilustracjami i QA.
- [ ] Przekazać całą półkę do akceptacji.

### Etap 9 — półka 59 zł

- [ ] Po akceptacji poprzedniej półki wybrać 5 tematów psich i 5 kocich.
- [ ] Wykonać 10 kompletnych PDF-ów wraz z ilustracjami i QA.
- [ ] Przekazać całą półkę do akceptacji.

### Etap 10 — pakiety i integracja lejka

- [ ] Zbudować pakiety wyłącznie z zaakceptowanych materiałów.
- [ ] Dopasować strony produktu, CTA, pobieranie i routing „Co dalej?”.
- [ ] Wykonać końcowe QA katalogu, zamówień, pobierania i komunikacji e-mail.

## Aktualny etap

W toku: **bramka akceptacji layoutu półki 19 zł**. Półka bezpłatna została zaakceptowana. Po uwadze, że pierwsza wersja wyglądała zbyt „Publisherowo”, kierunek został przebudowany na bazie nowej planszy ImageGen: organiczne plamy, nieregularne papierowe moduły, ścieżka decyzji, rysunkowe marginesy i ilustracja wtopiona w kompozycję. Demonstrator ma 8 stron, przeszedł `qpdf --check`, ma kompletne stopki i nie zawiera technicznej nazwy systemu. Nie wybierać tematów ani nie produkować 10 materiałów przed akceptacją layoutu.
