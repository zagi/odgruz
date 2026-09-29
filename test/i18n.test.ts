import { describe, it, expect } from 'vitest'
import { detectLocale, parseAppleLanguages, parseLangFlag, systemLocale } from '../src/i18n.js'

describe('detectLocale', () => {
  it('respects LC_ALL over system locale', () => {
    expect(detectLocale({ LC_ALL: 'pl_PL.UTF-8' }, 'en-US')).toBe('pl')
  })

  it('respects LC_ALL over LANG and system locale', () => {
    expect(detectLocale({ LC_ALL: 'en_US.UTF-8', LANG: 'pl_PL.UTF-8' }, 'pl-PL')).toBe('en')
  })

  it('skips empty LC_ALL and checks LC_MESSAGES', () => {
    expect(detectLocale({ LC_ALL: '', LC_MESSAGES: 'pl_PL', LANG: 'en_US' }, 'en-US')).toBe('pl')
  })

  it('falls back to LANG when LC_ALL is not set', () => {
    expect(detectLocale({ LANG: 'pl_PL.UTF-8' }, 'en-US')).toBe('pl')
  })

  it('skips C and falls through to the system locale', () => {
    expect(detectLocale({ LANG: 'C' }, 'pl-PL')).toBe('pl')
  })

  it('skips POSIX and falls through to the system locale', () => {
    expect(detectLocale({ LANG: 'POSIX' }, 'pl-PL')).toBe('pl')
  })

  it('skips C.UTF-8 and falls through to the system locale', () => {
    expect(detectLocale({ LANG: 'C.UTF-8' }, 'pl-PL')).toBe('pl')
    expect(detectLocale({ LANG: 'C.UTF-8' }, 'en-US')).toBe('en')
  })

  it('skips C in LC_ALL and uses the next variable', () => {
    expect(detectLocale({ LC_ALL: 'C', LANG: 'pl_PL.UTF-8' }, 'en-US')).toBe('pl')
  })

  it('does not treat ca_ES (Catalan) as C', () => {
    expect(detectLocale({ LANG: 'ca_ES.UTF-8' }, 'pl-PL')).toBe('en')
  })

  it('falls back to system locale when no env vars set', () => {
    expect(detectLocale({}, 'pl-PL')).toBe('pl')
    expect(detectLocale({}, 'pl')).toBe('pl')
    expect(detectLocale({}, 'en-GB')).toBe('en')
  })

  it('treats empty system locale as English', () => {
    expect(detectLocale({}, '')).toBe('en')
  })

  it('handles case-insensitive locale codes with underscores', () => {
    expect(detectLocale({ LANG: 'PL_pl' }, '')).toBe('pl')
  })

  it('rejects plx as not a valid Polish locale code', () => {
    expect(detectLocale({ LANG: 'plx' }, '')).toBe('en')
  })
})

describe('parseLangFlag', () => {
  it('accepts pl', () => {
    expect(parseLangFlag('pl')).toBe('pl')
  })

  it('accepts EN (case-insensitive)', () => {
    expect(parseLangFlag('EN')).toBe('en')
  })

  it('rejects de', () => {
    expect(parseLangFlag('de')).toBeNull()
  })

  it('rejects empty string', () => {
    expect(parseLangFlag('')).toBeNull()
  })
})

describe('parseAppleLanguages', () => {
  it('returns the first entry of a quoted list', () => {
    expect(parseAppleLanguages('(\n    "en-PL",\n    "pl-PL"\n)')).toBe('en-PL')
  })

  it('returns pl-PL when it is first', () => {
    expect(parseAppleLanguages('(\n    "pl-PL",\n    "en-US"\n)')).toBe('pl-PL')
  })

  it('handles unquoted entries', () => {
    expect(parseAppleLanguages('(\n    pl\n)')).toBe('pl')
  })

  it('returns empty string for empty input', () => {
    expect(parseAppleLanguages('')).toBe('')
    expect(parseAppleLanguages('()')).toBe('')
  })
})

describe('systemLocale', () => {
  it('returns a string on non-darwin platforms without throwing', async () => {
    const locale = await systemLocale('linux')
    expect(typeof locale).toBe('string')
  })
})
