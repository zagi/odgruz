import type { Messages } from './types.js'

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const en: Messages = {
  locale: 'en',
  dateLocale: 'en-US',
  help: `odgruz: interactive disk cleanup for macOS

Usage: npx odgruz [options]

  --dry-run          show what would be removed, delete nothing
  -y, --yes          no prompts: select caches only (npm, Go, bun, pnpm, pip, Playwright)
  --projects <dir>   where to look for inactive projects (default ~/projects)
  --days <n>         a project is inactive after n days without changes (default 30)
  --out <file>       path of the HTML report (default ./odgruz-report-<date>.html)
  --lang <en|pl>     interface language (default: from your locale settings)
  --open             open the report when finished
  -h, --help         this help
`,
  targets: {
    npm: { label: 'npm cache', impact: 'Packages will be downloaded again on the next install.' },
    npx: {
      label: 'Packages run via npx',
      impact: 'Tools run via npx (e.g. MCP servers) will be downloaded again. If one is running right now, it may stop working.',
    },
    go: { label: 'Go cache', impact: 'The first Go build will take longer and modules will be downloaded again.' },
    bun: { label: 'bun cache', impact: 'Packages will be downloaded again on the next bun install.' },
    pnpm: {
      label: 'pnpm: cache and old stores',
      impact: 'The current store is kept. Metadata caches and stores of old pnpm versions are removed.',
    },
    python: { label: 'pip cache', impact: 'Python packages will be downloaded again.' },
    uv: {
      label: 'uv cache',
      impact: 'uvx packages and environments (e.g. MCP servers) will be downloaded again. If one is running right now, it may stop working.',
    },
    playwright: {
      label: 'Playwright browsers',
      impact: 'E2E tests will download the browsers again (npx playwright install).',
    },
    'docker-sandboxes': {
      label: 'Docker Sandboxes',
      impact: 'Virtual machines from docker sandbox. If you use them, you will lose their state.',
    },
    'node-modules': {
      label: 'node_modules in inactive projects',
      impact: 'You will need to reinstall dependencies before running such a project.',
    },
    'ios-simulators': {
      label: 'iOS simulators',
      impact: 'If you use Xcode, the simulators will need to be downloaded again. The system part requires sudo.',
    },
    games: {
      label: 'Games: Steam, Whisky, Wineskin',
      impact: 'Removes the Steam app with its games and local saves (userdata), and Whisky bottles together with the Windows programs installed in them.',
    },
  },
  cli: {
    macOnly: 'odgruz only works on macOS.',
    invalidDays: '--days must be an integer greater than 0.',
    invalidLang: (value) => `Unknown language: ${value}. Allowed values for --lang: en, pl.`,
    noTty: 'No interactive terminal. Use --yes (caches only) or --dry-run --yes.',
    introDryRun: 'odgruz · dry run',
    freeSpace: (free, total) => `Free space: ${free} of ${total}`,
    scanning: 'Scanning disk',
    scanningTarget: (label) => `Scanning: ${label}`,
    found: (count, total) => `Found ${plural(count, 'category', 'categories')}, ${total} in total`,
    selectPrompt: 'What to remove? Space toggles, Enter confirms.',
    confirmDryRun: (total) => `Show ${total} to be removed in the report?`,
    confirmDelete: (total) => `Remove ${total}?`,
    cancelled: 'Cancelled. Nothing was removed.',
    reportUnwritable: (out, message) => `Cannot write the report to ${out}: ${message}. Nothing was removed.`,
    cleaningDryRun: 'Dry run…',
    cleaning: 'Removing…',
    done: 'Done',
    failedCount: (count) =>
      `Failed to remove ${plural(count, 'path', 'paths')}. Commands for manual removal are in the report.`,
    outroDryRun: (out) => `Dry run, nothing was removed. Report: ${out}`,
    outro: (freed, free, out) => `Freed ${freed}. Free: ${free}. Report: ${out}`,
  },
  report: {
    fileStem: 'odgruz-report',
    heading: 'Disk cleanup report',
    docTitle: (date) => `odgruz · report ${date}`,
    meta: (date, mount) => `odgruz · ${date} · volume ${mount}`,
    summaryDryRun: (selected) => `Dry run: nothing was removed. The selected items take up ${selected}.`,
    summary: (freed, before, after) => `Freed ${freed}. Free space: ${before} → ${after}.`,
    diskHeading: 'Disk state',
    before: 'Before',
    after: 'After',
    usage: (used, free, pct) => `${used} used · ${free} free · ${pct}%`,
    usedAria: (label, pct) => `${label}: ${pct}% used`,
    categoriesHeading: 'Categories found',
    colCategory: 'Category',
    colSize: 'Size',
    colStatus: 'Status',
    paths: (count) => plural(count, 'path', 'paths'),
    empty: 'Nothing to clean up was found.',
    status: {
      removed: 'Removed',
      'dry-run': 'To be removed (dry run)',
      partial: 'Partially removed',
      failed: 'Not removed',
      skipped: 'Skipped',
    },
    failuresHeading: 'Could not be removed',
    failuresIntro: 'These paths need administrator privileges or are in use.',
    failuresManual: 'You can remove them manually in Terminal:',
    outsideRoots: 'Path outside the allowed area, skipped',
  },
}
