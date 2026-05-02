import type { Parser } from 'web-tree-sitter'
import type { ExtractedSymbol } from '../types.js'

export function extractPythonSymbols(
  tree: Parser.Tree,
  file: string,
): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = []
  const root = tree.rootNode

  for (const node of root.children) {
    if (node.type === 'function_definition') {
      const nameNode = node.childForFieldName('name')
      if (!nameNode) continue
      const name = nameNode.text
      // skip private (leading underscore convention)
      if (name.startsWith('_')) continue
      symbols.push({
        name,
        kind: 'function',
        file,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        language: 'python',
      })
    }

    if (node.type === 'class_definition') {
      const nameNode = node.childForFieldName('name')
      if (!nameNode) continue
      const name = nameNode.text
      if (name.startsWith('_')) continue
      symbols.push({
        name,
        kind: 'class',
        file,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        language: 'python',
      })
    }
  }

  return symbols
}
