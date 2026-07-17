# Mapa zachowania — plan wykonawczy

## Status i decyzje obowiązujące — 2026-07-15

To jest jeden produkt publiczny: **Mapa zachowania**. Nie jest agresywnym quizem ani drugim formularzem obok quizu — jest premium wejściem do zakupu konsultacji z gotowym briefem.

- Publiczna nazwa, nagłówki, CTA i raport mają używać wyłącznie określenia „Mapa zachowania”.
- Techniczny adres `/mapa-sprawy` zostaje na obecnym etapie, aby nie zerwać działających wejść; nie jest nazwą produktu widoczną dla użytkownika.
- `/quiz` nie istnieje jako publiczna trasa i ma zwracać 404.
- Nowe obrazy rastrowe dla produktu wolno tworzyć wyłącznie przez **najnowszy dostępny model ImageGen**. Nie używamy stocków, generatorów zastępczych ani obrazów AI z innych źródeł.

## Kierunek zastępujący obecną makietę — decyzja użytkownika, 2026-07-15

Obecna lokalna wersja **nie jest zatwierdzona wizualnie** i nie może zostać wdrożona produkcyjnie. Jest zbyt formularzowa, zbyt długa w jednym widoku i wizualnie zbyt bliska ręcznie rysowanej stronie WWW zamiast aplikacji premium.

### Krótka Mapa zachowania — nowy wzorzec

- Najpierw dopracowano krótką ścieżkę jako wzorzec; aktywna Pełniejsza mapa używa teraz tego samego języka scen, bez kopiowania starego formularza.
- To ma być doświadczenie aplikacyjne: **jedno pytanie = jedna pełna, estetyczna scena/strona**, z płynnym przejściem do kolejnej sceny.
- Nie budujemy długiego landingu ani pionowej ściany kart. Stałe elementy aplikacji to: dyskretny postęp, zdjęcie/ilustracja sytuacyjna, pojedyncza decyzja, przycisk dalej/wróć i wizualny stan postępu.
- Desktop ma wyglądać jak dopracowana aplikacja webowa, a mobile jak naturalny interfejs aplikacji; nie jako wąska karta osadzona w pustej stronie.
- Grafika, fotografie, tekstury i dekoracyjne stany produktu mają powstawać wyłącznie przez najnowszy dostępny ImageGen. Design ma korzystać z pełnoprawnych obrazów, a nie z samych obramowań CSS.

### Bezpieczeństwo i usługa

- Usuwamy z publicznej Mapy zachowania blok pytań o objawy zdrowotne, stany medyczne i weterynaryjne emergency. Nie jest to formularz emergency ani narzędzie do medycznego triage.
- Nie budujemy odcinającego „wyjścia bezpieczeństwa”, które zatrzymuje rozmowę lub sprzedaż usługi.
- Publiczna Mapa nie zapisuje automatycznie odpowiedzi „nie” na pytania o zdrowie lub bezpieczeństwo, bo ich nie zadaje. Zapis prywatny oznacza wyraźnie, że taki triage nie był wykonany.
- Jeżeli odpowiedź wskazuje na napięcie/ryzyko, wynik ma pokazać: krótkie podsumowanie odpowiedzi, prostą mądrą radę na teraz oraz czytelny wizualny stan (spokojny sukces albo terakotowe ostrzeżenie).
- W stanie ryzyka głównym CTA ma być dostępność **„Kwadransa na już”** w formularzu zakupu; zwykła konsultacja pozostaje opcją dodatkową.
- Szczegóły realnego zagrożenia będą doprecyzowane podczas rozmowy, a nie przez rozbudowany publiczny formularz.

## Etap konwersji: Mapa ma prowadzić do rozmowy — decyzja użytkownika, 2026-07-15

Mapa zachowania nie ma być bezpłatnym substytutem konsultacji ani agresywnym quizem sprzedażowym. Ma dać opiekunowi pierwszą, uczciwą wartość i równocześnie wyraźnie pokazać, że **interpretację oraz plan dla ich konkretnej sytuacji daje rozmowa**.

### Diagnoza obecnego wyniku

- Nagłówek „Masz już spokojny punkt wyjścia” komunikacyjnie zamyka sprawę, zanim pojawi się oferta.
- Gotowa rada i surowe podsumowanie pięciu pól dają wrażenie, że Mapa wystarcza bez specjalisty.
- Przycisk „Porozmawiajmy o tej sytuacji” nie mówi, co użytkownik kupuje, ile to trwa ani dlaczego Mapa zwiększa wartość rozmowy.
- „Zapisz”, „Wróć” i „Zacznij nową mapę” konkurują wizualnie z kupnem usługi.
- Wynik nie ma odrębnej, atrakcyjnej sceny sukcesu ani czytelnego przejścia: obserwacje → brief → rozmowa → pierwszy kierunek działania.

