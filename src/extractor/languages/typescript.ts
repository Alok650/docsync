import type { Node, Tree } from 'web-tree-sitter'
import { SYMBOL_KIND } from '../types.js'
import type { ExtractedSymbol, Language, SymbolKind } from '../types.js'
import { TS_NODE } from './node-types.js'

const DECLARATION_NODE_TYPES = new Set<string>([
  TS_NODE.FUNCTION_DECLARATION,
  TS_NODE.CLASS_DECLARATION,
  TS_NODE.INTERFACE_DECLARATION,
  TS_NODE.TYPE_ALIAS_DECLARATION,
  TS_NODE.LEXICAL_DECLARATION,
  TS_NODE.VARIABLE_DECLARATION,
])

const VARIABLE_DECLARATION_TYPES = new Set<string>([
  TS_NODE.LEXICAL_DECLARATION,
  TS_NODE.VARIABLE_DECLARATION,
])

export function extractTypeScriptSymbols(
  tree: Tree,
  file: string,
  language: Language,
): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = []
  const root = tree.rootNode

  for (const node of root.children) {
    if (node.type !== TS_NODE.EXPORT_STATEMENT) continue

    const decl = node.children.find((c: Node) => DECLARATION_NODE_TYPES.has(c.type))
    if (!decl) continue

    const kind = nodeKind(decl.type)
    if (!kind) continue

    if (VARIABLE_DECLARATION_TYPES.has(decl.type)) {
      for (const child of decl.children) {
        if (child.type === TS_NODE.VARIABLE_DECLARATOR) {
          const nameNode = child.childForFieldName('name')
          if (nameNode) {
            symbols.push(makeSymbol(nameNode.text, kind, file, node, language))
          }
        }
      }
    } else {
      const nameNode = decl.childForFieldName('name')
      if (nameNode) {
        symbols.push(makeSymbol(nameNode.text, kind, file, node, language))
      }
    }
  }

  return symbols
}

function nodeKind(type: string): SymbolKind | null {
  switch (type) {
    case TS_NODE.FUNCTION_DECLARATION: return SYMBOL_KIND.FUNCTION
    case TS_NODE.CLASS_DECLARATION: return SYMBOL_KIND.CLASS
    case TS_NODE.INTERFACE_DECLARATION: return SYMBOL_KIND.INTERFACE
    case TS_NODE.TYPE_ALIAS_DECLARATION: return SYMBOL_KIND.TYPE
    case TS_NODE.LEXICAL_DECLARATION:
    case TS_NODE.VARIABLE_DECLARATION: return SYMBOL_KIND.VARIABLE
    default: return null
  }
}

function makeSymbol(
  name: string,
  kind: SymbolKind,
  file: string,
  node: Node,
  language: Language,
): ExtractedSymbol {
  return {
    name,
    kind,
    file,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    language,
  }
}
