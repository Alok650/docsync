import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { Parser, Language as WasmLanguage } from 'web-tree-sitter'
import { LANGUAGE } from './types.js'
import type { Language } from './types.js'

const require = createRequire(import.meta.url)
const moduleDir = path.dirname(fileURLToPath(import.meta.url))

// In the bundled dist/, WASM files are copied alongside the JS files by tsup's onSuccess hook.
// In dev/test, the source directory has no WASM files, so fall back to node_modules.
function resolveWasm(filename: string, pkg: string): string {
  const local = path.join(moduleDir, filename)
  return existsSync(local) ? local : require.resolve(pkg)
}

const WASM_PATH = {
  [LANGUAGE.TYPESCRIPT]: resolveWasm('tree-sitter-typescript.wasm', 'tree-sitter-typescript/tree-sitter-typescript.wasm'),
  [LANGUAGE.JAVASCRIPT]: resolveWasm('tree-sitter-javascript.wasm', 'tree-sitter-javascript/tree-sitter-javascript.wasm'),
  [LANGUAGE.PYTHON]:     resolveWasm('tree-sitter-python.wasm',     'tree-sitter-python/tree-sitter-python.wasm'),
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
  const lang = await WasmLanguage.load(WASM_PATH[language])
  const parser = new Parser()
  parser.setLanguage(lang)
  cache.set(language, parser)
  return parser
}
