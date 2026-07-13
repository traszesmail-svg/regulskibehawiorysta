# quiznew — mapa pierwszego kroku z Instagrama

Status: wdrożone lokalnie i zweryfikowane w buildzie produkcyjnym  
Właściciel: Regulski Behawiorysta  
Zakres: `/quiz`, wejścia z Instagrama, przekazanie kontekstu do rezerwacji i testy.  
Poza zakresem: przebudowa całego cennika, email gate przed wynikiem oraz automatyczna diagnoza AI.

## Cel

Zastąpić obecny selektor usługi narzędziem **„Mapa pierwszego kroku”**: krótką, uczciwą ścieżką dla osoby z IG, która najpierw rozpoznaje bezpieczeństwo i temat, daje użyteczny mikro-plan, a dopiero potem dyskretnie proponuje odpowiednią formę rozmowy.

## Zasady niepodlegające negocjacji

1. Ryzyko urazu, nagła zmiana, ból i objawy zdrowotne są twardymi bramkami bezpieczeństwa, nie punktami do droższej usługi.
2. Pytanie pojawia się wyłącznie wtedy, gdy dotyczy wybranego problemu; każda ścieżka ma możliwość „nie dotyczy”.
3. Wynik najpierw daje: „co zrobić dziś”, „czego nie dokładać”, „co obserwować”. Cena i rezerwacja są następnym krokiem.
4. AI może w przyszłości streszczać opis opiekuna, ale nie decyduje o pilności, diagnozie ani cenie. W tej wersji reguły są jawne i testowalne.
5. Odpowiedzi nie są przekazywane w adresie URL. Zapis/transfer do rezerwacji musi być świadomy, strukturalny i minimalny.

## Kolejność wdrożenia

### 0. Kontrakt i inwentaryzacja — ukończone

- [x] Potwierdzić, że IG prowadzi do `/quiz`, a nie do trzy-pytaniowego selektora homepage.
- [x] Udokumentować błędy obecnej punktacji, pytań wymuszonych, pozorowanej analizy oraz utraty kontekstu w bookingu.
- [x] Ustalić docelowy produkt i granice odpowiedzialności.

### 1. Silnik decyzji i model ścieżek — ukończone

- [x] Wprowadzić jeden model tematu, bramek bezpieczeństwa, pytań i wyniku dla psa oraz kota.
- [x] Rozdzielić wyniki: `pilnie bezpieczeństwo`, `najpierw weterynarz`, `zabezpiecz i obserwuj`, `krótka rozmowa`, `pełniejszy wywiad`.
- [x] Usunąć punktowanie preferencji użytkownika jako wskaźnika zakresu konsultacji.
- [x] Zaprojektować pytania kontekstowe dla: spacerów/reaktywności, samotności, zasobów, kuwety, kontaktu z kotem, konfliktu kotów, hałasu i zmiany nagłej.
- [x] Zablokować rekomendację usługi przy niepełnej ścieżce, błędnym temacie lub wariancie linku IG.

### 2. Przebudowa `/quiz` i warstwa wizualna — ukończone

- [x] Zmienić nazwę i wejście na „Mapa pierwszego kroku”.
- [x] Zbudować krótką ścieżkę: temat → bramka bezpieczeństwa → 3–4 pytania właściwe dla tematu → wynik.
- [x] Pokazać przejrzyste uzasadnienie wyniku i edycję odpowiedzi.
- [x] Usunąć animację sugerującą nieistniejącą analizę AI.
- [x] Dodać autorską kompozycję z istniejącą ilustracją zwierząt, delikatnym ruchem i wariantem `prefers-reduced-motion`.
- [x] Zrobić przegląd renderu desktop/mobile po buildzie.
- [x] Nie dodawać automatycznej muzyki; ewentualny dźwięk musi być osobno włączany przez użytkownika i pochodzić z licencjonowanego źródła.

### 3. IG, booking i prywatność — ukończone

- [x] Zachować UTM i temat z linków IG przez cały flow.
- [x] Przekazywać gatunek, temat i zwięzły, użyteczny brief do rezerwacji bez surowych odpowiedzi w URL.
- [x] Zapewnić, że ścieżka kota nie trafia do domyślnego problemu psa/szczeniaka.

### 4. Testy i weryfikacja — ukończone

- [x] Dodać test-matrycę dla czerwonych flag, wszystkich tematów i zmiany wcześniejszej odpowiedzi.
- [x] Zweryfikować dostępność, desktop i mobile oraz brak wycieku danych do URL.
- [x] Uruchomić testy, lint, build i docelowy smoke flow.

## Kryterium zakończenia

Osoba wchodząca z IG otrzymuje w mniej niż 2 minuty trafny, bezpieczny pierwszy krok, wie dlaczego go dostała, może przejść do właściwej rezerwacji z zachowanym kontekstem, a system nie udaje diagnozy ani AI, których nie wykonuje.
