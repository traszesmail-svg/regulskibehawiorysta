# Plan: grafik terminow dla Kwadransa, Kwadransa na juz, Dwoch kwadransow i Pelnej konsultacji

## Cel

Zmienic system terminow z jednej wspolnej puli slotow na reguly per usluga:

- `kwadrans-na-juz` ma miec osobny najblizszy grafik,
- zwykly `Kwadrans` i `Dwa kwadranse` maja miec te same godziny, ale z blokada pierwszych dwoch dni,
- `Pelna konsultacja` ma miec jeden realny termin dziennie,
- pozostale godziny maja byc widoczne w kalendarzu jako zajete/niedostepne, a nie znikac z widoku,
- backend ma egzekwowac te same reguly co UI.

## Ustalone reguly z briefu

### 1. Kwadrans na juz

- Dni: poniedzialek-piatek.
- Wykluczenia: glowne swieta i ustawowe dni wolne od pracy.
- Zakres widocznych godzin: `06:00-20:00`.
- Realnie dostepne sloty: co 30 minut w oknach:
  - `08:00-12:00`, ostatni start `11:30`,
  - `16:00-18:00`, ostatni start `17:30`.
- Pozostale godziny z zakresu `06:00-20:00` maja byc widoczne, ale zablokowane.
- Rozroznienie etykiet:
  - `Niedostepne` = usluga nie dziala w tym dniu/godzinie, np. weekend, swieto albo ustawowy dzien wolny.
  - `Zajete` = dzien jest roboczy dla uslugi, ale godzina ma symulowac zajety termin poza realnym oknem dostepnosci albo slot jest realnie zajety.

### 2. Kwadrans i Dwa kwadranse

- Terminy maja byc zawsze przesuniete minimum o dwa dni kalendarzowe do przodu.
- `Kwadrans` i `Dwa kwadranse` nie odbywaja sie w sobote, niedziele, swieta ani ustawowe dni wolne od pracy.
- Przyklad nadrzedny: w piatek zwykly `Kwadrans` i `Dwa kwadranse` sa dostepne dopiero od poniedzialku, bo sobota i niedziela nie maja Kwadransow.
- Implementacyjnie: liczona jest minimalna data `dzisiaj + 2 dni`, a jesli wypada w sobote/niedziele/swieto/dzien wolny, przesuwamy ja na najblizszy dzien roboczy dla Kwadransa.
- Dni przed ta minimalna data oraz weekendy/swieta sa zablokowane dla zwyklego `Kwadransa` i `Dwoch kwadransow`.
- Dni przed minimalna data, weekendy, swieta i dni wolne maja byc opisane jako `Niedostepne`.
- Godziny w dzialajacym dniu, ale poza realnymi oknami `08:00-11:30` i `16:00-17:30`, maja byc opisane jako `Zajete`.
- Uklad godzinowy taki sam jak w `kwadrans-na-juz`:
  - widoczne `06:00-20:00`,
  - realnie dostepne `08:00-12:00` z ostatnim startem `11:30`,
  - realnie dostepne `16:00-18:00` z ostatnim startem `17:30`,
  - poza oknami realnej dostepnosci godziny widoczne jako zablokowane.
- Dla `Dwa kwadranse` backend musi zarezerwowac dwa kolejne sloty 30-minutowe albo odrzucic rezerwacje, jesli para nie jest dostepna.

### 3. Pelna konsultacja

- Jeden realny termin dziennie:
  - poniedzialek-piatek: `08:15`,
  - sobota-niedziela: `08:00`.
- Reszta godzin ma byc widoczna, ale jako zajeta/niedostepna.
- Pelna konsultacja nie odbywa sie w swieta i ustawowe dni wolne od pracy.
- Sobota i niedziela sa traktowane jako dni pracujace dla pelnej konsultacji, o ile nie wypada wtedy swieto/dzien ustawowo wolny.
- Dla pelnej konsultacji dni swiateczne/dni wolne sa `Niedostepne`.
- W dni pracujace dla pelnej konsultacji jedyny realny slot jest dostepny, a pozostale widoczne godziny maja symulowac `Zajete`.

## Pytania do potwierdzenia przed kodem

1. Jaki horyzont pokazujemy w kalendarzu:
   - 14 dni,
   - 30 dni,
   - 60 dni,
   - inny?
