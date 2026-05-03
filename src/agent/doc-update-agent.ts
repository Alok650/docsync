import { AI } from '../defaults.js'
import type { LLMClient } from '../llm/types.js'
import type { DocSection } from '../scanner/doc-scanner.js'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js'

/** Request payload for a single doc-section update. */
export interface DocUpdateRequest {
  readonly symbol: string
  readonly file: string
  readonly beforeCode: string
  readonly afterCode: string
  readonly docSection: DocSection
}

/**
 * Calls the configured LLM to produce updated body text for a doc section.
 * The model receives before/after source and the current section body; it returns
 * only the replacement paragraph text (no headings, no explanation).
 */
export class DocUpdateAgent {
  private readonly client: LLMClient
  private readonly model: string

  constructor(client: LLMClient, model: string) {
    this.client = client
    this.model = model
  }

  generateUpdate(request: DocUpdateRequest): Promise<string> {
    return this.client.complete({
      model: this.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(request) }],
      maxTokens: AI.MAX_TOKENS,
    })
  }
}