### Zasada komunikacji na każdym z 8 kroków

Każdy krok ma mieć po wybraniu odpowiedzi krótki, spersonalizowany moduł poniżej opcji — bez diagnozy, straszenia i bez dodatkowego formularza:

1. **„Co ta odpowiedź wnosi do Mapy”** — jedna konkretna obserwacja w prostym języku.
2. **„Co doprecyzujemy w rozmowie”** — jedno zdanie pokazujące granicę narzędzia oraz wartość specjalisty.
3. Stały, dyskretny status briefu: `Mapa do rozmowy · zebraliśmy 3 z 5 ważnych obserwacji`. Pod nim tylko obietnica zgodna z usługą: `W 15-minutowej rozmowie nie zaczynamy od zera.`

Treść ma być zależna od wybranej odpowiedzi. Przykładowo: częsta sytuacja → „Warto rozpoznać, co utrwala ten rytm; w rozmowie zawęzimy pierwszy punkt zmiany”; duży wpływ → „To może obciążać codzienność całego domu; dobierzemy najbliższy realny krok”; wybrany temat → „Znamy już obszar, dzięki czemu rozmowa nie zacznie się od szukania kategorii.”

Nie dodajemy natarczywego przycisku zakupu do każdego kroku. Każdy ekran konsekwentnie buduje jednak **materiał do rozmowy** i jasno komunikuje, po co jest następny płatny krok.

### Wybór zakresu przed Mapą

Pierwszym ekranem publicznej Mapy jest wybór, a nie gatunek ani pytanie o sytuację:

- **Szybka mapa** — krótka ścieżka prowadząca do uporządkowania jednego głównego tematu i do odpowiedniej usługi.
- **Pełniejsza mapa** — dłuższa ścieżka, gdy opiekun chce przekazać więcej kontekstu przed zakupem dłuższej konsultacji.

Obie opcje pozostają aktywne, opisują różnicę prostym językiem i zaczynają się dopiero po świadomym wyborze zakresu. Następne ekrany zachowują ten sam aplikacyjny układ oraz na końcu pokazują ofertę dopasowaną do wybranego zakresu.

### Dopasowanie oferty po ostatniej odpowiedzi

- `Bezpieczeństwo i uspokojenie sytuacji` lub bardzo duży wpływ → **Kwadrans na już**: formularz zakupu z gotowym briefem i priorytetowym wyborem najbliższego realnego terminu.
- Jedno główne pytanie, zrozumienie sygnałów lub pierwszy krok → **15-minutowa konsultacja behawioralna**: formularz zakupu oparty na gotowej Mapie.
- Cel „pełniejszy plan” albo kilka mocno splątanych wątków → oferta **Dwóch kwadransów** / pełniejszej konsultacji, z jasnym wyjaśnieniem, że potrzebuje więcej czasu na kontekst.

Każde **główne** CTA Mapy prowadzi do formularza zakupu/rezerwacji `/book` z właściwą usługą i gotowym briefem. Nie prowadzi do telefonu ani ręcznego zgłoszenia. Nazwy, format, długość, cena i dostępność mają być pobierane z obecnej konfiguracji rezerwacji, bez ręcznego kopiowania lub obietnic niezgodnych z usługą.

Wyjątek pomocniczy: obok ofert na końcu Mapy znajduje się mały, drugorzędny przycisk **„Nie wiesz, co wybrać? Kontakt”**. Prowadzi do `/kontakt` wyłącznie dla osoby, która nie umie wybrać usługi; nie zastępuje głównych CTA zakupu i nie pojawia się na wcześniejszych krokach.

### Nowy wynik — spokojny stan sukcesu

Zamiast „gotowej odpowiedzi” wynik ma otwierać dalszy krok:

