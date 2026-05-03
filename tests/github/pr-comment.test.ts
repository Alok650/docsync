import { describe, it, expect, vi } from 'vitest'
import { GitHubOutput } from '../../src/github/pr-comment.js'
import type { GitHubContext, ProposedDocUpdate } from '../../src/github/types.js'

const CTX: GitHubContext = {
  owner: 'acme',
  repo: 'api',
  prNumber: 42,
  baseRef: 'main',
  token: 'ghp_test',
}

const UPDATE: ProposedDocUpdate = {
  docFile: 'docs/auth.md',
  section: '## Login Flow',
  beforeBody: 'Accepts username and password.',
  afterBody: 'Accepts username, password, and optional MFA token.',
  symbolName: 'processLogin',
  symbolFile: 'src/auth/login.ts',
}

function makeOctokit(existingComments: Array<{ id: number; body: string }> = []) {
  return {
    paginate: vi.fn().mockResolvedValue(existingComments),
    issues: {
      listComments: vi.fn(),
      createComment: vi.fn().mockResolvedValue({}),
      updateComment: vi.fn().mockResolvedValue({}),
      deleteComment: vi.fn().mockResolvedValue({}),
    },
  } as never
}

describe('GitHubOutput', () => {
  it('creates a new comment when none exists', async () => {
    const octokit = makeOctokit([])
    await new GitHubOutput(octokit, CTX).postOrUpdate([UPDATE])
    expect(octokit.issues.createComment).toHaveBeenCalledOnce()
    expect(octokit.issues.updateComment).not.toHaveBeenCalled()
  })

  it('updates the existing comment when marker is found', async () => {
    const octokit = makeOctokit([{ id: 101, body: '<!-- autodocs-check -->\nold content' }])
    await new GitHubOutput(octokit, CTX).postOrUpdate([UPDATE])
    expect(octokit.issues.updateComment).toHaveBeenCalledOnce()
    expect(octokit.issues.createComment).not.toHaveBeenCalled()
  })

  it('deletes duplicate comments keeping only the first', async () => {
    const octokit = makeOctokit([
      { id: 101, body: '<!-- autodocs-check -->' },
      { id: 102, body: '<!-- autodocs-check -->' },
    ])
    await new GitHubOutput(octokit, CTX).postOrUpdate([UPDATE])
    expect(octokit.issues.updateComment).toHaveBeenCalledOnce()
    expect(octokit.issues.deleteComment).toHaveBeenCalledOnce()
    expect(octokit.issues.deleteComment).toHaveBeenCalledWith(expect.objectContaining({ comment_id: 102 }))
  })

  it('does nothing when updates array is empty', async () => {
    const octokit = makeOctokit([])
    await new GitHubOutput(octokit, CTX).postOrUpdate([])
    expect(octokit.issues.createComment).not.toHaveBeenCalled()
  })

  it('renders diff content in the comment body', async () => {
    let capturedBody = ''
    const octokit = makeOctokit([])
    octokit.issues.createComment = vi.fn().mockImplementation(({ body }: { body: string }) => {
      capturedBody = body
      return Promise.resolve({})
    })
    await new GitHubOutput(octokit, CTX).postOrUpdate([UPDATE])
    expect(capturedBody).toContain('<!-- autodocs-check -->')
    expect(capturedBody).toContain('## Login Flow')
    expect(capturedBody).toContain('- Accepts username and password.')
    expect(capturedBody).toContain('+ Accepts username, password, and optional MFA token.')
  })
})
