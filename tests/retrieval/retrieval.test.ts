import { describe, it, expect } from 'vitest'
import { StructuralRetriever } from '../../src/retrieval/structural.js'
import { BM25Retriever } from '../../src/retrieval/bm25-retriever.js'
import { TieredRetriever } from '../../src/retrieval/index.js'
import { buildLookup } from '../../src/map/lookup.js'
import type { MapFile } from '../../src/map/types.js'
import type { DocSection } from '../../src/scanner/doc-scanner.js'
import type { SymbolChange } from '../../src/differ/types.js'

const MAP: MapFile = {
  version: 1,
  mappings: [
    {
      symbol: 'processLogin',
      file: 'src/auth/login.ts',
      docs: [{ file: 'docs/auth.md', section: '## Login Flow', lines: [5, 9] }],
    },
    {
      symbol: 'AuthError',
      file: 'src/auth/login.ts',
      docs: [{ file: 'docs/auth.md', section: '## Error Handling', lines: [11, 15] }],
    },
    {
      symbol: 'AuthResult',
      file: 'src/auth/login.ts',
      docs: [],
    },
  ],
}

const SECTIONS: DocSection[] = [
  {
    file: 'docs/auth.md',
    heading: '## Login Flow',
    body: 'The `processLogin` function handles authentication.',
    startLine: 5,
    endLine: 9,
  },
  {
    file: 'docs/auth.md',
    heading: '## Error Handling',
    body: '`AuthError` is thrown when authentication fails.',
    startLine: 11,
    endLine: 15,
  },
]

const modified = (symbol: string): SymbolChange => ({
  type: 'modified',
  symbol,
  file: 'src/auth/login.ts',
})

const LOOKUP = buildLookup(MAP)

describe('StructuralRetriever (Tier 1)', () => {
  it('returns mapped doc sections for a known symbol', async () => {
    const r = new StructuralRetriever(LOOKUP)
    const docs = await r.retrieve(modified('processLogin'))
    expect(docs).toHaveLength(1)
    expect(docs[0].section).toBe('## Login Flow')
  })

  it('returns empty array for a symbol with no docs in map', async () => {
    const r = new StructuralRetriever(LOOKUP)
    const docs = await r.retrieve(modified('AuthResult'))
    expect(docs).toHaveLength(0)
  })

  it('returns empty array for a symbol not in map at all', async () => {
    const r = new StructuralRetriever(LOOKUP)
    const docs = await r.retrieve(modified('unknownSymbol'))
    expect(docs).toHaveLength(0)
  })

  it('merges docs when the same symbol exists in multiple files', async () => {
    const multiMap: MapFile = {
      version: 1,
      mappings: [
        {
          symbol: 'processLogin',
          file: 'src/auth/login.ts',
          docs: [{ file: 'docs/auth.md', section: '## Login Flow', lines: [5, 9] }],
        },
        {
          symbol: 'processLogin',
          file: 'src/legacy/login.ts',
          docs: [{ file: 'docs/legacy.md', section: '## Legacy Login', lines: [1, 4] }],
        },
      ],
    }
    const r = new StructuralRetriever(buildLookup(multiMap))
    const docs = await r.retrieve(modified('processLogin'))
    expect(docs).toHaveLength(2)
  })
})

describe('BM25Retriever (Tier 2)', () => {
  it('finds a section by symbol name when not in map', async () => {
    const r = new BM25Retriever(SECTIONS)
    const docs = await r.retrieve(modified('processLogin'))
    expect(docs.length).toBeGreaterThan(0)
  })

  it('returns empty for a symbol with no textual match', async () => {
    const r = new BM25Retriever(SECTIONS)
    const docs = await r.retrieve(modified('totallyUnrelatedFunction'))
    expect(docs).toHaveLength(0)
  })
})

describe('TieredRetriever', () => {
  it('uses Tier 1 when symbol is in map', async () => {
    const retriever = new TieredRetriever(
      new StructuralRetriever(LOOKUP),
      new BM25Retriever(SECTIONS),
    )
    const result = await retriever.retrieve(modified('processLogin'))
    expect(result.tier).toBe(1)
    expect(result.docs[0].section).toBe('## Login Flow')
  })

  it('falls back to Tier 2 for a symbol not in the map', async () => {
    const retriever = new TieredRetriever(
      new StructuralRetriever(LOOKUP),
      new BM25Retriever(SECTIONS),
    )
    const result = await retriever.retrieve(modified('totallyNewSymbol'))
    expect(result.tier).toBe(2)
  })

  it('silently returns empty docs when no tier matches', async () => {
    const retriever = new TieredRetriever(
      new StructuralRetriever(LOOKUP),
      new BM25Retriever(SECTIONS),
    )
    const result = await retriever.retrieve(modified('completelyNewSymbol'))
    expect(result.docs).toHaveLength(0)
  })

  it('retrieveAll filters out results with no docs', async () => {
    const retriever = new TieredRetriever(
      new StructuralRetriever(LOOKUP),
      new BM25Retriever(SECTIONS),
    )
    const results = await retriever.retrieveAll([
      modified('processLogin'),
      modified('completelyNewSymbol'),
    ])
    expect(results.every(r => r.docs.length > 0)).toBe(true)
  })
})