- Nagłówek: **„Masz obraz sytuacji. W rozmowie zamienimy go w pierwszy plan dla Was.”**
- Trzy krótkie wnioski zamiast pięciu pól technicznych: `co już widać`, `czego sama Mapa nie rozstrzyga`, `co zrobimy podczas rozmowy`.
- Duża, kontrastowa zielona karta oferty: **„15-minutowa konsultacja z gotową Mapą”** z trzema konkretnymi korzyściami: rozmowa nie zaczyna się od zera, wspólna interpretacja sygnałów oraz pierwszy kierunek działania dla jednej sytuacji.
- Główne CTA: **„Przejdź do formularza zakupu · Konsultacja 15 min”**. Bezpośrednio pod nim: `W formularzu wybierzesz usługę z gotową Mapą jako punktem startu.`
- Pełna Mapa pozostaje prywatna; przy rezerwacji przekazywany jest krótki brief. Zapis i rozpoczęcie nowej Mapy trafiają pod ofertę jako działania drugorzędne.

Wizualnie: osobna, pełna scena sukcesu wygenerowana najnowszym ImageGenem — motyw `mapa → rozmowa → pierwszy plan`, z zielenią, spokojną roślinnością i widocznym, ale nienachalnym stanem ukończenia. Nie używamy już wyłącznie pieczęci na zdjęciu i listy danych.

### Nowy wynik — stan podwyższonego napięcia

- Nagłówek: **„Ta sytuacja zasługuje na rozmowę dziś.”**
- Jedna spokojna rada na teraz oraz jasne zdanie, że nie trzeba dalej zbierać odpowiedzi samodzielnie.
- Duża terakotowa karta: **„Kwadrans na już”**, z informacją o priorytecie najbliższego realnego terminu i wykorzystaniu gotowego briefu.
- Główne CTA: **„Przejdź do formularza zakupu · Kwadrans na już”**. Zwykła konsultacja pozostaje niżej jako spokojna alternatywa.
- Osobna, pełna grafika ImageGen: `sytuacja → zakup terminu → najbliższy krok`; bez symboliki medycznej, pseudo-triage i bez straszenia.

### Kolejność wdrożenia konwersji

- [x] Napisać bibliotekę mikro‑wniosków dla odpowiedzi krótkiej Mapy i dopasować ją do granic wiedzy/diagnozy.
- [x] Dodać moduł „co wnosi odpowiedź / co doprecyzujemy w rozmowie” oraz dyskretny status budowanego briefu do każdego kroku.
- [x] Uporządkować reguły dopasowania do 15 minut, Kwadransa na już i dłuższej rozmowy; wykorzystać wyłącznie istniejące usługi rezerwacji przez `/book`.
- [x] Wygenerować wyłącznie najnowszym ImageGenem osobne sceny końcowe: sukces i podwyższone napięcie.
- [x] Zastąpić obecny wynik dwiema pełnymi scenami ofertowymi; przenieść zapis/restart do drugiego poziomu ważności.
- [x] Dodać wybór „Szybka mapa / Pełniejsza mapa” jako pierwszy ekran oraz usunąć z obu publicznych ścieżek pytania zdrowotne i bezpieczeństwa.
- [x] Dodać prywatne zdarzenia analityczne dla: startu Mapy, ukończenia, wyświetlenia oferty, kliknięcia usługi i rozpoczęcia rezerwacji; bez odpowiedzi w URL lub danych wrażliwych.
- [x] Dopiero po ocenie użytkownika wykonać test rezerwacji z briefem oraz porównać: ukończenie Mapy → kliknięcie oferty → rozpoczęcie rezerwacji.

### Odrzucone — decyzja użytkownika, 2026-07-15

- Cały startowy ekran pytania o bezpieczeństwo/zagrożenie jest odrzucony. Dotyczy to w szczególności pytania „Czy w tej sytuacji czujesz zagrożenie?” oraz obu jego odpowiedzi.
- Nie wolno go tylko przeredagować, przesunąć dalej ani zastąpić kosmetycznie podobnym pytaniem.
- Kwalifikacja do „Kwadransa na już” wynika z celu „bezpieczeństwo i uspokojenie sytuacji” albo bardzo dużego wpływu na codzienność; to wybór potrzebnej rozmowy, nie ukryte pytanie o zagrożenie.

### Nowy wiążący wzorzec wizualny — decyzja użytkownika, 2026-07-15

Referencja: `C:\Users\chris\Downloads\ChatGPT Image 15 lip 2026, 15_22_44.png`.

