import fs from 'fs/promises'
import path from 'path'

const WORKFLOW_DIR = '.github/workflows'
const WORKFLOW_FILE = 'autodocs.yml'

// Pinned action versions follow GitHub's own starter-workflow conventions.
// fetch-depth: 0 is required so git diff can reach the base branch.
function generateWorkflowContent(): string {
  return `name: AutoDocs
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  autodocs:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: npm install -g pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec autodocs check
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: \${{ github.event.pull_request.number }}
          GITHUB_BASE_REF: \${{ github.event.pull_request.base.ref }}
`
}

export async function generateWorkflow(repoDir: string): Promise<string> {
  const workflowDir = path.join(repoDir, WORKFLOW_DIR)
  const workflowPath = path.join(workflowDir, WORKFLOW_FILE)

  await fs.mkdir(workflowDir, { recursive: true })
  await fs.writeFile(workflowPath, generateWorkflowContent(), 'utf-8')

  return workflowPath
}
