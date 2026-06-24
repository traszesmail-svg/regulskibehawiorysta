# Mapa linkowania — warstwa money pages

Dotyczy stron: `/cennik`, `/konsultacja-behawioralna-online`, `/behawiorysta-psow`, `/behawiorysta-kotow`
Format: co linkuje → gdzie → typ linku

---

## Zasady warstwy money pages

1. Każda money page linkuje do `/call` (CTA primary) i `/book` (CTA secondary).
2. Money pages linkują do kategorii (`/psy`, `/koty`) jako kontekst, nie jako CTA.
3. Money pages linkują do landingów problemowych przy przykładach problemów.
4. Money pages nie linkują bezpośrednio do wpisów blogowych (zbyt rozpraszające przy intencji zakupowej).
5. Wpisy blogowe linkują do money pages jako dodatkowy krok decyzyjny.
6. Landingi problemowe linkują do `/cennik` i `/konsultacja-behawioralna-online` przy opisie opcji.

---

## /cennik → outbound links

| Cel | Typ | Kontekst |
|---|---|---|
| `/call` | CTA primary | sekcja CTA końcowa i w tekście |
| `/book` | CTA secondary | sekcja CTA końcowa i w tekście |
| `/kontakt` | CTA tertiary | FAQ „jeśli termin nie pasuje" |
| `/konsultacja-behawioralna-online` | cross-link | sekcja co obejmuje 60 min |
| `/o-mnie` | opcjonalny | FAQ „jak pracuję" (jeśli pojawi się w przyszłości) |
| `/psy` | kontekst | sekcja dla kogo |
| `/koty` | kontekst | sekcja dla kogo |

---

## /konsultacja-behawioralna-online → outbound links

| Cel | Typ | Kontekst |
|---|---|---|
| `/call` | CTA primary | sekcja CTA + przebieg krok 1 |
| `/book` | CTA secondary | sekcja CTA |
| `/cennik` | cross-link | tabela porównawcza |
| `/o-mnie` | opcjonalny | sekcja czym jest konsultacja (kto prowadzi) |
| `/psy` | kontekst | sekcja dla kogo (psy) |
| `/koty` | kontekst | sekcja dla kogo (koty) |
| `/psy/reaktywnosc-na-smyczy` | przykład | kiedy wybrać 60 min |
| `/psy/lek-separacyjny` | przykład | kiedy wybrać 60 min |
| `/koty/zalatwianie-poza-kuweta` | przykład | kiedy wybrać 60 min |
| `/koty/konflikt-miedzy-kotami` | przykład | kiedy wybrać 60 min |
| wpis 05 (jak wygląda) | cross-link blogowy | sekcja przebieg (opcjonalny) |
| wpis 14 (jak się przygotować) | cross-link blogowy | sekcja co przygotować |

---

## /behawiorysta-psow → outbound links

| Cel | Typ | Kontekst |
|---|---|---|
| `/call` | CTA primary | sekcja CTA + „jak wygląda pierwszy krok" |
| `/book` | CTA secondary | sekcja CTA |
| `/psy` | kontekst | sekcja kategorii |
| `/psy/reaktywnosc-na-smyczy` | cross-link problemowy | sekcja CTA / footer linki |
| `/psy/lek-separacyjny` | cross-link problemowy | sekcja CTA / footer linki |
| `/konsultacja-behawioralna-online` | cross-link | sekcja „jak wygląda" |
| `/cennik` | cross-link | przy cenach |
| `/o-mnie` | opcjonalny | przy sekcji o metodach |
| wpis 10 (kiedy behawiorysta) | cross-link blogowy | sekcja behawiorysta vs trener |
| wpis 09 (nowy pies 72h) | opcjonalny | sekcja szczeniak |
| wpis 02 (szczekanie) | opcjonalny | sekcja reaktywność |
| wpis 03 (wycie) | opcjonalny | sekcja lęk separacyjny |

---

## /behawiorysta-kotow → outbound links

