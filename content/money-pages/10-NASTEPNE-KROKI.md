# Następne kroki po warstwie money pages

Po wdrożeniu ETAP 5A (4 money pages + packi redakcyjne) — co ma sens dalej.
Kolejność = priorytet.

---

## 1. Wdrożenie korekt z ETAP 5A QA

**Plik:** `09-REDAKCYJNY-QA-MONEY-LAYER.md`
**Co zrobić:** wdrożyć korekty HIGH i MEDIUM z audytu QA — szczególnie /o-mnie (hierarchia produktów) i /niezbednik (CTA i opis).
**Kto:** Codex (zmiany w plikach app/)
**Priorytet:** HIGH — przed wdrożeniem money pages, żeby nie było niespójności

---

## 2. Wdrożenie korekt z ETAP 4C cleanup (landing 03)

**Plik:** `content/landings-mvp/08-CLEANUP-LANDINGI-I-NOWE-WPISY.md`
**Co zrobić:** zmiana nagłówków „Filtr X" → opisowe w landingu `/koty/zalatwianie-poza-kuweta`
**Kto:** Codex
**Priorytet:** MEDIUM — stoi od ETAP 4C, warto domknąć

---

## 3. Blog Round 4 — 4 wpisy z listy 8 tematów

**Plik referencyjny:** `content/landings-mvp/09-NASTEPNE-8-TEMATOW.md`
**Rekomendowane tematy na Round 4 (wg priorytetu z listy):**

1. **Pies boi się burzy i fajerwerków** — sezonowy, timing jest kluczowy (wrzesień–październik). Najwyższy priorytet z listy.
2. **Dziecko i pies** — wysoka intencja, emocjonalny, łączy się z istniejącym silosem reaktywności.
3. **Pies szczeka w domu na dźwięki i ruch za oknem** — rozszerza silos reaktywności, niski koszt pisania.
4. **Nagła zmiana zachowania u kota** — krótki, decyzyjny, wejście do /koty i /call. Ważne klinicznie.

**Format:** każdy wpis 700–900 słów, struktura jak dotychczasowe wpisy blogowe.
**Dodać do:** `content/blog-mvp/` jako pliki 30–33.

---

## 4. Strona /blog (index bloga)

**Stan:** brak dedykowanej strony `/blog` z listą wpisów.
**Co zrobić:** content-pack z opisem strony, lead sekcji, kategorie, krótkie opisy postów dla index page.
**Kto:** content (Claude) — SEO copy + struktura; Codex — wdrożenie komponentu
**Priorytet:** MEDIUM — potrzebne do SEO bloga (linkowanie kategorii, breadcrumb, rich snippets)

---

## 5. Strona /o-mnie — rozszerzenie contentowe

**Stan:** strona jest, ale cienka jeśli chodzi o kontekst kwalifikacji i metod.
**Co zrobić:** pack contentowy z:
- rozszerzony opis metod (force-free, COAPE, co to oznacza w praktyce)
- skrócona historia zawodowa bez overclaiming
- sekcja „jak pracuję" (nie jako pitch, ale jako informacja praktyczna)
**Priorytet:** LOW — strona działa, rozszerzenie to wartość dodana, nie blokada

---

## 6. Sezonowy pack — Sylwester i fajerwerki

**Timing:** wdrożyć przed październikiem (sezon lękowy psy)
**Co zrobić:**
- wpis blogowy (już zaplanowany w punkcie 3 powyżej)
- opcjonalnie: landing `/psy/lek-przed-dzwiekami` jeśli temat trakcjonuje
- opcjonalnie: krótki poradnik do Niezbędnika (PDF / strona)
**Priorytet:** TIME-SENSITIVE — nie odkładać jeśli jest wrzesień lub październik

---

## 7. Schema markup pack (AEO)

**Stan:** brak danych strukturalnych na stronach.
**Co zrobić:** content-pack z danymi JSON-LD dla:
- `FAQPage` schema dla każdej money page i landingu (gotowe FAQ bloki istnieją)
- `Service` schema dla /cennik
- `Person` schema dla /o-mnie (behawioryst)
- `LocalBusiness` opcjonalnie jeśli są wizyty stacjonarne
**Kto:** content przygotowuje JSON-LD; Codex wdraża
**Priorytet:** MEDIUM — wartość SEO/AEO długoterminowa

---

## 8. Opinie / testimoniale — pack contentowy

**Stan:** strona /opinie istnieje, ale content jest generyczny (zidentyfikowane w QA ETAP 3C).
**Co zrobić:**
- zebrać rzeczywiste opinie od klientów (poza scope contentowym)
- przygotować strukturę dla rich snippets (`Review` schema)
- napisać lead i sekcję kontekstu dla strony /opinie
**Priorytet:** LOW — zależy od dostępności rzeczywistych opinii

---

## Kolejność wdrożenia — podsumowanie

| Krok | Co | Priorytet | Kto |
|---|---|---|---|
| 1 | QA korekty /o-mnie, /niezbednik, homepage CTA | HIGH | Codex |
| 2 | Cleanup landing 03 (nagłówki filtrów) | MEDIUM | Codex |
| 3a | Wpis: pies boi się burzy | HIGH (sezonowy) | Content |
| 3b | Wpis: dziecko i pies | MEDIUM | Content |
| 3c | Wpis: szczekanie w domu | MEDIUM | Content |
| 3d | Wpis: nagła zmiana kota | MEDIUM | Content |
| 4 | Schema markup pack (FAQ+Service+Person) | MEDIUM | Content + Codex |
| 5 | Strona /blog index | MEDIUM | Content + Codex |
| 6 | /o-mnie rozszerzenie | LOW | Content |
| 7 | /opinie pack | LOW | Content (zależny od danych) |
