#!/usr/bin/env node

// src/cli.ts
import { Command } from "commander";
import fs9 from "fs/promises";
import path8 from "path";
import readline from "readline";

// src/extractor/index.ts
import fs from "fs/promises";
import path from "path";

// src/extractor/loader.ts
import { createRequire } from "module";
import { Parser, Language as WasmLanguage } from "web-tree-sitter";

// src/extractor/constants.ts
var LANGUAGE = {
  TYPESCRIPT: "typescript",
  JAVASCRIPT: "javascript",
  PYTHON: "python"
};
var SYMBOL_KIND = {
  FUNCTION: "function",
  CLASS: "class",
  METHOD: "method",
  INTERFACE: "interface",
  TYPE: "type",
  VARIABLE: "variable"
};

// src/extractor/loader.ts
var require2 = createRequire(import.meta.url);
var WASM_PATH = {
  [LANGUAGE.TYPESCRIPT]: "tree-sitter-typescript/tree-sitter-typescript.wasm",
  [LANGUAGE.JAVASCRIPT]: "tree-sitter-javascript/tree-sitter-javascript.wasm",
  [LANGUAGE.PYTHON]: "tree-sitter-python/tree-sitter-python.wasm"
};
var initialized = false;
async function init() {
  if (initialized) return;
  await Parser.init();
  initialized = true;
}
var cache = /* @__PURE__ */ new Map();
async function getParser(language) {
  await init();
  if (cache.has(language)) return cache.get(language);
  const lang = await WasmLanguage.load(require2.resolve(WASM_PATH[language]));
  const parser = new Parser();
  parser.setLanguage(lang);
  cache.set(language, parser);
  return parser;
}

// src/extractor/languages/node-types.ts
var TS_NODE = {
  EXPORT_STATEMENT: "export_statement",
  FUNCTION_DECLARATION: "function_declaration",
  CLASS_DECLARATION: "class_declaration",
  INTERFACE_DECLARATION: "interface_declaration",
  TYPE_ALIAS_DECLARATION: "type_alias_declaration",
  LEXICAL_DECLARATION: "lexical_declaration",
  VARIABLE_DECLARATION: "variable_declaration",
  VARIABLE_DECLARATOR: "variable_declarator"
};
var PY_NODE = {
  FUNCTION_DEFINITION: "function_definition",
  CLASS_DEFINITION: "class_definition"
};

// src/extractor/languages/typescript.ts
var DECLARATION_NODE_TYPES = /* @__PURE__ */ new Set([
  TS_NODE.FUNCTION_DECLARATION,
  TS_NODE.CLASS_DECLARATION,
  TS_NODE.INTERFACE_DECLARATION,
  TS_NODE.TYPE_ALIAS_DECLARATION,
  TS_NODE.LEXICAL_DECLARATION,
  TS_NODE.VARIABLE_DECLARATION
]);
var VARIABLE_DECLARATION_TYPES = /* @__PURE__ */ new Set([
  TS_NODE.LEXICAL_DECLARATION,
  TS_NODE.VARIABLE_DECLARATION
]);
function extractTypeScriptSymbols(tree, file, language) {
  const symbols = [];
  const root = tree.rootNode;
  for (const node of root.children) {
    if (node.type !== TS_NODE.EXPORT_STATEMENT) continue;
    const decl = node.children.find((c) => DECLARATION_NODE_TYPES.has(c.type));
    if (!decl) continue;
    const kind = nodeKind(decl.type);
    if (!kind) continue;
    if (VARIABLE_DECLARATION_TYPES.has(decl.type)) {
      for (const child of decl.children) {
        if (child.type === TS_NODE.VARIABLE_DECLARATOR) {
          const nameNode = child.childForFieldName("name");
          if (nameNode) {
            symbols.push(makeSymbol(nameNode.text, kind, file, node, language));
          }
        }
      }
    } else {
      const nameNode = decl.childForFieldName("name");
      if (nameNode) {
        symbols.push(makeSymbol(nameNode.text, kind, file, node, language));
      }
    }
  }
  return symbols;
}
function nodeKind(type) {
  switch (type) {
    case TS_NODE.FUNCTION_DECLARATION:
      return SYMBOL_KIND.FUNCTION;
    case TS_NODE.CLASS_DECLARATION:
      return SYMBOL_KIND.CLASS;
    case TS_NODE.INTERFACE_DECLARATION:
      return SYMBOL_KIND.INTERFACE;
    case TS_NODE.TYPE_ALIAS_DECLARATION:
      return SYMBOL_KIND.TYPE;
    case TS_NODE.LEXICAL_DECLARATION:
    case TS_NODE.VARIABLE_DECLARATION:
      return SYMBOL_KIND.VARIABLE;
    default:
      return null;
  }
}
function makeSymbol(name, kind, file, node, language) {
  return {
    name,
    kind,
    file,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    language
  };
}

