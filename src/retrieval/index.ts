import type { SymbolChange } from '../differ/types.js'
import type { RetrievalAdapter, RetrievalResult } from './types.js'

export { StructuralRetriever } from './structural.js'
export { BM25Retriever } from './bm25-retriever.js'
export type { RetrievalResult, RetrievalAdapter } from './types.js'

/**
 * Queries Tier 1 (structural index) first; falls back to Tier 2 (BM25) if the symbol
 * isn't mapped. Results with no docs from either tier are filtered out by `retrieveAll`.
 */
export class TieredRetriever {
  constructor(
    private readonly tier1: RetrievalAdapter,
    private readonly tier2: RetrievalAdapter,
  ) {}

  async retrieve(change: SymbolChange): Promise<RetrievalResult> {
    const tier1Docs = await this.tier1.retrieve(change)
    if (tier1Docs.length > 0) {
      return { change, docs: tier1Docs, tier: 1 }
    }

    const tier2Docs = await this.tier2.retrieve(change)
    return { change, docs: tier2Docs, tier: 2 }
  }

  async retrieveAll(changes: readonly SymbolChange[]): Promise<RetrievalResult[]> {
    const results = await Promise.all(changes.map(c => this.retrieve(c)))
    return results.filter(r => r.docs.length > 0)
  }
}
