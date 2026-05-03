export interface DocRef {
  file: string
  section: string
  lines: [number, number]
}

export interface MapEntry {
  symbol: string
  file: string
  docs: DocRef[]
}

export interface MapFile {
  version: 1
  mappings: MapEntry[]
}
