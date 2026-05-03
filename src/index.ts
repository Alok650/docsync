export { extractSymbols } from './extractor/index.js'
export type { ExtractedSymbol, Language, SymbolKind } from './extractor/index.js'

export { buildMap } from './map/builder.js'
export type { MapFile, MapEntry, DocRef } from './map/types.js'

export { scanDocs } from './scanner/doc-scanner.js'
export type { DocSection } from './scanner/doc-scanner.js'

export { BM25Matcher } from './scanner/bm25.js'
export type { BM25Result } from './scanner/bm25.js'

export { diffSymbols } from './differ/ast-differ.js'
export { parseGitDiff, getGitDiff, getBeforeContent } from './differ/git-differ.js'
export type { SymbolChange, ChangedFile, ChangeType } from './differ/types.js'

export { TieredRetriever, StructuralRetriever, BM25Retriever } from './retrieval/index.js'
export type { RetrievalResult, RetrievalAdapter } from './retrieval/index.js'

export { DocUpdateAgent } from './agent/doc-update-agent.js'
export type { DocUpdateRequest } from './agent/doc-update-agent.js'

export { MarkdownEditor } from './editor/markdown-editor.js'

export { loadConfig } from './config.js'
export type { AutoDocsConfig, AnthropicProvider } from './config.js'
