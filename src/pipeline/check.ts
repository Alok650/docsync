import fs from 'fs/promises'
import path from 'path'
import { getGitDiff, getBeforeContent } from '../differ/git-differ.js'
import { diffSymbols } from '../differ/ast-differ.js'
import { StructuralRetriever } from '../retrieval/structural.js'
import { BM25Retriever } from '../retrieval/bm25-retriever.js'
import { TieredRetriever } from '../retrieval/index.js'
import { DocUpdateAgent } from '../agent/doc-update-agent.js'
import { scanDocs, extractSectionBody } from '../scanner/doc-scanner.js'
import { toDocSection } from '../map/types.js'
import type { MapFile } from '../map/types.js'
import type { SymbolChange } from '../differ/types.js'
import type { GitHubContext, ProposedDocUpdate } from '../github/types.js'
import type { AutoDocsConfig } from '../config.js'
import type { RetrievalResult } from '../retrieval/types.js'

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
  const { changes, skippedFiles, beforeContents } = await collectChanges(repoDir, ctx.baseRef)
  if (changes.length === 0) return { updates: [], skippedFiles }

  const updates = await generateUpdates(changes, beforeContents, repoDir, config)
  return { updates, skippedFiles }
}

interface CollectedChanges {
  changes: SymbolChange[]
  skippedFiles: string[]
  beforeContents: Map<string, string>
}

async function collectChanges(repoDir: string, baseRef: string): Promise<CollectedChanges> {
  const changedFiles = getGitDiff(repoDir, baseRef)
  const skippedFiles: string[] = []
  const beforeContents = new Map<string, string>()
  const allChanges: SymbolChange[] = []

  await Promise.all(
    changedFiles.map(async ({ file }) => {
      const absolutePath = path.join(repoDir, file)
      const [before, after] = await Promise.all([
        getBeforeContent(repoDir, file, baseRef),
        fs.readFile(absolutePath, 'utf-8').catch(() => ''),
      ])

      if (!after) {
        skippedFiles.push(file)
        return
      }

      beforeContents.set(absolutePath, before)
      const changes = await diffSymbols(absolutePath, before, after)
      allChanges.push(...changes)
    }),
  )

  return { changes: allChanges, skippedFiles, beforeContents }
}

async function generateUpdates(
  changes: SymbolChange[],
  beforeContents: Map<string, string>,
  repoDir: string,
  config: AutoDocsConfig,
): Promise<ProposedDocUpdate[]> {
  const [mapFile, docSections] = await Promise.all([
    readMapFile(repoDir),
    scanDocs(path.resolve(repoDir, config.docs)),
  ])

  const retriever = new TieredRetriever(
    new StructuralRetriever(mapFile),
    new BM25Retriever(docSections),
  )
  const retrievalResults = await retriever.retrieveAll(changes)

  const agent = new DocUpdateAgent()
  return buildUpdates(retrievalResults, beforeContents, agent)
}

async function buildUpdates(
  results: RetrievalResult[],
  beforeContents: Map<string, string>,
  agent: DocUpdateAgent,
): Promise<ProposedDocUpdate[]> {
  const updates: ProposedDocUpdate[] = []

  for (const result of results) {
    const afterCode = await fs.readFile(result.change.file, 'utf-8').catch(() => '')
    const beforeCode = beforeContents.get(result.change.file) ?? ''

    for (const docRef of result.docs) {
      const docContent = await fs.readFile(docRef.file, 'utf-8').catch(() => null)
      if (!docContent) continue

      const body = extractSectionBody(docContent, docRef.section)
      if (!body) continue

      const updatedBody = await agent.generateUpdate({
        symbol: result.change.symbol,
        file: result.change.file,
        beforeCode,
        afterCode,
        docSection: toDocSection(docRef, body),
      })

      updates.push({
        docFile: docRef.file,
        section: docRef.section,
        beforeBody: body,
        afterBody: updatedBody,
        symbolName: result.change.symbol,
        symbolFile: result.change.file,
      })
    }
  }

  return updates
}

async function readMapFile(repoDir: string): Promise<MapFile> {
  try {
    const raw = await fs.readFile(path.join(repoDir, MAP_PATH), 'utf-8')
    return JSON.parse(raw) as MapFile
  } catch {
    return { version: 1, mappings: [] }
  }
}
