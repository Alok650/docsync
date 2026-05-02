# M1: Symbol Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Given any code file in TypeScript, JavaScript, or Python — extract all public symbols (functions, classes, methods, exported types) with their name, kind, and line range.

**Architecture:** Use `web-tree-sitter` (WASM-based, no native addons) to parse each file into an AST, then run language-specific tree-sitter queries to locate public symbol nodes. A shared loader initialises the WASM runtime once and caches language parsers. Each language has its own query file. A unified public API wraps everything.

**Tech Stack:** Node.js 20, TypeScript 5 (strict), pnpm, web-tree-sitter, tree-sitter-{lang} WASM grammars, vitest, tsup

---

## File Structure

```
autodocs/
├── src/
│   ├── cli.ts                              # CLI entry — autodocs symbols <file>
│   └── extractor/
│       ├── index.ts                        # public extractSymbols(filePath) API
│       ├── types.ts                        # Symbol, Language, SymbolKind types
│       ├── loader.ts                       # web-tree-sitter init + grammar cache
│       └── languages/
│           ├── typescript.ts               # TS/JS query + public filter
│           └── python.ts                   # Python query + public filter
├── tests/
│   ├── fixtures/
│   │   ├── sample.ts                       # TypeScript fixture with known symbols
│   │   └── sample.py                       # Python fixture
│   └── extractor/
│       ├── typescript.test.ts
│       └── python.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1.1 — Initialise pnpm project**

```bash
cd /Users/alokprasad/autodocs
pnpm init
```

- [ ] **Step 1.2 — Install dependencies**

```bash
pnpm add web-tree-sitter
pnpm add tree-sitter-typescript tree-sitter-javascript tree-sitter-python
pnpm add commander
pnpm add -D typescript @types/node vitest tsup
```

- [ ] **Step 1.3 — Write `package.json`**

Replace the generated `package.json` with:

```json
{
  "name": "autodocs",
  "version": "0.1.0",
  "description": "Automatic documentation maintenance for codebases",
  "type": "module",
  "bin": {
    "autodocs": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 1.4 — Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 1.5 — Write `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/extractor/index.ts',
  },
  format: ['esm'],
  target: 'node20',
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

- [ ] **Step 1.6 — Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 1.7 — Verify scaffold compiles**

```bash
pnpm build
```

Expected: `dist/` folder created with no errors. (Will warn about missing entry files — that's fine, they don't exist yet.)

- [ ] **Step 1.8 — Commit**

```bash
git init
git add .
git commit -m "chore: project scaffold — pnpm, TypeScript, tsup, vitest"
```

---

## Task 2: Types

**Files:**
- Create: `src/extractor/types.ts`

- [ ] **Step 2.1 — Write `src/extractor/types.ts`**

```typescript
export type Language = 'typescript' | 'javascript' | 'python'

export type SymbolKind =
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'type'
  | 'variable'

export interface ExtractedSymbol {
  name: string
  kind: SymbolKind
  file: string
  startLine: number
  endLine: number
  language: Language
}
```

- [ ] **Step 2.2 — Commit**

```bash
git add src/extractor/types.ts
git commit -m "feat: add ExtractedSymbol and Language types"
```

---

## Task 3: WASM Loader

The loader initialises `web-tree-sitter` once and caches a `Parser` instance per language. This avoids re-loading 5 WASM files on every call.

**Why WASM?** `web-tree-sitter` uses WebAssembly instead of native C addons. This means no `node-gyp`, no compilation, and it works in every Node.js environment including enterprise CI without special build tools.

**Files:**
- Create: `src/extractor/loader.ts`

- [ ] **Step 3.1 — Write `src/extractor/loader.ts`**

```typescript
import Parser from 'web-tree-sitter'
import path from 'node:path'
import { createRequire } from 'node:module'
import type { Language } from './types.js'

const require = createRequire(import.meta.url)

const cache = new Map<Language, Parser>()
let initialised = false

async function init(): Promise<void> {
  if (initialised) return
  await Parser.init()
  initialised = true
}

function grammarWasmPath(language: Language): string {
  const packageName =
    language === 'typescript' || language === 'javascript'
      ? 'tree-sitter-typescript'
      : `tree-sitter-${language}`

  const packageDir = path.dirname(
    require.resolve(`${packageName}/package.json`)
  )

  const wasmFile =
    language === 'javascript'
      ? 'tree-sitter-tsx.wasm'
      : `tree-sitter-${language === 'typescript' ? 'typescript' : language}.wasm`

  return path.join(packageDir, wasmFile)
}

export async function getParser(language: Language): Promise<Parser> {
  await init()

  const cached = cache.get(language)
  if (cached) return cached

  const lang = await Parser.Language.load(grammarWasmPath(language))
  const parser = new Parser()
  parser.setLanguage(lang)
  cache.set(language, parser)

  return parser
}
```

- [ ] **Step 3.2 — Commit**

```bash
git add src/extractor/loader.ts
git commit -m "feat: add web-tree-sitter WASM loader with parser cache"
```

---

## Task 4: Fixture Files

These are the known inputs for every test. Define them first so tests can reference exact expected symbols.

**Files:**
- Create: `tests/fixtures/sample.ts`
- Create: `tests/fixtures/sample.py`
- Create: `tests/fixtures/sample.go`
- Create: `tests/fixtures/sample.java`

- [ ] **Step 4.1 — Write `tests/fixtures/sample.ts`**

```typescript
export function processLogin(username: string, password: string): boolean {
  return username.length > 0 && password.length > 0
}

export const validateToken = (token: string): boolean => {
  return token.startsWith('Bearer ')
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export interface AuthConfig {
  maxRetries: number
  timeout: number
}

export type TokenType = 'bearer' | 'basic'

// private — must NOT appear in output
const _internalHelper = () => {}
function _privateUtil() {}
```

- [ ] **Step 4.2 — Write `tests/fixtures/sample.py`**

```python
def process_login(username: str, password: str) -> bool:
    return len(username) > 0 and len(password) > 0


def validate_token(token: str) -> bool:
    return token.startswith("Bearer ")


class AuthError(Exception):
    def __init__(self, message: str):
        super().__init__(message)

    def to_json(self):
        return {"error": str(self)}


# private — must NOT appear in output
def _internal_helper():
    pass


class _PrivateClass:
    pass
```

- [ ] **Step 4.3 — Write `tests/fixtures/sample.go`**

```go
package auth

import "strings"

func ProcessLogin(username string, password string) bool {
	return len(username) > 0 && len(password) > 0
}

func ValidateToken(token string) bool {
	return strings.HasPrefix(token, "Bearer ")
}

type AuthError struct {
	Message string
}

func (e *AuthError) Error() string {
	return e.Message
}

// private — must NOT appear in output
func internalHelper() {}

type privateStruct struct{}
```

- [ ] **Step 4.4 — Write `tests/fixtures/sample.java`**

```java
public class AuthService {

    public boolean processLogin(String username, String password) {
        return username.length() > 0 && password.length() > 0;
    }

    public boolean validateToken(String token) {
        return token.startsWith("Bearer ");
    }

    public static class AuthError extends RuntimeException {
        public AuthError(String message) {
            super(message);
        }
    }

    // private — must NOT appear in output
    private void internalHelper() {}

    private static void privateUtil() {}
}
```

- [ ] **Step 4.5 — Commit**

```bash
git add tests/fixtures/
git commit -m "test: add fixture files for all four languages"
```

---

## Task 5: TypeScript Extractor

Tree-sitter works by running **queries** against the parsed AST. A query is written in an S-expression syntax that pattern-matches node types. When a pattern matches, captures (prefixed with `@`) give us the specific nodes we care about.

**Files:**
- Create: `src/extractor/languages/typescript.ts`
- Create: `tests/extractor/typescript.test.ts`

- [ ] **Step 5.1 — Write the failing test first**

Create `tests/extractor/typescript.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractSymbols } from '../../src/extractor/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(__dirname, '../fixtures/sample.ts')

describe('TypeScript symbol extractor', () => {
  it('extracts exported function declarations', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('processLogin')
  })

  it('extracts exported arrow functions', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('validateToken')
  })

  it('extracts exported classes', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('AuthError')
  })

  it('extracts exported interfaces', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('AuthConfig')
  })

  it('extracts exported type aliases', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('TokenType')
  })

  it('does not extract private symbols', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).not.toContain('_internalHelper')
    expect(names).not.toContain('_privateUtil')
  })

  it('returns correct line numbers', async () => {
    const symbols = await extractSymbols(fixture)
    const fn = symbols.find(s => s.name === 'processLogin')
    expect(fn).toBeDefined()
    expect(fn!.startLine).toBe(1)
  })

  it('sets language to typescript', async () => {
    const symbols = await extractSymbols(fixture)
    symbols.forEach(s => expect(s.language).toBe('typescript'))
  })
})
```

- [ ] **Step 5.2 — Run test to confirm it fails**

```bash
pnpm test tests/extractor/typescript.test.ts
```

Expected: FAIL — `Cannot find module '../../src/extractor/index.js'`

- [ ] **Step 5.3 — Write `src/extractor/languages/typescript.ts`**

```typescript
import type Parser from 'web-tree-sitter'
import type { ExtractedSymbol, SymbolKind } from '../types.js'