- To jest wzorzec **całego krótkiego formularza**, nie tylko jednego ekranu. Każdy krok krótkiej Mapy ma używać tej samej kompozycji aplikacyjnej.
- Desktop: duże, centralne okno aplikacji na spokojnym tle; cienka górna belka marki; po lewej marka, po prawej trzy lekkie akcje; potem dyskretny separator.
- Nad sceną: powrót + „Szybka mapa” po lewej oraz licznik `n / 8` i osiem krótkich segmentów postępu po prawej.
- Główna scena ma dwie równe, zintegrowane części: po lewej duże, ciepłe zdjęcie sytuacyjne zwierzęcia; po prawej jasny panel pytania. Nie wolno wrócić do układu małej karty na pustej stronie ani do pionowej ściany formularza.
- Pytanie ma dużą, elegancką typografię szeryfową z jednym spokojnym akcentem zieleni. Przy nagłówku ma być delikatny motyw roślinny, zgodny z referencją.
- Odpowiedzi są pełnej szerokości, w jednej spokojnej kolumnie: wygenerowana ikonka po lewej, wyraźny tekst, strzałka po prawej, miękka biała karta i bardzo oszczędny cień. Nie stosujemy emoji, przypadkowych ikon Lucide ani ręcznie rysowanych ozdobników jako substytutu tych elementów.
- W panelu zdjęcia: mały stan/pigułka u góry, podpis gatunku oraz duże hasło przy dolnej krawędzi, wraz z drobnymi roślinnymi detalami.
- Dół sceny: „Wróć” po lewej i główne CTA po prawej. Ma wyglądać jak pełna scena aplikacji, bez konieczności przewijania desktopu.
- Pierwszy ekran nie może być pytaniem o bezpieczeństwo/zagrożenie — wcześniejsze odrzucenie pozostaje w mocy.

### Dodatkowa referencja etapu — 2026-07-15

Przekazany zrzut bieżącej sceny ma służyć jako kontrola kierunku przebudowy, nie jako docelowy wygląd. Wprowadza trzy dodatkowe wymagania do tej samej referencji aplikacyjnej:

- desktopowy panel nie może wyglądać na pomniejszony formularz w środku pustego ekranu; kompozycja, nagłówek, zdjęcie i odpowiedzi mają mieć wyraźnie większą, spokojniejszą skalę;
- lista tematów oraz wszystkie kolejne pytania pozostają w jednej pionowej kolumnie pełnej szerokości, z jednym generowanym znakiem po lewej i kierunkiem po prawej — bez siatki małych kafelków;
- ilustracja ma mieć tę samą wagę wizualną co panel odpowiedzi, a elementy dekoracyjne oraz ikony nie mogą pochodzić z przypadkowej biblioteki ikon.

Użytkownik zatwierdził rozpoczęcie wykonania krótkiej ścieżki bez czekania na osobną makietę PNG. Po jej zapisaniu nie wykonujemy samodzielnego testu wizualnego; lokalny adres przekazujemy od razu do oceny użytkownika.

### Obrazy i ikony najnowszego ImageGen — wymagane przed wdrożeniem

- Wygenerować przez najnowszy dostępny ImageGen co najmniej: scenę psa, scenę kota oraz zestaw dyskretnych roślinnych detali. Wszystkie materiały muszą być autorskie i zapisane w projekcie jako nowe, wersjonowane pliki.
- Nie zastępować brakujących grafik CSS-em, emoji, stockiem ani innym modelem.
- Najpierw wygenerować i ocenić wyłącznie assety, następnie wdrożyć krótki formularz na ich podstawie.
- Po wdrożeniu krótkiego formularza **nie wykonywać własnego testu wizualnego ani smoke testu**; od razu poinformować użytkownika i oddać lokalny adres do jego szybkiej oceny.

### Artefakt referencyjny

- Referencja PNG docelowego layoutu krótkiej Mapy została przekazana przez użytkownika i jest obowiązującym wzorcem dla obu zakresów.
- Pokazuje pojedynczy ekran pytania w aplikacyjnym flow: postęp, duże odpowiedzi, obraz sytuacyjny oraz stan wyniku/ostrzeżenia.
- Dalsza ocena odbywa się już na działającej wersji lokalnej, bez własnego testu wizualnego po stronie wdrożenia.

## Korekta języka publicznego — decyzja użytkownika, 2026-07-16

