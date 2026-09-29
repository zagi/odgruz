import type { Messages } from './types.js'

/** Polska odmiana: 1 → one, 2–4 (poza 12–14) → few, reszta → many. */
function form(count: number): 'one' | 'few' | 'many' {
  if (count === 1) return 'one'
  const last = count % 10
  const lastTwo = count % 100
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? 'few' : 'many'
}

const plural = (count: number, one: string, few: string, many: string) =>
  `${count} ${{ one, few, many }[form(count)]}`

export const pl: Messages = {
  locale: 'pl',
  dateLocale: 'pl-PL',
  help: `odgruz: interaktywne sprzątanie dysku na macOS

Użycie: npx odgruz [opcje]

  --dry-run          pokaż, co zostałoby usunięte, niczego nie usuwaj
  -y, --yes          bez pytań: zaznacz tylko cache (npm, Go, bun, pnpm, pip, Playwright)
  --projects <dir>   gdzie szukać nieaktywnych projektów (domyślnie ~/projects)
  --days <n>         projekt jest nieaktywny po n dniach bez zmian (domyślnie 30)
  --out <plik>       ścieżka raportu HTML (domyślnie ./odgruz-raport-<data>.html)
  --lang <en|pl>     język interfejsu (domyślnie wg locale systemu)
  --open             otwórz raport po zakończeniu
  -h, --help         ta pomoc
`,
  targets: {
    npm: { label: 'Cache npm', impact: 'Paczki pobiorą się ponownie przy następnej instalacji.' },
    npx: {
      label: 'Pakiety uruchamiane przez npx',
      impact: 'Narzędzia uruchamiane przez npx (np. serwery MCP) pobiorą się ponownie. Jeśli któreś właśnie działa, może przestać działać.',
    },
    go: { label: 'Cache Go', impact: 'Pierwszy build Go potrwa dłużej, moduły pobiorą się ponownie.' },
    bun: { label: 'Cache bun', impact: 'Paczki pobiorą się ponownie przy następnym bun install.' },
    pnpm: {
      label: 'pnpm: cache i stare magazyny',
      impact: 'Aktualny magazyn zostaje. Znikają cache metadanych i magazyny starych wersji pnpm.',
    },
    python: { label: 'Cache pip', impact: 'Paczki Pythona pobiorą się ponownie.' },
    uv: {
      label: 'Cache uv',
      impact: 'Paczki i środowiska uvx (np. serwery MCP) pobiorą się ponownie. Jeśli któreś właśnie działa, może przestać działać.',
    },
    playwright: {
      label: 'Przeglądarki Playwright',
      impact: 'Testy E2E pobiorą przeglądarki ponownie (npx playwright install).',
    },
    'docker-sandboxes': {
      label: 'Docker Sandboxes',
      impact: 'Maszyny wirtualne z docker sandbox. Jeśli ich używasz, stracisz ich stan.',
    },
    'node-modules': {
      label: 'node_modules w nieaktywnych projektach',
      impact: 'Przed uruchomieniem takiego projektu trzeba ponownie zainstalować zależności.',
    },
    'ios-simulators': {
      label: 'Symulatory iOS',
      impact: 'Jeśli używasz Xcode, symulatory trzeba pobrać ponownie. Część systemowa wymaga sudo.',
    },
    games: {
      label: 'Gry: Steam, Whisky, Wineskin',
      impact: 'Usuwa aplikację Steam z grami i lokalnymi zapisami (userdata) oraz butelki Whisky razem z zainstalowanymi w nich programami Windows.',
    },
  },
  cli: {
    macOnly: 'odgruz działa tylko na macOS.',
    invalidDays: '--days musi być liczbą całkowitą większą od 0.',
    invalidLang: (value) => `Nieznany język: ${value}. Dozwolone wartości --lang: en, pl.`,
    noTty: 'Brak terminala interaktywnego. Użyj --yes (tylko cache) albo --dry-run --yes.',
    introDryRun: 'odgruz · tryb próbny',
    freeSpace: (free, total) => `Wolne miejsce: ${free} z ${total}`,
    scanning: 'Skanuję dysk',
    scanningTarget: (label) => `Skanuję: ${label}`,
    found: (count, total) => `Znaleziono ${plural(count, 'kategorię', 'kategorie', 'kategorii')}, razem ${total}`,
    selectPrompt: 'Co usunąć? Spacja zaznacza, Enter zatwierdza.',
    confirmDryRun: (total) => `Pokazać w raporcie ${total} do usunięcia?`,
    confirmDelete: (total) => `Usunąć ${total}?`,
    cancelled: 'Przerwano. Nic nie zostało usunięte.',
    reportUnwritable: (out, message) => `Nie mogę zapisać raportu w ${out}: ${message}. Nic nie zostało usunięte.`,
    cleaningDryRun: 'Tryb próbny…',
    cleaning: 'Usuwam…',
    done: 'Gotowe',
    failedCount: (count) =>
      `Nie udało się usunąć ${count === 1 ? '1 ścieżki' : `${count} ścieżek`}. Komendy do ręcznego usunięcia są w raporcie.`,
    outroDryRun: (out) => `Tryb próbny, nic nie usunięto. Raport: ${out}`,
    outro: (freed, free, out) => `Zwolniono ${freed}. Wolne: ${free}. Raport: ${out}`,
  },
  report: {
    fileStem: 'odgruz-raport',
    heading: 'Raport sprzątania dysku',
    docTitle: (date) => `odgruz · raport ${date}`,
    meta: (date, mount) => `odgruz · ${date} · wolumin ${mount}`,
    summaryDryRun: (selected) => `Tryb próbny: nic nie zostało usunięte. Zaznaczone pozycje zajmują ${selected}.`,
    summary: (freed, before, after) => `Zwolniono ${freed}. Wolne miejsce: ${before} → ${after}.`,
    diskHeading: 'Stan dysku',
    before: 'Przed',
    after: 'Po',
    usage: (used, free, pct) => `${used} zajęte · ${free} wolne · ${pct}%`,
    usedAria: (label, pct) => `${label}: ${pct}% zajęte`,
    categoriesHeading: 'Znalezione kategorie',
    colCategory: 'Kategoria',
    colSize: 'Rozmiar',
    colStatus: 'Status',
    paths: (count) => plural(count, 'ścieżka', 'ścieżki', 'ścieżek'),
    empty: 'Nie znaleziono nic do sprzątania.',
    status: {
      removed: 'Usunięte',
      'dry-run': 'Do usunięcia (tryb próbny)',
      partial: 'Usunięte częściowo',
      failed: 'Nie usunięto',
      skipped: 'Pominięte',
    },
    failuresHeading: 'Nie udało się usunąć',
    failuresIntro: 'Te ścieżki wymagają uprawnień administratora albo są w użyciu.',
    failuresManual: 'Możesz usunąć je ręcznie w Terminalu:',
    outsideRoots: 'Ścieżka poza dozwolonym obszarem, pominięta',
  },
}
