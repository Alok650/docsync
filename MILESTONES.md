# AutoDocs — Milestones

> Build incrementally. Each milestone is independently testable and delivers real value.

---

## Milestone 1 — Project Scaffold + Symbol Extraction

**Goal:** Lay the foundation. Given any code file, extract all public symbols with their names and locations.

### Tasks
- `pnpm init`, TypeScript strict config, `tsup` build, `vitest` test setup
- Install `web-tree-sitter` + language grammars as optional peer deps
- Write `SymbolExtractor` — given a file path, returns all public symbols (functions, classes, methods, exported types) with name + line range
- Handle TypeScript, JavaScript, Python
- Unit tests: one fixture file per language, assert correct symbols extracted

### Output
```bash
autodocs symbols src/auth/login.ts
# processLogin  [12-34]
# validateToken [36-58]
# AuthError     [60-72]
```

### Done when
TypeScript and Python extract correct public symbols from fixture files with tests passing.

---

## Milestone 2 — Map Building (`autodocs init`)

**Goal:** Scan a repo and produce `.autodocs/map.json` — the bidirectional index of which symbols each doc section references.

### Tasks
- Write doc scanner — reads all `.md` / `.mdx` files under `docs/` and `README.md`
- Write BM25 matcher — for each extracted symbol, find which doc sections mention it (backtick-formatted or alongside file paths to reduce false positives)
- Write map builder — combines symbol extraction + doc scanning into `map.json`
- Write `autodocs init` CLI command (using `commander`) — runs the scan, writes `.autodocs/map.json`, prompts user for `docs/` path and output mode
- Unit tests: fixture repo with code + docs, assert map entries are correct

### map.json shape
```json
{
  "version": 1,
  "mappings": [
    {
      "symbol": "processLogin",
      "file": "src/auth/login.ts",
      "docs": [
        {
          "file": "docs/authentication.md",
          "section": "## Login Flow",
          "lines": [14, 28]
        }
      ]
    }
  ]
}
```

### Done when
`autodocs init` runs on a real repo and produces a correct, human-readable `map.json`.

---

## Milestone 3 — Git Diff + AST-Level Change Detection

**Goal:** Given a PR branch, produce a precise list of changed symbols — not changed lines.

### Tasks
- Write `GitDiffer` — uses `node:child_process` to run `git diff origin/main...HEAD`, parses output to get changed files + changed line ranges
- Write `ASTDiffer` — runs tree-sitter on before + after versions of each changed file, diffs the symbol list to produce: added, removed, modified symbols
- Unit tests: fixture diffs (rename, signature change, new function, deleted function) — assert correct symbol-level change detected

### Output
```typescript
// Input: git diff of a PR
// Output:
[
  { type: "modified", symbol: "processLogin", file: "src/auth/login.ts" },
  { type: "added",   symbol: "processMFA",   file: "src/auth/login.ts" }
]
```

### Done when
Given a branch with known changes, `ASTDiffer` correctly identifies the changed symbols with type (added / modified / removed).

---

## Milestone 4 — Retrieval (Tier 1 + Tier 2)

**Goal:** Given changed symbols, find the affected doc sections.

### Tasks
- Write `StructuralRetriever` (Tier 1) — looks up changed symbols in `map.json`, returns affected doc sections. O(1).
- Write `BM25Retriever` (Tier 2) — for symbols not found in the map (new code), runs BM25 search over all doc content to find candidate sections. Falls back gracefully.
- Wire Tier 1 → Tier 2 in sequence: try structural first, fall back to BM25 if no hit
- Unit tests: symbols in map (Tier 1 path), new symbols not in map (Tier 2 path), symbols that genuinely have no docs (silent skip)

### Done when
Given a set of changed symbols, retrieval returns the correct doc sections — or silently skips if no match found.

---

## Milestone 5 — Doc Update Agent (Claude API)

**Goal:** Given a changed symbol and an affected doc section, produce a surgical doc update.

### Tasks
- Write `DocUpdateAgent` — calls Claude API via `@anthropic-ai/sdk` with:
  - The changed symbol name + file
  - Old code snippet (before the change)
  - New code snippet (after the change)
  - The full affected doc section text
  - Prompt instructing surgical update of only the relevant paragraph
- Write `MarkdownEditor` — uses `unified` + `remark-parse` + `remark-stringify` to locate the specific section in the doc AST and replace it with the updated content. Does not touch surrounding sections.
- Support `ANTHROPIC_API_KEY` env var + `autodocs.config.json` for Bedrock / Vertex provider config
- Unit tests: mock Claude response, assert markdown edit is surgical (surrounding sections unchanged)

### Done when
Given a known code change + doc section, the agent produces a correct update and `MarkdownEditor` applies it without disturbing surrounding content.

---

## Milestone 6 — Output: PR Comment

**Goal:** Post the proposed doc update as a PR comment the developer can accept or dismiss.

### Tasks
- Write `GitHubOutput` — uses `@octokit/rest` to post a PR comment showing the proposed diff
- Format the comment as a readable markdown diff with clear "what changed" messaging
- Support `GITHUB_TOKEN` env var and `github.baseUrl` config for GitHub Enterprise
- Write `autodocs check` CLI command — wires together Milestones 3 + 4 + 5 + 6 end to end
- Manual test: run `autodocs check` on a real PR with a known code change, verify comment appears

### Comment format
~~~markdown
**AutoDocs** detected a doc section that may need updating.

**File:** `docs/authentication.md` — `## Login Flow`

```diff
- The login function accepts a username and password.
+ The login function accepts a username, password, and an optional MFA token.
```

To apply: add a comment `/autodocs apply` — or dismiss with `/autodocs dismiss`.
~~~

### Done when
`autodocs check` runs end to end on a real PR and posts a correctly formatted comment.

---

## Milestone 7 — GitHub Actions Integration + Map Maintenance

**Goal:** AutoDocs runs automatically on every PR. Map stays accurate as code evolves.

### Tasks
- Write GitHub Actions workflow generator — `autodocs init` writes `.github/workflows/autodocs.yml` that runs `autodocs check` on `pull_request` events
- Write map updater — after a PR is merged, updates `map.json` for: renamed symbols, moved files, deleted symbols, new symbols added to existing docs
- Handle the `/autodocs apply` comment trigger via GitHub Actions workflow dispatch
- End-to-end test: open a real PR on a test repo, merge it, verify map is updated correctly

### Generated workflow
```yaml
name: AutoDocs
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  autodocs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - run: npx autodocs check
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Done when
A fresh repo can run `npx autodocs init`, open a PR with a code change, and receive an automatic doc update comment — with zero manual steps after init.

---

## Summary

| Milestone | Deliverable | Key Dependency |
|-----------|-------------|----------------|
| M1 | Symbol extraction | web-tree-sitter |
| M2 | Map building + init command | M1 |
| M3 | AST-level change detection | M1 |
| M4 | Retrieval (Tier 1 + 2) | M2 + M3 |
| M5 | Doc update agent | M4 + Claude API |
| M6 | PR comment output | M5 + GitHub API |
| M7 | GitHub Actions + map maintenance | M6 |

M1–M3 can be built and tested with no API keys. M4 onwards requires Claude API access.
