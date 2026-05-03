/**
 * Behavioral defaults for AutoDocs.
 *
 * Every tunable constant lives here so contributors have one place to look.
 * Structural constants (file paths, directory names, marker strings) are in constants.ts.
 */

// BM25 Okapi retrieval parameters.
export const BM25 = {
  // Term frequency saturation. Typical range: 1.2–2.0.
  // Higher = less saturation, rare terms weighted more aggressively.
  K1: 1.5,

  // Document length normalization. 0 = no normalization, 1 = full normalization.
  B: 0.75,

  // Minimum BM25 score to include a candidate in corpus-level search results.
  CORPUS_MIN_SCORE: 0.001,

  // Minimum BM25 score for a doc section to be mapped to a symbol.
  // Raise to require stronger textual overlap before creating a mapping.
  MATCH_MIN_SCORE: 0.5,
} as const

// LLM inference settings.
export const AI = {
  // Default provider when no autodocs.config.json is present.
  DEFAULT_PROVIDER: 'anthropic' as const,

  // Default model when no autodocs.config.json is present.
  DEFAULT_MODEL: 'claude-sonnet-4-6',

  // Maximum tokens in the model's response for a single doc-update request.
  MAX_TOKENS: 1024,
} as const

// Git settings.
export const GIT = {
  // Base branch used for git diff during CI. Overridable via GitHubContext.baseRef.
  DEFAULT_BASE_REF: 'origin/main',
} as const

// GitHub API settings.
export const GITHUB = {
  // Page size when paginating PR comments to find an existing AutoDocs comment.
  COMMENTS_PER_PAGE: 100,
} as const

// Lookup index sharding.
// Changing SHARD_NIBBLES or FINGERPRINT_HEX requires running `autodocs init` to rebuild.
export const LOOKUP = {
  // Number of hex chars used as the shard key: sha256(name).slice(0, SHARD_NIBBLES).
  // 2 → 256 shards (16^2). Increase for repos with >1M symbols.
  SHARD_NIBBLES: 2,

  // Hex chars stored as the symbol fingerprint: sha256(text).slice(0, FINGERPRINT_HEX).
  // 16 → 64-bit fingerprint; collision probability ≈ n² / 2^65.
  FINGERPRINT_HEX: 16,
} as const

// CLI display settings.
export const CLI = {
  // Column width for symbol names in the `autodocs symbols` output table.
  SYMBOL_COLUMN_WIDTH: 30,
} as const
