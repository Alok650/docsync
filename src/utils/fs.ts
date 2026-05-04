import fs from 'fs/promises'
import { UTF8 } from '../constants.js'

/** Reads a file as UTF-8 text. Returns `null` if the file does not exist or cannot be read. */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, UTF8)
  } catch {
    return null
  }
}

/** Reads a file as UTF-8 text. Returns an empty string if the file does not exist or cannot be read. */
export async function readFileOrEmpty(filePath: string): Promise<string> {
  return (await readFileSafe(filePath)) ?? ''
}
