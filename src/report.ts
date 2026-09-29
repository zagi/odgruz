import { escapeHtml, formatBytes, shellQuote } from './format.js'
import type { Messages, Status } from './messages/index.js'
import type { CleanOutcome, DiskUsage, ReportData, ScanResult } from './types.js'

const pad = (n: number) => String(n).padStart(2, '0')

export function reportFileName(now: Date, msgs: Messages): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `${msgs.report.fileStem}-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.html`
}

function statusOf(outcome: CleanOutcome | undefined, dryRun: boolean): Status {
  if (!outcome) return 'skipped'
  if (outcome.failed.length === 0) return dryRun ? 'dry-run' : 'removed'
  return outcome.removed.length > 0 ? 'partial' : 'failed'
}

function diskBar(label: string, disk: DiskUsage, msgs: Messages): string {
  const pct = disk.totalBytes > 0 ? (disk.usedBytes / disk.totalBytes) * 100 : 0
  return `<div class="disk">
  <div class="disk-head"><strong>${label}</strong><span class="num">${msgs.report.usage(formatBytes(disk.usedBytes), formatBytes(disk.freeBytes), pct.toFixed(0))}</span></div>
  <div class="bar" role="img" aria-label="${escapeHtml(msgs.report.usedAria(label, pct.toFixed(0)))}"><span style="width:${pct.toFixed(1)}%"></span></div>
</div>`
}

function resultRow(result: ScanResult, outcome: CleanOutcome | undefined, dryRun: boolean, msgs: Messages): string {
  const status = statusOf(outcome, dryRun)
  const items = result.items
    .map((item) => `<li><code>${escapeHtml(item.path)}</code> <span class="num muted">${formatBytes(item.bytes)}</span></li>`)
    .join('')
  return `<tr>
  <td><strong>${escapeHtml(result.target.label)}</strong><div class="muted">${escapeHtml(result.target.impact)}</div>
    <details><summary>${msgs.report.paths(result.items.length)}</summary><ul>${items}</ul></details></td>
  <td class="r num">${formatBytes(result.totalBytes)}</td>
  <td><span class="pill ${status}">${msgs.report.status[status]}</span></td>
</tr>`
}

export function renderReport(data: ReportData, msgs: Messages): string {
  const byId = new Map(data.outcomes.map((o) => [o.targetId, o]))
  const selectedBytes = data.results.filter((r) => byId.has(r.target.id)).reduce((sum, r) => sum + r.totalBytes, 0)
  const freed = Math.max(0, data.after.freeBytes - data.before.freeBytes)
  const failures = data.outcomes.flatMap((o) => o.failed)
  const sudoable = failures.filter((f) => f.code !== 'outside-roots')

  const date = data.generatedAt.toLocaleString(msgs.dateLocale)
  const summary = data.dryRun
    ? msgs.report.summaryDryRun(formatBytes(selectedBytes))
    : msgs.report.summary(formatBytes(freed), formatBytes(data.before.freeBytes), formatBytes(data.after.freeBytes))

  const rows = data.results.length
    ? data.results.map((r) => resultRow(r, byId.get(r.target.id), data.dryRun, msgs)).join('')
    : `<tr><td colspan="3" class="muted">${msgs.report.empty}</td></tr>`

  const failureSection = failures.length
    ? `<section>
  <h2>${msgs.report.failuresHeading}</h2>
  <p class="muted">${msgs.report.failuresIntro}${sudoable.length ? ` ${msgs.report.failuresManual}` : ''}</p>
  ${sudoable.length ? `<pre>${sudoable.map((f) => escapeHtml(`sudo rm -rf ${shellQuote(f.path)}`)).join('\n')}</pre>` : ''}
  <ul>${failures.map((f) => `<li><code>${escapeHtml(f.path)}</code>: ${escapeHtml(f.code === 'outside-roots' ? msgs.report.outsideRoots : f.error)}</li>`).join('')}</ul>
</section>`
    : ''

  return `<!doctype html>
<html lang="${msgs.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(msgs.report.docTitle(date))}</title>
<style>
:root { --bg:#f5f7f8; --surface:#fff; --fg:#16202a; --muted:#5b6874; --line:#dde3e8; --used:#3a4a5a; --free:#e3e9ee; --ok:#1f8a63; --warn:#b7791f; --bad:#c2410c; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg:#0f151b; --surface:#16202a; --fg:#e6edf2; --muted:#93a3b1; --line:#26333f; --used:#8193a4; --free:#22303c; --ok:#4fcf9f; --warn:#e0a84a; --bad:#f08a5d; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:15px/1.6 -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; }
main { max-width:860px; margin:0 auto; padding:40px 20px 64px; display:grid; gap:36px; }
h1 { margin:0; font-size:32px; letter-spacing:-.02em; } h2 { margin:0 0 12px; font-size:20px; }
.muted { color:var(--muted); } .num { font-variant-numeric:tabular-nums; }
.summary { font-size:18px; font-weight:600; margin:8px 0 0; }
.disk { display:grid; gap:6px; } .disks { display:grid; gap:16px; background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:20px; }
.disk-head { display:flex; flex-wrap:wrap; justify-content:space-between; gap:4px 16px; }
.bar { height:20px; border-radius:5px; background:var(--free); overflow:hidden; } .bar span { display:block; height:100%; background:var(--used); }
.table { overflow-x:auto; background:var(--surface); border:1px solid var(--line); border-radius:10px; }
table { width:100%; border-collapse:collapse; } th, td { padding:10px 14px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
tr:last-child td { border-bottom:0; } th { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); } .r { text-align:right; white-space:nowrap; }
.pill { display:inline-block; padding:2px 10px; border-radius:999px; font-size:13px; font-weight:600; border:1px solid currentColor; white-space:nowrap; }
.pill.removed, .pill.dry-run { color:var(--ok); } .pill.partial { color:var(--warn); } .pill.failed { color:var(--bad); } .pill.skipped { color:var(--muted); }
details { margin-top:6px; font-size:13px; } details ul { margin:6px 0 0; padding-left:18px; }
code, pre { font-family:ui-monospace, Menlo, monospace; font-size:13px; overflow-wrap:anywhere; }
pre { background:var(--surface); border:1px solid var(--line); border-radius:8px; padding:12px; overflow-x:auto; white-space:pre; }
</style>
</head>
<body>
<main>
<header>
  <div class="muted">${escapeHtml(msgs.report.meta(date, data.before.mount))}</div>
  <h1>${msgs.report.heading}</h1>
  <p class="summary">${summary}</p>
</header>
<section>
  <h2>${msgs.report.diskHeading}</h2>
  <div class="disks">${diskBar(msgs.report.before, data.before, msgs)}${diskBar(msgs.report.after, data.after, msgs)}</div>
</section>
<section>
  <h2>${msgs.report.categoriesHeading}</h2>
  <div class="table"><table>
    <thead><tr><th>${msgs.report.colCategory}</th><th class="r">${msgs.report.colSize}</th><th>${msgs.report.colStatus}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>
${failureSection}
</main>
</body>
</html>
`
}
