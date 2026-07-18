# Mapa zachowania — etapowa wymiana ikon ImageGen

## Cel

Zastąpić obecny, zbyt mały sprite ośmiu symboli zestawem autorskich ikon
rastrowych z ImageGen. Każda odpowiedź typu wyboru ma otrzymać czytelny,
tematyczny znak zgodny z premium layoutem Mapy zachowania: ciemna oliwkowa
konturówka, kość słoniowa, subtelna terakota i botaniczny detal.

## Stan wyjściowy

- 32 pytania wyboru; 20 z nich wpada obecnie w domyślny znak `?`.
- 17 pytań tekstowych i jedna skala nie wymagają ikon odpowiedzi.
- Duże obrazy psa i kota zostają jako ogólny kontekst gatunku; nie udają
  ilustracji konkretnego pytania.

## Etapy

1. [ZROBIONE] Utworzono typowany katalog `lib/case-map-icons.ts` z nazwanymi
   ścieżkami i jawnymi przypisaniami — bez zmiany copy ani logiki Mapy.
2. [ZROBIONE] Wygenerowano i wdrożono fundament: pies, kot, szybka mapa,
   pełniejsza mapa, obserwacja, czas, bezpieczeństwo i brak pewności.
3. [ZROBIONE] Wygenerowano i wdrożono ikony tematów: spacer, samotność,
   zasoby, hałas, zmiana domu, kuweta, dotyk/pielęgnacja i konflikt kotów.
4. [ZROBIONE] Szybka Mapa korzysta z nowych ikon; numeryczne przypisania i
   sprite `answer-icons-v2.png` nie są już używane przez komponent.
5. [ZROBIONE] Pełniejsza Mapa ma jawne pokrycie mediów, dystansu, odpoczynku,
   dźwięku, reakcji, relacji, kuwet, ciała, zasobów i wzorca. `?` występuje
   wyłącznie dla realnej odpowiedzi „Nie wiem”.
6. [ZROBIONE LOKALNIE] Testy źródłowe, lint i produkcyjny build przeszły;
   osobne wdrożenie produkcyjne nie było uruchamiane w ramach tej zmiany.

## Wykonanie 2026-07-18

- 27 finalnych, transparentnych PNG `*-v1.png` w
  `public/images/mapa-zachowania/icons-v3/`; plansze ImageGen są poza
  katalogiem publicznym w raporcie odbiorowym.
- 32 publiczne pytania wyboru i 118 par pytanie–odpowiedź mają jawne
  przypisanie; test blokuje brak wpisu i użycie `unknown` poza odpowiedzią
  `unknown`.
- Lokalny render: desktop i telefon bez uszkodzonych obrazów; ujęcia są w
  `qa-reports/mapa-zachowania-icons-2026-07-18/`.
- `npm test` przeszedł: 152 testy zaliczone, 13 świadomie pominiętych;
  `npm run build` przeszedł po kontroli TypeScript i statycznym renderze 70 tras.
- Stare źródło sprite'a pozostaje na dysku wyłącznie jako łatwy rollback, ale
  nie jest referencjonowane w komponencie ani CSS.

## Kryteria odbioru

- `?` pojawia się wyłącznie przy odpowiedziach „Nie wiem” lub rzeczywiście
  nieokreślonych.
- Ikona kota nie zawiera psa; konflikt kotów pokazuje dwa koty.
- Hałas ma czytelny znak dźwięku, kuweta — kuwetę, a dotyk — dłoń/pielęgnację.
- Każdy plik ma wersjonowaną nazwę i jest generowany ImageGen; żaden istniejący
  asset nie jest nadpisywany przed oceną.
- Przypisania są testowane źródłowo, a układ pozostaje czytelny przy 39–44 px.
