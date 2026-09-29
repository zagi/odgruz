import { chmod, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, afterEach } from 'vitest'
import { sizeOf } from '../src/size.js'

async function tmp() {
  return mkdtemp(path.join(tmpdir(), 'odgruz-size-'))
}

const lockedPaths: string[] = []

afterEach(async () => {
  // Restore permissions for cleanup
  for (const p of lockedPaths) {
    try {
      await chmod(p, 0o755)
    } catch {
      // ignore
    }
  }
  lockedPaths.length = 0
})

describe('sizeOf', () => {
  it('measures a directory with a space in its name', async () => {
    const dir = path.join(await tmp(), 'Application Support')
    await mkdir(dir)
    await writeFile(path.join(dir, 'blob'), Buffer.alloc(200 * 1024))
    expect(await sizeOf(dir)).toBeGreaterThanOrEqual(200 * 1024)
  })

  it('returns 0 for a missing path', async () => {
    expect(await sizeOf(path.join(await tmp(), 'missing'))).toBe(0)
  })

  it('does not follow a symlink', async () => {
    const root = await tmp()
    await mkdir(path.join(root, 'big'))
    await writeFile(path.join(root, 'big', 'blob'), Buffer.alloc(500 * 1024))
    await symlink(path.join(root, 'big'), path.join(root, 'link'))
    expect(await sizeOf(path.join(root, 'link'))).toBeLessThan(100 * 1024)
  })

  it('returns partial result when subdirectory has no read permission', async () => {
    const root = await tmp()
    // Create a readable file at root
    await writeFile(path.join(root, 'readable'), Buffer.alloc(200 * 1024))
    // Create a subdirectory with a file, then lock it
    const locked = path.join(root, 'locked')
    await mkdir(locked)
    await writeFile(path.join(locked, 'file'), Buffer.alloc(100 * 1024))
    await chmod(locked, 0o000)
    lockedPaths.push(locked)
    // du exits with code 1 but still outputs the readable part
    expect(await sizeOf(root)).toBeGreaterThanOrEqual(200 * 1024)
  })
})
