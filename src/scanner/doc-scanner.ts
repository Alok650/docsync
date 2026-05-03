import fs from 'fs/promises'
import { findDocFiles } from './file-finder.js'

export interface DocSection {
  file: string
  heading: string
  body: string
  startLine: number
  endLine: number
}

const HEADING_REGEX = /^#{1,6} .+/
const HEADING_LEVEL_REGEX = /^(#{1,6})\s/
const HEADING_PREFIX_REGEX = /^#{1,6}\s+/

function parseSections(filePath: string, content: string): DocSection[] {
  const lines = content.split('\n')
  const sections: DocSection[] = []

  let currentHeading = '(preamble)'
  let currentStart = 1
  let bodyLines: string[] = []

  const flush = (endLine: number) => {
    if (bodyLines.some(l => l.trim())) {
      sections.push({
        file: filePath,
        heading: currentHeading,
        body: bodyLines.join('\n').trim(),
        startLine: currentStart,
        endLine,
      })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1

    if (HEADING_REGEX.test(line)) {
      flush(lineNumber - 1)
      currentHeading = line.trim()
      currentStart = lineNumber
      bodyLines = []
    } else {
      bodyLines.push(line)
    }
  }

  flush(lines.length)
  return sections
}

export function extractSectionBody(content: string, sectionHeading: string): string | null {
  const targetText = sectionHeading.replace(HEADING_PREFIX_REGEX, '')
  const lines = content.split('\n')
  const headingIdx = lines.findIndex(
    l => l.replace(HEADING_PREFIX_REGEX, '') === targetText,
  )
  if (headingIdx === -1) return null

  const headingDepth = (lines[headingIdx].match(HEADING_LEVEL_REGEX) ?? ['', ''])[1].length
  const bodyLines: string[] = []

  for (let i = headingIdx + 1; i < lines.length; i++) {
    const match = lines[i].match(HEADING_LEVEL_REGEX)
    if (match && match[1].length <= headingDepth) break
    bodyLines.push(lines[i])
  }

  return bodyLines.join('\n').trim() || null
}

export async function scanDocs(docsDir: string): Promise<DocSection[]> {
  const files = await findDocFiles(docsDir)
  const sections: DocSection[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    sections.push(...parseSections(file, content))
  }

  return sections
}