const QUERY = `
; Exported function declarations: export function foo()
(export_statement
  declaration: (function_declaration
    name: (identifier) @name)) @symbol

; Exported class declarations: export class Foo {}
(export_statement
  declaration: (class_declaration
    name: (type_identifier) @name)) @symbol

; Exported abstract class declarations
(export_statement
  declaration: (abstract_class_declaration
    name: (type_identifier) @name)) @symbol

; Exported const/let with arrow function or value: export const foo = ...
(export_statement
  declaration: (lexical_declaration
    (variable_declarator
      name: (identifier) @name))) @symbol

; Exported interface declarations: export interface Foo {}
(export_statement
  declaration: (interface_declaration
    name: (type_identifier) @name)) @symbol

; Exported type aliases: export type Foo = ...
(export_statement
  declaration: (type_alias_declaration
    name: (type_identifier) @name)) @symbol
`

function kindFromNode(node: Parser.SyntaxNode): SymbolKind {
  const decl = node.childForFieldName('declaration')
  if (!decl) return 'variable'
  switch (decl.type) {
    case 'function_declaration': return 'function'
    case 'class_declaration':
    case 'abstract_class_declaration': return 'class'
    case 'interface_declaration': return 'interface'
    case 'type_alias_declaration': return 'type'
    case 'lexical_declaration': return 'variable'
    default: return 'variable'
  }
}

