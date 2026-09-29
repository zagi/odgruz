import { describe, expect, it } from 'vitest'
import { scan } from '../src/scan.js'
import type { TargetId } from '../src/messages/types.js'
import type { Target, TargetContext } from '../src/types.js'

const ctx: TargetContext = {
  home: '/Users/jan',
  appsDir: '/Applications',
  systemLibraryDir: '/Library',
  projectsDir: '/Users/jan/projects',
  inactiveDays: 30,
  now: new Date(),
  selfPath: null,
}

function fake(id: string, paths: string[]): Target {
  return { id: id as TargetId, label: id, category: 'cache', impact: '', discover: async () => paths }
}

const sizes: Record<string, number> = { '/Users/jan/.a/x': 100, '/Users/jan/.a/y': 50, '/Users/jan/.b/z': 0 }
const measure = async (p: string) => sizes[p] ?? 0

describe('scan', () => {
  it('sums sizes per target and drops empty targets', async () => {
    const results = await scan([fake('a', ['/Users/jan/.a/x', '/Users/jan/.a/y']), fake('b', ['/Users/jan/.b/z'])], ctx, measure)
    expect(results).toHaveLength(1)
    expect(results[0].target.id).toBe('a')
    expect(results[0].totalBytes).toBe(150)
    expect(results[0].items).toEqual([
      { path: '/Users/jan/.a/x', bytes: 100 },
      { path: '/Users/jan/.a/y', bytes: 50 },
    ])
  })

  it('drops paths that fail the safety guard', async () => {
    const results = await scan([fake('bad', ['/etc', '/Users/jan', '/Users/jan/.a/x'])], ctx, measure)
    expect(results[0].items.map((i) => i.path)).toEqual(['/Users/jan/.a/x'])
  })

  it('reports progress per target', async () => {
    const seen: string[] = []
    await scan([fake('a', []), fake('b', [])], ctx, measure, (t) => seen.push(t.id))
    expect(seen).toEqual(['a', 'b'])
  })
})
