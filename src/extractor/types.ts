import type { Language, SymbolKind } from './constants.js'

export { LANGUAGE, SYMBOL_KIND } from './constants.js'
export type { Language, SymbolKind } from './constants.js'

export interface ExtractedSymbol {
  readonly name: string
  readonly kind: SymbolKind
  readonly file: string
  readonly startLine: number
  readonly endLine: number
  readonly language: Language
}