export function extractTypeScriptSymbols(
  tree: Parser.Tree,
  language: Parser.Language,
  filePath: string
): ExtractedSymbol[] {
  const query = language.query(QUERY)
  const matches = query.matches(tree.rootNode)

  const seen = new Set<string>()
  const symbols: ExtractedSymbol[] = []

  for (const match of matches) {
    const symbolCapture = match.captures.find(c => c.name === 'symbol')
    const nameCapture = match.captures.find(c => c.name === 'name')
    if (!symbolCapture || !nameCapture) continue

    const name = nameCapture.node.text
    const key = `${name}:${nameCapture.node.startPosition.row}`
    if (seen.has(key)) continue
    seen.add(key)

    symbols.push({
      name,
      kind: kindFromNode(symbolCapture.node),
      file: filePath,
      startLine: symbolCapture.node.startPosition.row + 1,
      endLine: symbolCapture.node.endPosition.row + 1,
      language: 'typescript',
    })
  }

  return symbols
}
```

- [ ] **Step 5.4 — Write `src/extractor/index.ts`**

This is the public API. It detects the language from the file extension, loads the right parser, and delegates to the language-specific extractor.

```typescript
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { getParser } from './loader.js'
import { extractTypeScriptSymbols } from './languages/typescript.js'
import type { ExtractedSymbol, Language } from './types.js'

function detectLanguage(filePath: string): Language | null {
  const ext = extname(filePath).toLowerCase()
  switch (ext) {
    case '.ts':
    case '.tsx': return 'typescript'
    case '.js':
    case '.jsx':
    case '.mjs': return 'javascript'
    case '.py': return 'python'
    case '.go': return 'go'
    case '.java': return 'java'
    default: return null
  }
}

export async function extractSymbols(filePath: string): Promise<ExtractedSymbol[]> {
  const language = detectLanguage(filePath)
  if (!language) return []

  const source = await readFile(filePath, 'utf-8')
  const parser = await getParser(language)
  const tree = parser.parse(source)

  switch (language) {
    case 'typescript':
    case 'javascript':
      return extractTypeScriptSymbols(tree, parser.getLanguage()!, filePath)
    default:
      return []
  }
}
```

- [ ] **Step 5.5 — Run TypeScript tests**

```bash
pnpm test tests/extractor/typescript.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5.6 — Commit**

```bash
git add src/extractor/ tests/extractor/typescript.test.ts
git commit -m "feat: TypeScript/JS symbol extractor with tree-sitter queries"
```

---

## Task 6: Python Extractor

Python public symbols are those whose names do NOT start with `_`. Tree-sitter gives us all top-level definitions; we filter in code.

**Files:**
- Create: `src/extractor/languages/python.ts`
- Create: `tests/extractor/python.test.ts`

- [ ] **Step 6.1 — Write the failing test**

Create `tests/extractor/python.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractSymbols } from '../../src/extractor/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = path.join(__dirname, '../fixtures/sample.py')

describe('Python symbol extractor', () => {
  it('extracts top-level public functions', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('process_login')
    expect(names).toContain('validate_token')
  })

  it('extracts public classes', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).toContain('AuthError')
  })

  it('does not extract private symbols', async () => {
    const symbols = await extractSymbols(fixture)
    const names = symbols.map(s => s.name)
    expect(names).not.toContain('_internal_helper')
    expect(names).not.toContain('_PrivateClass')
  })

  it('sets correct kind for functions', async () => {
    const symbols = await extractSymbols(fixture)
    const fn = symbols.find(s => s.name === 'process_login')
    expect(fn?.kind).toBe('function')
  })

  it('sets correct kind for classes', async () => {
    const symbols = await extractSymbols(fixture)
    const cls = symbols.find(s => s.name === 'AuthError')
    expect(cls?.kind).toBe('class')
  })

  it('sets language to python', async () => {
    const symbols = await extractSymbols(fixture)
    symbols.forEach(s => expect(s.language).toBe('python'))
  })
})
```

