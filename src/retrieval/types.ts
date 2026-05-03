import type { DocRef } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'

/** The result of looking up doc refs for a single changed symbol across all retrieval tiers. */
export interface RetrievalResult {
  readonly change: SymbolChange
  readonly docs: readonly DocRef[]
  /** `1` = found in structural index (map.json), `2` = found via BM25 fallback. */
  readonly tier: 1 | 2
}

/** Retrieves doc refs for a changed symbol. Implemented by `StructuralRetriever` and `BM25Retriever`. */
export interface RetrievalAdapter {
  retrieve(change: SymbolChange): Promise<readonly DocRef[]>
}
