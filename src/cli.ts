#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { clean } from './clean.js'
import { getDiskUsage } from './disk.js'
import { formatBytes } from './format.js'
import { renderReport, reportFileName } from './report.js'
import { scan } from './scan.js'
import { TARGETS } from './targets.js'
import type { TargetContext } from './types.js'

const HELP = `odgruz: interaktywne sprzątanie dysku na macOS

Użycie: npx odgruz [opcje]

  --dry-run          pokaż, co zostałoby usunięte, niczego nie usuwaj
  -y, --yes          bez pytań: zaznacz tylko cache (npm, Go, bun, pnpm, pip/uv, Playwright)
  --projects <dir>   gdzie szukać nieaktywnych projektów (domyślnie ~/projects)
  --days <n>         projekt jest nieaktywny po n dniach bez zmian (domyślnie 30)
  --out <plik>       ścieżka raportu HTML (domyślnie ./odgruz-raport-<data>.html)
  --open             otwórz raport po zakończeniu
  -h, --help         ta pomoc
`

function safeRealpath(p: string | undefined): string | null {
  if (!p) return null
  try {
    return realpathSync(p)
  } catch {
    return null
  }
}

async function main(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      'dry-run': { type: 'boolean', default: false },
      yes: { type: 'boolean', short: 'y', default: false },
      projects: { type: 'string' },
      days: { type: 'string', default: '30' },
      out: { type: 'string' },
      open: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })

  if (values.help) {
    console.log(HELP)
    return 0
  }
  if (process.platform !== 'darwin') {
    console.error('odgruz działa tylko na macOS.')
    return 1
  }
  const days = Number(values.days)
  if (!Number.isInteger(days) || days < 1) {
    console.error('--days musi być liczbą całkowitą większą od 0.')
    return 1
  }

  const dryRun = values['dry-run']
  const home = safeRealpath(homedir()) ?? homedir()
  const ctx: TargetContext = {
    home,
    appsDir: '/Applications',
    systemLibraryDir: '/Library',
    projectsDir: path.resolve(values.projects ?? path.join(home, 'projects')),
    inactiveDays: days,
    now: new Date(),
    selfPath: safeRealpath(process.argv[1]),
  }
  const volume = existsSync('/System/Volumes/Data') ? '/System/Volumes/Data' : '/'

  p.intro(pc.bold(dryRun ? 'odgruz · tryb próbny' : 'odgruz'))
  const before = await getDiskUsage(volume)
  p.log.info(`Wolne miejsce: ${formatBytes(before.freeBytes)} z ${formatBytes(before.totalBytes)}`)

  const spinner = p.spinner()
  spinner.start('Skanuję dysk')
  const results = await scan(TARGETS, ctx, undefined, (t) => spinner.message(`Skanuję: ${t.label}`))
  const found = results.reduce((sum, r) => sum + r.totalBytes, 0)
  spinner.stop(`Znaleziono ${results.length} kategorii, razem ${formatBytes(found)}`)

  const cacheIds = results.filter((r) => r.target.category === 'cache').map((r) => r.target.id)
  let selected: string[] = []
  if (results.length > 0 && values.yes) {
    selected = cacheIds
  } else if (results.length > 0) {
    const choice = await p.multiselect({
      message: 'Co usunąć? Spacja zaznacza, Enter zatwierdza.',
      options: results.map((r) => ({
        value: r.target.id,
        label: `${r.target.label} · ${formatBytes(r.totalBytes)}`,
        hint: r.target.impact,
      })),
      initialValues: cacheIds,
      required: false,
    })
    if (p.isCancel(choice)) {
      p.cancel('Przerwano. Nic nie zostało usunięte.')
      return 0
    }
    selected = choice
    if (selected.length > 0) {
      const total = results.filter((r) => selected.includes(r.target.id)).reduce((sum, r) => sum + r.totalBytes, 0)
      const ok = await p.confirm({
        message: dryRun ? `Pokazać w raporcie ${formatBytes(total)} do usunięcia?` : `Usunąć ${formatBytes(total)}?`,
      })
      if (p.isCancel(ok) || !ok) {
        p.cancel('Przerwano. Nic nie zostało usunięte.')
        return 0
      }
    }
  }

  const outcomes = await clean(results, selected, { dryRun, roots: ctx })
  const after = await getDiskUsage(volume)
  const out = path.resolve(values.out ?? reportFileName(ctx.now))
  await writeFile(out, renderReport({ generatedAt: ctx.now, before, after, results, outcomes, dryRun }))

  const failed = outcomes.flatMap((o) => o.failed)
  if (failed.length > 0) p.log.warn(`Nie udało się usunąć ${failed.length} ścieżek. Komendy do ręcznego usunięcia są w raporcie.`)
  const freed = Math.max(0, after.freeBytes - before.freeBytes)
  p.outro(
    dryRun
      ? `Tryb próbny, nic nie usunięto. Raport: ${out}`
      : `Zwolniono ${formatBytes(freed)}. Wolne: ${formatBytes(after.freeBytes)}. Raport: ${out}`,
  )
  if (values.open) execFile('open', [out])
  return 0
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
