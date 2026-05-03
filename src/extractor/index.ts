import fs from 'fs/promises'
import path from 'path'
import type { Parser } from 'web-tree-sitter'
import { getParser } from './loader.js'
import { extractTypeScriptSymbols } from './languages/typescript.js'
import { extractPythonSymbols } from './languages/python.js'
import { LANGUAGE } from './types.js'
import type { ExtractedSymbol, Language } from './types.js'

export type { ExtractedSymbol, Language }
export type { SymbolKind } from './types.js'

const EXTENSION_LANGUAGE_MAP: Readonly<Record<string, Language>> = {
  '.ts': LANGUAGE.TYPESCRIPT,
  '.tsx': LANGUAGE.TYPESCRIPT,
  '.js': LANGUAGE.JAVASCRIPT,
  '.jsx': LANGUAGE.JAVASCRIPT,
  '.mjs': LANGUAGE.JAVASCRIPT,
  '.cjs': LANGUAGE.JAVASCRIPT,
  '.py': LANGUAGE.PYTHON,
}

/**
 * Returns the language for a given file path, or `null` for unsupported extensions.
 * Supported: TypeScript (.ts, .tsx), JavaScript (.js, .jsx, .mjs, .cjs), Python (.py).
 */
export function resolveLanguage(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase()
  return EXTENSION_LANGUAGE_MAP[ext] ?? null
}

/** Dispatches an already-parsed AST to the appropriate language extractor. */
export function parseSymbols(
  tree: Parser.Tree,
  filePath: string,
  language: Language,
): ExtractedSymbol[] {
  switch (language) {
    case LANGUAGE.TYPESCRIPT:
    case LANGUAGE.JAVASCRIPT:
      return extractTypeScriptSymbols(tree, filePath, language)
    case LANGUAGE.PYTHON:
      return extractPythonSymbols(tree, filePath)
  }
}

/**
 * Reads `filePath`, parses it with the WASM grammar, and returns all public symbols.
 * Returns `[]` for unsupported file extensions — never throws for that case.
 */
export async function extractSymbols(filePath: string): Promise<ExtractedSymbol[]> {
  const language = resolveLanguage(filePath)
  if (!language) return []

  const source = await fs.readFile(filePath, 'utf-8')
  const parser = await getParser(language)
  const tree = parser.parse(source)
  if (!tree) return []

  return parseSymbols(tree, filePath, language)
}
