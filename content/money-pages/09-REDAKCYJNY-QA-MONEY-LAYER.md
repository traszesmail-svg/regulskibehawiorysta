# Redakcyjny QA — warstwa money pages i strony kategorii

Audyt: /psy, /koty, /o-mnie, /niezbednik, /kontakt + istniejące CTA.
Format: problem → priorytet → podmiana 1:1.

---

## /psy (strona kategorii psów)

Stan ogólny: DOBRY. Ton spokojny i konkretny. Żadnych problemów HIGH.

### Problem 1
**Lokalizacja:** linia ~480 (sekcja końcowa / CTA)
**Obecny:** fragment z opisem strony od strony projektowej — zawiera język opisujący to, jak strona działa, nie co robi dla użytkownika.
**Priorytet:** MEDIUM
**Podmiana:** Zamień wszystkie frazy opisujące architekturę strony na frazy opisujące co robi opiekun lub co dostaje. Konkret: jeśli jest „ta strona pozwala Ci...", zamień na „możesz tu...". Jeśli jest „tutaj znajdziesz", zamień na „tu jest..." lub usuń i zacznij od meritum.

### Problem 2
**Lokalizacja:** linia ~514-515
**Obecny:** opis usługi brzmiący jak bullet z pitcha sprzedażowego.
**Priorytet:** LOW
**Podmiana:** bez zmian jeśli jest krótki i konkretny. Jeśli zaczyna się od „oferuję" — zamień na zdanie opisujące sytuację klienta lub co się dzieje w konsultacji.

### Ocena ogólna /psy: DOBRY. Nie wymaga interwencji pilnej.

---

## /koty (strona kategorii kotów)

Stan ogólny: DOBRY. Analogicznie do /psy — żadnych problemów HIGH.

### Problem 1
**Lokalizacja:** linia ~634-635
**Obecny:** sekcja „Zacznij od..." może brzmieć jak presja.
**Priorytet:** LOW
**Podmiana (opcjonalna):**
> Stare: „Zacznij teraz — zarezerwuj 15 min audio"
> Nowe: „15 min audio — jeśli nie wiesz jeszcze, od czego zacząć"

### Ocena ogólna /koty: DOBRY.

---

## /o-mnie (strona o autorze)

Stan ogólny: DOBRY. Ton autentyczny, bez overclaiming.

### Problem 1 — HIGH
**Lokalizacja:** linia ~145
**Obecny:** hierarchia produktów opisana tak, jakby 60 min konsultacja była głównym produktem, a 15 min było wstępem do niej. Przykład: „Możesz zacząć od 15 min audio, żeby sprawdzić..." sugeruje, że 15 min to etap w drodze do pełnej konsultacji.
**Priorytet:** HIGH
**Podmiana:**
> Stare (przykład): „Możesz zacząć od 15 min audio, żeby sprawdzić, czy warto umówić się na pełną konsultację."
> Nowe: „15 min audio to samodzielny format — dla jednego pytania, orientacji w temacie albo pierwszego kroku. Pełna godzina to osobna opcja, przy złożonych problemach."

**Zasada:** na stronie /o-mnie 15 min audio nie może być przedstawiane jako „wstęp" do 60 min. To dwa osobne produkty o różnych zastosowaniach.

### Problem 2
**Lokalizacja:** ogólna — ton certyfikacyjny
**Obecny:** sekcja o COAPE i certyfikatach jest dobra, ale sprawdź, czy nie ma nadmiernego podkreślania tytułów.
**Priorytet:** LOW
**Uwaga:** nie usuwaj informacji o COAPE i CAPBT — są wartościowe. Sprawdź tylko, czy nie ma frazy „jedyna" lub „najlepsza metoda".

### Ocena ogólna /o-mnie: DOBRY po korekcie HIGH.

---

## /niezbednik (Niezbędnik)

Stan ogólny: DOBRY. Ton pomocowy, bez presji. Dwa problemy do korekty.

### Problem 1 — MEDIUM
**Lokalizacja:** linia ~181-182
**Obecny:** opis niezbędnika jako produktu (co zawiera, ile ma elementów) zamiast opisu co robi dla opiekuna.
**Priorytet:** MEDIUM
**Podmiana:**
> Stare (przykład): „Niezbędnik zawiera X materiałów do pobrania / X sekcji."
> Nowe: usuń liczbę jeśli jest, zamiast tego opisz co opiekun może z tym zrobić. Np.: „Materiały do wykorzystania samodzielnie — przed konsultacją albo zamiast niej, jeśli sytuacja na to pozwala."

