# Redakcyjny QA — strony główne i wpisy blogowe

Audyt wyłącznie pod kątem języka i tonu. Nie ruszam kodu, routingu ani architektury. Każda zmiana to gotowy tekst 1:1 do wklejenia.

---

## / Strona główna (app/page.tsx)

### Problem 1 — linia 480: lejek audio-first w copy

**Obecny tekst:**
> „Obie strony prowadzą do tego samego lejka audio-first, ale pokazują właściwy kontekst, tematykę i przykłady dla danego gatunku."

**Dlaczego problem:** „lejka audio-first" to wewnętrzny język strategiczny. Klient nie wie, co to znaczy.

**Propozycja zastępcza:**
> „Obie strony prowadzą do tej samej ścieżki — z materiałami i przykładami dopasowanymi do psa albo kota."

---

### Problem 2 — linia 514–515: meta-komentarz o konstrukcji strony

**Obecny tekst (title + description sekcji):**
> title: „Najpierw szybki porządek. Głębsza konsultacja dopiero wtedy, gdy naprawdę ma sens."
> description: „Na home najpierw pokazuję najlżejsze wejście, a dopiero niżej wariant pełny. To ma skrócić drogę do decyzji, a nie ją komplikować."

**Dlaczego problem:** description tłumaczy strukturę strony klientowi. Klient nie potrzebuje wiedzieć, jak strona jest zbudowana — potrzebuje wiedzieć, co zyska.

**Propozycja zastępcza:**
> title: „Zacznij od tego, co jest prostsze. Głębsza opcja zostaje wtedy, gdy faktycznie jej potrzebujesz."
> description: „Najprostszy start to 15 min audio — krótka rozmowa, żeby zorientować się w temacie. Pełna konsultacja jest obok, gdy sytuacja tego wymaga."

---

### Problem 3 — linia 634–635: meta-opis sekcji autorytetu

**Obecny tekst:**
> title: „Spokojne podejście, konkretne kwalifikacje i materiały, do których można wrócić"
> description: „To nadal nie jest portfolio dla samego portfolio. Ta sekcja ma szybko pokazać, jak pracuję i dlaczego Niezbędnik jest tylko ścieżką pomocniczą."

**Dlaczego problem:** dwa błędy. „To nadal nie jest portfolio dla samego portfolio" to zdanie o projekcie, nie do klienta. „Niezbędnik jest tylko ścieżką pomocniczą" to wewnętrzna hierarchia lejka.

**Propozycja zastępcza:**
> title: „Kwalifikacje, podejście i materiały do samodzielnego sprawdzenia"
> description: „Poniżej pokazuję, jak pracuję, jakie mam kwalifikacje i gdzie można je zweryfikować — zanim zdecydujesz się na pierwszy kontakt."

---

## /kontakt (app/kontakt/page.tsx)

### Problem 4 — linia 223–224: meta-opis oferty z wewnętrzną hierarchią

**Obecny tekst (title + description):**
> title: „Tutaj od razu widać, co można wybrać przed bookingiem."
> description: „Krótka rozmowa wstępna 15 min audio za 69 zł jest głównym wejściem. Pełna konsultacja online 60 min za 350 zł zostaje głębszą, drugą opcją."

