import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../src/messages/index.js'
import { createTargets } from '../src/targets.js'

const POLISH = /[ąćęłńóśźż]/i
const IDS = [
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
]

/** Zbiera wszystkie stringi ze słownika; funkcje wywołuje z przykładowymi argumentami. */
function collect(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (typeof value === 'function') {
    for (const args of [[1], [5], [12], ['a', 'b', 'c'], [3.5]]) {
      const result = (value as (...a: unknown[]) => unknown)(...args)
      if (typeof result === 'string') out.push(result)
    }
  } else if (value && typeof value === 'object') for (const v of Object.values(value)) collect(v, out)
  return out
}

describe('MESSAGES', () => {
  it('has the same target keys in both dictionaries', () => {
    expect(Object.keys(MESSAGES.en.targets).sort()).toEqual(IDS)
    expect(Object.keys(MESSAGES.pl.targets).sort()).toEqual(IDS)
  })

  it('has the same structure in both dictionaries', () => {
    const shape = (v: unknown): unknown =>
      typeof v === 'function' ? 'fn' : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v
    expect(shape(MESSAGES.en)).toEqual(shape(MESSAGES.pl))
  })

  it('declares locale and date locale', () => {
    expect([MESSAGES.en.locale, MESSAGES.en.dateLocale]).toEqual(['en', 'en-US'])
    expect([MESSAGES.pl.locale, MESSAGES.pl.dateLocale]).toEqual(['pl', 'pl-PL'])
  })

  it('inflects Polish paths', () => {
    const f = MESSAGES.pl.report.paths
    expect([1, 3, 5, 12, 13, 14, 22, 25].map(f)).toEqual([
      '1 ścieżka',
      '3 ścieżki',
      '5 ścieżek',
      '12 ścieżek',
      '13 ścieżek',
      '14 ścieżek',
      '22 ścieżki',
      '25 ścieżek',
    ])
  })

  it('inflects Polish found categories and failed count', () => {
    const { found, failedCount } = MESSAGES.pl.cli
    expect(found(1, 'X')).toContain('1 kategorię')
    expect(found(3, 'X')).toContain('3 kategorie')
    expect(found(12, 'X')).toContain('12 kategorii')
    expect(failedCount(1)).toContain('1 ścieżki')
    expect(failedCount(4)).toContain('4 ścieżek')
  })

  it('inflects English counts', () => {
    expect(MESSAGES.en.report.paths(1)).toBe('1 path')
    expect(MESSAGES.en.report.paths(2)).toBe('2 paths')
    expect(MESSAGES.en.cli.found(1, 'X')).toContain('1 category')
    expect(MESSAGES.en.cli.found(2, 'X')).toContain('2 categories')
    expect(MESSAGES.en.cli.failedCount(1)).toContain('1 path')
    expect(MESSAGES.en.cli.failedCount(2)).toContain('2 paths')
  })

  it('English dictionary has no Polish characters', () => {
    const strings = collect(MESSAGES.en)
    expect(strings.length).toBeGreaterThan(50)
    for (const s of strings) expect(s).not.toMatch(POLISH)
  })

  it('Polish dictionary keeps Polish text', () => {
    expect(MESSAGES.pl.report.status.removed).toBe('Usunięte')
    expect(MESSAGES.pl.help).toContain('--lang <en|pl>')
    expect(MESSAGES.en.help).toContain('--lang <en|pl>')
  })
})

describe('createTargets', () => {
  it('returns the same ids, order, categories and paths for both locales', async () => {
    const en = createTargets(MESSAGES.en)
    const pl = createTargets(MESSAGES.pl)
    expect(en).toHaveLength(12)
    expect(en.map((t) => [t.id, t.category])).toEqual(pl.map((t) => [t.id, t.category]))
    expect(pl[0].label).toBe('Cache npm')
    expect(en[0].label).toBe(MESSAGES.en.targets.npm.label)
    expect(en.map((t) => t.impact)).toEqual(en.map((t) => MESSAGES.en.targets[t.id].impact))
  })
})
