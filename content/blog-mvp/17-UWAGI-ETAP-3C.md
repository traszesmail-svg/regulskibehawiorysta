# Uwagi końcowe — Etap 3C

## Czego świadomie nie ruszałem

- `app/`, `components/`, `lib/` — żaden plik niezmieniony,
- `app/page.tsx`, `app/psy/page.tsx`, `app/koty/page.tsx`, `app/o-mnie/page.tsx`, `app/opinie/page.tsx`, `app/kontakt/page.tsx`, `app/niezbednik/page.tsx` — przeczytane do audytu, ale kod niezmieniony,
- routing, booking, płatności, legal — nieruszone,
- metadata w istniejących `page.tsx` — QA tylko jako propozycje tekstowe w `15-REDAKCYJNY-QA.md`.

Cały etap 3C mieści się w plikach 11–17 w `content/blog-mvp/`.

## Co zrobione w tym etapie

**Blog Round 2 (pliki 11–14):**
- Wpis 11: Behawiorysta, zoopsycholog czy trener — do kogo się zgłosić?
- Wpis 12: Ile kosztuje konsultacja behawioralna i co dostajesz w cenie
- Wpis 13: Czym jest COAPE i co oznacza behawiorysta po tej szkole
- Wpis 14: Jak przygotować się do konsultacji behawioralnej online

Każdy ma pełną strukturę: slug / title SEO / meta / H1 / lead z krótką odpowiedzią / H2 z treścią / FAQ / CTA / propozycje linków wewnętrznych.

**QA redakcyjne (plik 15):**
Zidentyfikowano 10 konkretnych problemów w stronach głównych. Każdy z gotową propozycją 1:1 do wklejenia. Strony `/psy` i `/koty` są spójne — nie wymagają interwencji.

**Mapa linkowania i CTA pack (plik 16):**
Pełna tabela 12 wpisów × 5 celów linkowania. Cztery warianty CTA końcowego. Lekkie CTA do Niezbędnika i 15 min audio. Zasady linkowania do zachowania w kolejnych wpisach.

## Co warto zrobić w kolejnej paczce contentu

**Następne wpisy o wysokim priorytecie:**
- Lęk przed burzą i fajerwerkami — plan na sezon (najlepiej lipiec przed wakacjami i wrzesień przed sylwestrem)
- Dziecko i pies / dziecko i kot — pierwsze tygodnie. Wysoka intencja, dobre wejście do `/psy` i `/koty`
- Pies po adopcji vs. pies z hodowli — na co zwracać uwagę inaczej
- Stres kota w czasie zmian w domu (przeprowadzka, remont, nowy domownik)

**Do uzupełnienia w SEO copy pack:**
- `/blog` — brakowało w oryginalnym zestawie. Title + meta do dopisania, gdy strona bloga będzie wdrożona.

**Do rozważenia przy kolejnym etapie:**
- Wzbogacenie wpisów o CTA do Niezbędnika tam, gdzie guide bezpośrednio wspiera temat wpisu (szczególnie wpisy o kocie — guide o kuwecie i konflikcie są już gotowe).
- Przegląd cross-linków po wdrożeniu bloga — część z nich wskazuje na `/blog/[slug]`, który nie istnieje technicznie do momentu wdrożenia Codexa.
