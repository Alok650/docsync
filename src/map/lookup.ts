import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { LOOKUP_DIR } from '../constants.js'
import { LOOKUP } from '../defaults.js'
import type { MapFile, DocRef, LookupTable } from './types.js'

// shard(name) = sha256(name).slice(0, SHARD_NIBBLES) → uniform 256-bucket distribution.
export function symbolShard(symbolName: string): string {
  return createHash('sha256').update(symbolName).digest('hex').slice(0, LOOKUP.SHARD_NIBBLES)
}

// sha256(text).slice(0, FINGERPRINT_HEX) — truncated hash for change detection.
export function computeFingerprint(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, LOOKUP.FINGERPRINT_HEX)
}

/**
 * Partitions a `MapFile` into per-shard `LookupTable` objects.
 * Symbols with no docs are excluded. Same-named symbols across files are merged.
 * Returns a map of shard-id → partial LookupTable for that shard.
 */
export function buildShards(map: MapFile): Map<string, LookupTable> {
  const shards = new Map<string, Record<string, DocRef[]>>()

  for (const entry of map.mappings) {
    if (entry.docs.length === 0) continue
    const shard = symbolShard(entry.symbol)
    const bucket = shards.get(shard) ?? {}
    const existing = bucket[entry.symbol]
    bucket[entry.symbol] = existing ? [...existing, ...entry.docs] : [...entry.docs]
    shards.set(shard, bucket)
  }

  return shards as Map<string, LookupTable>
}

/** Merges all shards into a single `LookupTable` — useful for in-memory use and tests. */
export function buildLookup(map: MapFile): LookupTable {
  const result: Record<string, DocRef[]> = {}
  for (const [, shardData] of buildShards(map)) {
    for (const [symbol, docs] of Object.entries(shardData)) {
      const existing = result[symbol]
      result[symbol] = existing ? [...existing, ...(docs as DocRef[])] : [...(docs as DocRef[])]
    }
  }
  return result
}

/**
 * Reads only the shard files needed for `symbolNames` — at most `|Q|` file reads.
 * Symbols whose shard file is missing are silently omitted (handled by Tier 2 BM25).
 */
export async function readLookupForSymbols(
  repoDir: string,
  symbolNames: readonly string[],
): Promise<LookupTable> {
  if (symbolNames.length === 0) return {}

  const lookupDir = path.join(repoDir, LOOKUP_DIR)
  const shardIds = [...new Set(symbolNames.map(symbolShard))]

  const entries = await Promise.all(
    shardIds.map(async shard => {
      try {
        const raw = await fs.readFile(path.join(lookupDir, `${shard}.json`), 'utf-8')
        return Object.entries(JSON.parse(raw) as LookupTable)
      } catch {
        return []
      }
    }),
  )

  return Object.fromEntries(entries.flat())
}
