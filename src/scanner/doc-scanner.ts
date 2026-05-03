import fs from 'fs/promises'
import path from 'path'

export interface DocSection {
  file: string
  heading: string
  body: string
  startLine: number
  endLine: number
}

const MD_EXTENSIONS = new Set(['.md', '.mdx'])
const HEADING_REGEX = /^#{1,6} .+/

async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await findMarkdownFiles(full))
    } else if (MD_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full)
    }
  }
  return results
}

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
  const files = await findMarkdownFiles(docsDir)
  const sections: DocSection[] = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8')
    sections.push(...parseSections(file, content))
  }

  return sections
}
