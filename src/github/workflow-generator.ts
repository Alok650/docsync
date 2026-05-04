import fs from 'fs/promises'
import path from 'path'
import { WORKFLOW_DIR, WORKFLOW_FILENAME, APPLY_WORKFLOW_FILENAME, UTF8 } from '../constants.js'

function checkWorkflowContent(): string {
  return `name: DocSync
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  docsync:
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

function applyWorkflowContent(): string {
  return `name: DocSync Apply
on:
  issue_comment:
    types: [created]

jobs:
  apply:
    if: >
      github.event.issue.pull_request != null &&
      (startsWith(github.event.comment.body, '/docsync apply') ||
       github.event.comment.body == '/docsync dismiss')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Get PR branch
        id: pr
        run: |
          HEAD_REF=\$(gh api repos/\$GITHUB_REPOSITORY/pulls/\${{ github.event.issue.number }} --jq '.head.ref')
          echo "head_ref=\$HEAD_REF" >> \$GITHUB_OUTPUT
        env:
          GH_TOKEN: \${{ github.token }}
      - uses: actions/checkout@v4
        with:
          ref: \${{ steps.pr.outputs.head_ref }}
          token: \${{ github.token }}
      - uses: Alok650/docsync@v1
        with:
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
          openai-api-key: \${{ secrets.OPENAI_API_KEY }}
          comment-body: \${{ github.event.comment.body }}
`
}

export async function generateWorkflow(repoDir: string): Promise<string> {
  const workflowDir = path.join(repoDir, WORKFLOW_DIR)
  await fs.mkdir(workflowDir, { recursive: true })

  const checkPath = path.join(workflowDir, WORKFLOW_FILENAME)
  const applyPath = path.join(workflowDir, APPLY_WORKFLOW_FILENAME)

  await Promise.all([
    fs.writeFile(checkPath, checkWorkflowContent(), UTF8),
    fs.writeFile(applyPath, applyWorkflowContent(), UTF8),
  ])

  return checkPath
}
