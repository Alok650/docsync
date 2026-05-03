export type ChangeType = 'added' | 'removed' | 'modified'

/** A single symbol-level change detected by AST diffing. */
export interface SymbolChange {
  readonly type: ChangeType
  readonly symbol: string
  readonly file: string
}

/** A source file that changed, with the line ranges covered by its diff hunks. */
export interface ChangedFile {
  readonly file: string
  readonly changedLines: readonly [number, number][]
}