// src/extractor/languages/python.ts
var PRIVATE_PREFIX = "_";
function extractPythonSymbols(tree, file) {
  const symbols = [];
  const root = tree.rootNode;
  for (const node of root.children) {
    if (node.type === PY_NODE.FUNCTION_DEFINITION) {
      const symbol = tryMakeSymbol(node, SYMBOL_KIND.FUNCTION, file);
      if (symbol) symbols.push(symbol);
    } else if (node.type === PY_NODE.CLASS_DEFINITION) {
      const symbol = tryMakeSymbol(node, SYMBOL_KIND.CLASS, file);
      if (symbol) symbols.push(symbol);
    }
  }
  return symbols;
}
function tryMakeSymbol(node, kind, file) {
  const nameNode = node.childForFieldName("name");
  if (!nameNode) return null;
  const name = nameNode.text;
  if (name.startsWith(PRIVATE_PREFIX)) return null;
  return {
    name,
    kind,
    file,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    language: LANGUAGE.PYTHON
  };
}

// src/extractor/index.ts
var EXTENSION_LANGUAGE_MAP = {
  ".ts": LANGUAGE.TYPESCRIPT,
  ".tsx": LANGUAGE.TYPESCRIPT,
  ".js": LANGUAGE.JAVASCRIPT,
  ".jsx": LANGUAGE.JAVASCRIPT,
  ".mjs": LANGUAGE.JAVASCRIPT,
  ".cjs": LANGUAGE.JAVASCRIPT,
  ".py": LANGUAGE.PYTHON
};
function resolveLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] ?? null;
}
function parseSymbols(tree, filePath, language) {
  switch (language) {
    case LANGUAGE.TYPESCRIPT:
    case LANGUAGE.JAVASCRIPT:
      return extractTypeScriptSymbols(tree, filePath, language);
    case LANGUAGE.PYTHON:
      return extractPythonSymbols(tree, filePath);
  }
}
async function extractSymbols(filePath) {
  const language = resolveLanguage(filePath);
  if (!language) return [];
  const source = await fs.readFile(filePath, "utf-8");
  const parser = await getParser(language);
  const tree = parser.parse(source);
  if (!tree) return [];
  return parseSymbols(tree, filePath, language);
}

// src/scanner/doc-scanner.ts
import fs3 from "fs/promises";

