import OpenAI from 'openai'
import type { LLMClient, LLMCompletionOptions } from './types.js'

export class OpenAIClient implements LLMClient {
  private readonly client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey })
  }

  async complete(options: LLMCompletionOptions): Promise<string> {
    const systemMessages = options.system
      ? [{ role: 'system' as const, content: options.system }]
      : []

    const response = await this.client.chat.completions.create({
      model: options.model,
      max_tokens: options.maxTokens,
      messages: [
        ...systemMessages,
        ...options.messages.map(m => ({ role: m.role, content: m.content })),
      ],
    })

    const text = response.choices[0]?.message.content
    if (!text) throw new Error('OpenAIClient: no text content in response')
    return text.trim()
  }
}
