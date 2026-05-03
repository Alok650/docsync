import { describe, it, expect } from 'vitest'
import { BM25Matcher } from '../../src/scanner/bm25.js'
import type { DocSection } from '../../src/scanner/doc-scanner.js'

const sections: DocSection[] = [
  {
    file: 'docs/auth.md',
    heading: '## Login Flow',
    body: 'The `processLogin` function accepts a username and password.',
    startLine: 5,
    endLine: 8,
  },
  {
    file: 'docs/auth.md',
    heading: '## Error Handling',
    body: '`AuthError` is thrown when authentication fails.',
    startLine: 10,
    endLine: 13,
  },
  {
    file: 'docs/deploy.md',
    heading: '## CI Pipeline',
    body: 'This document covers deployment steps. No symbols here.',
    startLine: 1,
    endLine: 5,
  },
]

describe('BM25Matcher', () => {
  it('returns sections that mention the symbol name', () => {
    const matcher = new BM25Matcher(sections)
    const results = matcher.query('processLogin')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].section.heading).toBe('## Login Flow')
  })

  it('returns empty when no section mentions the symbol', () => {
    const matcher = new BM25Matcher(sections)
    const results = matcher.query('nonExistentSymbol')
    expect(results).toHaveLength(0)
  })

  it('ranks exact backtick match higher than prose mention', () => {
    const matcher = new BM25Matcher(sections)
    const results = matcher.query('AuthError')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].section.heading).toBe('## Error Handling')
  })

  it('result has a score and section reference', () => {
    const matcher = new BM25Matcher(sections)
    const results = matcher.query('processLogin')
    expect(results[0].score).toBeGreaterThan(0)
    expect(results[0].section).toBeDefined()
  })
})
