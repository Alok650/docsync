export { extractSymbols } from './extractor/index.js'
export type { ExtractedSymbol, Language, SymbolKind } from './extractor/index.js'

export { buildMap } from './map/builder.js'
export type { MapFile, MapEntry, DocRef } from './map/types.js'

export { scanDocs } from './scanner/doc-scanner.js'
export type { DocSection } from './scanner/doc-scanner.js'

export { BM25Matcher } from './scanner/bm25.js'
export type { BM25Result } from './scanner/bm25.js'
