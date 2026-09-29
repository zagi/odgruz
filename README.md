# odgruz

Interaktywne sprzątanie dysku na macOS. Znajduje cache menedżerów pakietów, stare maszyny wirtualne Docker Sandboxes, `node_modules` w nieaktywnych projektach, symulatory iOS i gry, pokazuje ich rozmiar i pozwala wybrać, co usunąć. Na końcu zapisuje raport HTML ze stanem dysku przed i po. Wymaga Node 20.12+.

```bash
npx github:zagi/odgruz               # do czasu publikacji w npm
npx odgruz --dry-run                 # po publikacji: najpierw zobacz, co by zniknęło
```

| Opcja | Opis |
|---|---|
| `--dry-run` | Pokaż, co zostałoby usunięte, niczego nie usuwaj |
| `-y, --yes` | Bez pytań, usuwa tylko cache (npm, Go, bun, pnpm, pip, Playwright). Cache npx i uv oraz reszta kategorii wymagają wyboru |
| `--projects <dir>` | Gdzie szukać nieaktywnych projektów (domyślnie `~/projects`) |
| `--days <n>` | Projekt jest nieaktywny po `n` dniach bez commitów i zmian w plikach (domyślnie 30) |
| `--out <plik>` | Ścieżka raportu HTML |
| `--open` | Otwórz raport po zakończeniu |

Bezpieczeństwo: `odgruz` usuwa tylko ścieżki z wbudowanej listy, co najmniej dwa poziomy pod katalogiem domowym albo w `/Applications` i `/Library/Developer`. Nigdy nie używa `sudo`. Ścieżki, których nie da się usunąć, trafiają do raportu z gotową komendą.
