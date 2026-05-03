import type { Node, Tree } from 'web-tree-sitter'
import { LANGUAGE, SYMBOL_KIND } from '../types.js'
import type { ExtractedSymbol, SymbolKind } from '../types.js'
import { PY_NODE } from './node-types.js'

const PRIVATE_PREFIX = '_'

export function extractPythonSymbols(
  tree: Tree,
  file: string,
): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = []
  const root = tree.rootNode

  for (const node of root.children) {
    if (node.type === PY_NODE.FUNCTION_DEFINITION) {
      const symbol = tryMakeSymbol(node, SYMBOL_KIND.FUNCTION, file)
      if (symbol) symbols.push(symbol)
    } else if (node.type === PY_NODE.CLASS_DEFINITION) {
      const symbol = tryMakeSymbol(node, SYMBOL_KIND.CLASS, file)
      if (symbol) symbols.push(symbol)
    }
  }

  return symbols
}

function tryMakeSymbol(
  node: Node,
  kind: SymbolKind,
  file: string,
): ExtractedSymbol | null {
  const nameNode = node.childForFieldName('name')
  if (!nameNode) return null
  const name = nameNode.text
  if (name.startsWith(PRIVATE_PREFIX)) return null
  return {
    name,
    kind,
    file,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    language: LANGUAGE.PYTHON,
  }
}
