import fs from 'fs/promises'
import path from 'path'
import { getParser } from './loader.js'
import { extractTypeScriptSymbols } from './languages/typescript.js'
import { extractPythonSymbols } from './languages/python.js'
import type { ExtractedSymbol, Language } from './types.js'

export type { ExtractedSymbol, Language }
export type { SymbolKind } from './types.js'

function resolveLanguage(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.ts' || ext === '.tsx') return 'typescript'
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'javascript'
  if (ext === '.py') return 'python'
  return null
}

export async function extractSymbols(filePath: string): Promise<ExtractedSymbol[]> {
  const language = resolveLanguage(filePath)
  if (!language) return []

  const source = await fs.readFile(filePath, 'utf-8')
  const parser = await getParser(language)
  const tree = parser.parse(source)

  switch (language) {
    case 'typescript':
    case 'javascript':
      return extractTypeScriptSymbols(tree, filePath)
    case 'python':
      return extractPythonSymbols(tree, filePath)
  }
}
