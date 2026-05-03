import type { DocRef } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'

export interface RetrievalResult {
  change: SymbolChange
  docs: DocRef[]
  tier: 1 | 2
}

export interface RetrievalAdapter {
  retrieve(change: SymbolChange): Promise<DocRef[]>
}
