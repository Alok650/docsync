// Tree-sitter grammar node type names, centralised to avoid scattered magic strings.
// Each Language block groups only the node types that the corresponding extractor uses.

export const TS_NODE = {
  EXPORT_STATEMENT: 'export_statement',
  FUNCTION_DECLARATION: 'function_declaration',
  CLASS_DECLARATION: 'class_declaration',
  INTERFACE_DECLARATION: 'interface_declaration',
  TYPE_ALIAS_DECLARATION: 'type_alias_declaration',
  LEXICAL_DECLARATION: 'lexical_declaration',
  VARIABLE_DECLARATION: 'variable_declaration',
  VARIABLE_DECLARATOR: 'variable_declarator',
} as const

export const PY_NODE = {
  FUNCTION_DEFINITION: 'function_definition',
  CLASS_DEFINITION: 'class_definition',
} as const
