export type Language = 'typescript' | 'javascript' | 'python'

export type SymbolKind = 'function' | 'class' | 'method' | 'interface' | 'type' | 'variable'

export interface ExtractedSymbol {
  name: string
  kind: SymbolKind
  file: string
  startLine: number
  endLine: number
  language: Language
}
