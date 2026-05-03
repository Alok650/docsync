import fs from 'fs/promises'
import path from 'path'

export type AnthropicProvider = 'anthropic' | 'bedrock' | 'vertex'

export interface AutoDocsConfig {
  docs: string
  code: string
  anthropic: {
    provider: AnthropicProvider
    model: string
    region?: string
  }
}

const DEFAULTS: AutoDocsConfig = {
  docs: 'docs',
  code: 'src',
  anthropic: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
  },
}

const CONFIG_FILENAME = 'autodocs.config.json'

export async function loadConfig(cwd = process.cwd()): Promise<AutoDocsConfig> {
  try {
    const raw = await fs.readFile(path.join(cwd, CONFIG_FILENAME), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AutoDocsConfig>
    return {
      ...DEFAULTS,
      ...parsed,
      anthropic: { ...DEFAULTS.anthropic, ...parsed.anthropic },
    }
  } catch {
    return DEFAULTS
  }
}
