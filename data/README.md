# Local data fallback

Pliki JSON w tym katalogu są wyłącznie pustym fallbackiem developerskim. Nie przechowujemy tu danych klientów ani zamówień testowych.

Na produkcji aplikacja powinna działać z `APP_DATA_MODE=supabase`. Gdy Vercel używa lokalnego fallbacku, zapis trafia do katalogu tymczasowego funkcji, a nie do repozytorium.
