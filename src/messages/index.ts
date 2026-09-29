import type { Locale } from '../types.js'
import { en } from './en.js'
import { pl } from './pl.js'
import type { Messages } from './types.js'

export type { Messages, Status, TargetId } from './types.js'

export const MESSAGES: Record<Locale, Messages> = { en, pl }