| Cel | Typ | Kontekst |
|---|---|---|
| `/call` | CTA primary | sekcja CTA + „jak wygląda pierwszy krok" |
| `/book` | CTA secondary | sekcja CTA |
| `/koty` | kontekst | sekcja kategorii |
| `/koty/zalatwianie-poza-kuweta` | cross-link problemowy | sekcja CTA / footer linki |
| `/koty/konflikt-miedzy-kotami` | cross-link problemowy | sekcja CTA / footer linki |
| `/konsultacja-behawioralna-online` | cross-link | sekcja „jak wygląda" |
| `/cennik` | cross-link | przy cenach |
| `/o-mnie` | opcjonalny | przy sekcji o metodach |
| wpis 04 (kot poza kuwetą) | opcjonalny | sekcja załatwianie poza kuwetą |
| wpis 24 (nowy kot) | opcjonalny | sekcja nowy kot |
| wpis 25 (agresja redyrekowana) | opcjonalny | sekcja agresja |

---

## Inbound links do money pages — co powinno linkować DO money pages

### Do /cennik

| Źródło | Gdzie w treści |
|---|---|
| `/konsultacja-behawioralna-online` | przy tabeli porównawczej |
| `/behawiorysta-psow` | przy cenach |
| `/behawiorysta-kotow` | przy cenach |
| `/psy/reaktywnosc-na-smyczy` | sekcja CTA (cross-link opcjonalny) |
| `/psy/lek-separacyjny` | sekcja CTA (cross-link opcjonalny) |
| `/koty/zalatwianie-poza-kuweta` | sekcja CTA (cross-link opcjonalny) |
| `/koty/konflikt-miedzy-kotami` | sekcja CTA (cross-link opcjonalny) |
| wpis 12 (ile kosztuje) | naturalny cross-link |
| wpis 05 (jak wygląda konsultacja) | naturalny cross-link |
| wpis 14 (jak się przygotować) | naturalny cross-link |

### Do /konsultacja-behawioralna-online

| Źródło | Gdzie w treści |
|---|---|
| `/cennik` | sekcja co obejmuje |
| `/behawiorysta-psow` | sekcja jak wygląda |
| `/behawiorysta-kotow` | sekcja jak wygląda |
| `/psy/reaktywnosc-na-smyczy` | sekcja CTA |
| `/psy/lek-separacyjny` | sekcja CTA |
| wpis 05 (jak wygląda konsultacja) | główna strona tematu |
| wpis 14 (jak się przygotować) | cross-link przy przygotowaniu |

### Do /behawiorysta-psow

| Źródło | Gdzie w treści |
|---|---|
| `/psy` | sekcja dla kogo / CTA |
| `/psy/reaktywnosc-na-smyczy` | cross-link opcjonalny |
| `/psy/lek-separacyjny` | cross-link opcjonalny |
| wpis 10 (kiedy behawiorysta) | CTA sekcji |
| wpis 11 (behawiorysta vs zoopsycholog) | CTA sekcji |

### Do /behawiorysta-kotow

| Źródło | Gdzie w treści |
|---|---|
| `/koty` | sekcja dla kogo / CTA |
| `/koty/zalatwianie-poza-kuweta` | cross-link opcjonalny |
| `/koty/konflikt-miedzy-kotami` | cross-link opcjonalny |
| wpis 04 (kot poza kuwetą) | cross-link w kontekście kota |
| wpis 24 (nowy kot) | cross-link w kontekście behawiorysty |

---

## Schemat hierarchii linkowania (uproszczony)

```
/psy ──────────────────────────────► /behawiorysta-psow ──► /call
/koty ─────────────────────────────► /behawiorysta-kotow ──► /call
                                              │
/psy/reaktywnosc-na-smyczy ─────────► /cennik ──────────────► /call
/psy/lek-separacyjny                          │                /book
/koty/zalatwianie-poza-kuweta ──────► /konsultacja-behawioralna-online
/koty/konflikt-miedzy-kotami

Wpisy blogowe ─────────────────────► money pages (cennik, konsultacja)
                                   ► landingi problemowe (CTA)
                                   ► /call lub /book
```

---

## Uwagi implementacyjne

- Linki do money pages z landingów i kategorii powinny mieć `rel="internal"` — nie nofollow.
- Money pages nie powinny być w breadcrumbie blogu (to nie są wpisy blogowe).
- `/cennik` i `/konsultacja-behawioralna-online` mogą być linkowane z navbaru lub footera jako pomocnicze — zależy od decyzji UX.
- `/behawiorysta-psow` i `/behawiorysta-kotow` są przede wszystkim stronami SEO pod frazy komercyjne — linkowanie z nawigacji jest opcjonalne, ważniejsze jest linkowanie z `/psy` i `/koty`.
