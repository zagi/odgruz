import { lstat, readdir } from 'node:fs/promises'
import path from 'node:path'
import { findInactiveNodeModules } from './inactive.js'
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

export const TARGETS: Target[] = [
  {
    id: 'npm',
    label: 'Cache npm',
    category: 'cache',
    impact: 'Paczki pobiorą się ponownie przy następnej instalacji.',
    discover: (ctx) => existing([home(ctx, '.npm', '_cacache')]),
  },
  {
    id: 'npx',
    label: 'Pakiety uruchamiane przez npx',
    category: 'optional',
    impact: 'Narzędzia uruchamiane przez npx (np. serwery MCP) pobiorą się ponownie. Jeśli któreś właśnie działa, może przestać działać.',
    async discover(ctx) {
      const self = ctx.selfPath
      return (await children(home(ctx, '.npm', '_npx'))).filter(
        (dir) => !(self && (self === dir || self.startsWith(dir + path.sep))),
      )
    },
  },
  {
    id: 'go',
    label: 'Cache Go',
    category: 'cache',
    impact: 'Pierwszy build Go potrwa dłużej, moduły pobiorą się ponownie.',
    discover: (ctx) =>
      existing([lib(ctx, 'Caches', 'go-build'), home(ctx, '.cache', 'go-build'), home(ctx, 'go', 'pkg', 'mod')]),
  },
  {
    id: 'bun',
    label: 'Cache bun',
    category: 'cache',
    impact: 'Paczki pobiorą się ponownie przy następnym bun install.',
    discover: (ctx) => existing([home(ctx, '.bun', 'install', 'cache')]),
  },
  {
    id: 'pnpm',
    label: 'pnpm: cache i stare magazyny',
    category: 'cache',
    impact: 'Aktualny magazyn zostaje. Znikają cache metadanych i magazyny starych wersji pnpm.',
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
    label: 'Cache pip',
    category: 'cache',
    impact: 'Paczki Pythona pobiorą się ponownie.',
    discover: (ctx) => existing([lib(ctx, 'Caches', 'pip')]),
  },
  {
    id: 'uv',
    label: 'Cache uv',
    category: 'optional',
    impact: 'Paczki i środowiska uvx (np. serwery MCP) pobiorą się ponownie. Jeśli któreś właśnie działa, może przestać działać.',
    discover: (ctx) => existing([home(ctx, '.cache', 'uv')]),
  },
  {
    id: 'playwright',
    label: 'Przeglądarki Playwright',
    category: 'cache',
    impact: 'Testy E2E pobiorą przeglądarki ponownie (npx playwright install).',
    discover: (ctx) => existing([lib(ctx, 'Caches', 'ms-playwright')]),
  },
  {
    id: 'docker-sandboxes',
    label: 'Docker Sandboxes',
    category: 'optional',
    impact: 'Maszyny wirtualne z docker sandbox. Jeśli ich używasz, stracisz ich stan.',
    discover: (ctx) => existing([home(ctx, '.docker', 'sandboxes')]),
  },
  {
    id: 'node-modules',
    label: 'node_modules w nieaktywnych projektach',
    category: 'optional',
    impact: 'Przed uruchomieniem takiego projektu trzeba ponownie zainstalować zależności.',
    discover: (ctx) => findInactiveNodeModules(ctx.projectsDir, ctx.inactiveDays, ctx.now),
  },
  {
    id: 'ios-simulators',
    label: 'Symulatory iOS',
    category: 'optional',
    impact: 'Jeśli używasz Xcode, symulatory trzeba pobrać ponownie. Część systemowa wymaga sudo.',
    discover: (ctx) =>
      existing([path.join(ctx.systemLibraryDir, 'Developer', 'CoreSimulator'), lib(ctx, 'Developer', 'CoreSimulator')]),
  },
  {
    id: 'games',
    label: 'Gry: Steam, Whisky, Wineskin',
    category: 'optional',
    impact: 'Usuwa aplikację Steam z grami i lokalnymi zapisami (userdata) oraz butelki Whisky razem z zainstalowanymi w nich programami Windows.',
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