// src/scanner/file-finder.ts
import fs2 from "fs/promises";
import path2 from "path";
var CODE_EXTENSIONS = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);
var DOC_EXTENSIONS = /* @__PURE__ */ new Set([".md", ".mdx"]);
var EXCLUDED_DIRS = /* @__PURE__ */ new Set(["node_modules", "dist", ".git", ".autodocs"]);
async function findCodeFiles(dir) {
  return findFiles(dir, CODE_EXTENSIONS);
}
async function findDocFiles(dir) {
  return findFiles(dir, DOC_EXTENSIONS);
}
async function findFiles(dir, extensions) {
  const results = [];
  let entries;
  try {
    entries = await fs2.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path2.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        results.push(...await findFiles(full, extensions));
      }
    } else if (extensions.has(path2.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// src/scanner/doc-scanner.ts
var HEADING_REGEX = /^#{1,6} .+/;
var HEADING_LEVEL_REGEX = /^(#{1,6})\s/;
var HEADING_PREFIX_REGEX = /^#{1,6}\s+/;
function getHeadingDepth(line) {
  const match = line.match(HEADING_LEVEL_REGEX);
  return match ? match[1].length : 0;
}
function parseSections(filePath, content) {
  const lines = content.split("\n");
  const sections = [];
  let currentHeading = "(preamble)";
  let currentStart = 1;
  let bodyLines = [];
  const flush = (endLine) => {
    if (bodyLines.some((l) => l.trim())) {
      sections.push({
        file: filePath,
        heading: currentHeading,
        body: bodyLines.join("\n").trim(),
        startLine: currentStart,
        endLine
      });
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    if (HEADING_REGEX.test(line)) {
      flush(lineNumber - 1);
      currentHeading = line.trim();
      currentStart = lineNumber;
      bodyLines = [];
    } else {
      bodyLines.push(line);
    }
  }
  flush(lines.length);
  return sections;
}
function extractSectionBody(content, sectionHeading) {
  const targetText = sectionHeading.replace(HEADING_PREFIX_REGEX, "");
  const lines = content.split("\n");
  const headingIdx = lines.findIndex(
    (l) => l.replace(HEADING_PREFIX_REGEX, "") === targetText
  );
  if (headingIdx === -1) return null;
  const headingDepth = getHeadingDepth(lines[headingIdx]);
  const bodyLines = [];
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const depth = getHeadingDepth(lines[i]);
    if (depth > 0 && depth <= headingDepth) break;
    bodyLines.push(lines[i]);
  }
  return bodyLines.join("\n").trim() || null;
}
async function scanDocs(docsDir) {
  const files = await findDocFiles(docsDir);
  const sections = [];
  for (const file of files) {
    const content = await fs3.readFile(file, "utf-8");
    sections.push(...parseSections(file, content));
  }
  return sections;
}

// src/defaults.ts
var BM25 = {
  // Term frequency saturation. Typical range: 1.2–2.0.
  // Higher = less saturation, rare terms weighted more aggressively.
  K1: 1.5,
  // Document length normalization. 0 = no normalization, 1 = full normalization.
  B: 0.75,
  // Minimum BM25 score to include a candidate in corpus-level search results.
  CORPUS_MIN_SCORE: 1e-3,
  // Minimum BM25 score for a doc section to be mapped to a symbol.
  // Raise to require stronger textual overlap before creating a mapping.
  MATCH_MIN_SCORE: 0.5
};
var AI = {
  // Default provider when no autodocs.config.json is present.
  DEFAULT_PROVIDER: "anthropic",
  // Default model when no autodocs.config.json is present.
  DEFAULT_MODEL: "claude-sonnet-4-6",
  // Maximum tokens in the model's response for a single doc-update request.
  MAX_TOKENS: 1024
};
var GIT = {
  // Base branch used for git diff during CI. Overridable via GitHubContext.baseRef.
  DEFAULT_BASE_REF: "origin/main"
};
var GITHUB = {
  // Page size when paginating PR comments to find an existing AutoDocs comment.
  COMMENTS_PER_PAGE: 100
};
var LOOKUP = {
  // Number of hex chars used as the shard key: sha256(name).slice(0, SHARD_NIBBLES).
  // 2 → 256 shards (16^2). Increase for repos with >1M symbols.
  SHARD_NIBBLES: 2,
  // Hex chars stored as the symbol fingerprint: sha256(text).slice(0, FINGERPRINT_HEX).
  // 16 → 64-bit fingerprint; collision probability ≈ n² / 2^65.
  FINGERPRINT_HEX: 16
};
var CLI = {
  // Column width for symbol names in the `autodocs symbols` output table.
  SYMBOL_COLUMN_WIDTH: 30
};

// src/scanner/bm25.ts
function tokenize(text) {
  return text.toLowerCase().replace(/[`_\-./]/g, " ").split(/\s+/).filter((t) => t.length > 0);
}
function termFrequencies(tokens) {
  const freq = /* @__PURE__ */ new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return freq;
}
var BM25Matcher = class {
  sections;
  docTokens;
  docFreqs;
  idf;
  avgDocLen;
  constructor(sections) {
    this.sections = sections;
    this.docTokens = sections.map((s) => tokenize(s.heading + " " + s.body));
    this.docFreqs = this.docTokens.map(termFrequencies);
    this.avgDocLen = this.docTokens.reduce((sum, t) => sum + t.length, 0) / (sections.length || 1);
    this.idf = this.buildIdf();
  }
  buildIdf() {
    const df = /* @__PURE__ */ new Map();
    const N = this.sections.length;
    for (const freq of this.docFreqs) {
      for (const term of freq.keys()) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    const idf = /* @__PURE__ */ new Map();
    for (const [term, docCount] of df) {
      idf.set(term, Math.log((N - docCount + 0.5) / (docCount + 0.5) + 1));
    }
    return idf;
  }
  query(symbolName) {
    const queryTokens = tokenize(symbolName);
    const results = [];
    for (let i = 0; i < this.sections.length; i++) {
      const docLen = this.docTokens[i].length;
      const freq = this.docFreqs[i];
      let score = 0;
      for (const term of queryTokens) {
        const tf = freq.get(term) ?? 0;
        if (tf === 0) continue;
        const idf = this.idf.get(term) ?? 0;
        const numerator = tf * (BM25.K1 + 1);
        const denominator = tf + BM25.K1 * (1 - BM25.B + BM25.B * (docLen / this.avgDocLen));
        score += idf * (numerator / denominator);
      }
      if (score > BM25.CORPUS_MIN_SCORE) {
        results.push({ section: this.sections[i], score });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }
};

// src/map/builder.ts
async function buildMap(codeFiles, docsDir) {
  const [allSections, allSymbols] = await Promise.all([
    scanDocs(docsDir),
    Promise.all(codeFiles.map(extractSymbols)).then((results) => results.flat())
  ]);
  const matcher = new BM25Matcher(allSections);
  const mappings = [];
  for (const symbol of allSymbols) {
    const hits = matcher.query(symbol.name);
    const docs = hits.map((hit) => ({
      file: hit.section.file,
      section: hit.section.heading,
      lines: [hit.section.startLine, hit.section.endLine]
    }));
    mappings.push({
      symbol: symbol.name,
      file: symbol.file,
      docs
    });
  }
  return { version: 1, mappings };
}

// src/map/writer.ts
import fs5 from "fs/promises";
import path4 from "path";

// src/constants.ts
var AUTODOCS_DIR = ".autodocs";
var MAP_FILENAME = "map.json";
var MAP_RELATIVE_PATH = `${AUTODOCS_DIR}/${MAP_FILENAME}`;
var LOOKUP_DIR = `${AUTODOCS_DIR}/lookup`;
var WORKFLOW_DIR = ".github/workflows";
var WORKFLOW_FILENAME = "docsync.yml";
var CONFIG_FILENAME = "docsync.config.json";

// src/map/lookup.ts
import { createHash } from "crypto";
import fs4 from "fs/promises";
import path3 from "path";
function symbolShard(symbolName) {
  return createHash("sha256").update(symbolName).digest("hex").slice(0, LOOKUP.SHARD_NIBBLES);
}
function buildShards(map) {
  const shards = /* @__PURE__ */ new Map();
  for (const entry of map.mappings) {
    if (entry.docs.length === 0) continue;
    const shard = symbolShard(entry.symbol);
    const bucket = shards.get(shard) ?? {};
    const existing = bucket[entry.symbol];
    bucket[entry.symbol] = existing ? [...existing, ...entry.docs] : [...entry.docs];
    shards.set(shard, bucket);
  }
  return shards;
}
async function readLookupForSymbols(repoDir, symbolNames) {
  if (symbolNames.length === 0) return {};
  const lookupDir = path3.join(repoDir, LOOKUP_DIR);
  const shardIds = [...new Set(symbolNames.map(symbolShard))];
  const entries = await Promise.all(
    shardIds.map(async (shard) => {
      try {
        const raw = await fs4.readFile(path3.join(lookupDir, `${shard}.json`), "utf-8");
        return Object.entries(JSON.parse(raw));
      } catch {
        return [];
      }
    })
  );
  return Object.fromEntries(entries.flat());
}

// src/map/writer.ts
async function writeMapFile(filePath, map) {
  const lookupDir = path4.join(path4.dirname(filePath), path4.basename(LOOKUP_DIR));
  await fs5.mkdir(lookupDir, { recursive: true });
  const shards = buildShards(map);
  await Promise.all([
    atomicWrite(filePath, JSON.stringify(map, null, 2)),
    ...[...shards.entries()].map(
      ([shard, data]) => atomicWrite(path4.join(lookupDir, `${shard}.json`), JSON.stringify(data, null, 2))
    )
  ]);
}
async function atomicWrite(filePath, content) {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    await fs5.writeFile(tmpPath, content, "utf-8");
    await fs5.rename(tmpPath, filePath);
  } catch (err) {
    await fs5.unlink(tmpPath).catch(() => {
    });
    throw err;
  }
}

// src/github/client.ts
import { Octokit } from "@octokit/rest";
function createOctokit(ctx) {
  return new Octokit({
    auth: ctx.token,
    ...ctx.baseUrl ? { baseUrl: ctx.baseUrl } : {}
  });
}

// src/github/pr-comment.ts
var COMMENT_MARKER = "<!-- autodocs-check -->";
function renderComment(updates) {
  const sections = updates.map((u) => {
    const diffLines = renderDiff(u.beforeBody, u.afterBody);
    return [
      `**File:** \`${u.docFile}\` \u2014 \`${u.section}\``,
      "",
      "```diff",
      diffLines,
      "```",
      "",
      `To apply: comment \`/autodocs apply ${u.symbolName}\` \u2014 or dismiss with \`/autodocs dismiss\`.`
    ].join("\n");
  });
  return [
    COMMENT_MARKER,
    "**AutoDocs** detected doc sections that may need updating.",
    "",
    sections.join("\n\n---\n\n")
  ].join("\n");
}
function renderDiff(before, after) {
  const beforeLines = before.split("\n").map((l) => `- ${l}`);
  const afterLines = after.split("\n").map((l) => `+ ${l}`);
  return [...beforeLines, ...afterLines].join("\n");
}
var GitHubOutput = class {
  constructor(octokit, ctx) {
    this.octokit = octokit;
    this.ctx = ctx;
  }
  octokit;
  ctx;
  async postOrUpdate(updates) {
    if (updates.length === 0) return;
    const body = renderComment(updates);
    const existing = await this.findExistingComments();
    if (existing.length > 0) {
      await this.octokit.issues.updateComment({
        owner: this.ctx.owner,
        repo: this.ctx.repo,
        comment_id: existing[0].id,
        body
      });
      for (const comment of existing.slice(1)) {
        await this.octokit.issues.deleteComment({
          owner: this.ctx.owner,
          repo: this.ctx.repo,
          comment_id: comment.id
        });
      }
    } else {
      await this.octokit.issues.createComment({
        owner: this.ctx.owner,
        repo: this.ctx.repo,
        issue_number: this.ctx.prNumber,
        body
      });
    }
  }
  async findExistingComments() {
    const comments = await this.octokit.paginate(this.octokit.issues.listComments, {
      owner: this.ctx.owner,
      repo: this.ctx.repo,
      issue_number: this.ctx.prNumber,
      per_page: GITHUB.COMMENTS_PER_PAGE
    });
    return comments.filter((c) => c.body?.includes(COMMENT_MARKER));
  }
};

// src/github/workflow-generator.ts
import fs6 from "fs/promises";
import path5 from "path";
function generateWorkflowContent() {
  return `name: DocSync
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  docsync:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: Alok650/docsync@v1
        with:
          anthropic-api-key: \${{ secrets.ANTHROPIC_API_KEY }}
          openai-api-key: \${{ secrets.OPENAI_API_KEY }}
`;
}
async function generateWorkflow(repoDir) {
  const workflowDir = path5.join(repoDir, WORKFLOW_DIR);
  const workflowPath = path5.join(workflowDir, WORKFLOW_FILENAME);
  await fs6.mkdir(workflowDir, { recursive: true });
  await fs6.writeFile(workflowPath, generateWorkflowContent(), "utf-8");
  return workflowPath;
}

// src/github/context.ts
function readGitHubContext() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER ?? process.env.GITHUB_PR_NUMBER;
  if (!token || !repository || !prNumber) return null;
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) return null;
  return {
    owner,
    repo,
    prNumber: parseInt(prNumber, 10),
    baseRef: process.env.GITHUB_BASE_REF ?? "main",
    token,
    baseUrl: process.env.GITHUB_API_URL
  };
}

