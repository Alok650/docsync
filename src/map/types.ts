import type { DocSection } from '../scanner/doc-scanner.js'

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

export function toDocSection(ref: DocRef, body: string): DocSection {
  return {
    file: ref.file,
    heading: ref.section,
    body,
    startLine: ref.lines[0],
    endLine: ref.lines[1],
  }
}
