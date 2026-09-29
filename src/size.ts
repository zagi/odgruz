import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

function parseKb(stdout: string | undefined): number {
  const kb = Number.parseInt(stdout ?? '', 10)
  return Number.isFinite(kb) ? kb * 1024 : 0
}

/** Rozmiar w bajtach według `du -skx` (bez symlinków i bez przekraczania punktów montowania). 0 gdy ścieżka nie istnieje. */
export async function sizeOf(path: string): Promise<number> {
  try {
    const { stdout } = await run('du', ['-skx', path], { maxBuffer: 16 * 1024 * 1024 })
    return parseKb(stdout)
  } catch (error) {
    // du kończy się kodem 1 przy "Permission denied", ale i tak wypisuje sumę
    return parseKb((error as { stdout?: string }).stdout)
  }
}
