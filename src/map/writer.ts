import fs from 'fs/promises'
import type { MapFile } from './types.js'

export async function writeMapFile(filePath: string, map: MapFile): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.tmp`
  const content = JSON.stringify(map, null, 2)
  try {
    await fs.writeFile(tmpPath, content, 'utf-8')
    await fs.rename(tmpPath, filePath)
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => {})
    throw err
  }
}
