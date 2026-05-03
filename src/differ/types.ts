export type ChangeType = 'added' | 'removed' | 'modified'

export interface SymbolChange {
  type: ChangeType
  symbol: string
  file: string
}

export interface ChangedFile {
  file: string
  changedLines: Array<[number, number]>
}
