import { existsSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clean, removableByHand } from '../src/clean.js'
import type { TargetId } from '../src/messages/types.js'
import type { SafeRoots, ScanResult } from '../src/types.js'

let roots: SafeRoots
const readOnly: string[] = []

function result(id: string, paths: string[]): ScanResult {
  return {
    target: { id: id as TargetId, label: id, category: 'cache', impact: '', discover: async () => paths },
    items: paths.map((p) => ({ path: p, bytes: 1 })),
    totalBytes: paths.length,
  }
}

async function dir(...parts: string[]) {
  const d = path.join(roots.home, ...parts)
  await mkdir(d, { recursive: true })
  await writeFile(path.join(d, 'file'), 'x')
  return d
}

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'odgruz-clean-'))
  roots = { home: path.join(root, 'home'), appsDir: path.join(root, 'Applications'), systemLibraryDir: path.join(root, 'Library') }
})

afterEach(async () => {
  for (const d of readOnly.splice(0)) await chmod(d, 0o755).catch(() => {})
})

describe('clean', () => {
  it('removes selected targets only, including paths with spaces', async () => {
    const a = await dir('Library', 'Application Support', 'Steam')
    const b = await dir('.npm', '_cacache')
    const outcomes = await clean([result('games', [a]), result('npm', [b])], ['games'], { dryRun: false, roots })
    expect(existsSync(a)).toBe(false)
    expect(existsSync(b)).toBe(true)
    expect(outcomes).toEqual([{ targetId: 'games', removed: [a], failed: [] }])
  })

  it('dry run removes nothing', async () => {
    const a = await dir('.npm', '_cacache')
    const outcomes = await clean([result('npm', [a])], ['npm'], { dryRun: true, roots })
    expect(existsSync(a)).toBe(true)
    expect(outcomes[0].removed).toEqual([a])
  })

  it('removes read-only directories via chmod fallback', async () => {
    const mod = await dir('go', 'pkg', 'mod')
    const pkg = await dir('go', 'pkg', 'mod', 'example.com@v1')
    await chmod(pkg, 0o555)
    readOnly.push(pkg)
    const outcomes = await clean([result('go', [mod])], ['go'], { dryRun: false, roots })
    expect(outcomes[0].failed).toEqual([])
    expect(existsSync(mod)).toBe(false)
  })

  it('records failures and continues with the next path', async () => {
    const a = await dir('.cache', 'a')
    const b = await dir('.cache', 'b')
    const remove = async (p: string) => {
      if (p === a) throw new Error('EACCES: permission denied')
    }
    const outcomes = await clean([result('x', [a, b])], ['x'], { dryRun: false, roots, remove })
    expect(outcomes[0].failed).toEqual([{ path: a, error: 'EACCES: permission denied' }])
    expect(outcomes[0].removed).toEqual([b])
  })

  it('refuses paths outside safe roots', async () => {
    const outside = await mkdtemp(path.join(tmpdir(), 'odgruz-outside-'))
    const outcomes = await clean([result('x', [outside])], ['x'], { dryRun: false, roots })
    expect(existsSync(outside)).toBe(true)
    expect(outcomes[0].failed).toEqual([{ path: outside, error: '', code: 'outside-roots' }])
  })

  it('removes a symlink without touching its target', async () => {
    const real = await dir('keep', 'real')
    await mkdir(path.join(roots.home, 'projects', 'app'), { recursive: true })
    const link = path.join(roots.home, 'projects', 'app', 'node_modules')
    await symlink(real, link)
    await clean([result('node-modules', [link])], ['node-modules'], { dryRun: false, roots })
    expect(existsSync(link)).toBe(false)
    expect(existsSync(path.join(real, 'file'))).toBe(true)
  })
})

describe('removableByHand', () => {
  it('excludes guard-rejected paths', () => {
    const failed = [
      { path: '/a', error: 'EACCES' },
      { path: '/b', error: '', code: 'outside-roots' as const },
    ]
    expect(removableByHand(failed)).toEqual([{ path: '/a', error: 'EACCES' }])
    expect(removableByHand([failed[1]])).toEqual([])
  })
})