// src/pipeline/check.ts
import fs8 from "fs/promises";
import path7 from "path";

// src/differ/git-differ.ts
import { execSync } from "child_process";
var DIFF_FILE_HEADER = /^diff --git a\/.+ b\/(.+)$/;
var HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
var MAX_DIFF_BYTES = 100 * 1024 * 1024;
function parseGitDiff(diffOutput) {
  const files = [];
  let current = null;
  for (const line of diffOutput.split("\n")) {
    const fileMatch = line.match(DIFF_FILE_HEADER);
    if (fileMatch) {
      current = { file: fileMatch[1], changedLines: [] };
      files.push(current);
      continue;
    }
    if (!current) continue;
    const hunkMatch = line.match(HUNK_HEADER);
    if (hunkMatch) {
      const start = parseInt(hunkMatch[1], 10);
      const count = hunkMatch[2] !== void 0 ? parseInt(hunkMatch[2], 10) : 1;
      const end = count === 0 ? start : start + count - 1;
      current.changedLines.push([start, end]);
    }
  }
  return files;
}
function getGitDiff(repoDir, base = GIT.DEFAULT_BASE_REF) {
  const output = execSync(`git diff ${base}...HEAD -- . ':(exclude)${AUTODOCS_DIR}'`, {
    cwd: repoDir,
    encoding: "utf-8",
    maxBuffer: MAX_DIFF_BYTES
  });
  return parseGitDiff(output);
}
async function getBeforeContent(repoDir, filePath, base = GIT.DEFAULT_BASE_REF) {
  try {
    return execSync(`git show ${base}:${filePath}`, {
      cwd: repoDir,
      encoding: "utf-8"
    });
  } catch {
    return "";
  }
}

