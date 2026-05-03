import type { GitHubContext } from './types.js'

/**
 * Resolves `GitHubContext` from CI environment variables.
 * Returns `null` if any required variable (`GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `PR_NUMBER`) is missing.
 */
export function readGitHubContext(): GitHubContext | null {
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  const prNumber = process.env.PR_NUMBER ?? process.env.GITHUB_PR_NUMBER

  if (!token || !repository || !prNumber) return null

  const [owner, repo] = repository.split('/')
  if (!owner || !repo) return null

  return {
    owner,
    repo,
    prNumber: parseInt(prNumber, 10),
    baseRef: process.env.GITHUB_BASE_REF ?? 'main',
    token,
    baseUrl: process.env.GITHUB_API_URL,
  }
}
