# Live Setup

Repo ma już domkniętą część kodową Promptu 6:

- `app/layout.tsx` renderuje consent-gated GA4 przez `AnalyticsConsent`
- banner zgody i storage/cookie dla analityki są gotowe
- wewnętrzny funnel ledger działa niezależnie od GA4

To, co zostało, jest wdrożeniem środowiska i konfiguracją zewnętrznych usług.

## 1. Vercel Env

Ustaw w środowisku produkcyjnym co najmniej:

```env
APP_DATA_MODE=supabase
APP_PAYMENT_MODE=manual
NEXT_PUBLIC_APP_URL=https://regulskibehawiorysta.pl
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MAIL_PROVIDER=resend
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Regulski <kontakt@regulskibehawiorysta.pl>
CUSTOMER_EMAIL_MODE=auto
ADMIN_NOTIFICATION_EMAIL=krzyre@gmail.com
REGULSKI_CONTACT_EMAIL=kontakt@regulskibehawiorysta.pl
MANUAL_PAYMENT_BLIK_PHONE=...
MANUAL_PAYMENT_ACCOUNT_NAME=Krzysztof Regulski
# A selected Zapytaj slot is held for 5 minutes while the form is completed.
RESERVATION_WINDOW_MINUTES=5
# A reported Zapytaj BLIK payment can await manual confirmation for up to 24 hours.
ZAPYTAJ_MANUAL_PAYMENT_HOLD_MINUTES=1440
# This 60-minute value applies only to other manual-payment flows.
MANUAL_PAYMENT_HOLD_MINUTES=60
PAYU_MODE=disabled
```

Opcjonalnie dla GA4:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 2. Search Console

1. Wejdź do Google Search Console.
2. Dodaj `Domain property` dla `regulskibehawiorysta.pl`.
3. Dodaj rekord TXT w DNS.
4. Po weryfikacji dodaj sitemapę:
   `https://regulskibehawiorysta.pl/sitemap.xml`
5. Po deployu użyj `URL Inspection` dla:
   - `/`
   - `/behawiorysta-online-polska`
   - `/faq`
   - `/o-mnie`

## 3. Bing Webmaster Tools

1. Dodaj `https://regulskibehawiorysta.pl`.
2. Najszybciej: import z GSC.
3. Potwierdź sitemapę:
   `https://regulskibehawiorysta.pl/sitemap.xml`

## 4. Analytics

Repo jest przygotowane pod GA4 bez ładowania skryptu przed zgodą.

### Wariant A: GA4

1. Utwórz web data stream dla `https://regulskibehawiorysta.pl`.
2. Skopiuj `Measurement ID`.
3. Ustaw `NEXT_PUBLIC_GA_MEASUREMENT_ID` w Vercel.
4. Zrób redeploy.
5. Wejdź na stronę, zaakceptuj analitykę i sprawdź Realtime w GA4.

### Wariant B: bez GA4

Jeśli nie chcesz zewnętrznej analityki od razu, zostaw `NEXT_PUBLIC_GA_MEASUREMENT_ID` puste.
Wewnętrzny ledger i `/admin` dalej zbierają first-party metryki funnelu.

## 5. Resend i domena nadawcy

1. Dodaj domenę do Resend.
2. W DNS ustaw rekordy SPF, DKIM i ewentualnie DMARC zgodnie z panelem Resend.
3. Ustaw `RESEND_FROM_EMAIL` na adres z własnej domeny.
4. Nie zostawiaj `onboarding@resend.dev`, bo blokuje wysyłkę do zewnętrznych odbiorców.

## 6. Rich Results i indeksacja

Po publicznym deployu sprawdź ręcznie:

- Google Rich Results Test dla:
  - `/faq`
  - `/psy`
  - `/koty`
  - `/o-mnie`
- `site:regulskibehawiorysta.pl` po kilku dniach

## 7. Go-Live Commands

Po ustawieniu envów uruchom:

```bash
npm run build
npm test
node --import tsx scripts/live-readiness.ts --report-only
node --import tsx scripts/live-smoke.ts --url https://regulskibehawiorysta.pl
node --import tsx scripts/live-clickthrough-report.ts
```

Jeśli kiedyś włączysz PayU produkcyjnie:

```bash
npm run payu-smoke:production
```

## 8. Definition of Done

Prompt 6 uznaj za domknięty dopiero gdy:

- `NEXT_PUBLIC_APP_URL` wskazuje na publiczny HTTPS
- runtime działa na Supabase, nie na local fallback
- maile klienta wychodzą z własnej domeny
- GSC i Bing mają dodaną sitemapę
- GA4 jest albo świadomie włączone po zgodzie, albo świadomie pominięte
- Rich Results Test przechodzi dla publicznych URL
- `qa-reports/latest-live-readiness.md` nie pokazuje blockerów środowiskowych
