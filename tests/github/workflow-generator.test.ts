import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { generateWorkflow } from '../../src/github/workflow-generator.js'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autodocs-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('generateWorkflow', () => {
  it('writes the workflow file to .github/workflows/autodocs.yml', async () => {
    const outPath = await generateWorkflow(tmpDir)
    const stat = await fs.stat(outPath)
    expect(stat.isFile()).toBe(true)
    expect(outPath).toContain('.github/workflows/autodocs.yml')
  })

  it('generates valid YAML with required keys', async () => {
    const outPath = await generateWorkflow(tmpDir)
    const content = await fs.readFile(outPath, 'utf-8')
    expect(content).toContain('name: AutoDocs')
    expect(content).toContain('pull_request')
    expect(content).toContain('actions/checkout@v4')
    expect(content).toContain('fetch-depth: 0')
    expect(content).toContain('ANTHROPIC_API_KEY')
    expect(content).toContain('GITHUB_TOKEN')
    expect(content).toContain('PR_NUMBER')
  })

  it('creates intermediate directories if they do not exist', async () => {
    const nested = path.join(tmpDir, 'deep', 'repo')
    await generateWorkflow(nested)
    const workflowPath = path.join(nested, '.github/workflows/autodocs.yml')
    const stat = await fs.stat(workflowPath)
    expect(stat.isFile()).toBe(true)
  })
})
