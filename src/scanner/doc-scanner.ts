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

export async function scanDocs(docsDir: string): Promise<DocSection[]> {
  const files = await findDocFiles(docsDir)
  const sections: DocSection[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    sections.push(...parseSections(file, content))
  }

  return sections
}
