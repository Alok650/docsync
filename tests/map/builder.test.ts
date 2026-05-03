import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildMap } from '../../src/map/builder.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtureCode = path.resolve(__dirname, '../fixtures/sample.ts')
const fixtureDocs = path.resolve(__dirname, '../fixtures/docs')

describe('map builder', () => {
  it('produces version 1 map', async () => {
    const map = await buildMap([fixtureCode], fixtureDocs)
    expect(map.version).toBe(1)
  })

  it('creates an entry for processLogin mapped to Login Flow section', async () => {
    const map = await buildMap([fixtureCode], fixtureDocs)
    const entry = map.mappings.find(m => m.symbol === 'processLogin')
    expect(entry).toBeDefined()
    expect(entry!.docs.length).toBeGreaterThan(0)
    expect(entry!.docs[0].section).toBe('## Login Flow')
  })

  it('creates an entry for AuthError mapped to Error Handling section', async () => {
    const map = await buildMap([fixtureCode], fixtureDocs)
    const entry = map.mappings.find(m => m.symbol === 'AuthError')
    expect(entry).toBeDefined()
    expect(entry!.docs[0].section).toBe('## Error Handling')
  })

  it('omits symbols with no doc matches', async () => {
    const map = await buildMap([fixtureCode], fixtureDocs)
    // AuthResult has no mention in docs — should be absent or have empty docs
    const entry = map.mappings.find(m => m.symbol === 'AuthResult')
    if (entry) expect(entry.docs).toHaveLength(0)
  })

  it('each doc ref has file, section, and lines', async () => {
    const map = await buildMap([fixtureCode], fixtureDocs)
    for (const entry of map.mappings) {
      for (const doc of entry.docs) {
        expect(doc.file).toBeTruthy()
        expect(doc.section).toBeTruthy()
        expect(doc.lines).toHaveLength(2)
      }
    }
  })
})
