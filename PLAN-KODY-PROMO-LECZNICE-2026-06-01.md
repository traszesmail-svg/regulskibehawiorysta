# Plan: kody promocyjne dla lecznic

Cel: dodac jednorazowe kody, ktore zastepuja platnosc tylko dla uslugi `Kwadrans z behawiorysta`, bez omijania terminarza.

## Zakres

1. Dane
   - Dodac kampanie kodow dla lecznic.
   - Domyslnie generowac 5 kodow na lecznice.
   - Trzymac w bazie hash kodu, nie jawny kod.
   - Kazdy kod ma limit uzyc 1 i opcjonalna date waznosci.

2. Platnosc
   - Na `/payment` dodac trzecia metode: `Mam kod od lecznicy`.
   - Kod dziala tylko dla `szybka-konsultacja-15-min`.
   - Po poprawnym kodzie booking przechodzi przez istniejace potwierdzenie `markBookingPaid`.
   - Metoda platnosci zapisywana jako `promo`, a referencja jako `PROMO ...`.

3. Admin
   - Dodac `/admin/promocje`.
   - Formularz: nazwa lecznicy, liczba kodow, data waznosci.
   - Po wygenerowaniu pokazac liste kodow do przekazania lecznicy.
   - W historii pokazac kampanie, uzyte/wolne kody i date waznosci.

4. Dostep admina
   - Lokalnie ustawic Basic Auth jako `admin` / `admin`.
   - Nie zapisywac slabego hasla jako produkcyjnego sekretu w kodzie.

5. Weryfikacja
   - Dodac test jednostkowy dla uzycia kodu i blokady ponownego uzycia.
   - Uruchomic testy, lint/build na koncu.
