# AutoDocs — Product Requirements Document

> **Status:** Draft v0.2
> **Author:** Alok Prasad
> **Last Updated:** 2026-05-02

---

## 1. Problem Statement

Technical documentation decays the moment it is written. When engineers change code, they rarely update the corresponding docs — not because they don't care, but because the friction is too high and there is no automatic signal that a doc is stale.

The result: onboarding takes longer, incorrect docs cause production bugs, and teams lose trust in documentation entirely and stop writing it.

**The core gap:** Existing tools either generate docs once (DocAgent — ACL 2025, HGEN — 2024) or detect staleness and ask humans to fix it (Swimm). HGEN explicitly acknowledges this as unresolved:

> *"The study measures point-in-time documentation quality rather than maintenance of synchronization over time."*

No tool automatically proposes surgical doc updates as code evolves. AutoDocs is that tool.

---

## 2. Goals

- Automatically detect when a code change affects existing documentation
- Propose a precise, surgical update to the affected doc section
- Require zero changes to the developer's existing codebase or workflow
- Work out of the box with minimal config for teams at companies like Meta, Google, and Gojek
- Support Markdown-based docs in v1 with a pluggable adapter layer for Confluence and Notion in v2

## 3. Non-Goals (v1)

- Generating documentation from scratch
- Supporting Confluence or Notion directly (adapter interface defined in v1, implementations in v2)
- Real-time doc updates on every keystroke
- Supporting non-text doc formats (PDFs, diagrams)
- Code quality review or linting
- Supporting inline code comments (focus is standalone doc files only)

---

## 4. User Personas

**Primary — Backend / Platform Engineer**
Works on large TypeScript, Go, Java, or Python services. Has a `docs/` folder that is perpetually out of date. Does not want to think about docs when merging a PR.

**Secondary — Engineering Manager / Tech Lead**
Wants docs reliable enough that new hires can onboard without asking questions. Cares about doc coverage as a team health metric.

**Tertiary — Developer Experience (DevEx) Team**
Evaluates AutoDocs for org-wide adoption at companies like Gojek or Google. Cares about security posture, minimal dependency footprint, enterprise config (GitHub Enterprise, AWS Bedrock, custom embedding endpoints), and ability to plug into existing internal code search infrastructure.

---

## 5. Solution Overview

AutoDocs is a TypeScript CLI tool that:

1. On `init` — scans the codebase using tree-sitter to extract public symbols, scans doc files to find which symbols each section references, and stores a bidirectional map in `.autodocs/map.json`
2. On every PR — reads the git diff, identifies changed symbols at the AST level, runs three-tier retrieval to find affected doc sections, calls Claude API to generate a surgical update, and posts the proposed change as a PR comment or auto-commit
3. Requires only `npx autodocs init` once per repo; works automatically for the entire team after that

---

## 6. Functional Requirements

### 6.1 Initialisation — `autodocs init`

- Scans code files under the configured `code` directory (default: repo root, excluding `node_modules`, `dist`, `.git`)
- Extracts all public symbols (functions, classes, methods, exported types) using tree-sitter
- Scans markdown doc files under the configured `docs` directory (default: `docs/`, `README.md`)
- Runs Tier 1 structural mapping to build initial `.autodocs/map.json`
- Generates `.github/workflows/autodocs.yml` for CI integration automatically
- Completes in under 60 seconds for repos up to 500k LOC

### 6.2 Change Detection — `autodocs check`

- Reads git diff against the base branch using the local `git` binary (no additional dependency)
- Extracts changed symbols using tree-sitter AST diff — "function `processPayment` signature changed" not just "line 47 changed"
- Runs three-tier retrieval to find affected doc sections
- Skips gracefully if no doc sections are mapped to the changed symbols

### 6.3 Three-Tier Retrieval

The retrieval problem has two distinct shapes:

- **Shape 1 — Symbol lookup (PL→PL):** a changed function `processPayment` → find docs that reference `processPayment`. Research shows BM25 and exact matching outperform dense embeddings by ~10 percentage points for this case.
- **Shape 2 — Concept lookup (PL→NL):** changed retry logic → find docs about "reliability" or "error handling" that describe this behavior conceptually. Dense embeddings outperform BM25 here.

Three tiers handle both shapes with zero mandatory external dependencies:

**Tier 1 — Structural (always on, zero API cost)**
tree-sitter extracts changed symbols → O(1) lookup against `.autodocs/map.json`. Handles ~75% of real-world cases. Offline, instant.

**Tier 2 — Lexical BM25 (always on, zero API cost)**
For changed symbols not yet in the map (new code, recently renamed symbols). BM25 search over doc content — no embedding API required. Handles ~20% of remaining cases.

