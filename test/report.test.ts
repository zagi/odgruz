import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../src/messages/index.js'
import { renderReport, reportFileName } from '../src/report.js'
import type { ReportData, ScanResult } from '../src/types.js'

const GB = 1024 ** 3
const pl = MESSAGES.pl
const en = MESSAGES.en

function result(id: string, label: string, paths: string[], bytes: number): ScanResult {
  return {
    target: { id, label, category: 'cache', impact: `skutek ${id}`, discover: async () => paths },
    items: paths.map((p) => ({ path: p, bytes: bytes / paths.length })),
    totalBytes: bytes,
  } as unknown as ScanResult
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

describe('renderReport (pl)', () => {
  it('shows before/after and freed space', () => {
    const html = renderReport(data(), pl)
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Przed')
    expect(html).toContain('Po')
    expect(html).toContain('Zwolniono 169 GB')
    expect(html).toContain('58.0 GB → 227 GB')
  })

  it('labels removed and skipped targets', () => {
    const html = renderReport(data(), pl)
    expect(html).toMatch(/Cache npm[\s\S]*Usunięte/)
    expect(html).toMatch(/Gry[\s\S]*Pominięte/)
  })

  it('shows a dry-run banner instead of freed space', () => {
    const html = renderReport(data({ dryRun: true, after: data().before }), pl)
    expect(html).toContain('Tryb próbny: nic nie zostało usunięte')
    expect(html).toContain('Do usunięcia (tryb próbny)')
    expect(html).not.toContain('Zwolniono')
  })

  it('lists failures with a quoted sudo command', () => {
    const html = renderReport(
      data({ outcomes: [{ targetId: 'npm', removed: [], failed: [{ path: "/Users/jan/it's", error: 'EACCES' }] }] }),
      pl,
    )
    expect(html).toContain('Nie usunięto')
    expect(html).toContain('Możesz usunąć je ręcznie w Terminalu:')
    expect(html).toContain('sudo rm -rf &#39;/Users/jan/it&#39;\\&#39;&#39;s&#39;')
  })

  it('never suggests sudo for guard-rejected paths', () => {
    const html = renderReport(
      data({ outcomes: [{ targetId: 'npm', removed: [], failed: [{ path: '/etc/hosts', error: '', code: 'outside-roots' }] }] }),
      pl,
    )
    expect(html).toContain('/etc/hosts')
    expect(html).toContain(pl.report.outsideRoots)
    expect(html).not.toContain('sudo rm -rf')
    expect(html).not.toContain(pl.report.failuresManual)
  })

  it('escapes file system text', () => {
    const html = renderReport(data({ results: [result('x', '<script>alert(1)</script>', ['/Users/jan/<b>'], GB)] }), pl)
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('declares lang="pl"', () => {
    expect(renderReport(data(), pl)).toContain('<html lang="pl">')
  })
})

describe('renderReport (en)', () => {
  it('shows before/after and freed space', () => {
    const html = renderReport(data(), en)
    expect(html).toContain('Before')
    expect(html).toContain('Freed 169 GB')
    expect(html).toContain('58.0 GB → 227 GB')
    expect(html).toContain('1 path')
  })

  it('labels removed and skipped targets', () => {
    const html = renderReport(data(), en)
    expect(html).toMatch(/Cache npm[\s\S]*Removed/)
    expect(html).toMatch(/Gry[\s\S]*Skipped/)
  })

  it('shows a dry-run banner instead of freed space', () => {
    const html = renderReport(data({ dryRun: true, after: data().before }), en)
    expect(html).toContain('Dry run: nothing was removed')
    expect(html).toContain('To be removed (dry run)')
    expect(html).not.toContain('Freed')
  })

  it('shows outside-roots text and no sudo for guard-rejected paths', () => {
    const html = renderReport(
      data({ outcomes: [{ targetId: 'npm', removed: [], failed: [{ path: '/etc/hosts', error: '', code: 'outside-roots' }] }] }),
      en,
    )
    expect(html).toContain(en.report.outsideRoots)
    expect(html).not.toContain('sudo rm -rf')
  })

  it('declares lang="en"', () => {
    expect(renderReport(data(), en)).toContain('<html lang="en">')
  })

  it('has no Polish characters', () => {
    const html = renderReport(
      data({
        outcomes: [
          { targetId: 'npm', removed: [], failed: [{ path: '/a', error: 'EACCES' }, { path: '/b', error: '', code: 'outside-roots' }] },
        ],
      }),
      en,
    )
    expect(html).not.toMatch(/[ąćęłńóśźż]/i)
    const dry = renderReport(data({ dryRun: true, results: [] }), en)
    expect(dry).not.toMatch(/[ąćęłńóśźż]/i)
  })
})

describe('reportFileName', () => {
  it('uses local date and time, per locale', () => {
    const now = new Date(2026, 8, 29, 21, 5)
    expect(reportFileName(now, pl)).toBe('odgruz-raport-2026-09-29-2105.html')
    expect(reportFileName(now, en)).toBe('odgruz-report-2026-09-29-2105.html')
  })
})
