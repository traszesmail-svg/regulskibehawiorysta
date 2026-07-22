# PDF5POLEK — demonstratory systemu

Ten folder jest pierwszym etapem planu `PLAN_PDF5POLEK.md`. Zawiera wspólny system czterech półek oraz demonstratory do akceptacji, nie finalną serię 40 materiałów.

## Półki

- `free` — bezpłatny start, zwykle 4–8 stron.
- `p19` — krótki poradnik, zwykle 8–14 stron.
- `p39` — plan działania, zwykle 18–30 stron.
- `p59` — kompendium premium, około 40–50 stron.

Każdy poziom zachowuje markę Regulski, wspólną stopkę i typografię. Różnicę budują: rytm stron, gęstość narzędzi, liczba poziomów informacji, liczba ilustracji i objętość uzasadniona treścią.

## Wygenerowane kotwice ImageGen

- `art/style-anchor.png` — kotwica wspólnej kreski.
- `art/tier-free.png` — prosty, lekki wariant.
- `art/tier-19.png` — pojedynczy problem i jeden kontekst działania.
- `art/tier-39.png` — powiązane strefy i struktura planu.
- `art/tier-59.png` — bogata scena editorialowa z wieloma warstwami środowiska.

Bitmapy nie zawierają tekstu. Tekst, ceny, logo i disclaimer są składane deterministycznie w HTML/CSS/PDF.

## Budowanie

```powershell
npm.cmd run pdf5polek-build-system
npm.cmd run pdf5polek-audit-system
```

Wynik trafia do `do-przegladu\system-pdf5polek-2026-07-22\`.

