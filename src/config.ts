import fs from 'fs/promises'
import path from 'path'
import { CONFIG_FILENAME } from './constants.js'
import { AI, CHECK } from './defaults.js'
import { logger } from './logger.js'

export const LLM_PROVIDER = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
} as const

export type LLMProvider = (typeof LLM_PROVIDER)[keyof typeof LLM_PROVIDER]

export interface LLMConfig {
  readonly provider: LLMProvider
  readonly model: string
}

export interface DocSyncConfig {
  readonly docs: string
  readonly code: string
  readonly llm: LLMConfig
  /** Maximum proposed doc updates per PR. Defaults to CHECK.MAX_UPDATES_PER_PR. */
  readonly maxUpdatesPerPr: number
}

const DEFAULTS: DocSyncConfig = {
  docs: 'docs',
  code: 'src',
  llm: {
    provider: LLM_PROVIDER.ANTHROPIC,
    model: AI.DEFAULT_MODEL,
  },
  maxUpdatesPerPr: CHECK.MAX_UPDATES_PER_PR,
}

/**
 * Loads config from `autodocs.config.json` in `cwd`, merging over built-in defaults.
 * Returns defaults silently if the file is absent; warns if it exists but is invalid JSON.
 */
export async function loadConfig(cwd = process.cwd()): Promise<DocSyncConfig> {
  let raw: string
  try {
    raw = await fs.readFile(path.join(cwd, CONFIG_FILENAME), 'utf-8')
  } catch {
    return DEFAULTS
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DocSyncConfig>
    return {
      ...DEFAULTS,
      ...parsed,
      llm: { ...DEFAULTS.llm, ...parsed.llm },
      maxUpdatesPerPr: parsed.maxUpdatesPerPr ?? DEFAULTS.maxUpdatesPerPr,
    }
  } catch {
    logger.warn(`${CONFIG_FILENAME} could not be parsed — using defaults.`)
    return DEFAULTS
  }
}
