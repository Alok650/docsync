/** GitHub context resolved from CI environment variables. */
export interface GitHubContext {
  readonly owner: string
  readonly repo: string
  readonly prNumber: number
  readonly baseRef: string
  readonly token: string
  readonly baseUrl?: string
}

/** A doc section that AutoDocs proposes to update, with before/after body text. */
export interface ProposedDocUpdate {
  readonly docFile: string
  readonly section: string
  readonly beforeBody: string
  readonly afterBody: string
  readonly symbolName: string
  readonly symbolFile: string
}
