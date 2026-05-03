import fs from 'fs/promises'
import path from 'path'
import { getParser } from './loader.js'
import { extractTypeScriptSymbols } from './languages/typescript.js'
import { extractPythonSymbols } from './languages/python.js'
import { LANGUAGE } from './types.js'
import type { ExtractedSymbol, Language } from './types.js'

export type { ExtractedSymbol, Language }
export type { SymbolKind } from './types.js'

function resolveLanguage(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.ts' || ext === '.tsx') return LANGUAGE.TYPESCRIPT
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return LANGUAGE.JAVASCRIPT
  if (ext === '.py') return LANGUAGE.PYTHON
  return null
}

export async function extractSymbols(filePath: string): Promise<ExtractedSymbol[]> {
  const language = resolveLanguage(filePath)
  if (!language) return []

  const source = await fs.readFile(filePath, 'utf-8')
  const parser = await getParser(language)
  const tree = parser.parse(source)
  if (!tree) return []

  switch (language) {
    case LANGUAGE.TYPESCRIPT:
    case LANGUAGE.JAVASCRIPT:
      return extractTypeScriptSymbols(tree, filePath, language)
    case LANGUAGE.PYTHON:
      return extractPythonSymbols(tree, filePath)
  }
}
