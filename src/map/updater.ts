import path from 'path'
import { extractSymbols } from '../extractor/index.js'
import { readFileOrEmpty } from '../utils/fs.js'
import { UTF8 } from '../constants.js'
import { writeMapFile } from './writer.js'
import { computeFingerprint } from './lookup.js'
import { logger } from '../logger.js'
import type { ExtractedSymbol } from '../extractor/types.js'
import type { MapFile, MapEntry } from './types.js'

/**
 * Re-scans `changedFiles` and updates their entries in the map.
 * Symbols whose source fingerprint is unchanged keep their existing doc mappings.
 * Symbols with changed source carry forward old docs (marked stale until next `check`).
 */
export async function updateMapForChangedFiles(
  mapFilePath: string,
  changedFiles: string[],
): Promise<MapFile> {
  const raw = await readFileOrEmpty(mapFilePath)
  let map = JSON.parse(raw) as MapFile

  for (const filePath of changedFiles) {
    const absolutePath = path.resolve(filePath)

    // Index old entries for this file so we can restore docs on unchanged symbols.
    const oldBySymbol = new Map(
      map.mappings.filter(m => m.file === absolutePath).map(m => [m.symbol, m]),
    )
    const remaining = map.mappings.filter(m => m.file !== absolutePath)

    let currentSymbols: ExtractedSymbol[]
    try {
      currentSymbols = await extractSymbols(absolutePath)
    } catch (err) {
      logger.debug(`Skipping ${absolutePath}: ${err instanceof Error ? err.message : String(err)}`)
      map = { ...map, mappings: remaining }
      continue
    }

    const content = await readFileOrEmpty(absolutePath)

    const newEntries: MapEntry[] = currentSymbols.map(s => {
      const symbolText = content.split('\n').slice(s.startLine - 1, s.endLine).join('\n')
      const fingerprint = computeFingerprint(symbolText)
      const old = oldBySymbol.get(s.name)

      // Fingerprint match → source unchanged, preserve existing doc mappings.
      if (old?.fingerprint === fingerprint) return { ...old, fingerprint }

      // Source changed or new symbol — carry forward old docs (may be stale).
      // Re-mapping to updated docs requires running the full check pipeline.
      return { symbol: s.name, file: absolutePath, docs: old?.docs ?? [], fingerprint }
    })

    map = { ...map, mappings: [...remaining, ...newEntries] }
  }

  await writeMapFile(mapFilePath, map)
  return map
}
