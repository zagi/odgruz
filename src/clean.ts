import { execFile } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import { isSafeToDelete } from './paths.js'
import type { CleanFailure, CleanOutcome, SafeRoots, ScanResult } from './types.js'

const run = promisify(execFile)

/** Niepowodzenia, które użytkownik może naprawić ręcznie (bez odrzuconych przez guard ścieżek). */
export function removableByHand(failed: CleanFailure[]): CleanFailure[] {
  return failed.filter((f) => f.code !== 'outside-roots')
}

export type Remover = (p: string) => Promise<void>

/** rm -rf bez podążania za symlinkami; przy EACCES/EPERM nadaje sobie prawo zapisu i próbuje raz jeszcze. */
export async function defaultRemove(p: string): Promise<void> {
  try {
    await rm(p, { recursive: true, force: true })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'EACCES' && code !== 'EPERM') throw error
    await run('chmod', ['-R', 'u+w', p]).catch(() => {})
    await rm(p, { recursive: true, force: true })
  }
}

export async function clean(
  results: ScanResult[],
  selectedIds: string[],
  opts: { dryRun: boolean; roots: SafeRoots; remove?: Remover },
): Promise<CleanOutcome[]> {
  const remove = opts.remove ?? defaultRemove
  const outcomes: CleanOutcome[] = []
  for (const result of results) {
    if (!selectedIds.includes(result.target.id)) continue
    const outcome: CleanOutcome = { targetId: result.target.id, removed: [], failed: [] }
    for (const { path } of result.items) {
      if (!isSafeToDelete(path, opts.roots)) {
        outcome.failed.push({ path, error: '', code: 'outside-roots' })
        continue
      }
      if (opts.dryRun) {
        outcome.removed.push(path)
        continue
      }
      try {
        await remove(path)
        outcome.removed.push(path)
      } catch (error) {
        outcome.failed.push({ path, error: (error as Error).message })
      }
    }
    outcomes.push(outcome)
  }
  return outcomes
}