2. Czy pelna konsultacja ma pokazywac wszystkie godziny co 30 minut plus specjalny slot `08:15`, czy osobna siatke 15-minutowa?
3. Potwierdzenie brzegowe: jesli swieto wypada w sobote albo niedziele, pelna konsultacja ma byc zablokowana jak w swieto.
4. Potwierdzenie nazewnictwa: regule dla zwyklego Kwadransa i Dwoch kwadransow opisujemy w UI jako `minimum 2 dni w przod`, a nie jako `2 dni robocze`, bo sobota i niedziela nie maja Kwadransow.

## Etap 1 - Model danych i typy

1. Dodac typ prezentacyjny, np. `CalendarSlotView`:
   - `date`,
   - `time`,
   - `serviceType`,
   - `state`: `available | booked | locked | outside_window | unavailable | reserved_for_urgent`,
   - `reasonLabel`,
   - `href` tylko dla `available`.
2. Mapowanie etykiet UI:
   - `unavailable` i `reserved_for_urgent` -> `Niedostepne`,
   - `outside_window`, `booked`, `locked` -> `Zajete`.
3. Nie mieszac juz "widocznych, ale zablokowanych" godzin z realnymi `AvailabilitySlot`.
4. Zostawic `AvailabilitySlot` jako rekord rezerwacyjny/lockujacy, ale dodac warstwe harmonogramu nad nim.
5. Usunac koncepcje specjalnych godzin typu `?12:20`; to jest za slabe i nieczytelne dla UI oraz backendu.

## Etap 2 - Reguly grafiku

1. Dodac modul `lib/scheduling/rules.ts`.
2. Wydzielic stale:
   - `VISIBLE_DAY_START = 06:00`,
   - `VISIBLE_DAY_END = 20:00`,
   - `PRIMARY_WINDOWS = 08:00-11:30, 16:00-17:30` jako starty co 30 minut,
   - `FULL_CONSULT_WEEKDAY_TIME = 08:15`,
   - `FULL_CONSULT_WEEKEND_TIME = 08:00`.
3. Dodac funkcje:
   - `isBookableForService(date, time, serviceType, now)`,
   - `getBlockedReason(date, time, serviceType, now)`,
   - `buildVisibleServiceDay(date, serviceType, bookings, locks, now)`.
4. Wszystko liczyc w strefie `Europe/Warsaw`.

## Etap 3 - Swieta i dni wolne

1. Dodac `lib/scheduling/polish-holidays.ts`.
2. Liczyc swieta stale i ruchome lokalnie:
   - Nowy Rok,
   - Trzech Kroli,
   - Wielkanoc i Poniedzialek Wielkanocny,
   - Swieto Pracy,
   - Swieto Konstytucji 3 Maja,
   - Zielone Swiatki,
   - Boze Cialo,
   - Wniebowziecie / Swieto Wojska Polskiego,
   - Wszystkich Swietych,
   - Swieto Niepodleglosci,
   - Wigilia,
   - Boze Narodzenie 25-26 grudnia.
3. Dodac testy na rok 2026, w tym 24 grudnia jako dzien wolny.
4. Nie pobierac swiat z internetu w runtime.
5. Zrodla do sprawdzenia listy dni wolnych przed implementacja:
   - Panstwowa Inspekcja Pracy: 24 grudnia jako dzien wolny od pracy od 2025 roku,
   - Gov.pl / Ministerstwo Rodziny: komunikaty o wolnej Wigilii,
   - ISAP / Dziennik Ustaw: tekst ustawy zmieniajacej ustawe o dniach wolnych od pracy.

## Etap 4 - Zrodlo terminow

1. Dla UI nie zwracac juz tylko dni z wolnymi slotami.
2. Endpoint/warstwa `listAvailability()` albo nowa funkcja powinna zwracac:
   - dni w horyzoncie kalendarza,
   - wszystkie widoczne godziny,
   - stan kazdej godziny.
3. Backend przy rezerwacji nie moze ufac samemu `slotId`; musi ponownie policzyc reguly uslugi.
4. Dla Supabase i local-store trzeba zachowac wspolna abstrakcje, zeby produkcja i lokal dzialaly tak samo.

## Etap 5 - Walidacja rezerwacji

