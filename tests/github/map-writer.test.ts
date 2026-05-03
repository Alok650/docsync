import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { writeMapFile } from '../../src/map/writer.js'
import { symbolShard } from '../../src/map/lookup.js'
import type { MapFile, LookupTable } from '../../src/map/types.js'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autodocs-test-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

const MAP: MapFile = {
  version: 1,
  mappings: [
    { symbol: 'processLogin', file: 'src/auth.ts', docs: [{ file: 'docs/auth.md', section: '## Login', lines: [1, 5] }] },
    { symbol: 'noDocSymbol', file: 'src/auth.ts', docs: [] },
  ],
}

describe('writeMapFile (atomic)', () => {
  it('writes valid JSON to the target path', async () => {
    const filePath = path.join(tmpDir, 'map.json')
    await writeMapFile(filePath, MAP)
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as MapFile
    expect(parsed.version).toBe(1)
    expect(parsed.mappings[0].symbol).toBe('processLogin')
  })

  it('writes a lookup shard file for each symbol that has docs', async () => {
    const filePath = path.join(tmpDir, 'map.json')
    await writeMapFile(filePath, MAP)

    const shard = symbolShard('processLogin')
    const shardPath = path.join(tmpDir, 'lookup', `${shard}.json`)
    const raw = await fs.readFile(shardPath, 'utf-8')
    const lookup = JSON.parse(raw) as LookupTable
    expect(lookup['processLogin']).toHaveLength(1)
    expect(lookup['processLogin'][0].section).toBe('## Login')
  })

  it('excludes symbols with no docs from lookup shards', async () => {
    const filePath = path.join(tmpDir, 'map.json')
    await writeMapFile(filePath, MAP)

    const lookupDir = path.join(tmpDir, 'lookup')
    const shardFiles = await fs.readdir(lookupDir)

    for (const file of shardFiles) {
      const raw = await fs.readFile(path.join(lookupDir, file), 'utf-8')
      const lookup = JSON.parse(raw) as LookupTable
      expect(lookup['noDocSymbol']).toBeUndefined()
    }
  })

  it('leaves no .tmp files after successful write', async () => {
    const filePath = path.join(tmpDir, 'map.json')
    await writeMapFile(filePath, MAP)
    const topFiles = await fs.readdir(tmpDir)
    const lookupFiles = await fs.readdir(path.join(tmpDir, 'lookup'))
    const allFiles = [...topFiles, ...lookupFiles]
    expect(allFiles.every(f => !f.endsWith('.tmp'))).toBe(true)
  })

  it('overwrites an existing map file completely', async () => {
    const filePath = path.join(tmpDir, 'map.json')
    await writeMapFile(filePath, MAP)
    const updated: MapFile = { version: 1, mappings: [] }
    await writeMapFile(filePath, updated)
    const raw = await fs.readFile(filePath, 'utf-8')
    expect(JSON.parse(raw).mappings).toHaveLength(0)
  })
})
