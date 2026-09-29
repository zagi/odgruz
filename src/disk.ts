import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { DiskUsage } from './types.js'

const run = promisify(execFile)

export function parseDf(stdout: string): DiskUsage {
  const lines = stdout.trim().split('\n')
  const cols = lines.length >= 2 ? lines[lines.length - 1].trim().split(/\s+/) : []
  if (cols.length < 6) throw new Error('Nieoczekiwany wynik df')
  const [, total, used, available] = cols
  return {
    totalBytes: Number(total) * 1024,
    usedBytes: Number(used) * 1024,
    freeBytes: Number(available) * 1024,
    mount: cols.slice(5).join(' '),
  }
}

export async function getDiskUsage(path: string): Promise<DiskUsage> {
  const { stdout } = await run('df', ['-kP', path])
  return parseDf(stdout)
}
