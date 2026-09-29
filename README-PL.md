# odgruz

[English](README.md)

Interaktywne sprzątanie dysku na macOS. Znajduje cache menedżerów pakietów, maszyny wirtualne Docker Sandboxes, `node_modules` w nieaktywnych projektach, symulatory iOS i dane gier, pokazuje ich rozmiar i pozwala wybrać, co usunąć. Na końcu zapisuje raport HTML ze stanem dysku przed i po.

```bash
npx odgruz --dry-run    # zobacz, co by zniknęło, niczego nie usuwaj
npx odgruz              # interaktywne sprzątanie
```

Alternatywa, prosto z GitHuba: `npx github:zagi/odgruz`.

## Opcje

| Opcja | Opis |
|---|---|
| `--dry-run` | Pokaż, co zostałoby usunięte, niczego nie usuwaj |
| `-y, --yes` | Bez pytań, usuwa tylko kategorie oznaczone poniżej jako cache |
| `--projects <dir>` | Gdzie szukać nieaktywnych projektów (domyślnie `~/projects`) |
| `--days <n>` | Projekt jest nieaktywny po `n` dniach bez commitów i zmian w plikach (domyślnie 30) |
| `--out <plik>` | Ścieżka raportu HTML |
| `--open` | Otwórz raport po zakończeniu |
| `--lang <en\|pl>` | Język interfejsu i raportu |

## Kategorie

Kategorie z grupy cache są zaznaczone domyślnie na liście i tylko je usuwa `--yes`. Kategorie opcjonalne wymagają jawnego wyboru.

| Kategoria | Co usuwa | Grupa |
|---|---|---|
| Cache npm | `~/.npm/_cacache` | cache |
| Pakiety uruchamiane przez npx | `~/.npm/_npx` (może zatrzymać działający serwer MCP) | opcjonalna |
| Cache Go | Cache buildów Go i pobrane moduły | cache |
| Cache bun | `~/.bun/install/cache` | cache |
| pnpm: cache i stare magazyny | Cache metadanych pnpm i magazyny starszych wersji pnpm; aktualny magazyn zostaje | cache |
| Cache pip | `~/Library/Caches/pip` | cache |
| Cache uv | `~/.cache/uv` (może zatrzymać działający serwer MCP przez uvx) | opcjonalna |
| Przeglądarki Playwright | `~/Library/Caches/ms-playwright` | cache |
| Docker Sandboxes | `~/.docker/sandboxes` (stan maszyn wirtualnych przepada) | opcjonalna |
| node_modules w nieaktywnych projektach | `node_modules` projektów bez zmian od `--days` dni | opcjonalna |
| Symulatory iOS | Dane CoreSimulator; część systemowa wymaga `sudo` | opcjonalna |
| Gry: Steam, Whisky, Wineskin | Aplikacja Steam z grami i lokalnymi zapisami, butelki Whisky z programami Windows, Wineskin | opcjonalna |

## Język

Domyślnie angielski. Polski włącza się, gdy wykryte locale zaczyna się od `pl` (bez rozróżniania wielkości liter) albo gdy podasz `--lang pl`. Wygrywa pierwsze źródło, które jest ustawione i niepuste:

1. `--lang`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG` (`C` i `POSIX` oznaczają angielski)
5. Locale systemu

`--lang` przyjmuje tylko `en` lub `pl`. Inna wartość wypisuje błąd i kończy program kodem 1.

## Bezpieczeństwo

- Usuwa tylko ścieżki z wbudowanej listy.
- Ścieżka musi leżeć co najmniej dwa poziomy pod katalogiem domowym albo jeden poziom pod `/Applications` lub `/Library/Developer`. Sam `~/Library` nigdy nie jest usuwany.
- Nigdy nie używa `sudo`. Ścieżki, których nie da się usunąć, trafiają do raportu z gotową komendą.
- Pliki usuwa przez `rm` z Node, a zewnętrzne komendy uruchamia tylko przez `execFile` z tablicą argumentów, nigdy przez powłokę.

## Wymagania

macOS i Node 20.12 lub nowszy.

## Licencja

[MIT](LICENSE)
