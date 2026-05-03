import Anthropic from '@anthropic-ai/sdk'
import type { LLMClient, LLMCompletionOptions } from './types.js'

export class AnthropicClient implements LLMClient {
  private readonly client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey })
  }

  async complete(options: LLMCompletionOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens,
      ...(options.system && { system: options.system }),
      messages: options.messages.map(m => ({ role: m.role, content: m.content })),
    })

    const block = response.content.find(
      (b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text',
    )
    if (!block) throw new Error('AnthropicClient: no text content in response')
    return block.text.trim()
  }
}
