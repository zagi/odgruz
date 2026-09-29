import type { Locale } from './types.js'

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

export function systemLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale
  } catch {
    return ''
  }
}
