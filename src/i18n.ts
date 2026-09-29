import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Locale } from './types.js'

const execFileAsync = promisify(execFile)

const PL = /^pl([_.\-@]|$)/i
const C_POSIX = /^(c|posix)(\..*)?$/i
const VARS = ['LC_ALL', 'LC_MESSAGES', 'LANG'] as const

export function detectLocale(env: Record<string, string | undefined>, systemLocale: string): Locale {
  for (const name of VARS) {
    const value = env[name]
    if (value && !C_POSIX.test(value)) return PL.test(value) ? 'pl' : 'en'
  }
  return PL.test(systemLocale) ? 'pl' : 'en'
}

export function parseLangFlag(value: string): Locale | null {
  const v = value.toLowerCase()
  return v === 'en' || v === 'pl' ? v : null
}

export function parseAppleLanguages(stdout: string): string {
  for (const raw of stdout.split('\n')) {
    const line = raw.trim().replace(/,$/, '').trim()
    if (line === '' || line === '(' || line === ')' || line === '()') continue
    return line.replace(/^"(.*)"$/, '$1').trim()
  }
  return ''
}

export async function macosLanguage(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('defaults', ['read', '-g', 'AppleLanguages'])
    return parseAppleLanguages(stdout)
  } catch {
    return ''
  }
}

function intlLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return ''
  }
}

export async function systemLocale(platform: string = process.platform): Promise<string> {
  if (platform === 'darwin') {
    const language = await macosLanguage()
    if (language !== '') return language
  }
  return intlLocale()
}
