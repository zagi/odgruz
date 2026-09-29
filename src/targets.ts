import { lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { findInactiveNodeModules } from './inactive.js'
import type { Messages } from './messages/types.js'
import type { Target, TargetContext } from './types.js'

async function existing(paths: string[]): Promise<string[]> {
  const found: string[] = []
  for (const p of paths) {
    try {
      await lstat(p)
      found.push(p)
    } catch {
      // brak ścieżki
    }
  }
  return found
}

async function children(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).sort().map((name) => path.join(dir, name))
  } catch {
    return []
  }
}

const home = (ctx: TargetContext, ...parts: string[]) => path.join(ctx.home, ...parts)
const lib = (ctx: TargetContext, ...parts: string[]) => home(ctx, 'Library', ...parts)

export function createTargets(msgs: Messages): Target[] {
  const t = msgs.targets
  return [
    {
      id: 'npm',
      ...t.npm,
      category: 'cache',
      discover: (ctx) => existing([home(ctx, '.npm', '_cacache')]),
    },
    {
      id: 'npx',
      ...t.npx,
      category: 'optional',
      async discover(ctx) {
        const self = ctx.selfPath
        return (await children(home(ctx, '.npm', '_npx'))).filter(
          (dir) => !(self && (self === dir || self.startsWith(dir + path.sep))),
        )
      },
    },
    {
      id: 'go',
      ...t.go,
      category: 'cache',
      discover: (ctx) =>
        existing([lib(ctx, 'Caches', 'go-build'), home(ctx, '.cache', 'go-build'), home(ctx, 'go', 'pkg', 'mod')]),
    },
    {
      id: 'bun',
      ...t.bun,
      category: 'cache',
      discover: (ctx) => existing([home(ctx, '.bun', 'install', 'cache')]),
    },
    {
      id: 'pnpm',
      ...t.pnpm,
      category: 'cache',
      async discover(ctx) {
        const storeRoot = lib(ctx, 'pnpm', 'store')
        const versions = (await children(storeRoot))
          .filter((p) => /^v\d+$/.test(path.basename(p)))
          .sort((a, b) => Number(path.basename(b).slice(1)) - Number(path.basename(a).slice(1)))
        return [...(await existing([lib(ctx, 'Caches', 'pnpm')])), ...versions.slice(1)]
      },
    },
    {
      id: 'python',
      ...t.python,
      category: 'cache',
      discover: (ctx) => existing([lib(ctx, 'Caches', 'pip')]),
    },
    {
      id: 'uv',
      ...t.uv,
      category: 'optional',
      discover: (ctx) => existing([home(ctx, '.cache', 'uv')]),
    },
    {
      id: 'playwright',
      ...t.playwright,
      category: 'cache',
      discover: (ctx) => existing([lib(ctx, 'Caches', 'ms-playwright')]),
    },
    {
      id: 'docker-sandboxes',
      ...t['docker-sandboxes'],
      category: 'optional',
      discover: (ctx) => existing([home(ctx, '.docker', 'sandboxes')]),
    },
    {
      id: 'node-modules',
      ...t['node-modules'],
      category: 'optional',
      discover: (ctx) => findInactiveNodeModules(ctx.projectsDir, ctx.inactiveDays, ctx.now),
    },
    {
      id: 'ios-simulators',
      ...t['ios-simulators'],
      category: 'optional',
      discover: (ctx) =>
        existing([path.join(ctx.systemLibraryDir, 'Developer', 'CoreSimulator'), lib(ctx, 'Developer', 'CoreSimulator')]),
    },
    {
      id: 'games',
      ...t.games,
      category: 'optional',
      discover: (ctx) =>
        existing([
          path.join(ctx.appsDir, 'Steam.app'),
          lib(ctx, 'Application Support', 'Steam'),
          lib(ctx, 'Caches', 'Steam'),
          lib(ctx, 'LaunchAgents', 'com.valvesoftware.steamclean.plist'),
          lib(ctx, 'Application Support', 'com.isaacmarovitz.Whisky'),
          lib(ctx, 'Containers', 'com.isaacmarovitz.Whisky'),
          lib(ctx, 'Containers', 'com.isaacmarovitz.Whisky.WhiskyThumbnail'),
          lib(ctx, 'Application Scripts', 'com.isaacmarovitz.Whisky.WhiskyThumbnail'),
          lib(ctx, 'Logs', 'com.isaacmarovitz.Whisky'),
          lib(ctx, 'Preferences', 'com.isaacmarovitz.Whisky.plist'),
          lib(ctx, 'Application Support', 'Wineskin'),
          lib(ctx, 'Preferences', 'com.unofficial.wineskin.plist'),
          home(ctx, '.cache', 'winetricks'),
        ]),
    },
  ]
}
