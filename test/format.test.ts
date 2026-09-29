import { describe, expect, it } from 'vitest'
import { escapeHtml, formatBytes, shellQuote } from '../src/format.js'

describe('formatBytes', () => {
  it('formats small and large values with 1024 base', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB')
    expect(formatBytes(150 * 1024 ** 3)).toBe('150 GB')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;')
  })
})

describe('shellQuote', () => {
  it('wraps in single quotes and escapes embedded quotes', () => {
    expect(shellQuote('/a b/c')).toBe(`'/a b/c'`)
    expect(shellQuote(`/it's`)).toBe(`'/it'\\''s'`)
  })
})
