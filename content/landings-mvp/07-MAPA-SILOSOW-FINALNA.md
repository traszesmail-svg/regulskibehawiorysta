# Mapa silosów — wersja finalna

Obejmuje wszystkie 29 wpisów blogowych + 4 landingi problemowe.
Praktyczna mapa do wdrożenia dla Codexa.

---

## Struktura silosów

```
SILOS 1: REAKTYWNOŚĆ NA SMYCZY
Landing:  /psy/reaktywnosc-na-smyczy
Wpisy:    02 szczekanie na inne psy
          07 ciągnie na smyczy (nawyk vs. problem)
          18 próg pobudzenia u psa
          19 ćwiczenie luźnej smyczy
          26 ciągnie — od czego zacząć [NOWY]

SILOS 2: LĘK SEPARACYJNY
Landing:  /psy/lek-separacyjny
Wpisy:    03 pies wyje kiedy zostaje sam
          20 jak nagrać psa zostawionego samemu
          21 rutyna wyjścia — oswajanie z samotnością
          27 jak nauczyć psa zostawania samemu [NOWY]

SILOS 3: KUWETA
Landing:  /koty/zalatwianie-poza-kuweta
Wpisy:    04 kot załatwia się poza kuwetą
          22 jak wybrać kuwetę i żwirek
          23 stres kota a zachowania toaletowe
          28 jak ustawić kuwetę dla kota [NOWY]

SILOS 4: KONFLIKTY MIĘDZY KOTAMI
Landing:  /koty/konflikt-miedzy-kotami
Wpisy:    24 jak wprowadzić nowego kota do domu
          25 agresja przekierowana u kota
          29 jak zapoznać dwa koty [NOWY]
```

---

## Tabela linkowania: wpis → landing

| Wpis | Landing | Gdzie w tekście |
|---|---|---|
| 02 — szczekanie | `/psy/reaktywnosc-na-smyczy` | CTA końcowe |
| 03 — wycie | `/psy/lek-separacyjny` | CTA końcowe |
| 04 — kot/kuweta | `/koty/zalatwianie-poza-kuweta` | CTA końcowe |
| 07 — ciągnie (nawyk) | `/psy/reaktywnosc-na-smyczy` | CTA + opcja w tekście |
| 08 — drapanie mebli | `/koty/konflikt-miedzy-kotami` | opcja w tekście |
| 09 — nowy pies 72h | `/psy/lek-separacyjny` | opcja w tekście |
| 18 — próg pobudzenia | `/psy/reaktywnosc-na-smyczy` | CTA końcowe |
| 19 — luźna smycz | `/psy/reaktywnosc-na-smyczy` | CTA końcowe |
| 20 — nagranie psa | `/psy/lek-separacyjny` | CTA końcowe |
| 21 — rutyna wyjścia | `/psy/lek-separacyjny` | CTA końcowe |
| 22 — kuweta/żwirek | `/koty/zalatwianie-poza-kuweta` | CTA końcowe |
| 23 — stres kota | `/koty/zalatwianie-poza-kuweta` + `/koty/konflikt-miedzy-kotami` | CTA + opcja |
| 24 — nowy kot | `/koty/konflikt-miedzy-kotami` | CTA końcowe |
| 25 — agresja przekierowana | `/koty/konflikt-miedzy-kotami` | CTA końcowe |
| 26 — ciągnie od czego zacząć | `/psy/reaktywnosc-na-smyczy` | CTA + w tekście |
| 27 — zostawanie samemu | `/psy/lek-separacyjny` | CTA + w tekście |
| 28 — jak ustawić kuwetę | `/koty/zalatwianie-poza-kuweta` | CTA + w tekście |
| 29 — zapoznać dwa koty | `/koty/konflikt-miedzy-kotami` | CTA + w tekście |

**Wpisy ogólne (nie silosowe) linkują do landingów tylko opcjonalnie:**
- 05 konsultacja online → bez landingu (linkuje do `/o-mnie`, `/call`)
- 10, 11 — kiedy behawiorysta → opcjonalnie do `/psy/reaktywnosc-na-smyczy`
- 12 — koszty → bez landingu
- 13 — COAPE → bez landingu
- 14 — przygotowanie do konsultacji → bez landingu

---

## Tabela linkowania: landing → /psy, /koty, /call, /niezbednik, /o-mnie

| Landing | /psy | /koty | /call | /niezbednik | /o-mnie |
|---|:---:|:---:|:---:|:---:|:---:|
| reaktywność | ✓ | — | ✓ | ✓ | opt |
| lęk separacyjny | ✓ | — | ✓ | ✓ | opt |
| kuweta | — | ✓ | ✓ | ✓ | opt |
| konflikty | — | ✓ | ✓ | ✓ | opt |

---

## Hierarchia CTA w treściach

### Primary (obowiązkowe w każdej treści)
→ `/call` — 15 min audio
Warianty tekstu:
- „[Zamów 15 min audio](/call)"
- „[15 min audio — bez kamery](/call)"

### Secondary (obowiązkowe w treściach silosowych)
→ właściwy landing problemowy
- wpisy silosu reaktywność → `/psy/reaktywnosc-na-smyczy`
- wpisy silosu lęk → `/psy/lek-separacyjny`
- wpisy silosu kuweta → `/koty/zalatwianie-poza-kuweta`
- wpisy silosu konflikty → `/koty/konflikt-miedzy-kotami`

### Tertiary (jeśli pasuje, nie wszędzie)
→ `/niezbednik` — tylko gdy istnieje konkretny guide na ten temat
→ `/o-mnie` — w wpisach informacyjnych (COAPE, konsultacja, kiedy behawiorysta)
→ `/psy` lub `/koty` — zawsze w CTA końcowym wpisów silosowych

### Czego nie linkować
- Nie linkuj z landingów do innych wpisów blogowych (landing = koniec ścieżki, nie most do dalszego czytania).
- Nie linkuj `/opinie` w środku tekstu — opcjonalnie tylko w boxie CTA.
- Nie linkuj cross-landingów psy ↔ koty (różna persona, różna decyzja).
- Nie linkuj krzyżowo silosów psa z psem (reaktywność ↔ separacja) — zbyt odległe.
- Cross-link dozwolony: `/koty/zalatwianie-poza-kuweta` ↔ `/koty/konflikt-miedzy-kotami` (oba problemy się przenikają).

---

## Cross-linki między wpisami w silosie (max 2 per wpis)

| Wpis | Cross-link do |
|---|---|
| 02 | 07, 18 |
| 07 | 02, 19 |
| 18 | 02, 19 |
| 19 | 18, 07 |
| 26 | 07, 19 |
| 03 | 20, 21 |
| 20 | 03, 21 |
| 21 | 03, 20 |
| 27 | 03, 20 |
| 04 | 22, 23 |
| 22 | 04, 23 |
| 23 | 04, 22 |
| 28 | 04, 22 |
| 24 | 25, 29 |
| 25 | 24, 08 |
| 29 | 24, 25 |

---

## Wpisy ogólne — uproszczone linkowanie

| Wpis | Primary CTA | Secondary |
|---|---|---|
| 05 konsultacja online | `/call` | `/o-mnie`, `/psy`, `/koty` |
| 09 nowy pies 72h | `/call` | `/psy`, `/niezbednik` |
| 10 kiedy behawiorysta | `/call` | `/o-mnie` |
| 11 zoo/behawiorysta | `/call` | `/o-mnie` |
| 12 koszty | `/call` | wpis 05 |
| 13 COAPE | `/call` | `/o-mnie` |
| 14 przygotowanie | `/call` | wpis 05 |
