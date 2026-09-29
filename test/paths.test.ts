import { describe, expect, it } from 'vitest'
import { isSafeToDelete } from '../src/paths.js'

const roots = { home: '/Users/jan', appsDir: '/Applications', systemLibraryDir: '/Library' }

describe('isSafeToDelete', () => {
  it.each([
    '/',
    '/Users/jan',
    '/Users/jan/',
    '/Users/jan/Library',
    '/Users/jan/.npm',
    '/Applications',
    '/Library',
    '/Library/Developer',
    '/Library/Caches/foo',
    '/etc/hosts',
    'relative/path',
    '/Users/jan/.npm/../../other',
  ])('rejects %s', (p) => {
    expect(isSafeToDelete(p, roots)).toBe(false)
  })

  it.each([
    '/Users/jan/.npm/_cacache',
    '/Users/jan/Library/Application Support/Steam',
    '/Users/jan/projects/app/node_modules',
    '/Applications/Steam.app',
    '/Library/Developer/CoreSimulator',
  ])('accepts %s', (p) => {
    expect(isSafeToDelete(p, roots)).toBe(true)
  })
})
