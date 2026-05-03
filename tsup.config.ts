import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

function copyWasm() {
  mkdirSync('dist', { recursive: true })
  const files = [
    ['tree-sitter-typescript/tree-sitter-typescript.wasm', 'tree-sitter-typescript.wasm'],
    ['tree-sitter-javascript/tree-sitter-javascript.wasm', 'tree-sitter-javascript.wasm'],
    ['tree-sitter-python/tree-sitter-python.wasm',         'tree-sitter-python.wasm'],
  ] as const
  for (const [pkg, dest] of files) {
    copyFileSync(require.resolve(pkg), `dist/${dest}`)
  }
}

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm'],
  target: 'node20',
  dts: false,
  clean: true,
  splitting: false,
  // Bundle all dependencies so dist/ is self-contained for GitHub Actions.
  // WASM files are copied into dist/ via onSuccess and referenced by import.meta.url.
  noExternal: [/.*/],
  external: [
    'web-tree-sitter',
    'tree-sitter-typescript',
    'tree-sitter-javascript',
    'tree-sitter-python',
  ],
  onSuccess: copyWasm,
})
