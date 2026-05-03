export { extractSymbols, resolveLanguage } from './extractor/index.js'
export type { ExtractedSymbol, Language, SymbolKind } from './extractor/index.js'

export { buildMap } from './map/builder.js'
export type { MapFile, MapEntry, DocRef } from './map/types.js'

export { scanDocs } from './scanner/doc-scanner.js'
export type { DocSection } from './scanner/doc-scanner.js'

export { findCodeFiles, findDocFiles, CODE_EXTENSIONS, DOC_EXTENSIONS } from './scanner/file-finder.js'

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

export { loadConfig, LLM_PROVIDER } from './config.js'
export type { DocSyncConfig, LLMProvider, LLMConfig } from './config.js'

export { BM25, AI, GIT, GITHUB, LOOKUP, CLI } from './defaults.js'

export { createLLMClient } from './llm/index.js'
export type { LLMClient, LLMMessage, LLMCompletionOptions } from './llm/index.js'
export { AnthropicClient } from './llm/index.js'
export { OpenAIClient } from './llm/index.js'

export { writeMapFile } from './map/writer.js'
export { updateMapForChangedFiles } from './map/updater.js'
export { buildLookup, buildShards, readLookupForSymbols, symbolShard, computeFingerprint } from './map/lookup.js'
export type { LookupTable } from './map/types.js'

export { createOctokit, GitHubOutput, generateWorkflow, readGitHubContext } from './github/index.js'
export type { GitHubContext, ProposedDocUpdate } from './github/index.js'

export { runCheck } from './pipeline/check.js'
export type { CheckResult } from './pipeline/check.js'
