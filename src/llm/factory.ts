import { LLM_PROVIDER } from '../config.js'
import type { AutoDocsConfig } from '../config.js'
import type { LLMClient } from './types.js'
import { AnthropicClient } from './anthropic.js'
import { OpenAIClient } from './openai.js'

/**
 * Creates the correct `LLMClient` for the provider in `config.llm`.
 * API keys are read from environment variables (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`).
 */
export function createLLMClient(config: AutoDocsConfig): LLMClient {
  const { provider } = config.llm
  switch (provider) {
    case LLM_PROVIDER.ANTHROPIC: return new AnthropicClient()
    case LLM_PROVIDER.OPENAI: return new OpenAIClient()
    default: {
      const exhaustive: never = provider
      throw new Error(`Unsupported LLM provider: ${exhaustive as string}`)
    }
  }
}
