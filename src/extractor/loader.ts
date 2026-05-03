import { createRequire } from 'module'
import { Parser, Language as WasmLanguage } from 'web-tree-sitter'
import { LANGUAGE } from './types.js'
import type { Language } from './types.js'

const require = createRequire(import.meta.url)

const WASM_PATH = {
  [LANGUAGE.TYPESCRIPT]: 'tree-sitter-typescript/tree-sitter-typescript.wasm',
  [LANGUAGE.JAVASCRIPT]: 'tree-sitter-javascript/tree-sitter-javascript.wasm',
  [LANGUAGE.PYTHON]:     'tree-sitter-python/tree-sitter-python.wasm',
} as const satisfies Record<Language, string>

let initialized = false

async function init(): Promise<void> {
  if (initialized) return
  await Parser.init()
  initialized = true
}

const cache = new Map<Language, Parser>()

export async function getParser(language: Language): Promise<Parser> {
  await init()
  if (cache.has(language)) return cache.get(language)!
  const lang = await WasmLanguage.load(require.resolve(WASM_PATH[language]))
  const parser = new Parser()
  parser.setLanguage(lang)
  cache.set(language, parser)
  return parser
}
