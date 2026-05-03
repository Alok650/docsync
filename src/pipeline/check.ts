import fs from 'fs/promises'
import path from 'path'
import { getGitDiff, getBeforeContent } from '../differ/git-differ.js'
import { diffSymbols } from '../differ/ast-differ.js'
import { StructuralRetriever } from '../retrieval/structural.js'
import { BM25Retriever } from '../retrieval/bm25-retriever.js'
import { TieredRetriever } from '../retrieval/index.js'
import { DocUpdateAgent } from '../agent/doc-update-agent.js'
import { MarkdownEditor } from '../editor/markdown-editor.js'
import { scanDocs } from '../scanner/doc-scanner.js'
import type { MapFile } from '../map/types.js'
import type { GitHubContext, ProposedDocUpdate } from '../github/types.js'
import type { AutoDocsConfig } from '../config.js'

const MAP_PATH = '.autodocs/map.json'

export interface CheckResult {
  updates: ProposedDocUpdate[]
  skippedFiles: string[]
}

export async function runCheck(
  ctx: GitHubContext,
  config: AutoDocsConfig,
  repoDir = process.cwd(),
): Promise<CheckResult> {
  // Stage 1: Collect — git diff → changed symbols
  const changedFiles = getGitDiff(repoDir, ctx.baseRef)
  if (changedFiles.length === 0) return { updates: [], skippedFiles: [] }

  const skippedFiles: string[] = []
  const allChanges = (
    await Promise.all(
      changedFiles.map(async ({ file }) => {
        const absolutePath = path.join(repoDir, file)
        const [beforeContent, afterContent] = await Promise.all([
          getBeforeContent(repoDir, file, ctx.baseRef),
          fs.readFile(absolutePath, 'utf-8').catch(() => ''),
        ])
        if (!afterContent) {
          skippedFiles.push(file)
          return []
        }
        return diffSymbols(absolutePath, beforeContent, afterContent)
      }),
    )
  ).flat()

  if (allChanges.length === 0) return { updates: [], skippedFiles }

  // Stage 2: Analyse — retrieve affected doc sections + generate updates
  const [mapFile, docSections] = await Promise.all([
    readMapFile(repoDir),
    scanDocs(path.resolve(repoDir, config.docs)),
  ])

  const retriever = new TieredRetriever(
    new StructuralRetriever(mapFile),
    new BM25Retriever(docSections),
  )
  const retrievalResults = await retriever.retrieveAll(allChanges)

  const agent = new DocUpdateAgent(undefined, config.anthropic.model)
  const updates: ProposedDocUpdate[] = []

  for (const result of retrievalResults) {
    for (const docRef of result.docs) {
      const docContent = await fs.readFile(docRef.file, 'utf-8').catch(() => null)
      if (!docContent) continue

      const sectionBody = extractSectionBody(docContent, docRef.section)
      if (!sectionBody) continue

      const beforeContent = await getBeforeContent(repoDir, result.change.file, ctx.baseRef)

      const updatedBody = await agent.generateUpdate({
        symbol: result.change.symbol,
        file: result.change.file,
        beforeCode: beforeContent,
        afterCode: await fs.readFile(result.change.file, 'utf-8').catch(() => ''),
        docSection: { ...docRef, file: docRef.file, heading: docRef.section, body: sectionBody, startLine: docRef.lines[0], endLine: docRef.lines[1] },
      })

      updates.push({
        docFile: docRef.file,
        section: docRef.section,
        beforeBody: sectionBody,
        afterBody: updatedBody,
        symbolName: result.change.symbol,
        symbolFile: result.change.file,
      })
    }
  }

  return { updates, skippedFiles }
}

async function readMapFile(repoDir: string): Promise<MapFile> {
  try {
    const raw = await fs.readFile(path.join(repoDir, MAP_PATH), 'utf-8')
    return JSON.parse(raw) as MapFile
  } catch {
    return { version: 1, mappings: [] }
  }
}

function extractSectionBody(docContent: string, sectionHeading: string): string | null {
  const headingText = sectionHeading.replace(/^#{1,6}\s+/, '')
  const lines = docContent.split('\n')
  const headingIdx = lines.findIndex(l => l.replace(/^#{1,6}\s+/, '') === headingText)
  if (headingIdx === -1) return null

  const headingDepth = (lines[headingIdx].match(/^#{1,6}/) ?? [''])[0].length
  const bodyLines: string[] = []
  for (let i = headingIdx + 1; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s/)
    if (match && match[1].length <= headingDepth) break
    bodyLines.push(lines[i])
  }
  return bodyLines.join('\n').trim() || null
}
