import { describe, it, expect, vi } from 'vitest'
import { DocUpdateAgent } from '../../src/agent/doc-update-agent.js'
import type { DocUpdateRequest } from '../../src/agent/doc-update-agent.js'
import type { LLMClient } from '../../src/llm/types.js'

const TEST_MODEL = 'test-model'

const REQUEST: DocUpdateRequest = {
  symbol: 'processLogin',
  file: 'src/auth/login.ts',
  beforeCode: 'export function processLogin(username: string, password: string): boolean {\n  return true\n}',
  afterCode: 'export function processLogin(username: string, password: string, mfa?: string): boolean {\n  return true\n}',
  docSection: {
    file: 'docs/auth.md',
    heading: '## Login Flow',
    body: 'The `processLogin` function accepts a username and password.',
    startLine: 5,
    endLine: 7,
  },
}

const MOCK_UPDATED_BODY = 'The `processLogin` function accepts a username, password, and an optional MFA token.'

function makeClient(returnValue: string): LLMClient {
  return { complete: vi.fn().mockResolvedValue(returnValue) }
}

describe('DocUpdateAgent', () => {
  it('calls the LLM client with correct context and returns updated body', async () => {
    const client = makeClient(MOCK_UPDATED_BODY)
    const agent = new DocUpdateAgent(client, TEST_MODEL)
    const result = await agent.generateUpdate(REQUEST)

    expect(result).toBe(MOCK_UPDATED_BODY)
    expect(client.complete).toHaveBeenCalledOnce()
  })

  it('passes symbol name, before/after code, and doc body in the prompt', async () => {
    const client = makeClient(MOCK_UPDATED_BODY)
    const agent = new DocUpdateAgent(client, TEST_MODEL)
    await agent.generateUpdate(REQUEST)

    const callArgs = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const promptText = JSON.stringify(callArgs)
    expect(promptText).toContain('processLogin')
    expect(promptText).toContain('mfa')
    expect(promptText).toContain('username and password')
  })

  it('passes the model name to the client', async () => {
    const client = makeClient(MOCK_UPDATED_BODY)
    const agent = new DocUpdateAgent(client, TEST_MODEL)
    await agent.generateUpdate(REQUEST)

    const callArgs = (client.complete as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArgs.model).toBe(TEST_MODEL)
  })

  it('throws if the client rejects', async () => {
    const client: LLMClient = { complete: vi.fn().mockRejectedValue(new Error('API error')) }
    const agent = new DocUpdateAgent(client, TEST_MODEL)
    await expect(agent.generateUpdate(REQUEST)).rejects.toThrow('API error')
  })
})
