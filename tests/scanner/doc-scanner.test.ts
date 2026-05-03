import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { scanDocs } from '../../src/scanner/doc-scanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtureDocsDir = path.resolve(__dirname, '../fixtures/docs')

describe('doc scanner', () => {
  it('finds all markdown files', async () => {
    const sections = await scanDocs(fixtureDocsDir)
    const files = [...new Set(sections.map(s => path.basename(s.file)))]
    expect(files).toContain('authentication.md')
    expect(files).toContain('unrelated.md')
  })

  it('splits file into sections by heading', async () => {
    const sections = await scanDocs(fixtureDocsDir)
    const headings = sections.map(s => s.heading)
    expect(headings).toContain('## Login Flow')
    expect(headings).toContain('## Error Handling')
    expect(headings).toContain('## Configuration')
  })

  it('each section has a non-empty body', async () => {
    const sections = await scanDocs(fixtureDocsDir)
    for (const s of sections) {
      expect(s.body.trim().length).toBeGreaterThan(0)
    }
  })

  it('records start and end line numbers', async () => {
    const sections = await scanDocs(fixtureDocsDir)
    for (const s of sections) {
      expect(s.startLine).toBeGreaterThanOrEqual(1)
      expect(s.endLine).toBeGreaterThanOrEqual(s.startLine)
    }
  })
})