- [ ] **Step 6.2 — Run test to confirm it fails**

```bash
pnpm test tests/extractor/python.test.ts
```

Expected: FAIL — Python returns `[]` (not yet implemented in `extractSymbols`)

- [ ] **Step 6.3 — Write `src/extractor/languages/python.ts`**

```typescript
import type Parser from 'web-tree-sitter'
import type { ExtractedSymbol } from '../types.js'

const QUERY = `
; Top-level function definitions
(module
  (function_definition
    name: (identifier) @name) @symbol)

; Top-level class definitions
(module
  (class_definition
    name: (identifier) @name) @symbol)
`

export function extractPythonSymbols(
  tree: Parser.Tree,
  language: Parser.Language,
  filePath: string
): ExtractedSymbol[] {
  const query = language.query(QUERY)
  const matches = query.matches(tree.rootNode)

  const seen = new Set<string>()
  const symbols: ExtractedSymbol[] = []

  for (const match of matches) {
    const symbolCapture = match.captures.find(c => c.name === 'symbol')
    const nameCapture = match.captures.find(c => c.name === 'name')
    if (!symbolCapture || !nameCapture) continue

    const name = nameCapture.node.text
    if (name.startsWith('_')) continue

    const key = `${name}:${nameCapture.node.startPosition.row}`
    if (seen.has(key)) continue
    seen.add(key)

    symbols.push({
      name,
      kind: symbolCapture.node.type === 'function_definition' ? 'function' : 'class',
      file: filePath,
      startLine: symbolCapture.node.startPosition.row + 1,
      endLine: symbolCapture.node.endPosition.row + 1,
      language: 'python',
    })
  }

  return symbols
}
```

- [ ] **Step 6.4 — Wire Python into `src/extractor/index.ts`**

Add the import and case to `extractSymbols`:

```typescript
import { extractPythonSymbols } from './languages/python.js'
```

Add to the switch statement:
```typescript
case 'python':
  return extractPythonSymbols(tree, parser.getLanguage()!, filePath)
```

- [ ] **Step 6.5 — Run Python tests**

```bash
pnpm test tests/extractor/python.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 6.6 — Commit**

```bash
git add src/extractor/languages/python.ts src/extractor/index.ts tests/extractor/python.test.ts
git commit -m "feat: Python symbol extractor"
```

---

## Task 7: CLI Command

Expose `extractSymbols` via the `autodocs symbols <file>` command so M1 has a runnable output.

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 9.1 — Write `src/cli.ts`**

```typescript
import { Command } from 'commander'
import { extractSymbols } from './extractor/index.js'

const program = new Command()

program
  .name('autodocs')
  .description('Automatic documentation maintenance')
  .version('0.1.0')

program
  .command('symbols <file>')
  .description('Extract public symbols from a source file')
  .action(async (file: string) => {
    const symbols = await extractSymbols(file)

    if (symbols.length === 0) {
      console.log('No public symbols found.')
      return
    }

    for (const s of symbols) {
      console.log(`${s.name.padEnd(40)} ${s.kind.padEnd(12)} [${s.startLine}-${s.endLine}]`)
    }
  })

program.parse()
```

- [ ] **Step 9.2 — Build and run against a fixture**

```bash
pnpm build
node dist/cli.js symbols tests/fixtures/sample.ts
```

Expected output (order may vary):
```
processLogin                             function     [1-3]
validateToken                            variable     [5-7]
AuthError                                class        [9-15]
AuthConfig                               interface    [17-20]
TokenType                                type         [22-22]
```

- [ ] **Step 9.3 — Run all tests together**

```bash
pnpm test
```

Expected: all tests across all 4 languages pass.

- [ ] **Step 9.4 — Final commit**

```bash
git add src/cli.ts
git commit -m "feat: autodocs symbols CLI command — M1 complete"
```

---

## M1 Done When

- [ ] `pnpm test` passes — all tests across TypeScript, Python, Go, Java
- [ ] `node dist/cli.js symbols tests/fixtures/sample.ts` prints correct symbols
- [ ] Private/unexported symbols are absent from all outputs
- [ ] No native addons — only WASM (`node_modules` contains no `.node` files from tree-sitter)
