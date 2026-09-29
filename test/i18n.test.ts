import { describe, it, expect } from 'vitest'
import { detectLocale, parseLangFlag, systemLocale } from '../src/i18n.js'

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

  it('treats C as English', () => {
    expect(detectLocale({ LANG: 'C' }, 'pl-PL')).toBe('en')
  })

  it('treats POSIX as English', () => {
    expect(detectLocale({ LANG: 'POSIX' }, 'pl-PL')).toBe('en')
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

describe('systemLocale', () => {
  it('returns a valid locale string', () => {
    const locale = systemLocale()
    expect(typeof locale).toBe('string')
    expect(locale.length).toBeGreaterThan(0)
  })
})
