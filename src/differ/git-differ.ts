import { execSync } from 'child_process'
import type { ChangedFile } from './types.js'

const DIFF_FILE_HEADER = /^diff --git a\/.+ b\/(.+)$/
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/

export function parseGitDiff(diffOutput: string): ChangedFile[] {
  const files: ChangedFile[] = []
  let current: ChangedFile | null = null

  for (const line of diffOutput.split('\n')) {
    const fileMatch = line.match(DIFF_FILE_HEADER)
    if (fileMatch) {
      current = { file: fileMatch[1], changedLines: [] }
      files.push(current)
      continue
    }

    if (!current) continue

    const hunkMatch = line.match(HUNK_HEADER)
    if (hunkMatch) {
      const start = parseInt(hunkMatch[1], 10)
      const count = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1
      const end = count === 0 ? start : start + count - 1
      current.changedLines.push([start, end])
    }
  }

  return files
}

export function getGitDiff(repoDir: string, base = 'origin/main'): ChangedFile[] {
  const output = execSync(`git diff ${base}...HEAD`, {
    cwd: repoDir,
    encoding: 'utf-8',
  })
  return parseGitDiff(output)
}

export async function getBeforeContent(
  repoDir: string,
  filePath: string,
  base = 'origin/main',
): Promise<string> {
  try {
    return execSync(`git show ${base}:${filePath}`, {
      cwd: repoDir,
      encoding: 'utf-8',
    })
  } catch {
    return ''
  }
}
