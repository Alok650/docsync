import { BM25Matcher } from '../scanner/bm25.js'
import { BM25 } from '../defaults.js'
import type { DocSection } from '../scanner/doc-scanner.js'
import type { DocRef } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'
import type { RetrievalAdapter } from './types.js'

/**
 * Tier 2 retriever: falls back to BM25 lexical search when a symbol
 * isn't in the structural index. Scores are capped by `BM25.MATCH_MIN_SCORE`.
 */
export class BM25Retriever implements RetrievalAdapter {
  private readonly matcher: BM25Matcher

  constructor(sections: readonly DocSection[]) {
    this.matcher = new BM25Matcher(sections)
  }

  retrieve(change: SymbolChange): Promise<readonly DocRef[]> {
    const hits = this.matcher.query(change.symbol)
    const docs: DocRef[] = hits
      .filter(hit => hit.score >= BM25.MATCH_MIN_SCORE)
      .map(hit => ({
        file: hit.section.file,
        section: hit.section.heading,
        lines: [hit.section.startLine, hit.section.endLine],
      }))
    return Promise.resolve(docs)
  }
}
