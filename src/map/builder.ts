import { extractSymbols } from '../extractor/index.js'
import { scanDocs } from '../scanner/doc-scanner.js'
import { BM25Matcher } from '../scanner/bm25.js'
import type { MapFile, MapEntry, DocRef } from './types.js'

/**
 * Builds a fresh `MapFile` by scanning all `codeFiles` and matching symbols to
 * doc sections via BM25. All existing mappings are replaced.
 */
export async function buildMap(codeFiles: string[], docsDir: string): Promise<MapFile> {
  const [allSections, allSymbols] = await Promise.all([
    scanDocs(docsDir),
    Promise.all(codeFiles.map(extractSymbols)).then(results => results.flat()),
  ])

  const matcher = new BM25Matcher(allSections)
  const mappings: MapEntry[] = []

  for (const symbol of allSymbols) {
    const hits = matcher.query(symbol.name)
    const docs: DocRef[] = hits.map(hit => ({
      file: hit.section.file,
      section: hit.section.heading,
      lines: [hit.section.startLine, hit.section.endLine],
    }))

    mappings.push({
      symbol: symbol.name,
      file: symbol.file,
      docs,
    })
  }

  return { version: 1, mappings }
}
