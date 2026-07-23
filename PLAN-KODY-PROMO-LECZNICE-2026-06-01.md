# Plan: kody promocyjne dla lecznic

Cel: dodać jednorazowe kody, które zastępują płatność tylko dla usługi `Kwadrans`, bez omijania terminarza.

Aktualizacja zakresu 2026-07-23: kod lecznicy otwiera tę samą ścieżkę Kwadransa, a po wyborze gatunku, tematu i terminu klient wybiera sposób realizacji: Jitsi bez dopłaty albo rozmowę telefoniczną z dopłatą ujawnioną dopiero na tym etapie. Nie tworzymy nowej publicznej usługi i nie usuwamy żadnej istniejącej usługi.

## Zakres

1. Dane
   - Kampanie kodów dla lecznic.
   - Domyślnie 5 kodów na lecznicę.
   - W bazie hash kodu, nie jawny kod.
   - Każdy kod ma limit jednego użycia i opcjonalną datę ważności.

2. Ścieżka klienta
   - Wejście `Mam kod od lecznicy` prowadzi do `/lecznica`.
   - Najpierw klient wpisuje i sprawdza kod; samo sprawdzenie nie zużywa kodu.
   - Następnie wybiera gatunek, temat, termin i uzupełnia formularz Kwadransa.
   - Na `/payment` wybiera Jitsi bez dopłaty albo telefon z dopłatą.
   - Informacja o dopłacie pojawia się dopiero po poprawnym sprawdzeniu kodu, przy wyborze kanału.
   - Dla telefonu numer jest obowiązkowy i walidowany po stronie klienta oraz serwera.
   - Kod najpierw zabezpiecza wariant Jitsi; nieopłacona dopłata nie odbiera prawa do Jitsi.
   - Rezerwacja przechodzi na telefon dopiero po potwierdzeniu osobnej dopłaty.
   - Opłacony telefon jest realizowany przez Zadarma; cron uruchamia połączenie i pilnuje czasu, a webhook aktualizuje status.

3. Płatność
   - Na `/payment` pozostaje trzecia metoda `Mam kod od lecznicy`.
   - Kod działa tylko dla `szybka-konsultacja-15-min`.
   - Metoda płatności rezerwacji jest zapisywana jako `promo`, a referencja jako `PROMO ...`.
   - Dopłata telefoniczna jest osobnym zamówieniem, a jej kwota jest wspólna dla BLIK i płatności online.

4. Wejście publiczne i partnerzy
   - Na stronie głównej wtórne wejście `Mam kod od lecznicy`, bez automatycznego popupu dla wszystkich.
   - W cenniku blok `Program dla klientów lecznic`, bez ujawniania kwoty dopłaty przed wyborem kanału.
   - Strona `/lecznica` z logotypami wyłącznie za zgodą; określenie `Lecznice uczestniczące w programie`, bez sugerowania rekomendacji.
   - Linki i QR mogą kierować do strony programu, bez jawnych kodów w URL.

5. Regulamin i prywatność
   - Regulamin: ważność i jednorazowość kodu, Jitsi/telefon, osobna dopłata, wymagany numer, zmiana terminu, nieudane połączenie i rozpoczęcie usługi przed upływem 14 dni.
   - Brak opłacenia dopłaty nie odbiera wariantu Jitsi.
   - Polityka: identyfikator kampanii/lecznicy, kanał, numer tylko dla telefonu, Zadarma, odbiorcy i retencja.
   - Lecznica nie otrzymuje danych klienta bez odrębnej podstawy lub zgody; logotyp wymaga uzgodnienia.
   - Istniejące checkboxy rezerwacji obejmują regulamin, politykę i żądanie rozpoczęcia świadczenia przed upływem 14 dni.

6. Admin
   - `/admin/promocje` służy do tworzenia kampanii, wyboru liczby kodów i daty ważności.
   - Po wygenerowaniu pokazuje jawne kody tylko do przekazania lecznicy.
   - Historia pokazuje kampanie, użyte/wolne kody i datę ważności.

7. Dostęp admina
   - Lokalny Basic Auth może używać danych developerskich `admin` / `admin`.
   - Słabe dane nie mogą być produkcyjnym sekretem w kodzie.

8. Weryfikacja
   - Test użycia kodu i blokady ponownego użycia.
   - Test wymagania telefonu tylko dla kanału `phone`.
   - Test, że nieopłacona dopłata nie odbiera wariantu Jitsi.
   - Desktop/mobile: homepage, cennik, `/lecznica`, gatunek/temat, kanał, numer i płatność.
   - Typecheck, testy i build na końcu.

## Status 2026-07-23

- [x] Model danych, migracja `consultation_mode` i osobne zamówienie dopłaty.
- [x] Walidacja kodu bez jego zużycia.
- [x] Wybór Jitsi/telefonu po sprawdzeniu kodu.
- [x] Wymagany i walidowany numer telefonu dla wariantu telefonicznego.
- [x] Zadarma dla głównych rezerwacji: trigger, cron i webhook.
- [x] Wejścia publiczne i strona `/lecznica`.
- [x] Regulamin i polityka prywatności.
- [x] Testy automatyczne, build i przegląd desktop/mobile — zweryfikowane 2026-07-23.
