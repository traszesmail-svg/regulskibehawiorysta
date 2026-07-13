# Plan Poprawek Wizualnych (Visual QA & Polish)
## regulskibehawiorysta.pl — 12.07.2026

**Strategia:** "Mobile First, Desktop Second". Każdą stronę sprawdzamy najpierw w widoku mobilnym, a następnie na komputerze.

### 🗂 ETAP 1: Komponenty Globalne (Fundament)
- [ ] Nawigacja główna (Header, logo, linki) — Mobile & Desktop
- [ ] Menu mobilne (rozwijane)
- [ ] Stopka (Footer, linki prawne, certyfikaty) — Mobile & Desktop
- [ ] Karuzela z opiniami nad stopką
- [ ] Wyskakujący pop-up startowy (Intro)

### 🏠 ETAP 2: Strona Główna (`/`)
- [ ] Sekcja Hero (grafiki, przyciski akcji)
- [ ] Główny selektor/quiz na hero (Wybór drogi)
- [ ] Sekcja "Najczęściej szukane teraz" (karty problemów dla psów i kotów)
- [ ] Sekcja Trend Radar (sezonowe problemy)
- [ ] Sekcja "Jak to działa" (ikony kroków)
- [ ] Sekcja o specjaliście (zdjęcie, tekst, ułożenie logo COAPE)
- [ ] Akordeon FAQ na stronie głównej

### 🛒 ETAP 3: Lejek Rezerwacji (Najważniejsze dla konwersji)
- [ ] Wybór ścieżki i quiz (`/wybor`, `/quiz`)
- [ ] Strona z cennikiem i porównaniem usług (`/cennik`)
- [ ] Pełny cennik (`/cennik/pelny`)
- [ ] Kalendarz wyboru terminu (`/book`)
- [ ] Formularz rezerwacji z danymi klienta (`/form`)
- [ ] Ekran potwierdzenia (Sukces / Oczekiwanie na płatność)

### 📖 ETAP 4: Strony Informacyjne i Ofertowe
- [ ] Strona "O mnie" (`/o-mnie`) — pozycjonowanie grafik, tekstów, opinii
- [ ] Zbiorcza strona dla psów (`/psy` lub `/problemy#pies`)
- [ ] Zbiorcza strona dla kotów (`/koty` lub `/problemy#kot`)
- [ ] Główna strona FAQ (`/faq`)
- [ ] Kontakt (`/kontakt`)
- [ ] Strona informacyjna usług online (`/behawiorysta-online-polska` / `konsultacja-behawioralna-online`)

### 📦 ETAP 5: E-commerce i Materiały
- [ ] Katalog materiałów PDF (`/materialy`)
- [ ] Detale pojedynczego e-booka / pakietu
- [ ] Formularz zakupu (Checkout koszyka)

### 📝 ETAP 6: Blog i Treści
- [ ] Lista artykułów na blogu (`/blog`)
- [ ] Pojedynczy artykuł (typografia, marginesy, czytelność)
- [ ] Landing page'e dla newslettera / lead magnetów

---
*Proces operacyjny:*
1. Developer (AI) uruchamia środowisko i analizuje strukturę wybranej strony.
2. Dyrektor Artystyczny / Tester (User) przegląda stronę w przeglądarce i zgłasza poprawki (np. "przesunięty listek", "za mały odstęp").
3. Developer aplikuje poprawki CSS/Tailwind, HMR odświeża widok.
4. User akceptuje i przechodzimy do kolejnego punktu na liście.
