# Plan: Kwadrans na już, homepage mobile i dodatki graficzne

## Cel

Uspójnić pilne CTA i booking tak, żeby:

- na stronie głównej nie było terminarza,
- przycisk `Potrzebuję pomocy natychmiast!` prowadził na osobną stronę pilnego Kwadransa,
- `Kwadrans na już` działał jak normalny booking, ale z inną dostępnością: tylko bieżący dzień, 5 terminów co 30 minut, od aktualnej godziny do maksymalnie 18:00,
- dodatki graficzne na home były zgodne z dostarczoną referencją, a nie z prowizorycznymi SVG/kreskami.

## Etap 1 - Cofnięcie błędnego kierunku

1. Usunąć terminarz osadzony pod CTA na stronie głównej.
2. Usunąć komponent `HomeUrgentNowScheduler`, jeśli nie będzie używany na osobnej stronie.
3. Zostawić na home tylko przycisk `Potrzebuję pomocy natychmiast!`.
4. Zmienić link tego przycisku na osobną stronę pilnej rezerwacji, np. `/kwadrans-na-juz`.
5. Usunąć CSS dla `.urgent-now-panel`, `.urgent-now-form`, `.urgent-now-slot-grid` z homepage, jeśli nie będzie potrzebny.

## Etap 2 - Osobna strona `Kwadrans na już`

1. Dodać osobną trasę `/kwadrans-na-juz`.
2. Strona ma być bookingowa, nie marketingowa:
   - krótki nagłówek,
   - jasne: `Kwadrans na już / 99 zł / 15 min audio`,
   - wybór gatunku i tematu, jeśli nie przyszły z query,
   - od razu widoczne terminy na dziś.
3. Po wybraniu terminu użytkownik ma przechodzić dalej normalnym torem:
   - `/form?service=kwadrans-na-juz&problem=...&slotId=...`,
   - potem `/payment`,
   - potem pokój/link jak w standardowej rezerwacji.
4. Nie tworzyć osobnego formularza mailowego jako głównego flow.

## Etap 3 - Dostępność slotów dla `kwadrans-na-juz`

1. Poprawić generator dostępności pilnej:
   - tylko dzisiejsza data,
   - 5 slotów,
   - co 30 minut,
   - start od aktualnej godziny zaokrąglonej do następnego sensownego slotu,
   - ostatni slot nie później niż 18:00.
2. Jeśli po aktualnej godzinie nie da się utworzyć 5 slotów do 18:00:
   - pokazać tyle slotów, ile zostało,
   - dodać jasny komunikat o braku pełnych 5 terminów na dziś,
   - nie pokazywać terminów jutrzejszych w trybie `Kwadrans na już`.
3. Upewnić się, że `filterGroupedAvailabilityForService` i `/termin` nie mieszają pilnych slotów ze zwykłym Kwadransem.
4. Linki dla pilnego flow muszą zawsze mieć `service=kwadrans-na-juz`.

## Etap 4 - Admin i maile

1. Zachować poprawkę backendową: pilne zatwierdzenie nie może tworzyć zwykłego Kwadransa.
2. Jeśli zostaje adminowa akceptacja zgłoszeń:
   - admin wybiera godzinę,
   - system tworzy booking `kwadrans-na-juz`,
   - klient dostaje link do płatności.
3. Jeśli pilny flow idzie w pełni przez normalny booking, uprościć/odseparować stary mailowy `urgent-requests`, żeby nie dublował ścieżki.
4. Sprawdzić treść maili:
   - klient: link do płatności,
   - po płatności: link do pokoju jak zwykle.

## Etap 5 - Dodatki graficzne 1:1 z referencji

1. Nie używać prowizorycznych rysowanych SVG jako zamienników referencji.
2. Wyciąć z dostarczonej referencji realne ornamenty/liście/łapkę jako bitmapy lub odtworzyć je precyzyjnie na podstawie assetu.
3. Zastąpić obecne:
   - `home-leaf-sprig.svg`,
   - `home-paw-divider.svg`,
   - pseudo-elementy z przypadkowymi kreskami/liśćmi.
4. Porównać mobile screenshot z referencją:
   - nagłówek,
   - separator pod H1,
   - liście przy sekcjach,
   - karta opinii,
   - stopka.

## Etap 6 - Walidacja

1. Uruchomić `npm.cmd run build`.
2. Sprawdzić lokalnie:
   - `/` na mobile,
   - `/kwadrans-na-juz` na mobile,
   - wybór slotu pilnego,
   - przejście do `/form`,
   - przejście do `/payment`.
3. Sprawdzić, że na home nie ma formularza/terminarza pilnego.
4. Sprawdzić, że `Nie wiem, co wybrać` nadal prowadzi do `/quiz`.
5. Sprawdzić, że `/book?service=kwadrans-na-juz` albo przekierowuje do poprawnej strony, albo renderuje ten sam poprawny pilny flow.

## Etap 7 - Sprzątanie

1. Usunąć nieużywane pliki po błędnej implementacji.
2. Nie usuwać assetów referencyjnych, jeśli są potrzebne do finalnego wyglądu.
3. Przywrócić `public/sitemap-0.xml`, jeśli build go zmieni.
4. Pokazać listę zmienionych plików i wynik builda.