### Problem 2 — MEDIUM
**Lokalizacja:** linia ~403-404
**Obecny:** CTA niezbędnika używa języka sprzedażowego nieadekwatnego do darmowego zasobu (np. „Pobierz teraz", „Zdobądź dostęp").
**Priorytet:** MEDIUM
**Podmiana:**
> Stare: „Pobierz teraz" / „Zdobądź dostęp do Niezbędnika"
> Nowe: „Otwórz Niezbędnik" / „Przejdź do Niezbędnika" / „Niezbędnik — materiały do samodzielnej pracy"

### Ocena ogólna /niezbednik: DOBRY po korekcie MEDIUM.

---

## /kontakt (strona kontaktowa)

Stan ogólny: DOBRY. Ton spokojny, bez nadmiernych obietnic.

### Problem 1 — MEDIUM
**Lokalizacja:** linia ~223-224
**Obecny:** opis formularza kontaktowego sugeruje, że odpowiedź jest szybka albo gwarantowana w określonym czasie.
**Priorytet:** MEDIUM
**Podmiana:**
> Stare (przykład): „Odpowiem w ciągu 24 godzin" lub „Odpowiem najszybciej jak mogę"
> Nowe: „Staram się odpowiadać w ciągu 1–2 dni roboczych." (konkretnie, bez obietnicy niemożliwej do dotrzymania)

### Problem 2 — LOW
**Lokalizacja:** linia ~231
**Obecny:** link do rezerwacji z kontaktowej może sugerować, że formularz jest wstępem do rezerwacji (hierarchia odwrotna od zamierzonej).
**Priorytet:** LOW
**Uwaga:** jeśli na stronie /kontakt jest zarówno formularz wiadomości, jak i CTA do /call, upewnij się że CTA do /call jest oznaczone jako osobna opcja, nie jako „alternatywa po przesłaniu wiadomości".

### Ocena ogólna /kontakt: DOBRY, jedna korekta MEDIUM.

---

## Istniejące CTA — audyt ogólny

### Stany poprawne (bez zmian):
- `/call` strona: krótka, konkretna, bez presji — OK
- `/book` strona: opis zakresu zgodny z tym, co klient dostanie — OK
- Wszystkie CTA kończące landingi problemowe: spokojne, bez hype'u — OK

### Stany wymagające uwagi:

**CTA na stronie głównej (homepage)**
**Priorytet:** MEDIUM
**Problem:** jeśli na homepage CTA do `/book` jest wizualnie lub tekstowo równie prominentne jak CTA do `/call`, hierarchia jest odwrócona.
**Zasada:** `/call` = CTA primary (duży przycisk, wyraźny); `/book` = CTA secondary (mniejszy lub pod spodem); `/kontakt` = opcja trzecia.

**Kolejność CTA na stronach kategorii (/psy, /koty)**
**Priorytet:** LOW
**Sprawdź:** czy w sekcji CTA na /psy i /koty nie pojawiają się wszystkie trzy opcje na tym samym poziomie (co osłabia decyzję). Preferowana kolejność: `/call` → `/book` → `/kontakt`.

---

## Zbiorcze priorytety

| Problem | Strona | Priorytet |
|---|---|---|
| Hierarchia produktów (15 min jako „wstęp") | /o-mnie | HIGH |
| CTA niezbędnika (język sprzedażowy) | /niezbednik | MEDIUM |
| Opis niezbędnika (liczby zamiast zastosowania) | /niezbednik | MEDIUM |
| Czas odpowiedzi w formularzu | /kontakt | MEDIUM |
| Wizualna hierarchia CTA (call vs book) | homepage | MEDIUM |
| Presja w CTA „Zacznij teraz" | /koty | LOW |
| Link rezerwacyjny z /kontakt | /kontakt | LOW |
| Hierarchia CTA na /psy i /koty | /psy, /koty | LOW |
| Ton certyfikacyjny | /o-mnie | LOW |

---

## Nota końcowa

Warstwa money pages (01–04) jest gotowa do wdrożenia bez korekt — ton jest spójny z resztą serwisu, hierarchia produktów zachowana (15 min primary), brak języka projektowego.

Główne prace redakcyjne dotyczą istniejących stron (szczególnie /o-mnie i /niezbednik) — nie money pages.
