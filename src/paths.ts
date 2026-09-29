import path from 'node:path'
import type { SafeRoots } from './types.js'

function depthUnder(p: string, root: string): number {
  const rel = path.relative(root, p)
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return 0
  return rel.split(path.sep).length
}

/**
 * Ścieżkę wolno usunąć tylko gdy jest:
 * - co najmniej 2 poziomy pod home (np. ~/.npm/_cacache, nigdy ~/Library),
 * - albo 1 poziom pod katalogiem aplikacji (np. /Applications/Steam.app),
 * - albo 1 poziom pod /Library/Developer.
 */
export function isSafeToDelete(p: string, roots: SafeRoots): boolean {
  if (!path.isAbsolute(p) || p.split('/').includes('..')) return false
  const normalized = path.normalize(p).replace(/\/+$/, '')
  if (depthUnder(normalized, roots.home) >= 2) return true
  if (depthUnder(normalized, roots.appsDir) >= 1) return true
  if (depthUnder(normalized, path.join(roots.systemLibraryDir, 'Developer')) >= 1) return true
  return false
}
