# Półka bezpłatna — PDF5POLEK

Folder zawiera zatwierdzoną listę tematów, architekturę źródeł, briefy oraz robocze teksty 10 materiałów.

- `TOPIC-ARCHITECTURE.md` — obietnice, granice bezpieczeństwa, role w lejku, konspekty i źródła.
- `manifest.json` — kolejność i metadane materiałów.
- `guides/` — autorskie polskie teksty w wersji redakcyjnej.

## Generowanie wersji do przeglądu

```powershell
npm.cmd run pdf5polek-build-free
```

Pliki trafiają do `do-przegladu/system-pdf5polek-2026-07-22/free-shelf/`.

Każdy materiał ma osobną ilustrację tematyczną wygenerowaną przez ImageGen. Prompty i mapowanie assetów zapisano w `IMAGEGEN-PROMPTS.md`.

## QA

```powershell
npm.cmd run pdf5polek-audit-free
npm.cmd run pdf5polek-review-free
```

Audyt zapisuje `audit.json`, a skrypt przeglądowy tworzy trzy plansze: okładki, pierwsze strony treści i zakończenia.
