import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { writeMapFile } from '../../src/map/writer.js'
import type { MapFile } from '../../src/map/types.js'

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

  it('leaves no .tmp file after successful write', async () => {
    const filePath = path.join(tmpDir, 'map.json')
    await writeMapFile(filePath, MAP)
    const files = await fs.readdir(tmpDir)
    expect(files.every(f => !f.endsWith('.tmp'))).toBe(true)
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