**Dlaczego problem:** title to zdanie o stronie („Tutaj widać"), a nie zdanie do klienta. Description eksponuje ceny i hierarchię lejka w copy sekcji. Ceny powinny siedzieć przy elementach rezerwacji, nie w opisie sekcji.

**Propozycja zastępcza:**
> title: „Wybierz format, który odpowiada twojemu pytaniu"
> description: „Jeśli masz jedno konkretne pytanie — zacznij od 15 min audio. Jeśli temat jest szerszy i chcesz pełny plan — wybierz konsultację online. Możesz też napisać krótką wiadomość, jeśli jeszcze nie wiesz, od czego zacząć."

---

### Problem 5 — linia 231: meta-komentarz o formularzu

**Obecny tekst:**
> description: „Wystarczy gatunek, temat, 2-4 zdania i kontakt. To ma ułatwiać start, a nie otwierać długą korespondencję."

**Dlaczego problem:** „To ma ułatwiać start, a nie otwierać długą korespondencję" — to zdanie dla projektanta, nie dla klienta. Klient czyta to jako instrukcję, żeby pisać mało.

**Propozycja zastępcza:**
> description: „Wystarczy kilka zdań: gatunek, co się dzieje, jak się z tobą skontaktować. Na tej podstawie odpowiem, czy i jak możemy zacząć."

---

## /niezbednik (app/niezbednik/page.tsx)

### Problem 6 — linia 181–182: meta-opis struktury strony

**Obecny tekst:**
> title: „Pierwszy klik ma być prosty, a cała strona ma prowadzić bez chaosu."
> description: „Najpierw wybierasz, czy potrzebujesz jednego materiału, szerszego pakietu czy krótkiej rozmowy. Książki i afiliacje siedzą niżej jako uzupełnienie, nie jako rdzeń strony."

**Dlaczego problem:** oba zdania opisują architekturę strony klientowi. „Siedzą niżej jako uzupełnienie, nie jako rdzeń strony" to wewnętrzna logika projektu.

**Propozycja zastępcza:**
> title: „Zacznij od tego, czego konkretnie szukasz — jednego materiału, pakietu albo krótkiej rozmowy."
> description: „Poniżej znajdziesz materiały własne, przydatne książki i narzędzia. Jeśli temat jest szerszy niż materiał — jest tu też ścieżka do pierwszej rozmowy."

---

### Problem 7 — linia 403–404: strategia marki widoczna w copy

**Obecny tekst:**
> title: „Niezbędnik zostaje secondary path. Głównym wejściem marki nadal jest 15 min audio."
> description: „Materiały pomagają przed konsultacją, po konsultacji i między krokami, ale nie przejmują hierarchii. Gdy temat jest szerszy, rozmowa nadal wygrywa z samym katalogiem."

**Dlaczego problem:** pierwsze zdanie to dosłownie strategia produktowa. Klient nie powinien czytać, że coś jest „secondary path".

**Propozycja zastępcza:**
> title: „Materiały pomagają przed konsultacją, po niej i między krokami."
> description: „Jeśli chcesz samodzielnie popracować nad tematem — tu znajdziesz dobre punkty startu. Jeśli temat jest szerszy i potrzebujesz rozmowy — 15 min audio jest obok."

---

## /o-mnie (app/o-mnie/page.tsx)

### Problem 8 — linia ~145: mieszanie hierarchii produktowej z copy

**Obecny tekst (karta w whoCards):**
> copy: „Jasny pierwszy krok, decyzja czy wystarczy 15 min audio i spokojniejsza ocena, czy temat wymaga 60 min albo dalszego sprawdzenia."

**Dlaczego problem:** karta opisuje efekt konsultacji językiem hierarchii produktu (15 min vs. 60 min). Klient czyta to jako opis oferty, a nie efektu.

**Propozycja zastępcza:**
> copy: „Po rozmowie wiesz, od czego zacząć, co obserwować i czy temat wymaga dalszej pracy, czy spokojnie możesz działać samodzielnie."

---

## /opinie (app/opinie/page.tsx)

### Problem 9 — linia 516: meta-komentarz o kartach

**Obecny tekst:**
> description: „Te karty opierają się na istniejących opisach przypadków. Zamiast obiecywać identyczny finał pokazują, od czego zwykle zaczyna się porządkowanie tematu."

**Dlaczego problem:** „Te karty opierają się na istniejących opisach przypadków" to zdanie o elemencie UI, nie do klienta.

**Propozycja zastępcza:**
> description: „Każda sytuacja jest inna. Te przykłady nie obiecują identycznego wyniku — pokazują, od czego zazwyczaj zaczyna się praca i co zmienia dobry pierwszy krok."

---

### Problem 10 — linia 575: zbyt formalne, ciężkie zdanie

**Obecny tekst:**
> description: „Profil specjalisty i istniejące publikacje pomagają sprawdzić wiarygodność spokojnie, bez opierania całej decyzji wyłącznie na testimonialach."

**Dlaczego problem:** „opierania całej decyzji wyłącznie na testimonialach" — niepotrzebnie formalne i defensywne.

**Propozycja zastępcza:**
> description: „Jeśli chcesz sprawdzić coś poza opiniami — profil CAPBT i dostępne artykuły są publiczne i widoczne przed pierwszym kontaktem."

---

## Wpisy blogowe (content/blog-mvp/)

Wpisy 02–05 z pierwszej paczki są spójne z tonem marki. Kilka drobnych uwag:

### Wpis 02 — pies szczeka na inne psy

Drobna uwaga: sekcja „Co możesz zrobić jeszcze dzisiaj" w krokach numerowanych używa nagłówków H3 z numerami. To dobry wzorzec — zachować w kolejnych wpisach.

Uwaga do FAQ — pytanie „Czy muszkawka albo kolczatka pomogą?" jest słuszne treściowo, ale pisownia: muskawka (nie muszkawka). Do korekty przed wdrożeniem.

### Wpis 03 — pies wyje

Spójny. Struktura trzech wzorców (lęk / frustracja / niedokończone oswojenie) jest bardzo czytelna — warto utrzymać podobną typologię w przyszłych wpisach o lękach.

### Wpis 04 — kot poza kuwetą

Mocny wpis. Akapit o kocurach i stanie nagłym jest ważny i dobrze osadzony. Warto go zachować mimo ogólnego spokojnego tonu — to jedna z niewielu sytuacji, gdzie szybkość reakcji ma znaczenie życiowe.

### Wpis 05 — konsultacja online

Sekcja „Co dostajesz realnie po 15 min audio" jest najlepszą częścią wpisu pod kątem AEO/snippetów. Warto rozważyć, czy tę listę w przyszłości wyeksponować wyżej (np. po leadzie).

---

## /psy i /koty (app/psy/page.tsx, app/koty/page.tsx)

Obie strony mają dobry, spokojny ton. Brak projektowego języka. Metadane są poprawne (description skupia się na problemach opiekuna, nie na „ofercie").

Jedna obserwacja (nie błąd, tylko propozycja): tytuły sekcji benefitCard używają słowa „Czytelność" i „Dopasowanie" jako eyebrow — to trochę abstrakcyjne. Przy kolejnym przeglądzie warto rozważyć czy nie lepsze byłoby coś bardziej konkretnego (np. „Co zyskujesz" zamiast „Czytelność"). Ale to niska priorytet — nie blokuje wdrożenia.
