import fs from 'fs/promises'
import path from 'path'
import { extractSymbols } from '../extractor/index.js'
import { writeMapFile } from './writer.js'
import type { MapFile, MapEntry } from './types.js'

export async function updateMapForChangedFiles(
  mapFilePath: string,
  changedFiles: string[],
): Promise<MapFile> {
  const raw = await fs.readFile(mapFilePath, 'utf-8')
  const map = JSON.parse(raw) as MapFile

  for (const filePath of changedFiles) {
    const absolutePath = path.resolve(filePath)

    // Remove all existing entries for this file
    map.mappings = map.mappings.filter(m => m.file !== absolutePath)

    // Re-extract current symbols and re-add entries (docs list empty — will be re-matched on next init)
    let currentSymbols: Awaited<ReturnType<typeof extractSymbols>>
    try {
      currentSymbols = await extractSymbols(absolutePath)
    } catch {
      // File was deleted — entries already removed above
      continue
    }

    const newEntries: MapEntry[] = currentSymbols.map(s => ({
      symbol: s.name,
      file: absolutePath,
      docs: map.mappings.find(m => m.symbol === s.name && m.file === absolutePath)?.docs ?? [],
    }))

    map.mappings.push(...newEntries)
  }

  await writeMapFile(mapFilePath, map)
  return map
}
