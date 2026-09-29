import { isSafeToDelete } from './paths.js'
import { sizeOf } from './size.js'
import type { ScanResult, Target, TargetContext } from './types.js'

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      out[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return out
}

export async function scan(
  targets: Target[],
  ctx: TargetContext,
  measure: (p: string) => Promise<number> = sizeOf,
  onProgress?: (target: Target) => void,
): Promise<ScanResult[]> {
  const results: ScanResult[] = []
  for (const target of targets) {
    onProgress?.(target)
    const paths = (await target.discover(ctx)).filter((p) => isSafeToDelete(p, ctx))
    const sizes = await mapLimit(paths, 4, measure)
    const items = paths.map((p, i) => ({ path: p, bytes: sizes[i] })).filter((item) => item.bytes > 0)
    const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0)
    if (totalBytes > 0) results.push({ target, items, totalBytes })
  }
  return results
}