- Widoczny dla klienta slogan „Jedna decyzja na ekran” jest błędem krytycznym: opisuje założenie interfejsu, a nie pomaga opiekunowi. Ma zostać usunięty z każdej sceny.
- Żaden ekran publiczny nie może używać języka zespołu projektowego lub technicznego, w tym: `flow`, `brief`, „Mapa gotowa do zakupu”, schematów typu `mapa → zakup → plan` ani opisów mechaniki formularza.
- Copy ma mówić prostym językiem do opiekuna: co zauważył, co Mapa już porządkuje i jaki krok może wybrać dalej. Sprzedaż pozostaje wyraźna przez usługę i wybór terminu, nie przez techniczne nazwy procesu.
- [x] Przejrzeć wszystkie sceny krótkiej i Pełniejszej Mapy oraz usunąć pozostały język projektowy z tekstów widocznych dla klienta. W szczególności usunięto „Jedna decyzja na ekran”, „brief”, „Mapa gotowa do zakupu” i schematy procesu zakupu.

### Wartość odpowiedzi i prywatny profil — decyzja użytkownika, 2026-07-16

- Status odpowiedzi nie może nazywać ich materiałem do sprzedaży ani technicznym „briefem”. Ma krótko wyjaśniać korzyść: dzięki nim konsultacja zaczyna się od konkretnej sytuacji, a nie od opowiadania wszystkiego od początku.
- Bieżący, prawdziwy komunikat przy wyborze terminu: klient podaje e-mail, a najważniejsze odpowiedzi zostają dołączone do jego rezerwacji, aby konsultacja zaczęła się od konkretnej sytuacji. Pełną Mapę może dobrowolnie zapisać w Pokoju po zalogowaniu; sama rezerwacja jej tam nie zapisuje.
- Docelowy wymóg produktu: po podaniu e-maila przy rezerwacji Mapa ma zostać połączona także z prywatnym profilem klienta. Wymaga to osobnego, świadomego modelu zgody i technicznego powiązania konta, a nie samego tekstu w interfejsie.
- Każde podobne pole w krótkiej i Pełniejszej Mapie ma odpowiadać na pytanie „co mam z tego jako opiekun?”, a nie wyjaśniać wewnętrzny mechanizm aplikacji.
- [x] Wdrożyć dobrowolne powiązanie Mapy z prywatnym profilem po podaniu e-maila przy rezerwacji; do tego czasu nie obiecywać automatycznego zapisu Mapy w Pokoju.

## Co ma powstać

Mapa zachowania ma być spokojnym, premium i użytecznym wejściem w pomoc behawioralną:

`wybór zakresu → jedna scena pytania na raz → krótki wizualny wynik → Kwadrans na już lub dalsza konsultacja → prywatny materiał do rozmowy`

Jednocześnie ma działać jako:

1. zrozumiałe doświadczenie dla opiekuna;
2. rzeczywisty materiał przygotowujący Krzysztofa do rozmowy;
3. prywatna, dobrowolnie zapisana historia w Pokoju;
4. źródło minimalnego briefu dla rezerwacji, bez przekazywania pełnego wywiadu bez zgody.

## Wzorzec wizualny i UX

Referencjami są dostarczone przez użytkownika wizualizacje mobilne:

- wejście ma być sceną i decyzją, nie małą kartą pośrodku ogromnego pustego desktopu;
- duże, realne zdjęcie sytuacyjne zwierzęcia prowadzi otwarcie;
- warianty „Szybka mapa” oraz „Pełniejsza mapa” są pełnowymiarowymi, czytelnymi kartami decyzji;
- wywiad wygląda jak mapa/case file: widoczny postęp, grupy pytań, spokojna hierarchia i duże kontrolki;
- desktop wykorzystuje szerokość ekranu, a mobile naturalnie zajmuje viewport — nie renderujemy dosłownej ramki telefonu;
- paleta: kość słoniowa, ciemna zieleń, stonowana terakota, prawdziwa fotografia, delikatna faktura;
- nie używamy wypłowiałych tapet po bokach, mikroskopijnego tekstu, sztucznej gamifikacji, orbit ani pustej przestrzeni bez funkcji.

## Zasady flow

### 1. Lekki start

- Na początku użytkownik widzi, co może wybrać: szybką mapę albo pełniejszą mapę.
- Wybór zakresu nie może zostać schowany za długim blokiem pytań.
- Mapa nie pyta o zdrowie, weterynarię ani bieżące zagrożenie; nie udaje emergency ani ukrytego triage.

### 2. Rytm aplikacji

- Krótka ścieżka ma jedno pytanie na pełnej scenie, a nie zgrupowaną ścianę pól.
- Kontrolki są duże, zrozumiałe i działają bez czytania długich instrukcji.
- Postęp ma objaśniać, gdzie użytkownik jest, bez zmieniania ekranu w landing page.

### 3. Ryzyko i rozmowa

