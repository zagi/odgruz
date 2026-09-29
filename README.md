# odgruz

[Polski](README-PL.md)

Interactive disk cleanup for macOS. It finds package manager caches, Docker Sandboxes VMs, `node_modules` in inactive projects, iOS simulators and game data, shows their size, and lets you choose what to delete. When it finishes, it writes an HTML report with disk usage before and after.

```bash
npx odgruz --dry-run    # see what would be removed, delete nothing
npx odgruz              # interactive cleanup
```

Alternative, straight from GitHub: `npx github:zagi/odgruz`.

## Options

| Option | Description |
|---|---|
| `--dry-run` | Show what would be removed, delete nothing |
| `-y, --yes` | No prompts. Removes only the cache categories marked "cache" below |
| `--projects <dir>` | Where to look for inactive projects (default `~/projects`) |
| `--days <n>` | A project is inactive after `n` days without commits or file changes (default 30) |
| `--out <file>` | Path of the HTML report |
| `--open` | Open the report when finished |
| `--lang <en\|pl>` | Language of the interface and the report |

## Categories

Categories marked "cache" are preselected in the interactive list and are the only ones `--yes` removes. "Optional" categories need an explicit choice.

| Category | What it removes | Group |
|---|---|---|
| npm cache | `~/.npm/_cacache` | cache |
| Packages run by npx | `~/.npm/_npx` (may break a running MCP server) | optional |
| Go cache | Go build cache and downloaded modules | cache |
| bun cache | `~/.bun/install/cache` | cache |
| pnpm: cache and old stores | pnpm metadata cache and stores of older pnpm versions; the current store stays | cache |
| pip cache | `~/Library/Caches/pip` | cache |
| uv cache | `~/.cache/uv` (may break a running uvx MCP server) | optional |
| Playwright browsers | `~/Library/Caches/ms-playwright` | cache |
| Docker Sandboxes | `~/.docker/sandboxes` (VM state is lost) | optional |
| node_modules in inactive projects | `node_modules` of projects unchanged for `--days` days | optional |
| iOS simulators | CoreSimulator data; the system part needs `sudo` | optional |
| Games: Steam, Whisky, Wineskin | Steam app with games and local saves, Whisky bottles with their Windows programs, Wineskin | optional |

## Language

The default is English. Polish is used when the detected locale starts with `pl` (case-insensitive) or when you pass `--lang pl`. The first source that is set, non-empty and not the C/POSIX locale wins:

1. `--lang`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. The first language in macOS System Settings → General → Language & Region (`AppleLanguages`); if it cannot be read, the runtime's default locale

`C`, `POSIX` and `C.*` (for example `C.UTF-8`) are skipped like empty values, so the next source decides. macOS terminals often set `LANG=C.UTF-8`, which must not override a Polish system language.

`--lang` accepts only `en` or `pl`. Any other value prints an error and exits with code 1.

## Safety

- It deletes only paths from a built-in list.
- A path must be at least two levels below your home directory, or one level below `/Applications` or `/Library/Developer`. `~/Library` itself is never deleted.
- It never uses `sudo`. Paths it cannot remove go to the report with a ready-made command.
- It removes files with Node's `rm` and runs external commands only through `execFile` with an argument array, never through a shell.

## Requirements

macOS and Node 20.12 or newer.

## License

[MIT](LICENSE)
