# API Reference

## getGitDiff

Computes the set of files changed between the PR head and a base revision, together with the line ranges that were added or modified. Internally runs `git diff <base>...HEAD` and excludes the `.autodocs/` directory so that index churn never triggers false-positive doc updates. Returns an array of `ChangedFile` objects; each entry holds the relative file path and a list of `[startLine, endLine]` tuples covering the changed hunks.

The `base` parameter accepts any git revision — a branch name, a remote ref such as `origin/main`, or a full commit SHA. When called from the GitHub Actions runner the pipeline passes the PR's base commit SHA so the diff is always anchored to the exact point the branch diverged.

## extractSymbols

Reads a source file from disk, selects the appropriate tree-sitter grammar based on the file extension, parses the file into an AST, and returns every public top-level symbol found. Each `ExtractedSymbol` carries the symbol name, its kind (`function`, `class`, `interface`, `type`, `variable`, or `enum`), and the start and end line numbers in the source file.

Returns an empty array for unsupported file extensions without throwing. Supported languages are TypeScript (`.ts`, `.tsx`), JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`), and Python (`.py`).

## resolveLanguage

Maps a file path to its `Language` enum value using the file extension. Returns `null` for extensions that have no supported grammar. Used by `extractSymbols` to decide which tree-sitter parser to load and also by the file-finder to skip non-code files before parsing.

## parseSymbols

Dispatches an already-parsed tree-sitter `Tree` to the correct language-specific extractor. Accepts the parse tree, the file path (used for constructing symbol metadata), and the target `Language`. Splitting parsing from dispatch allows callers to reuse a tree across multiple operations without re-parsing.

## getParser

Returns a cached `web-tree-sitter` `Parser` instance configured for the requested language. Initialises the WASM runtime on the first call and caches parsers keyed by language so subsequent calls for the same language are synchronous after the first await. WASM files are resolved relative to the running bundle (in `dist/`) with a fallback to `node_modules` for the development and test environment.

## buildMap

Scans a list of source files and a documentation directory, extracts symbols from every code file, parses every Markdown doc into sections, and builds a `SymbolDocMap` that links each symbol to the documentation sections most likely to describe it. Matching is two-tiered: structural name lookup via the `.autodocs/lookup/` shard files first, then a BM25 lexical fallback over the full doc corpus.

## runCheck

Main pipeline entry point. Accepts a `GitHubContext` (owner, repo, PR number, base ref, token) and a `DocSyncConfig`. Diffs the PR, extracts symbols from each changed file, retrieves the current documentation body for every matched doc section, and calls the LLM for each `(before code, after code, doc section)` triple where the code change is non-trivial. Returns an array of `ProposedDocUpdate` objects — one per section that needs updating.