// src/differ/ast-differ.ts
async function parseSymbolsWithText(source, filePath) {
  const language = resolveLanguage(filePath);
  if (!language) return [];
  const parser = await getParser(language);
  const tree = parser.parse(source);
  const symbols = parseSymbols(tree, filePath, language);
  const sourceLines = source.split("\n");
  return symbols.map((s) => ({
    ...s,
    text: sourceLines.slice(s.startLine - 1, s.endLine).join("\n")
  }));
}
async function diffSymbols(filePath, before, after) {
  const [beforeSymbols, afterSymbols] = await Promise.all([
    parseSymbolsWithText(before, filePath),
    parseSymbolsWithText(after, filePath)
  ]);
  const beforeMap = new Map(beforeSymbols.map((s) => [s.name, s]));
  const afterMap = new Map(afterSymbols.map((s) => [s.name, s]));
  const changes = [];
  for (const [name, afterSym] of afterMap) {
    const beforeSym = beforeMap.get(name);
    if (!beforeSym) {
      changes.push({ type: "added", symbol: name, file: filePath });
    } else if (beforeSym.text !== afterSym.text) {
      changes.push({ type: "modified", symbol: name, file: filePath });
    }
  }
  for (const name of beforeMap.keys()) {
    if (!afterMap.has(name)) {
      changes.push({ type: "removed", symbol: name, file: filePath });
    }
  }
  return changes;
}

