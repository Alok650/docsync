import type { MapFile, DocRef } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'
import type { RetrievalAdapter } from './types.js'

export class StructuralRetriever implements RetrievalAdapter {
  private readonly index: Map<string, DocRef[]>

  constructor(map: MapFile) {
    this.index = new Map(
      map.mappings.map(entry => [entry.symbol, entry.docs]),
    )
  }

  retrieve(change: SymbolChange): Promise<DocRef[]> {
    return Promise.resolve(this.index.get(change.symbol) ?? [])
  }
}
