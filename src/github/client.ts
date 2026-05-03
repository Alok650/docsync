import { Octokit } from '@octokit/rest'
import type { GitHubContext } from './types.js'

export function createOctokit(ctx: GitHubContext): Octokit {
  return new Octokit({
    auth: ctx.token,
    ...(ctx.baseUrl ? { baseUrl: ctx.baseUrl } : {}),
  })
}
