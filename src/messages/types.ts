import type { Locale } from '../types.js'

export type TargetId =
  | 'npm' | 'npx' | 'go' | 'bun' | 'pnpm' | 'python' | 'uv' | 'playwright'
  | 'docker-sandboxes' | 'node-modules' | 'ios-simulators' | 'games'

export type Status = 'removed' | 'dry-run' | 'partial' | 'failed' | 'skipped'

export interface Messages {
  locale: Locale
  dateLocale: string // 'en-US' | 'pl-PL'
  help: string
  targets: Record<TargetId, { label: string; impact: string }>
  cli: {
    macOnly: string
    invalidDays: string
    invalidLang: (value: string) => string
    noTty: string
    introDryRun: string
    freeSpace: (free: string, total: string) => string
    scanning: string
    scanningTarget: (label: string) => string
    found: (count: number, total: string) => string
    selectPrompt: string
    confirmDryRun: (total: string) => string
    confirmDelete: (total: string) => string
    cancelled: string
    reportUnwritable: (out: string, message: string) => string
    cleaningDryRun: string
    cleaning: string
    done: string
    failedCount: (count: number) => string
    outroDryRun: (out: string) => string
    outro: (freed: string, free: string, out: string) => string
  }
  report: {
    fileStem: string
    heading: string
    docTitle: (date: string) => string
    meta: (date: string, mount: string) => string
    summaryDryRun: (selected: string) => string
    summary: (freed: string, before: string, after: string) => string
    diskHeading: string
    before: string
    after: string
    usage: (used: string, free: string, pct: string) => string
    usedAria: (label: string, pct: string) => string
    categoriesHeading: string
    colCategory: string
    colSize: string
    colStatus: string
    paths: (count: number) => string
    empty: string
    status: Record<Status, string>
    failuresHeading: string
    failuresIntro: string
    failuresManual: string
    outsideRoots: string
  }
}
