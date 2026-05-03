import { createRequire } from 'module'
import { Parser, Language as WasmLanguage } from 'web-tree-sitter'
import { LANGUAGE } from './types.js'
import type { Language } from './types.js'

const require = createRequire(import.meta.url)

let initialized = false

async function init(): Promise<void> {
  if (initialized) return
  await Parser.init()
  initialized = true
}

function grammarWasmPath(language: Language): string {
  switch (language) {
    case LANGUAGE.TYPESCRIPT:
      return require.resolve('tree-sitter-typescript/tree-sitter-typescript.wasm')
    case LANGUAGE.JAVASCRIPT:
      return require.resolve('tree-sitter-javascript/tree-sitter-javascript.wasm')
    case LANGUAGE.PYTHON:
      return require.resolve('tree-sitter-python/tree-sitter-python.wasm')
  }
}

const cache = new Map<Language, Parser>()

export async function getParser(language: Language): Promise<Parser> {
  await init()
  if (cache.has(language)) return cache.get(language)!
  const lang = await WasmLanguage.load(grammarWasmPath(language))
  const parser = new Parser()
  parser.setLanguage(lang)
  cache.set(language, parser)
  return parser
}
