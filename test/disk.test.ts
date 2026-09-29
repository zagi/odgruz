import { describe, expect, it } from 'vitest'
import { getDiskUsage, parseDf } from '../src/disk.js'

const FIXTURE = `Filesystem   1024-blocks      Used Available Capacity  Mounted on
/dev/disk3s5   482797652 221249212 238034944    49%    /System/Volumes/Data
`

describe('parseDf', () => {
  it('parses df -kP output into bytes', () => {
    expect(parseDf(FIXTURE)).toEqual({
      totalBytes: 482797652 * 1024,
      usedBytes: 221249212 * 1024,
      freeBytes: 238034944 * 1024,
      mount: '/System/Volumes/Data',
    })
  })

  it('throws on unexpected output', () => {
    expect(() => parseDf('garbage')).toThrow('Nieoczekiwany wynik df')
  })
})

describe('getDiskUsage', () => {
  it('reads the real root volume', async () => {
    const usage = await getDiskUsage('/')
    expect(usage.totalBytes).toBeGreaterThan(0)
    expect(usage.freeBytes).toBeGreaterThan(0)
  })
})
