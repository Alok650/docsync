import { execSync } from 'child_process'
import { AUTODOCS_DIR, UTF8 } from '../constants.js'
import { GIT } from '../defaults.js'
import type { ChangedFile } from './types.js'

const DIFF_FILE_HEADER = /^diff --git a\/.+ b\/(.+)$/
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/
/** 100 MB — enough for any realistic source diff. */
const MAX_DIFF_BYTES = 100 * 1024 * 1024

export function parseGitDiff(diffOutput: string): ChangedFile[] {
  const files: ChangedFile[] = []
  let current: { file: string; changedLines: [number, number][] } | null = null

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

export function getGitDiff(
  repoDir: string,
  base = GIT.DEFAULT_BASE_REF,
  extraExcludes: string[] = [],
): ChangedFile[] {
  const excludes = [AUTODOCS_DIR, ...extraExcludes]
    .map(p => `':(exclude)${p}'`)
    .join(' ')
  const output = execSync(`git diff ${base}...HEAD -- . ${excludes}`, {
    cwd: repoDir,
    encoding: UTF8,
    maxBuffer: MAX_DIFF_BYTES,
  })
  return parseGitDiff(output)
}

export async function getBeforeContent(
  repoDir: string,
  filePath: string,
  base = GIT.DEFAULT_BASE_REF,
): Promise<string> {
  try {
    return execSync(`git show ${base}:${filePath}`, {
      cwd: repoDir,
      encoding: UTF8,
    })
  } catch {
    return ''
  }
}
