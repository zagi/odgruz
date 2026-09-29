import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { MESSAGES } from '../src/messages/index.js'
import { createTargets } from '../src/targets.js'
import type { TargetContext } from '../src/types.js'

const TARGETS = createTargets(MESSAGES.pl)

let ctx: TargetContext

async function touch(...parts: string[]) {
  const file = path.join(...parts)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, 'x')
}

function target(id: string) {
  const t = TARGETS.find((x) => x.id === id)
  if (!t) throw new Error(`missing target ${id}`)
  return t
}

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'odgruz-targets-'))
  ctx = {
    home: path.join(root, 'home'),
    appsDir: path.join(root, 'Applications'),
    systemLibraryDir: path.join(root, 'Library'),
    projectsDir: path.join(root, 'home', 'projects'),
    inactiveDays: 30,
    now: new Date(),
    selfPath: null,
  }
  await mkdir(ctx.home, { recursive: true })
})

describe('TARGETS', () => {
  it('has unique ids matching the spec', () => {
    expect(TARGETS.map((t) => t.id).sort()).toEqual(
      [
        'bun',
        'docker-sandboxes',
        'games',
        'go',
        'ios-simulators',
        'node-modules',
        'npm',
        'npx',
        'playwright',
        'pnpm',
        'python',
        'uv',
      ].sort(),
    )
  })

  it('returns [] for every target on an empty home', async () => {
    for (const t of TARGETS) expect(await t.discover(ctx)).toEqual([])
  })

  it('npm returns only _cacache', async () => {
    await touch(ctx.home, '.npm', '_cacache', 'index')
    await touch(ctx.home, '.npm', '_npx', 'aaa', 'package.json')
    expect(await target('npm').discover(ctx)).toEqual([path.join(ctx.home, '.npm', '_cacache')])
  })

  it('npx skips the _npx dir the CLI runs from', async () => {
    await touch(ctx.home, '.npm', '_npx', 'aaa', 'package.json')
    await touch(ctx.home, '.npm', '_npx', 'self', 'node_modules', 'odgruz', 'dist', 'cli.mjs')
    ctx.selfPath = path.join(ctx.home, '.npm', '_npx', 'self', 'node_modules', 'odgruz', 'dist', 'cli.mjs')
    expect(await target('npx').discover(ctx)).toEqual([path.join(ctx.home, '.npm', '_npx', 'aaa')])
  })

  it('splits pip and uv, with uv optional', async () => {
    await touch(ctx.home, 'Library', 'Caches', 'pip', 'f')
    await touch(ctx.home, '.cache', 'uv', 'f')
    expect(await target('python').discover(ctx)).toEqual([path.join(ctx.home, 'Library', 'Caches', 'pip')])
    expect(await target('uv').discover(ctx)).toEqual([path.join(ctx.home, '.cache', 'uv')])
    expect(target('npx').category).toBe('optional')
    expect(target('uv').category).toBe('optional')
  })

  it('pnpm keeps the newest store version', async () => {
    for (const v of ['v3', 'v10', 'v11']) await touch(ctx.home, 'Library', 'pnpm', 'store', v, 'f')
    const found = await target('pnpm').discover(ctx)
    expect(found).toContain(path.join(ctx.home, 'Library', 'pnpm', 'store', 'v3'))
    expect(found).toContain(path.join(ctx.home, 'Library', 'pnpm', 'store', 'v10'))
    expect(found).not.toContain(path.join(ctx.home, 'Library', 'pnpm', 'store', 'v11'))
  })

  it('games finds Steam.app in appsDir and Whisky data in home', async () => {
    await touch(ctx.appsDir, 'Steam.app', 'Contents', 'Info.plist')
    await touch(ctx.home, 'Library', 'Containers', 'com.isaacmarovitz.Whisky', 'data')
    expect(await target('games').discover(ctx)).toEqual([
      path.join(ctx.appsDir, 'Steam.app'),
      path.join(ctx.home, 'Library', 'Containers', 'com.isaacmarovitz.Whisky'),
    ])
  })
})