// src/retrieval/structural.ts
var StructuralRetriever = class {
  index;
  constructor(lookup) {
    this.index = new Map(Object.entries(lookup));
  }
  retrieve(change) {
    return Promise.resolve(this.index.get(change.symbol) ?? []);
  }
};

// src/retrieval/bm25-retriever.ts
var BM25Retriever = class {
  matcher;
  constructor(sections) {
    this.matcher = new BM25Matcher(sections);
  }
  retrieve(change) {
    const hits = this.matcher.query(change.symbol);
    const docs = hits.filter((hit) => hit.score >= BM25.MATCH_MIN_SCORE).map((hit) => ({
      file: hit.section.file,
      section: hit.section.heading,
      lines: [hit.section.startLine, hit.section.endLine]
    }));
    return Promise.resolve(docs);
  }
};

// src/retrieval/index.ts
var TieredRetriever = class {
  constructor(tier1, tier2) {
    this.tier1 = tier1;
    this.tier2 = tier2;
  }
  tier1;
  tier2;
  async retrieve(change) {
    const tier1Docs = await this.tier1.retrieve(change);
    if (tier1Docs.length > 0) {
      return { change, docs: tier1Docs, tier: 1 };
    }
    const tier2Docs = await this.tier2.retrieve(change);
    return { change, docs: tier2Docs, tier: 2 };
  }
  async retrieveAll(changes) {
    const results = await Promise.all(changes.map((c) => this.retrieve(c)));
    return results.filter((r) => r.docs.length > 0);
  }
};

// src/agent/prompts.ts
var SYSTEM_PROMPT = `You are AutoDocs, an automated technical documentation editor embedded in a CI pipeline.

Your role is to update documentation sections to reflect code changes \u2014 nothing more.

## What you receive
- A changed function, class, or type: its name, file path, and full source before and after the change
- A documentation section that currently describes that symbol

## What you produce
The updated body of the documentation section \u2014 only the paragraph text that replaces the existing body.
No headings. No code fences. No preamble. No explanation. Just the updated text.

## Rules

### Change only what the code changed
- If a parameter was added or removed, update only that parameter's description.
- If return behavior changed, update only the affected description.
- If the public signature is unchanged but implementation details changed, only update descriptions of caller-visible behavior.
- If the change adds an optional parameter, describe it as optional with its default behavior.

### Preserve the author's voice
- Match the existing sentence structure, terminology, and tone exactly.
- Do not rephrase, reorder, or improve sentences that don't require updating.
- Do not modernize, simplify, or clarify writing that is unrelated to the change.

### Never add information not present in the code
- Do not invent behavior, side effects, performance characteristics, or error conditions.
- Every claim in your output must be directly supported by the before/after code provided.

### When nothing needs changing
If the existing documentation already accurately describes the changed code, return the original body text verbatim.`;
function buildUserPrompt(req) {
  return `The symbol \`${req.symbol}\` in \`${req.file}\` changed.

<before>
${req.beforeCode}
</before>

<after>
${req.afterCode}
</after>

The documentation section \`${req.docSection.heading}\` currently reads:

<documentation>
${req.docSection.body}
</documentation>

Return the updated body for this section. Output only the replacement text \u2014 no headings, no explanation.`;
}

// src/agent/doc-update-agent.ts
var DocUpdateAgent = class {
  client;
  model;
  constructor(client, model) {
    this.client = client;
    this.model = model;
  }
  generateUpdate(request) {
    return this.client.complete({
      model: this.model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(request) }],
      maxTokens: AI.MAX_TOKENS
    });
  }
};

