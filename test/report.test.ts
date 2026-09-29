import { describe, expect, it } from 'vitest'
import { OUTSIDE_ROOTS_ERROR } from '../src/clean.js'
import { renderReport, reportFileName } from '../src/report.js'
import type { ReportData, ScanResult } from '../src/types.js'

const GB = 1024 ** 3

function result(id: string, label: string, paths: string[], bytes: number): ScanResult {
  return {
    target: { id, label, category: 'cache', impact: `skutek ${id}`, discover: async () => paths },
    items: paths.map((p) => ({ path: p, bytes: bytes / paths.length })),
    totalBytes: bytes,
  }
}

function data(overrides: Partial<ReportData> = {}): ReportData {
  return {
    generatedAt: new Date(2026, 8, 29, 21, 5),
    before: { totalBytes: 460 * GB, usedBytes: 380 * GB, freeBytes: 58 * GB, mount: '/System/Volumes/Data' },
    after: { totalBytes: 460 * GB, usedBytes: 211 * GB, freeBytes: 227 * GB, mount: '/System/Volumes/Data' },
    results: [
      result('npm', 'Cache npm', ['/Users/jan/.npm/_cacache'], 38 * GB),
      result('games', 'Gry', ['/Applications/Steam.app'], 11 * GB),
    ],
    outcomes: [{ targetId: 'npm', removed: ['/Users/jan/.npm/_cacache'], failed: [] }],
    dryRun: false,
    ...overrides,
  }
}

describe('renderReport', () => {
  it('shows before/after and freed space', () => {
    const html = renderReport(data())
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Przed')
    expect(html).toContain('Po')
    expect(html).toContain('Zwolniono 169 GB')
    expect(html).toContain('58.0 GB → 227 GB')
  })

  it('labels removed and skipped targets', () => {
    const html = renderReport(data())
    expect(html).toMatch(/Cache npm[\s\S]*Usunięte/)
    expect(html).toMatch(/Gry[\s\S]*Pominięte/)
  })

  it('shows a dry-run banner instead of freed space', () => {
    const html = renderReport(data({ dryRun: true, after: data().before }))
    expect(html).toContain('Tryb próbny: nic nie zostało usunięte')
    expect(html).toContain('Do usunięcia (tryb próbny)')
    expect(html).not.toContain('Zwolniono')
  })

  it('lists failures with a quoted sudo command', () => {
    const html = renderReport(
      data({ outcomes: [{ targetId: 'npm', removed: [], failed: [{ path: "/Users/jan/it's", error: 'EACCES' }] }] }),
    )
    expect(html).toContain('Nie usunięto')
    expect(html).toContain('sudo rm -rf &#39;/Users/jan/it&#39;\\&#39;&#39;s&#39;')
  })

  it('never suggests sudo for guard-rejected paths', () => {
    const html = renderReport(
      data({ outcomes: [{ targetId: 'npm', removed: [], failed: [{ path: '/etc/hosts', error: OUTSIDE_ROOTS_ERROR }] }] }),
    )
    expect(html).toContain('/etc/hosts')
    expect(html).not.toContain('sudo rm -rf')
  })

  it('escapes file system text', () => {
    const html = renderReport(data({ results: [result('x', '<script>alert(1)</script>', ['/Users/jan/<b>'], GB)] }))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('reportFileName', () => {
  it('uses local date and time', () => {
    expect(reportFileName(new Date(2026, 8, 29, 21, 5))).toBe('odgruz-raport-2026-09-29-2105.html')
  })
})