- Nie pytamy w Mapie o medyczne lub weterynaryjne emergency.
- Przy podwyższonym ryzyku pokazujemy krótkie podsumowanie, wizualne ostrzeżenie i poradę na teraz.
- Głównym kolejnym krokiem przy ryzyku jest „Kwadrans na już”; rozmowa ma być dostępna, nie ukryta.

### 4. Prywatność i materiał dla specjalisty

- Odpowiedzi nie trafiają do URL.
- Zapis sprawy oraz marketing pozostają odrębnymi zgodami; marketing jest domyślnie wyłączony.
- Pełna Mapa trafia do Krzysztofa wyłącznie po świadomym przekazaniu jej do przygotowania wybranej konsultacji.
- Rezerwacja otrzymuje wyłącznie zwięzły brief, a pełna Mapa pozostaje prywatna.

## Zakres wdrożenia krok po kroku

- [x] Zapisać decyzje, referencje i kryteria akceptacji w tym planie.
- [x] Zmienić publiczne nazewnictwo z „Mapa sprawy” na „Mapa zachowania” oraz usunąć stare publiczne teksty.
- [x] Przygotować zestaw nowych, projektowych obrazów ImageGen: wejście psa, wejście kota oraz dyskretne obrazy sekcji.
- [x] Zbudować osobny, responsywny shell Mapy zachowania zamiast odziedziczonego układu strony.
- [x] Przeprojektować wejście: duże zdjęcie, dwa warianty zakresu, przejrzysta orientacja.
- [x] Przeprojektować wywiad w grupy pytań, z widoczną mapą postępu i bez nadmiernego przeklikiwania.
- [x] Usunąć z publicznej Mapy ścieżki bezpieczeństwa/zdrowia i zastąpić je kwalifikacją do właściwej usługi rozmowy.
- [x] Zachować oraz ponownie zweryfikować zapis, wznowienie, prywatność, brief rezerwacji i panel specjalisty.
- [x] Przygotować i zatwierdzić referencję aplikacyjnego layoutu krótkiej Mapy zachowania.
- [x] Wygenerować wymagane nowe assety wyłącznie przez najnowszy dostępny ImageGen: pies, kot, ornament roślinny i zestaw ikon odpowiedzi.
- [x] Zastąpić niezatwierdzony lokalny flow krótką ścieżką zgodną z nową referencją: jedna scena na pytanie, bez pytania startowego o bezpieczeństwo, z nowymi assetami najnowszego ImageGen. Oczekuje wyłącznie na ocenę użytkownika, bez własnego testu wizualnego.
- [x] Przenieść ten sam aplikacyjny wzorzec do aktywnej Pełniejszej mapy, bez pytań zdrowotnych i safety-triage.
- [x] Wykonać produkcyjny build, deploy i smoke test dopiero po akceptacji wizualnej oraz funkcjonalnej.

## Kontrola wdrożenia lokalnego — 2026-07-15

- Poprzednia kontrola triage jest historyczna i nie opisuje już publicznego flow; pytania czerwonej flagi i zdrowia zostały z niego usunięte.
- Bieżąca wersja zachowuje rozdział danych: do `/book` trafia krótki brief, a pełna Mapa pozostaje prywatna.
- Po ostatniej zmianie użytkownik prosił, aby nie wykonywać samodzielnego testu wizualnego ani smoke testu. Lokalna ocena należy do użytkownika.
- Produkcyjny deploy celowo czeka na ocenę wyglądu i funkcji pod lokalnym adresem, aby nie wdrażać kolejnej iteracji bez akceptacji.

## Kryteria akceptacji

1. Użytkownik widzi „Mapa zachowania”, a nie „Mapa sprawy” ani „Quiz”.
2. Pierwszy ekran i wybór zakresu są czytelne zarówno na telefonie, jak i desktopie; nie ma wąskiej karty zagubionej w pustej przestrzeni.
3. Obrazy są spójne z referencjami i zostały utworzone wyłącznie przez ImageGen.
4. Formularz daje poczucie prowadzenia przez sprawę, a nie serii małych ekranów do odklikania.
5. Mapa nie udaje formularza medycznego ani safety-triage; wybór potrzeby szybszej rozmowy lub bardzo duży wpływ prowadzi do „Kwadransa na już” w `/book`.
6. Zapisane dane, zgody, prywatność i przekazanie materiału do konsultacji działają jak przed przebudową.
7. `/quiz` nadal zwraca 404, a Mapa zachowania jest jedyną publiczną ścieżką tego produktu.
