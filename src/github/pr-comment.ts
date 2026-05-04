import { GITHUB } from '../defaults.js'
import type { Octokit } from '@octokit/rest'
import type { GitHubContext, ProposedDocUpdate } from './types.js'

const COMMENT_MARKER = '<!-- docsync-check -->'
const DATA_PREFIX = '<!-- docsync-data:'
const DATA_SUFFIX = ' -->'
const DATA_RE = /<!-- docsync-data:([A-Za-z0-9+/=]+) -->/

// ─── Serialisation ───────────────────────────────────────────────────────────

type StoredUpdate = Pick<ProposedDocUpdate, 'symbolName' | 'docFile' | 'section' | 'beforeBody' | 'afterBody' | 'symbolFile'>

function embedData(updates: readonly ProposedDocUpdate[]): string {
  const stored: StoredUpdate[] = updates.map(u => ({
    symbolName: u.symbolName,
    docFile: u.docFile,
    section: u.section,
    beforeBody: u.beforeBody,
    afterBody: u.afterBody,
    symbolFile: u.symbolFile,
  }))
  return DATA_PREFIX + Buffer.from(JSON.stringify(stored)).toString('base64') + DATA_SUFFIX
}

export function extractUpdatesFromComment(body: string): StoredUpdate[] {
  const match = body.match(DATA_RE)
  if (!match) return []
  try {
    return JSON.parse(Buffer.from(match[1], 'base64').toString('utf-8')) as StoredUpdate[]
  } catch {
    return []
  }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderComment(updates: readonly ProposedDocUpdate[]): string {
  const sections = updates.map(u => {
    const diffLines = renderDiff(u.beforeBody, u.afterBody)
    return [
      `**File:** \`${u.docFile}\` — \`${u.section}\``,
      '',
      '```diff',
      diffLines,
      '```',
      '',
      `To apply: comment \`/docsync apply ${u.symbolName}\` — or dismiss with \`/docsync dismiss\`.`,
    ].join('\n')
  })

  return [
    COMMENT_MARKER,
    '**DocSync** detected doc sections that may need updating.',
    '',
    sections.join('\n\n---\n\n'),
    '',
    embedData(updates),
  ].join('\n')
}

function renderDiff(before: string, after: string): string {
  const beforeLines = before.split('\n').map(l => `- ${l}`)
  const afterLines = after.split('\n').map(l => `+ ${l}`)
  return [...beforeLines, ...afterLines].join('\n')
}

// ─── GitHubOutput ─────────────────────────────────────────────────────────────

interface CommentRef { id: number; body: string }

/** Posts, updates, and manages the DocSync PR comment. */
export class GitHubOutput {
  constructor(
    private readonly octokit: Octokit,
    private readonly ctx: GitHubContext,
  ) {}

  async postOrUpdate(updates: readonly ProposedDocUpdate[]): Promise<void> {
    if (updates.length === 0) return

    const body = renderComment(updates)
    const existing = await this.findExistingComments()

    if (existing.length > 0) {
      await this.octokit.issues.updateComment({
        owner: this.ctx.owner,
        repo: this.ctx.repo,
        comment_id: existing[0].id,
        body,
      })
      for (const comment of existing.slice(1)) {
        await this.octokit.issues.deleteComment({
          owner: this.ctx.owner,
          repo: this.ctx.repo,
          comment_id: comment.id,
        })
      }
    } else {
      await this.octokit.issues.createComment({
        owner: this.ctx.owner,
        repo: this.ctx.repo,
        issue_number: this.ctx.prNumber,
        body,
      })
    }
  }

  /** Returns the first DocSync comment on the PR, or null if none exists. */
  async findComment(): Promise<CommentRef | null> {
    const existing = await this.findExistingComments()
    return existing[0] ?? null
  }

  /** Updates the comment to reflect applied symbols. Deletes it when all are done. */
  async markApplied(applied: string[], remaining: StoredUpdate[], commentId: number): Promise<void> {
    if (remaining.length === 0) {
      const appliedList = applied.map(s => `\`${s}\``).join(', ')
      await this.octokit.issues.updateComment({
        owner: this.ctx.owner,
        repo: this.ctx.repo,
        comment_id: commentId,
        body: `${COMMENT_MARKER}\n**DocSync** ✓ Applied: ${appliedList}.`,
      })
      return
    }

    // Re-render with only remaining updates (cast is safe — StoredUpdate ⊆ ProposedDocUpdate fields)
    const body = renderComment(remaining as unknown as ProposedDocUpdate[])
    await this.octokit.issues.updateComment({
      owner: this.ctx.owner,
      repo: this.ctx.repo,
      comment_id: commentId,
      body,
    })
  }

  /** Deletes the DocSync comment (dismiss). */
  async dismiss(): Promise<void> {
    const existing = await this.findExistingComments()
    for (const comment of existing) {
      await this.octokit.issues.deleteComment({
        owner: this.ctx.owner,
        repo: this.ctx.repo,
        comment_id: comment.id,
      })
    }
  }

  private async findExistingComments(): Promise<CommentRef[]> {
    const comments = await this.octokit.paginate(this.octokit.issues.listComments, {
      owner: this.ctx.owner,
      repo: this.ctx.repo,
      issue_number: this.ctx.prNumber,
      per_page: GITHUB.COMMENTS_PER_PAGE,
    })
    return comments
      .filter(c => c.body?.includes(COMMENT_MARKER))
      .map(c => ({ id: c.id, body: c.body ?? '' }))
  }
}
