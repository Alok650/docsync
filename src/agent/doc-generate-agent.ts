import { GENERATE } from '../defaults.js'
import type { LLMClient } from '../llm/types.js'
import { GENERATE_SYSTEM_PROMPT, buildGenerateUserPrompt } from './generate-prompts.js'

export interface DocGenerateRequest {
  readonly symbol: string
  readonly kind: string
  readonly file: string
  readonly sourceText: string
}

export class DocGenerateAgent {
  private readonly client: LLMClient
  private readonly model: string

  constructor(client: LLMClient, model: string) {
    this.client = client
    this.model = model
  }

  generateDoc(request: DocGenerateRequest): Promise<string> {
    return this.client.complete({
      model: this.model,
      system: GENERATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildGenerateUserPrompt(request) }],
      maxTokens: GENERATE.MAX_TOKENS,
    })
  }
}
