import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { extractSymbols } from '../../src/extractor/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.resolve(__dirname, '../fixtures/sample.ts')

describe('TypeScript symbol extraction', () => {
  it('extracts exported functions', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('processLogin')
    expect(names).toContain('validateToken')
  })

  it('extracts exported class', async () => {
    const symbols = await extractSymbols(fixture)
    const cls = symbols.find(s => s.name === 'AuthError')
    expect(cls).toBeDefined()
    expect(cls!.kind).toBe('class')
  })

  it('extracts exported interface', async () => {
    const symbols = await extractSymbols(fixture)
    const iface = symbols.find(s => s.name === 'AuthConfig')
    expect(iface).toBeDefined()
    expect(iface!.kind).toBe('interface')
  })

  it('extracts exported type alias', async () => {
    const symbols = await extractSymbols(fixture)
    const type = symbols.find(s => s.name === 'AuthResult')
    expect(type).toBeDefined()
    expect(type!.kind).toBe('type')
  })

  it('does not extract internal functions', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).not.toContain('hashPassword')
  })

  it('sets correct language and file', async () => {
    const symbols = await extractSymbols(fixture)
    for (const s of symbols) {
      expect(s.language).toBe('typescript')
      expect(s.file).toBe(fixture)
    }
  })

  it('records accurate line ranges', async () => {
    const symbols = await extractSymbols(fixture)
    const fn = symbols.find(s => s.name === 'processLogin')
    expect(fn!.startLine).toBeGreaterThanOrEqual(1)
    expect(fn!.endLine).toBeGreaterThan(fn!.startLine)
  })
})