// src/map/types.ts
function toDocSection(ref, body) {
  return {
    file: ref.file,
    heading: ref.section,
    body,
    startLine: ref.lines[0],
    endLine: ref.lines[1]
  };
}

// src/config.ts
import fs7 from "fs/promises";
import path6 from "path";

// src/logger.ts
import { createConsola } from "consola";
var logger = createConsola({
  level: process.env.AUTODOCS_DEBUG ? 4 : 3
  // 4 = debug, 3 = info
});

// src/config.ts
var LLM_PROVIDER = {
  ANTHROPIC: "anthropic",
  OPENAI: "openai"
};
var DEFAULTS = {
  docs: "docs",
  code: "src",
  llm: {
    provider: LLM_PROVIDER.ANTHROPIC,
    model: AI.DEFAULT_MODEL
  }
};
async function loadConfig(cwd = process.cwd()) {
  let raw;
  try {
    raw = await fs7.readFile(path6.join(cwd, CONFIG_FILENAME), "utf-8");
  } catch {
    return DEFAULTS;
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...parsed,
      llm: { ...DEFAULTS.llm, ...parsed.llm }
    };
  } catch {
    logger.warn(`${CONFIG_FILENAME} could not be parsed \u2014 using defaults.`);
    return DEFAULTS;
  }
}

// src/llm/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
var AnthropicClient = class {
  client;
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }
  async complete(options) {
    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens,
      ...options.system && { system: options.system },
      messages: options.messages.map((m) => ({ role: m.role, content: m.content }))
    });
    const block = response.content.find(
      (b) => b.type === "text"
    );
    if (!block) throw new Error("AnthropicClient: no text content in response");
    return block.text.trim();
  }
};

// src/llm/openai.ts
import OpenAI from "openai";
var OpenAIClient = class {
  client;
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }
  async complete(options) {
    const systemMessages = options.system ? [{ role: "system", content: options.system }] : [];
    const response = await this.client.chat.completions.create({
      model: options.model,
      max_tokens: options.maxTokens,
      messages: [
        ...systemMessages,
        ...options.messages.map((m) => ({ role: m.role, content: m.content }))
      ]
    });
    const text = response.choices[0]?.message.content;
    if (!text) throw new Error("OpenAIClient: no text content in response");
    return text.trim();
  }
};

// src/llm/factory.ts
function createLLMClient(config) {
  const { provider } = config.llm;
  switch (provider) {
    case LLM_PROVIDER.ANTHROPIC:
      return new AnthropicClient();
    case LLM_PROVIDER.OPENAI:
      return new OpenAIClient();
    default: {
      const exhaustive = provider;
      throw new Error(`Unsupported LLM provider: ${exhaustive}`);
    }
  }
}

// src/pipeline/check.ts
async function runCheck(ctx, config, repoDir = process.cwd()) {
  const { changes, skippedFiles, beforeContents } = await collectChanges(repoDir, ctx.baseRef);
  if (changes.length === 0) return { updates: [], skippedFiles };
  const updates = await generateUpdates(changes, beforeContents, repoDir, config);
  return { updates, skippedFiles };
}
async function collectChanges(repoDir, baseRef) {
  const changedFiles = getGitDiff(repoDir, baseRef);
  const skippedFiles = [];
  const beforeContents = /* @__PURE__ */ new Map();
  const allChanges = [];
  await Promise.all(
    changedFiles.map(async ({ file }) => {
      const absolutePath = path7.join(repoDir, file);
      const [before, after] = await Promise.all([
        getBeforeContent(repoDir, file, baseRef),
        fs8.readFile(absolutePath, "utf-8").catch(() => "")
      ]);
      if (!after) {
        skippedFiles.push(file);
        return;
      }
      beforeContents.set(absolutePath, before);
      const changes = await diffSymbols(absolutePath, before, after);
      allChanges.push(...changes);
    })
  );
  return { changes: allChanges, skippedFiles, beforeContents };
}
async function generateUpdates(changes, beforeContents, repoDir, config) {
  const symbolNames = changes.map((c) => c.symbol);
  const [lookup, docSections] = await Promise.all([
    readLookupForSymbols(repoDir, symbolNames),
    scanDocs(path7.resolve(repoDir, config.docs))
  ]);
  const retriever = new TieredRetriever(
    new StructuralRetriever(lookup),
    new BM25Retriever(docSections)
  );
  const retrievalResults = await retriever.retrieveAll(changes);
  const client = createLLMClient(config);
  const agent = new DocUpdateAgent(client, config.llm.model);
  return buildUpdates(retrievalResults, beforeContents, agent);
}
async function buildUpdates(results, beforeContents, agent) {
  const updates = [];
  for (const result of results) {
    const afterCode = await fs8.readFile(result.change.file, "utf-8").catch(() => "");
    const beforeCode = beforeContents.get(result.change.file) ?? "";
    for (const docRef of result.docs) {
      const docContent = await fs8.readFile(docRef.file, "utf-8").catch(() => null);
      if (!docContent) continue;
      const body = extractSectionBody(docContent, docRef.section);
      if (!body) continue;
      const updatedBody = await agent.generateUpdate({
        symbol: result.change.symbol,
        file: result.change.file,
        beforeCode,
        afterCode,
        docSection: toDocSection(docRef, body)
      });
      updates.push({
        docFile: docRef.file,
        section: docRef.section,
        beforeBody: body,
        afterBody: updatedBody,
        symbolName: result.change.symbol,
        symbolFile: result.change.file
      });
    }
  }
  return updates;
}

