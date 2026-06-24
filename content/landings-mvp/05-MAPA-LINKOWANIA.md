# Mapa linkowania — silosy problemowe

---

## 1. Wpisy blogowe → landingi problemowe

| Wpis blogowy | Linkuje do landingu | Gdzie w tekście |
|---|---|---|
| 02 — pies szczeka na inne psy | `/psy/reaktywnosc-na-smyczy` | CTA końcowe + opcjonalnie w treści przy sekcji „kiedy warto" |
| 03 — pies wyje kiedy zostaje sam | `/psy/lek-separacyjny` | CTA końcowe + opcjonalnie w treści |
| 04 — kot poza kuwetą | `/koty/zalatwianie-poza-kuweta` | CTA końcowe |
| 07 — pies ciągnie na smyczy | `/psy/reaktywnosc-na-smyczy` | CTA końcowe (uzupełniający silos) |
| 08 — kot drapie meble | `/koty/konflikt-miedzy-kotami` | opcjonalnie przy akapicie o napięciu środowiskowym |
| 09 — nowy pies 72h | `/psy/lek-separacyjny` | opcjonalnie przy sekcji o zostawaniu samemu |
| 10 — kiedy behawiorysta/trener | oba `/psy/reaktywnosc-na-smyczy` i `/psy/lek-separacyjny` | w sekcji o sytuacjach wymagających behawiorysty |
| 11 — behawiorysta/zoo/trener | `/psy/reaktywnosc-na-smyczy` (przykład) | opcjonalnie |

**Zasada:** każdy wpis blogowy silosu psa powinien mieć minimum jeden link do odpowiedniego landingu problemowego w CTA. Wpisy silosu kota analogicznie.

---

## 2. Landingi → strony główne i lejek

| Landing | /psy | /koty | /call (15 min) | /niezbednik | /o-mnie |
|---|:---:|:---:|:---:|:---:|:---:|
| /psy/reaktywnosc-na-smyczy | ✓ | — | ✓ | ✓ (guide reaktywny pies) | opt |
| /psy/lek-separacyjny | ✓ | — | ✓ | ✓ (guide pies zostaje sam) | opt |
| /koty/zalatwianie-poza-kuweta | — | ✓ | ✓ | ✓ (guide kot i kuweta) | opt |
| /koty/konflikt-miedzy-kotami | — | ✓ | ✓ | ✓ (guide konflikt kotów) | opt |

---

## 3. Cross-linki między landingami

| Landing | Cross-link do |
|---|---|
| `/koty/zalatwianie-poza-kuweta` | `/koty/konflikt-miedzy-kotami` — bo kuweta jest często sygnałem napięcia między kotami |
| `/koty/konflikt-miedzy-kotami` | `/koty/zalatwianie-poza-kuweta` — bo konflikt często objawia się problemami toaletowymi |
| `/psy/reaktywnosc-na-smyczy` | (brak cross-linku do lęku separacyjnego — tematy zbyt różne) |
| `/psy/lek-separacyjny` | (brak cross-linku do reaktywności — tematy zbyt różne) |

---

## 4. Hierarchia linkowania w silosach

```
SILOS PSY / REAKTYWNOŚĆ
wpis 02 szczekanie ──────────┐
wpis 07 ciągnie na smyczy ───┼──► /psy/reaktywnosc-na-smyczy ──► /psy ──► /call
wpis 09 nowy pies (opcja) ───┘                                         └──► /niezbednik

SILOS PSY / LĘK SEPARACYJNY
wpis 03 pies wyje samemu ────┐
wpis 09 nowy pies (opcja) ───┼──► /psy/lek-separacyjny ──────────► /psy ──► /call
                             └                                         └──► /niezbednik

SILOS KOTY / KUWETA
wpis 04 kot poza kuwetą ─────┐
                             ├──► /koty/zalatwianie-poza-kuweta ──► /koty ──► /call
wpis 08 drapanie (opcja) ────┘    ↕ cross                              └──► /niezbednik
                                  │
SILOS KOTY / KONFLIKTY ◄──────────┘
wpis 04 (cross) ─────────────┐
wpis 08 drapanie (opcja) ────┼──► /koty/konflikt-miedzy-kotami ──► /koty ──► /call
                             └                                         └──► /niezbednik
```

---

## 5. Zasady linkowania do zachowania

1. Każdy landing ma `/call` jako CTA główne — 15 min audio jest primary.
2. `/niezbednik` pojawia się tylko wtedy, gdy istnieje konkretny guide na ten temat.
3. `/o-mnie` nie jest wymagane na każdym landingu — wchodzi opcjonalnie przy FAQ o behawioryście.
4. Wpisy blogowe linkują do landingów w CTA, nie w środku treści (żeby nie zakłócać toku artykułu).
5. Cross-linki między landingami kocimi są wzajemne — oba problemy często się przeplatają.
6. Nie linkuj z landingów do innych wpisów blogowych (landing ma być końcem ścieżki, nie mostem do dalszego czytania).

---

## 6. Kolejne wpisy blogowe do silosów — rekomendacja

### Silos: reaktywność na smyczy (`/psy/reaktywnosc-na-smyczy`)
1. **Próg pobudzenia u psa — co to jest i jak go obserwować**
   - dlaczego: wyjaśnia mechanizm, który jest sercem pracy z reaktywnym psem; daje pełniejszy kontekst do landingu
2. **Reaktywność na smyczy — jak ćwiczyć luźną smycz bez szarpania**
   - dlaczego: praktyczny follow-up do landingu, wysoka intencja wyszukiwania, zamyka lukę w treściach

### Silos: lęk separacyjny (`/psy/lek-separacyjny`)
1. **Jak nagrać psa zostawionego samemu i co z nagrania odczytać**
   - dlaczego: bardzo konkretne, wysoka użyteczność, wpis, który dobrze działa przed konsultacją
2. **Rutyna wyjścia — jak krok po kroku oswajać psa z samotnością**
   - dlaczego: uzupełnia landing o technikę wdrożeniową, prowadzi do /niezbednik i /call

### Silos: kuweta (`/koty/zalatwianie-poza-kuweta`)
1. **Jak wybrać odpowiednią kuwetę i żwirek — co koty preferują**
   - dlaczego: jeden z najczęstszych podproblemów, duży ruch long-tail, konkretny i łatwy do napisania
2. **Stres kota w domu — jak środowisko wpływa na zachowania toaletowe**
   - dlaczego: łączy silos kuwety z szerszym tematem stresu środowiskowego, naturalny cross-link do landingu o konflikcie

### Silos: konflikty między kotami (`/koty/konflikt-miedzy-kotami`)
1. **Jak wprowadzić nowego kota do domu, w którym jest już jeden — plan krok po kroku**
   - dlaczego: wysoka intencja wyszukiwania, bardzo użyteczny temat, naturalnie linkuje do landingu i /call
2. **Agresja przekierowana u kota — co to jest i jak reagować**
   - dlaczego: często mylona z konfliktem wewnętrznym, wyjaśnienie różnicy jest wartościowe i SEO-friendly
