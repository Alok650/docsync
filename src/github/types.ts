export interface GitHubContext {
  owner: string
  repo: string
  prNumber: number
  baseRef: string
  token: string
  baseUrl?: string
}

export interface ProposedDocUpdate {
  docFile: string
  section: string
  beforeBody: string
  afterBody: string
  symbolName: string
  symbolFile: string
}