**Tier 3 — Semantic (optional, pluggable)**
Embedding-based search for conceptual doc sections that don't explicitly reference the changed symbol. Opt-in. Configurable endpoint — supports Anthropic, OpenAI, or the company's own internal embedding service (e.g., Google Kythe, Meta's internal code search).

### 6.4 Doc Update Generation

- Sends changed symbol context + old code + new code + affected doc section to Claude API
- Generates a surgical update — modifies only the relevant paragraph or section
- Preserves surrounding structure, headings, formatting, tone, and links
- Does not regenerate the entire doc file

### 6.5 Output Modes

- **PR comment** (default) — posts a markdown diff of the proposed change with Accept / Dismiss options
- **Auto-commit** — pushes a commit to the PR branch with the updated doc alongside the code change

### 6.6 Map Maintenance

- After each accepted update, refreshes the relevant entries in `.autodocs/map.json` automatically
- When a symbol is renamed or a file moves, updates map entries via AST diff detection
- Map file is human-readable JSON — manually editable as a fallback

### 6.7 Language Support (v1)

TypeScript / JavaScript, Python

### 6.8 Doc Format Support (v1)

Markdown (`.md`, `.mdx`) via the `MarkdownAdapter`

---

## 7. Technical Architecture

```
PR opened / commit pushed
          │
          ▼
    git diff
    (node:child_process → git binary, no dependency)
          │
          ▼
    AST diff — web-tree-sitter
    extract changed symbols precisely
          │
          ▼
    ┌─────────────────────────────────┐
    │     Three-Tier Retrieval        │
    │                                 │
    │  Tier 1: Structural             │
    │  map.json O(1) lookup           │
    │                                 │
    │  Tier 2: Lexical BM25           │
    │  (if Tier 1 misses)             │
    │                                 │
    │  Tier 3: Semantic embeddings    │
    │  (optional, pluggable)          │
    └─────────────────────────────────┘
          │
          ▼
    doc update agent — Claude API
    (@anthropic-ai/sdk)
    input:  symbol context + old code
            + new code + doc section
    output: updated section
          │
          ▼
    surgical markdown edit
    (unified + remark — AST-level edit,
    not string replacement)
          │
          ▼
    output
    PR comment (@octokit/rest)
    or git commit
```

### Adapter Interfaces

Two abstraction layers defined in v1, enabling v2 integrations without architectural changes:

**RetrievalAdapter** — pluggable retrieval backend

```typescript
interface RetrievalAdapter {
  findAffectedDocs(changedSymbols: Symbol[]): Promise<DocSection[]>
}

// v1 implementations
class StructuralAdapter implements RetrievalAdapter  // map.json lookup
class BM25Adapter implements RetrievalAdapter        // lexical fallback

// pluggable (optional)
class EmbeddingAdapter implements RetrievalAdapter   // semantic search
class ExternalSearchAdapter implements RetrievalAdapter // Kythe, internal search
```

**DocAdapter** — pluggable doc format backend

```typescript
interface DocAdapter {
  parse(content: string): DocAST
  findSection(ast: DocAST, symbol: Symbol): DocSection | null
  applyUpdate(ast: DocAST, section: DocSection, update: string): string
  serialize(ast: DocAST): string
}

// v1 implementation
class MarkdownAdapter implements DocAdapter   // remark-based

// v2 implementations (not in scope)
class ConfluenceAdapter implements DocAdapter
class NotionAdapter implements DocAdapter
```

### Dependencies

| Package | Purpose | Weekly Downloads | License |
|---------|---------|-----------------|---------|
| `@anthropic-ai/sdk` | Claude API (Bedrock + Vertex supported) | Official | MIT |
| `web-tree-sitter` | AST parsing — WASM, no native addon | Official | MIT |
| `tree-sitter-{lang}` | Language grammars (peer deps, auto-detected) | Official | MIT |
| `unified` + `remark-parse` + `remark-stringify` | Markdown AST editing | 50M+ | MIT |
| `@octokit/rest` | GitHub API + GitHub Enterprise | Official | MIT |
| `commander` | CLI interface | 25M+ | MIT |

Git operations use `node:child_process` calling the system `git` binary — no additional dependency. All packages carry MIT licenses. No native addon dependencies (WASM only for tree-sitter).

---

## 8. Configuration — `autodocs.config.json`

All fields optional. Sensible defaults for zero-config usage.

```json
{
  "docs": "docs/",
  "code": "src/",
  "output": "pr-comment",
  "exclude": ["**/node_modules/**", "**/dist/**", "**/vendor/**"],
  "languages": ["typescript", "python"],
  "retrieval": {
    "tiers": ["structural", "bm25"],
    "semantic": {
      "enabled": false,
      "provider": "anthropic",
      "endpoint": ""
    }
  },
  "github": {
    "baseUrl": "https://github.mycompany.com/api/v3"
  },
  "anthropic": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "region": ""
  }
}
```

**`anthropic.provider`** — `"anthropic"` | `"bedrock"` | `"vertex"`. Accommodates companies using Claude via AWS or GCP rather than the Anthropic API directly.

**`github.baseUrl`** — supports GitHub Enterprise for companies not on github.com.

**`retrieval.semantic.endpoint`** — custom embedding endpoint for companies with internal search infrastructure (Google Kythe, Meta's code search, etc.).

**`languages`** — controls which tree-sitter grammars are loaded. Reduces install size for single-language teams.

---

## 9. Developer Experience

### One-time setup (~2 minutes)

```bash
npx autodocs init
```

Two prompts:

```
> Where are your docs? [docs/]
> Output mode: pr-comment or auto-commit? [pr-comment]
```

After init:
- `.autodocs/map.json` committed to repo
- `.github/workflows/autodocs.yml` generated and committed
- `ANTHROPIC_API_KEY` (or Bedrock/Vertex credentials) stored as a GitHub secret — never in the codebase

### Zero changes required to

- Source code files
- Existing doc files
- `package.json` or build scripts
- CI/CD pipeline beyond adding one GitHub secret

### Every PR after setup

Developer opens PR → AutoDocs runs in CI → if affected docs found, posts a PR comment with the proposed diff → developer clicks Accept or Dismiss → done. If no docs are affected, AutoDocs is silent.

---

## 10. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| `init` time — 500k LOC repo | < 60 seconds |
| `check` time per PR (excluding LLM) | < 30 seconds |
| LLM call latency per affected doc | 3–8 seconds (Claude Sonnet) |
| map.json size — 500k LOC repo | < 5 MB |
| Node.js version | >= 20.0.0 |
| Package manager | pnpm >= 9.0.0 |
| Native addon dependencies | None (WASM only) |
| Offline operation (Tiers 1+2) | Fully supported |

---

## 11. Success Metrics

| Metric | Description |
|--------|-------------|
| Doc staleness rate | % of merged PRs that touch mapped code without a doc update |
| Acceptance rate | % of proposed updates accepted vs dismissed |
| Map coverage | % of public symbols with at least one mapped doc section |
| Time to first accepted update | How quickly a new installation produces its first accepted suggestion |
| Tier distribution | % of retrievals handled by Tier 1 vs 2 vs 3 |

---

## 12. Research Foundation

| Paper | Finding applied |
|-------|----------------|
| DocAgent (Meta/Facebook, ACL 2025) | AST dependency graph for symbol extraction; Writer + Verifier agent pattern for update generation |
| HGEN (Aug 2024) | Confirmed the maintenance gap: "point-in-time quality, not synchronization over time" |
| Practical Code RAG at Scale (2024) | BM25 outperforms dense embeddings by ~10pp for PL→PL retrieval — justifies Tier 1+2 as primary path |
| Microsoft GraphRAG (2024) | Graph-based retrieval is superior for relational code queries — informs the structural map.json approach over pure vector RAG |
| From BM25 to Corrective RAG (2025) | Hybrid BM25 + semantic improves nDCG by 9pp — justifies three-tier design |

---

## 13. Out of Scope (v1)

- Confluence and Notion adapters (interface defined, implementations deferred to v2)
- Generation of net-new documentation
- Support for inline code comments
- IDE plugin or local editor integration
- Slack or email notifications
- Analytics dashboard
- Monorepo multi-service orchestration (single service per config in v1)

---

## 14. Open Questions

| # | Question | Impact |
|---|---------|--------|
| Q1 | What confidence threshold should Tier 2 BM25 use before surfacing a match? Too low = false positives, too high = missed updates | Map quality |
| Q2 | For auto-commit mode, what is the rollback path if a generated update is factually incorrect? | Trust and safety |
| Q3 | For large PRs touching 50+ symbols, what is the batching and rate-limit strategy for Claude API calls? | Latency and cost |
| Q4 | How does `init` scope in a monorepo with 20+ services — per-service `autodocs.config.json` or a root-level workspace config? | Enterprise adoption |

---

## 15. Appendix — File Structure After Init

```
repo/
├── .autodocs/
│   └── map.json              ← code-to-doc mapping, auto-maintained
├── .github/
│   └── workflows/
│       └── autodocs.yml      ← generated by init
├── autodocs.config.json      ← optional, minimal config
├── docs/
│   └── ...                   ← existing docs, unchanged
└── src/
    └── ...                   ← existing code, unchanged
```
