import type { Octokit } from '@octokit/rest'
import type { GitHubContext, ProposedDocUpdate } from './types.js'

// Embedded in every comment body so we can reliably find and update it.
const COMMENT_MARKER = '<!-- autodocs-check -->'

function renderComment(updates: ProposedDocUpdate[]): string {
  const sections = updates.map(u => {
    const diffLines = renderDiff(u.beforeBody, u.afterBody)
    return [
      `**File:** \`${u.docFile}\` — \`${u.section}\``,
      '',
      '```diff',
      diffLines,
      '```',
      '',
      `To apply: comment \`/autodocs apply ${u.symbolName}\` — or dismiss with \`/autodocs dismiss\`.`,
    ].join('\n')
  })

  return [
    COMMENT_MARKER,
    '**AutoDocs** detected doc sections that may need updating.',
    '',
    sections.join('\n\n---\n\n'),
  ].join('\n')
}

function renderDiff(before: string, after: string): string {
  const beforeLines = before.split('\n').map(l => `- ${l}`)
  const afterLines = after.split('\n').map(l => `+ ${l}`)
  return [...beforeLines, ...afterLines].join('\n')
}

export class GitHubOutput {
  constructor(
    private readonly octokit: Octokit,
    private readonly ctx: GitHubContext,
  ) {}

  async postOrUpdate(updates: ProposedDocUpdate[]): Promise<void> {
    if (updates.length === 0) return

    const body = renderComment(updates)
    const existing = await this.findExistingComments()

    if (existing.length > 0) {
      // Update the first match; delete any duplicates from prior runs
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

  private async findExistingComments(): Promise<Array<{ id: number }>> {
    const comments = await this.octokit.paginate(this.octokit.issues.listComments, {
      owner: this.ctx.owner,
      repo: this.ctx.repo,
      issue_number: this.ctx.prNumber,
      per_page: 100,
    })
    return comments.filter(c => c.body?.includes(COMMENT_MARKER))
  }
}
