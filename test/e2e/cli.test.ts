import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

const CLI = path.resolve('dist/cli.mjs')
let home: string
let out: string

function run(...args: string[]) {
  return runWith({}, ...args)
}

function runWith(opts: { lang?: string; cwd?: string }, ...args: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, LANG: opts.lang ?? 'en_US.UTF-8' }
  delete env.LC_ALL
  delete env.LC_MESSAGES
  return spawnSync('node', [CLI, ...args], { env, encoding: 'utf8', cwd: opts.cwd })
}

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'odgruz-e2e-'))
  home = path.join(root, 'home')
  out = path.join(root, 'raport.html')
  await mkdir(path.join(home, 'projects'), { recursive: true })
})

function rowFor(html: string, label: string): string {
  const chunk = html.split('<tr>').find((c) => c.includes(`<strong>${label}</strong>`))
  if (!chunk) throw new Error(`no row for ${label}`)
  return chunk.slice(0, chunk.indexOf('</tr>'))
}

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
    expect(readFileSync(out, 'utf8')).toContain('Dry run: nothing was removed')
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
    expect(rowFor(html, 'npm cache')).toContain('class="pill removed"')
    expect(rowFor(html, 'Docker Sandboxes')).toContain('class="pill skipped"')
  })

  it('refuses to delete when the report path is not writable', async () => {
    const file = await seedNpmCache()
    const r = run('--yes', '--out', path.join(path.dirname(out), 'missing-dir', 'r.html'))
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('Nothing was removed')
    expect(existsSync(file)).toBe(true)
  })

  it('refuses a non-interactive run without --yes', async () => {
    const file = await seedNpmCache()
    const r = run('--out', out)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('--yes')
    expect(existsSync(out)).toBe(false)
    expect(existsSync(file)).toBe(true)
  })

  it('handles an empty home', () => {
    const r = run('--yes', '--out', out)
    expect(r.status, r.stderr).toBe(0)
    expect(existsSync(out)).toBe(true)
    expect(readFileSync(out, 'utf8')).not.toContain('class="pill removed"')
  })

  it('LANG=pl_PL.UTF-8 gives a Polish help and report', () => {
    const h = runWith({ lang: 'pl_PL.UTF-8' }, '--help')
    expect(h.status).toBe(0)
    expect(h.stdout).toContain('interaktywne sprzątanie dysku')
    const r = runWith({ lang: 'pl_PL.UTF-8' }, '--yes', '--dry-run', '--out', out)
    expect(r.status, r.stderr).toBe(0)
    expect(readFileSync(out, 'utf8')).toContain('Tryb próbny: nic nie zostało usunięte')
  })

  it('--lang pl overrides LANG=en_US.UTF-8', () => {
    const r = runWith({ lang: 'en_US.UTF-8' }, '--lang', 'pl', '--yes', '--dry-run', '--out', out)
    expect(r.status, r.stderr).toBe(0)
    expect(readFileSync(out, 'utf8')).toContain('Tryb próbny: nic nie zostało usunięte')
    expect(runWith({}, '--lang', 'pl', '--help').stdout).toContain('interaktywne sprzątanie dysku')
  })

  it('rejects an unknown --lang before scanning', async () => {
    const file = await seedNpmCache()
    const r = run('--lang', 'xx', '--yes', '--out', out)
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('xx')
    expect(existsSync(out)).toBe(false)
    expect(existsSync(file)).toBe(true)
  })

  it('writes odgruz-report-*.html in the cwd when --out is omitted', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'odgruz-cwd-'))
    const r = runWith({ cwd }, '--yes', '--dry-run')
    expect(r.status, r.stderr).toBe(0)
    expect(readdirSync(cwd).some((f) => /^odgruz-report-.*\.html$/.test(f))).toBe(true)
  })
})
