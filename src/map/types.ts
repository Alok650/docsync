import type { DocSection } from '../scanner/doc-scanner.js'

/** A reference to a specific section within a documentation file. */
export interface DocRef {
  readonly file: string
  readonly section: string
  readonly lines: readonly [number, number]
}

/** A symbol extracted from source code, together with its mapped documentation sections. */
export interface MapEntry {
  readonly symbol: string
  readonly file: string
  readonly docs: readonly DocRef[]
  // sha256(source_text).slice(0, 16) — 64-bit fingerprint of the symbol's source.
  // Used by the updater to skip re-mapping symbols whose source hasn't changed.
  readonly fingerprint?: string
}

/** The full bidirectional index persisted to `.autodocs/map.json`. */
export interface MapFile {
  readonly version: 1
  readonly mappings: readonly MapEntry[]
}

/**
 * Compact symbol→docs index derived from `MapFile`.
 * Keys are symbol names; values are the doc refs that cover that symbol.
 * Same-named symbols across different files have their docs merged.
 */
export type LookupTable = Readonly<Record<string, readonly DocRef[]>>

/** Converts a `DocRef` plus resolved body text into a `DocSection` for the agent. */
export function toDocSection(ref: DocRef, body: string): DocSection {
  return {
    file: ref.file,
    heading: ref.section,
    body,
    startLine: ref.lines[0],
    endLine: ref.lines[1],
  }
}
