import type { DocRef, LookupTable } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'
import type { RetrievalAdapter } from './types.js'

/**
 * Tier 1 retriever: O(1) lookup from the pre-built `LookupTable`.
 * Returns `[]` for symbols not in the index; the caller falls back to Tier 2.
 */
export class StructuralRetriever implements RetrievalAdapter {
  private readonly index: Map<string, readonly DocRef[]>

  constructor(lookup: LookupTable) {
    this.index = new Map(Object.entries(lookup))
  }

  retrieve(change: SymbolChange): Promise<readonly DocRef[]> {
    return Promise.resolve(this.index.get(change.symbol) ?? [])
  }
}
