export const LANGUAGE = {
  TYPESCRIPT: 'typescript',
  JAVASCRIPT: 'javascript',
  PYTHON: 'python',
} as const

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE]

export const SYMBOL_KIND = {
  FUNCTION: 'function',
  CLASS: 'class',
  METHOD: 'method',
  INTERFACE: 'interface',
  TYPE: 'type',
  VARIABLE: 'variable',
} as const

export type SymbolKind = (typeof SYMBOL_KIND)[keyof typeof SYMBOL_KIND]

