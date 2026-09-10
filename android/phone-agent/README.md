# Prywatna aplikacja telefonu — Android 7+

To natywna aplikacja właściciela, nie publiczna aplikacja klienta. Ekran pokazuje płatne sprawy telefoniczne wraz z opisem przypadku, a usługa w tle pobiera wyłącznie oczekujące zadanie i automatycznie uruchamia rozmowę przez kartę SIM.

Przed instalacją APK należy ustawić na serwerze `PHONE_AGENT_TOKEN` i po wdrożeniu wpisać w aplikacji adres `https://regulskibehawiorysta.pl` oraz token. Token nie należy do repozytorium ani do zrzutów ekranu. Telefon wymaga jednorazowej zgody na telefon, SMS i stan telefonu oraz wyłączenia oszczędzania baterii dla tej aplikacji.

Podczas odebranej rozmowy aplikacja daje tylko właścicielowi lokalne sygnały: pojedynczy bip po 7:30, pojedynczy bip minutę przed końcem i podwójny bip po 15 minutach wraz z przypomnieniem o podsumowaniu. Nie wysyła tych sygnałów do klienta.

Wersja 0.1 ma celowo ograniczony zakres: automatycznie inicjuje połączenie i raportuje jego stan; zakończenie rozmowy pozostaje po stronie standardowego dialera Androida. Android bez uprawnień systemowych nie pozwala bezpiecznie rozłączać cudzej aplikacji Dialer automatycznie.
