import { execFile } from 'node:child_process'
import { lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const DAY_MS = 24 * 60 * 60 * 1000
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.open-next', '.output', '.nuxt', '.turbo', '.wrangler', '.vercel'])
const IGNORED_FILES = new Set(['.DS_Store'])

async function listDir(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

/** Katalogi node_modules pod `root`; nie wchodzi do node_modules, katalogów buildów ani w symlinki. */
export async function findNodeModules(root: string, maxDepth = 5): Promise<string[]> {
  const found: string[] = []
  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return
    for (const entry of await listDir(dir)) {
      if (!entry.isDirectory()) continue // Dirent symlinka nie jest katalogiem
      const full = path.join(dir, entry.name)
      if (entry.name === 'node_modules') found.push(full)
      else if (!SKIP_DIRS.has(entry.name)) await walk(full, depth + 1)
    }
  }
  await walk(root, 1)
  return found.sort()
}

export async function lastGitCommit(dir: string): Promise<Date | null> {
  try {
    const { stdout } = await run('git', ['-C', dir, 'log', '-1', '--format=%cI'])
    const iso = stdout.trim()
    return iso ? new Date(iso) : null
  } catch {
    return null
  }
}

/** Najnowszy mtime pliku w projekcie, z pominięciem zależności, buildów i .DS_Store. */
export async function lastFileChange(dir: string): Promise<Date | null> {
  let newest = 0
  async function walk(current: string): Promise<void> {
    for (const entry of await listDir(current)) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await walk(full)
      } else if (entry.isFile() && !IGNORED_FILES.has(entry.name)) {
        try {
          newest = Math.max(newest, (await lstat(full)).mtimeMs)
        } catch {
          // plik zniknął w trakcie skanu
        }
      }
    }
  }
  await walk(dir)
  return newest > 0 ? new Date(newest) : null
}

export async function findInactiveNodeModules(root: string, days: number, now: Date): Promise<string[]> {
  const cutoff = now.getTime() - days * DAY_MS
  const inactive: string[] = []
  for (const nodeModules of await findNodeModules(root)) {
    const project = path.dirname(nodeModules)
    const [commit, change] = await Promise.all([lastGitCommit(project), lastFileChange(project)])
    const lastActive = Math.max(commit?.getTime() ?? 0, change?.getTime() ?? 0)
    if (lastActive < cutoff) inactive.push(nodeModules)
  }
  return inactive
}
