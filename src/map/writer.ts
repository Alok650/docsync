import fs from 'fs/promises'
import path from 'path'
import { LOOKUP_DIR } from '../constants.js'
import { buildShards } from './lookup.js'
import type { MapFile } from './types.js'

/**
 * Atomically writes `map.json` and all lookup shards in parallel.
 * Uses write-to-tmp + rename to ensure readers never see a partial file.
 */
export async function writeMapFile(filePath: string, map: MapFile): Promise<void> {
  const lookupDir = path.join(path.dirname(filePath), path.basename(LOOKUP_DIR))
  await fs.mkdir(lookupDir, { recursive: true })

  const shards = buildShards(map)

  await Promise.all([
    atomicWrite(filePath, JSON.stringify(map, null, 2)),
    ...[...shards.entries()].map(([shard, data]) =>
      atomicWrite(path.join(lookupDir, `${shard}.json`), JSON.stringify(data, null, 2)),
    ),
  ])
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`
  try {
    await fs.writeFile(tmpPath, content, 'utf-8')
    await fs.rename(tmpPath, filePath)
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {})
    throw err
  }
}