1. `app/api/bookings/route.ts` ma sprawdzac:
   - czy wybrany slot jest zgodny z usluga,
   - czy data nie jest swietem/dniem wolnym,
   - czy slot nie jest przed minimalna data normalnej rezerwacji dla zwyklego Kwadransa/Dwoch kwadransow,
   - czy slot zwyklego Kwadransa/Dwoch kwadransow nie wypada w sobote, niedziele, swieto albo ustawowy dzien wolny,
   - czy `Dwa kwadranse` ma dostepne dwa kolejne sloty,
   - czy `Pelna konsultacja` startuje tylko o `08:15` w tygodniu albo `08:00` w weekend.
2. `createPendingBooking()` ma lockowac wszystkie sloty wymagane przez usluge.
3. Blokady wygasle nadal czyscic tak jak obecnie.

## Etap 6 - UI kalendarza

1. `TerminCalendarPicker` ma dostac liste slotow z ich stanami.
2. Dostepne sloty sa klikane.
3. Zajete/zablokowane sloty sa widoczne, ale:
   - disabled,
   - wyszarzone,
   - bez linku do formularza,
   - z krotkim powodem w `aria-label` albo tooltipie.
4. Dni bez dostepnych slotow, ale z widocznymi zablokowanymi godzinami, nadal maja byc widoczne w kalendarzu.
5. Trzeba rozdzielic komunikat `brak terminow` od sytuacji `sa godziny, ale wszystko jest zajete`.

## Etap 7 - Admin

1. Panel admina powinien pokazywac realny grafik wynikajacy z regul, nie tylko recznie utworzone sloty.
2. Dodac lub zaplanowac reczne nadpisania:
   - zablokuj konkretny dzien,
   - zablokuj konkretna godzine,
   - dodaj wyjatek/dodatkowy slot,
   - oznacz urlop.
3. Nadpisania musza byc per usluga albo wspolne dla wszystkich uslug.

## Etap 8 - Testy

1. Unit testy:
   - `kwadrans-na-juz`: pon-pt, 08:00-12:00 i 16:00-18:00, reszta 06:00-20:00 blocked,
   - weekend/swieto dla `kwadrans-na-juz`: brak dostepnych slotow,
   - zwykly Kwadrans: dni przed minimalna data normalnej rezerwacji widoczne jako zablokowane,
   - zwykly Kwadrans: sobota, niedziela, swieta i dni wolne zablokowane,
   - piatek: zwykly Kwadrans/Dwa kwadranse pierwszy raz dostepne w poniedzialek,
   - `Dwa kwadranse`: wymaga dwoch kolejnych slotow,
   - pelna konsultacja: `08:15` w tygodniu, `08:00` weekend,
   - pelna konsultacja: zwykla sobota/niedziela dostepna, swieto w sobote/niedziele zablokowane.
2. Test API:
   - nie da sie zarezerwowac slotu zablokowanego,
   - nie da sie obejsc blokady query parametrem,
   - dwa rownolegle requesty nie rezerwuja tego samego slotu.
3. Browser QA:
   - `/book?service=kwadrans-na-juz`,
   - `/book?service=szybka-konsultacja-15-min`,
   - `/book?service=konsultacja-30-min`,
   - `/book?service=konsultacja-behawioralna-online`.

## Etap 9 - Migracja i wdrozenie

1. Najpierw lokalnie:
   - `npm.cmd run lint`,
   - `npm.cmd run build`,
   - browser check mobile/desktop.
2. Potem sprawdzic, czy produkcja dziala na `APP_DATA_MODE=local` czy Supabase.
3. Jesli Supabase jest aktywne, przygotowac migracje pod ewentualne override'y grafiku.
4. Nie wdrazac bez osobnego potwierdzenia.

## Ryzyka

- Obecny `AvailabilitySlot` nie ma `serviceType`, wiec nie wystarczy dopisac kilku godzin do `availability.json`.
- Obecny UI pokazuje glownie dostepne sloty, a nie pelna siatke widocznych/zablokowanych godzin.
- `Dwa kwadranse` i `Pelna konsultacja` nie powinny korzystac z tej samej prostej interpretacji slotu co 15 minut.
- Swieta i dni wolne musza byc liczone deterministycznie, z testami, bo inaczej kalendarz bedzie sie rozjezdzal z realnym grafikiem.
