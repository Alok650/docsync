import fs from 'fs/promises'
import path from 'path'

export const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'])
export const DOC_EXTENSIONS = new Set(['.md', '.mdx'])

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', '.autodocs'])

export async function findCodeFiles(dir: string): Promise<string[]> {
  return findFiles(dir, CODE_EXTENSIONS)
}

export async function findDocFiles(dir: string): Promise<string[]> {
  return findFiles(dir, DOC_EXTENSIONS)
}

async function findFiles(dir: string, extensions: Set<string>): Promise<string[]> {
  const results: string[] = []

  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        results.push(...await findFiles(full, extensions))
      }
    } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      results.push(full)
    }
  }

  return results
}
