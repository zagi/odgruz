#!/usr/bin/env node
import { execFile } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { clean, removableByHand } from './clean.js'
import { getDiskUsage } from './disk.js'
import { formatBytes } from './format.js'
import { renderReport, reportFileName } from './report.js'
import { scan } from './scan.js'
import { detectLocale, parseLangFlag, systemLocale } from './i18n.js'
import { MESSAGES } from './messages/index.js'
import { createTargets } from './targets.js'
import type { Locale, TargetContext } from './types.js'

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
      lang: { type: 'string' },
      open: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })

  const detected = detectLocale(process.env, await systemLocale())
  let locale: Locale = detected
  if (values.lang !== undefined) {
    const parsed = parseLangFlag(values.lang)
    if (parsed === null) {
      console.error(MESSAGES[detected].cli.invalidLang(values.lang))
      return 1
    }
    locale = parsed
  }
  const msgs = MESSAGES[locale]

  if (values.help) {
    console.log(msgs.help)
    return 0
  }
  if (process.platform !== 'darwin') {
    console.error(msgs.cli.macOnly)
    return 1
  }
  const days = Number(values.days)
  if (!Number.isInteger(days) || days < 1) {
    console.error(msgs.cli.invalidDays)
    return 1
  }

  if (!values.yes && !process.stdin.isTTY) {
    console.error(msgs.cli.noTty)
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
  const out = path.resolve(values.out ?? reportFileName(ctx.now, msgs))
  const volume = existsSync('/System/Volumes/Data') ? '/System/Volumes/Data' : '/'

  p.intro(pc.bold(dryRun ? msgs.cli.introDryRun : 'odgruz'))
  const before = await getDiskUsage(volume)
  p.log.info(msgs.cli.freeSpace(formatBytes(before.freeBytes), formatBytes(before.totalBytes)))

  const spinner = p.spinner()
  spinner.start(msgs.cli.scanning)
  const results = await scan(createTargets(msgs), ctx, undefined, (t) => spinner.message(msgs.cli.scanningTarget(t.label)))
  const found = results.reduce((sum, r) => sum + r.totalBytes, 0)
  spinner.stop(msgs.cli.found(results.length, formatBytes(found)))

  const cacheIds = results.filter((r) => r.target.category === 'cache').map((r) => r.target.id)
  let selected: string[] = []
  if (results.length > 0 && values.yes) {
    selected = cacheIds
  } else if (results.length > 0) {
    const choice = await p.multiselect({
      message: msgs.cli.selectPrompt,
      options: results.map((r) => ({
        value: r.target.id,
        label: `${r.target.label} · ${formatBytes(r.totalBytes)}`,
        hint: r.target.impact,
      })),
      initialValues: cacheIds,
      required: false,
    })
    if (p.isCancel(choice)) {
      p.cancel(msgs.cli.cancelled)
      return 0
    }
    selected = choice
    if (selected.length > 0) {
      const total = results.filter((r) => selected.includes(r.target.id)).reduce((sum, r) => sum + r.totalBytes, 0)
      const ok = await p.confirm({
        message: dryRun ? msgs.cli.confirmDryRun(formatBytes(total)) : msgs.cli.confirmDelete(formatBytes(total)),
      })
      if (p.isCancel(ok) || !ok) {
        p.cancel(msgs.cli.cancelled)
        return 0
      }
    }
  }

  // Zanim cokolwiek usuniemy, upewnij się, że raport da się zapisać.
  try {
    await writeFile(out, '')
  } catch (error) {
    console.error(msgs.cli.reportUnwritable(out, (error as Error).message))
    return 1
  }

  spinner.start(dryRun ? msgs.cli.cleaningDryRun : msgs.cli.cleaning)
  const outcomes = await clean(results, selected, { dryRun, roots: ctx })
  spinner.stop(msgs.cli.done)
  const after = await getDiskUsage(volume)
  await writeFile(out, renderReport({ generatedAt: ctx.now, before, after, results, outcomes, dryRun }, msgs))

  const manualFailures = removableByHand(outcomes.flatMap((o) => o.failed))
  if (manualFailures.length > 0) p.log.warn(msgs.cli.failedCount(manualFailures.length))
  const freed = Math.max(0, after.freeBytes - before.freeBytes)
  p.outro(
    dryRun
      ? msgs.cli.outroDryRun(out)
      : msgs.cli.outro(formatBytes(freed), formatBytes(after.freeBytes), out),
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
