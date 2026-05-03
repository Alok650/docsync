import { describe, it, expect, vi } from 'vitest'
import { DocUpdateAgent } from '../../src/agent/doc-update-agent.js'
import type { DocUpdateRequest } from '../../src/agent/doc-update-agent.js'

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

describe('DocUpdateAgent', () => {
  it('calls the Claude API with correct context and returns updated body', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: MOCK_UPDATED_BODY }],
    })
    const mockClient = { messages: { create: mockCreate } } as never

    const agent = new DocUpdateAgent(mockClient)
    const result = await agent.generateUpdate(REQUEST)

    expect(result).toBe(MOCK_UPDATED_BODY)
    expect(mockCreate).toHaveBeenCalledOnce()
  })

  it('passes symbol name, before/after code, and doc body in the prompt', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: MOCK_UPDATED_BODY }],
    })
    const mockClient = { messages: { create: mockCreate } } as never

    const agent = new DocUpdateAgent(mockClient)
    await agent.generateUpdate(REQUEST)

    const callArgs = mockCreate.mock.calls[0][0]
    const promptText = JSON.stringify(callArgs)
    expect(promptText).toContain('processLogin')
    expect(promptText).toContain('mfa')
    expect(promptText).toContain('username and password')
  })

  it('throws if API returns no text content', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ content: [] })
    const mockClient = { messages: { create: mockCreate } } as never

    const agent = new DocUpdateAgent(mockClient)
    await expect(agent.generateUpdate(REQUEST)).rejects.toThrow()
  })
})