// src/cli.ts
var program = new Command();
program.name("autodocs").description("Automatic documentation maintenance for codebases").version("0.1.0");
program.command("symbols <file>").description("Extract public symbols from a source file").action(async (file) => {
  const filePath = path8.resolve(file);
  let symbols;
  try {
    symbols = await extractSymbols(filePath);
  } catch (err) {
    logger.error(`Failed to extract symbols: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }
  if (symbols.length === 0) {
    logger.info("No symbols found.");
    return;
  }
  for (const s of symbols) {
    process.stdout.write(`${s.name.padEnd(CLI.SYMBOL_COLUMN_WIDTH)} [${s.startLine}-${s.endLine}]  (${s.kind})
`);
  }
});
program.command("init").description("Scan codebase and docs, write .autodocs/map.json and GitHub Actions workflow").option("--docs <dir>", "Path to docs directory", "docs").option("--code <dir>", "Path to code directory", "src").option("--yes", "Skip prompts and use defaults").action(async (opts) => {
  const cwd = process.cwd();
  let docsDir = path8.resolve(cwd, opts.docs);
  let codeDir = path8.resolve(cwd, opts.code);
  if (!opts.yes) {
    docsDir = path8.resolve(cwd, await prompt(`Where are your docs? [${opts.docs}] `) || opts.docs);
    codeDir = path8.resolve(cwd, await prompt(`Where is your code? [${opts.code}] `) || opts.code);
  }
  const codeFiles = await findCodeFiles(codeDir);
  if (codeFiles.length === 0) {
    logger.warn("No code files found.");
    return;
  }
  logger.info(`Scanning ${codeFiles.length} code files and docs in ${docsDir}...`);
  const map = await buildMap(codeFiles, docsDir);
  const outDir = path8.join(cwd, AUTODOCS_DIR);
  await fs9.mkdir(outDir, { recursive: true });
  await writeMapFile(path8.join(outDir, MAP_FILENAME), map);
  const mapped = map.mappings.filter((m) => m.docs.length > 0).length;
  logger.success(`${map.mappings.length} symbols indexed, ${mapped} mapped to doc sections.`);
  logger.info(`Map written to ${MAP_RELATIVE_PATH}`);
  const workflowPath = await generateWorkflow(cwd);
  logger.info(`Workflow written to ${path8.relative(cwd, workflowPath)}`);
  logger.info("Add ANTHROPIC_API_KEY or OPENAI_API_KEY to your GitHub repository secrets to activate AutoDocs.");
});
program.command("check").description("Check changed symbols against docs and post PR comment").option("--dry-run", "Print proposed updates without posting to GitHub").action(async (opts) => {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const ctx = readGitHubContext();
  if (!ctx) {
    logger.error("Missing GitHub context. Set GITHUB_TOKEN, GITHUB_REPOSITORY, and PR_NUMBER.");
    process.exit(1);
  }
  logger.info("Running AutoDocs check...");
  const { updates, skippedFiles } = await runCheck(ctx, config, cwd);
  if (skippedFiles.length > 0) {
    logger.warn(`Skipped ${skippedFiles.length} deleted or unreadable file(s).`);
  }
  if (updates.length === 0) {
    logger.success("No doc updates needed.");
    return;
  }
  logger.info(`Found ${updates.length} proposed update(s).`);
  if (opts.dryRun) {
    for (const u of updates) {
      process.stdout.write(`
${u.docFile} \u2014 ${u.section}
`);
      process.stdout.write(`
--- before
${u.beforeBody}
`);
      process.stdout.write(`
+++ after
${u.afterBody}
`);
      process.stdout.write(`
`);
    }
    return;
  }
  const octokit = createOctokit(ctx);
  await new GitHubOutput(octokit, ctx).postOrUpdate(updates);
  logger.success("PR comment posted.");
});
program.parse();
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}
