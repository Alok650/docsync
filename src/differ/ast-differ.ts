import path from 'path'
import { getParser } from '../extractor/loader.js'
import { extractTypeScriptSymbols } from '../extractor/languages/typescript.js'
import { extractPythonSymbols } from '../extractor/languages/python.js'
import type { ExtractedSymbol, Language } from '../extractor/types.js'
import type { SymbolChange } from './types.js'

interface SymbolWithText extends ExtractedSymbol {
  text: string
}

function resolveLanguage(filePath: string): Language | null {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.ts' || ext === '.tsx') return 'typescript'
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'javascript'
  if (ext === '.py') return 'python'
  return null
}

async function parseSymbolsWithText(source: string, filePath: string): Promise<SymbolWithText[]> {
  const language = resolveLanguage(filePath)
  if (!language) return []

  const parser = await getParser(language)
  const tree = parser.parse(source)
  const symbols = language === 'python'
    ? extractPythonSymbols(tree, filePath)
    : extractTypeScriptSymbols(tree, filePath, language)

  const sourceLines = source.split('\n')
  return symbols.map(s => ({
    ...s,
    text: sourceLines.slice(s.startLine - 1, s.endLine).join('\n'),
  }))
}

export async function diffSymbols(
  filePath: string,
  before: string,
  after: string,
): Promise<SymbolChange[]> {
  const [beforeSymbols, afterSymbols] = await Promise.all([
    parseSymbolsWithText(before, filePath),
    parseSymbolsWithText(after, filePath),
  ])

  const beforeMap = new Map(beforeSymbols.map(s => [s.name, s]))
  const afterMap = new Map(afterSymbols.map(s => [s.name, s]))
  const changes: SymbolChange[] = []

  for (const [name, afterSym] of afterMap) {
    const beforeSym = beforeMap.get(name)
    if (!beforeSym) {
      changes.push({ type: 'added', symbol: name, file: filePath })
    } else if (beforeSym.text !== afterSym.text) {
      changes.push({ type: 'modified', symbol: name, file: filePath })
    }
  }

  for (const name of beforeMap.keys()) {
    if (!afterMap.has(name)) {
      changes.push({ type: 'removed', symbol: name, file: filePath })
    }
  }

  return changes
}
