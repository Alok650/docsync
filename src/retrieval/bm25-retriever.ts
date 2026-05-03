import { BM25Matcher } from '../scanner/bm25.js'
import type { DocSection } from '../scanner/doc-scanner.js'
import type { DocRef } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'
import type { RetrievalAdapter } from './types.js'

const BM25_MIN_SCORE = 0.5

export class BM25Retriever implements RetrievalAdapter {
  private readonly matcher: BM25Matcher

  constructor(sections: DocSection[]) {
    this.matcher = new BM25Matcher(sections)
  }

  retrieve(change: SymbolChange): Promise<DocRef[]> {
    const hits = this.matcher.query(change.symbol)
    const docs: DocRef[] = hits
      .filter(hit => hit.score >= BM25_MIN_SCORE)
      .map(hit => ({
        file: hit.section.file,
        section: hit.section.heading,
        lines: [hit.section.startLine, hit.section.endLine],
      }))
    return Promise.resolve(docs)
  }
}
