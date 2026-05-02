import type { Parser } from 'web-tree-sitter'
import type { ExtractedSymbol, SymbolKind } from '../types.js'

export function extractTypeScriptSymbols(
  tree: Parser.Tree,
  file: string,
): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = []
  const root = tree.rootNode

  for (const node of root.children) {
    // export function foo() {}
    if (node.type === 'export_statement') {
      const decl = node.children.find(c =>
        c.type === 'function_declaration' ||
        c.type === 'class_declaration' ||
        c.type === 'interface_declaration' ||
        c.type === 'type_alias_declaration' ||
        c.type === 'lexical_declaration' ||
        c.type === 'variable_declaration',
      )
      if (!decl) continue

      const kind = nodeKind(decl.type)
      if (!kind) continue

      if (decl.type === 'lexical_declaration' || decl.type === 'variable_declaration') {
        for (const child of decl.children) {
          if (child.type === 'variable_declarator') {
            const nameNode = child.childForFieldName('name')
            if (nameNode) {
              symbols.push(makeSymbol(nameNode.text, kind, file, node))
            }
          }
        }
      } else {
        const nameNode = decl.childForFieldName('name')
        if (nameNode) {
          symbols.push(makeSymbol(nameNode.text, kind, file, node))
        }
      }
    }
  }

  return symbols
}

function nodeKind(type: string): SymbolKind | null {
  switch (type) {
    case 'function_declaration': return 'function'
    case 'class_declaration': return 'class'
    case 'interface_declaration': return 'interface'
    case 'type_alias_declaration': return 'type'
    case 'lexical_declaration':
    case 'variable_declaration': return 'variable'
    default: return null
  }
}

function makeSymbol(
  name: string,
  kind: SymbolKind,
  file: string,
  node: Parser.SyntaxNode,
): ExtractedSymbol {
  return {
    name,
    kind,
    file,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    language: 'typescript',
  }
}
