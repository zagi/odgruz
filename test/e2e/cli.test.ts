import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

const CLI = path.resolve('dist/cli.mjs')
let home: string
let out: string

function run(...args: string[]) {
  return spawnSync('node', [CLI, ...args], { env: { ...process.env, HOME: home }, encoding: 'utf8' })
}

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'odgruz-e2e-'))
  home = path.join(root, 'home')
  out = path.join(root, 'raport.html')
  await mkdir(path.join(home, 'projects'), { recursive: true })
})

async function seedNpmCache() {
  const file = path.join(home, '.npm', '_cacache', 'content', 'blob')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, Buffer.alloc(300 * 1024))
  return file
}

describe('odgruz CLI', () => {
  it('prints help', () => {
    const r = run('--help')
    expect(r.status).toBe(0)
    expect(r.stdout).toContain('--dry-run')
  })

  it('rejects invalid --days', () => {
    const r = run('--days', '0')
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('--days')
  })

  it('dry run keeps files and writes a report', async () => {
    const file = await seedNpmCache()
    const r = run('--yes', '--dry-run', '--out', out)
    expect(r.status, r.stderr).toBe(0)
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(out, 'utf8')).toContain('Tryb próbny: nic nie zostało usunięte')
  })

  it('--yes removes cache targets and reports it', async () => {
    const file = await seedNpmCache()
    const sandbox = path.join(home, '.docker', 'sandboxes', 'vm', 'disk.img')
    await mkdir(path.dirname(sandbox), { recursive: true })
    await writeFile(sandbox, Buffer.alloc(300 * 1024))
    const r = run('--yes', '--out', out)
    expect(r.status, r.stderr).toBe(0)
    expect(existsSync(file)).toBe(false)
    expect(existsSync(sandbox)).toBe(true)
    const html = readFileSync(out, 'utf8')
    expect(html).toMatch(/Cache npm[\s\S]*Usunięte/)
    expect(html).toMatch(/Docker Sandboxes[\s\S]*Pominięte/)
  })

  it('handles an empty home', () => {
    const r = run('--yes', '--out', out)
    expect(r.status, r.stderr).toBe(0)
    expect(readFileSync(out, 'utf8')).toContain('Nie znaleziono nic do sprzątania')
  })
})
