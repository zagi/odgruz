import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { findInactiveNodeModules, findNodeModules, lastGitCommit } from '../src/inactive.js'

const OLD = new Date('2020-01-01T00:00:00Z')
let root: string

function git(dir: string, ...args: string[]) {
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...args], {
    cwd: dir,
    env: { ...process.env, GIT_AUTHOR_DATE: OLD.toISOString(), GIT_COMMITTER_DATE: OLD.toISOString() },
    stdio: 'ignore',
  })
}

async function project(name: string, opts: { git?: boolean; fresh?: string } = {}) {
  const dir = path.join(root, name)
  await mkdir(path.join(dir, 'node_modules', 'pkg'), { recursive: true })
  await writeFile(path.join(dir, 'node_modules', 'pkg', 'index.js'), 'x')
  await writeFile(path.join(dir, 'package.json'), '{}')
  if (opts.git) {
    git(dir, 'init', '-q')
    git(dir, 'add', 'package.json')
    git(dir, 'commit', '-q', '-m', 'init')
  }
  await utimes(path.join(dir, 'package.json'), OLD, OLD)
  if (opts.fresh) await writeFile(path.join(dir, opts.fresh), 'new')
  return dir
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'odgruz-inactive-'))
})

describe('findNodeModules', () => {
  it('skips build output dirs and does not follow symlinks', async () => {
    const app = await project('app')
    await mkdir(path.join(app, '.next', 'standalone', 'node_modules'), { recursive: true })
    await mkdir(path.join(root, 'elsewhere', 'node_modules'), { recursive: true })
    await symlink(path.join(root, 'elsewhere'), path.join(root, 'linked'))
    const found = await findNodeModules(root)
    expect(found).toContain(path.join(app, 'node_modules'))
    expect(found).toContain(path.join(root, 'elsewhere', 'node_modules'))
    expect(found.some((p) => p.includes('.next'))).toBe(false)
    expect(found.some((p) => p.includes('linked'))).toBe(false)
  })
})

describe('lastGitCommit', () => {
  it('returns null outside a git repo', async () => {
    expect(await lastGitCommit(root)).toBeNull()
  })

  it('returns the commit date', async () => {
    const dir = await project('g', { git: true })
    expect((await lastGitCommit(dir))?.toISOString()).toBe(OLD.toISOString())
  })
})

describe('findInactiveNodeModules', () => {
  it('flags old git and non-git projects, keeps recently edited ones', async () => {
    const oldGit = await project('old-git', { git: true })
    const activeGit = await project('active-git', { git: true, fresh: 'index.ts' })
    const oldPlain = await project('old-plain')
    const finderOnly = await project('finder-only', { fresh: '.DS_Store' })

    const inactive = await findInactiveNodeModules(root, 30, new Date())

    expect(inactive).toContain(path.join(oldGit, 'node_modules'))
    expect(inactive).toContain(path.join(oldPlain, 'node_modules'))
    expect(inactive).toContain(path.join(finderOnly, 'node_modules'))
    expect(inactive).not.toContain(path.join(activeGit, 'node_modules'))
  })

  it('returns [] for a missing root', async () => {
    expect(await findInactiveNodeModules(path.join(root, 'nope'), 30, new Date())).toEqual([])
  })
})
