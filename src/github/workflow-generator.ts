import fs from 'fs/promises'
import path from 'path'
import { WORKFLOW_DIR, WORKFLOW_FILENAME } from '../constants.js'

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
      - uses: Alok650/docsync@v1
        with:
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
          openai-api-key: \${{ secrets.OPENAI_API_KEY }}
`
}

export async function generateWorkflow(repoDir: string): Promise<string> {
  const workflowDir = path.join(repoDir, WORKFLOW_DIR)
  const workflowPath = path.join(workflowDir, WORKFLOW_FILENAME)

  await fs.mkdir(workflowDir, { recursive: true })
  await fs.writeFile(workflowPath, generateWorkflowContent(), 'utf-8')

  return workflowPath
}
