export interface LLMMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

export interface LLMCompletionOptions {
  readonly model: string
  readonly system?: string
  readonly messages: readonly LLMMessage[]
  readonly maxTokens: number
}

/** Provider-agnostic interface for text completion. Implemented by `AnthropicClient` and `OpenAIClient`. */
export interface LLMClient {
  complete(options: LLMCompletionOptions): Promise<string>
}
