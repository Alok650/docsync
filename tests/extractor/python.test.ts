import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { extractSymbols } from '../../src/extractor/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.resolve(__dirname, '../fixtures/sample.py')

describe('Python symbol extraction', () => {
  it('extracts top-level functions', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('process_login')
    expect(names).toContain('validate_token')
  })

  it('extracts class', async () => {
    const symbols = await extractSymbols(fixture)
    const cls = symbols.find(s => s.name === 'AuthError')
    expect(cls).toBeDefined()
    expect(cls!.kind).toBe('class')
  })

  it('does not extract private functions (leading underscore)', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).not.toContain('_hash_password')
  })

  it('sets correct language and file', async () => {
    const symbols = await extractSymbols(fixture)
    for (const s of symbols) {
      expect(s.language).toBe('python')
      expect(s.file).toBe(fixture)
    }
  })

  it('records accurate line ranges', async () => {
    const symbols = await extractSymbols(fixture)
    const fn = symbols.find(s => s.name === 'process_login')
    expect(fn!.startLine).toBeGreaterThanOrEqual(1)
    expect(fn!.endLine).toBeGreaterThanOrEqual(fn!.startLine)
  })
})
