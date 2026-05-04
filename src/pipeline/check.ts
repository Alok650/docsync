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
import { readLookupForSymbols } from '../map/lookup.js'
import { createLLMClient } from '../llm/factory.js'
import type { SymbolChange } from '../differ/types.js'
import type { GitHubContext, ProposedDocUpdate } from '../github/types.js'
import type { DocSyncConfig } from '../config.js'
import type { RetrievalResult } from '../retrieval/types.js'

export interface CheckResult {
  readonly updates: readonly ProposedDocUpdate[]
  /** Files that were in the diff but could not be read (deleted, permission error, etc.). */
  readonly skippedFiles: readonly string[]
}

/**
 * Main pipeline entry point: diffs the PR against `baseRef`, retrieves relevant doc sections,
 * calls the LLM agent for each changed symbol, and returns proposed updates.
 */
export async function runCheck(
  ctx: GitHubContext,
  config: DocSyncConfig,
  repoDir = process.cwd(),
): Promise<CheckResult> {
  const { changes, skippedFiles, beforeContents } = await collectChanges(repoDir, ctx.baseRef)
  if (changes.length === 0) return { updates: [], skippedFiles }

  const updates = await generateUpdates(changes, beforeContents, repoDir, config)
  return { updates, skippedFiles }
}

interface CollectedChanges {
  readonly changes: readonly SymbolChange[]
  readonly skippedFiles: readonly string[]
  readonly beforeContents: Map<string, string>
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
  changes: readonly SymbolChange[],
  beforeContents: Map<string, string>,
  repoDir: string,
  config: DocSyncConfig,
): Promise<ProposedDocUpdate[]> {
  const symbolNames = changes.map(c => c.symbol)
  const [lookup, docSections] = await Promise.all([
    readLookupForSymbols(repoDir, symbolNames),
    scanDocs(path.resolve(repoDir, config.docs)),
  ])

  const retriever = new TieredRetriever(
    new StructuralRetriever(lookup),
    new BM25Retriever(docSections),
  )
  const retrievalResults = await retriever.retrieveAll(changes)

  const client = createLLMClient(config)
  const agent = new DocUpdateAgent(client, config.llm.model)
  return buildUpdates(retrievalResults, beforeContents, agent, repoDir, config.maxUpdatesPerPr)
}

async function buildUpdates(
  results: readonly RetrievalResult[],
  beforeContents: Map<string, string>,
  agent: DocUpdateAgent,
  repoDir: string,
  maxUpdates: number,
): Promise<ProposedDocUpdate[]> {
  const updates: ProposedDocUpdate[] = []

  for (const result of results) {
    if (updates.length >= maxUpdates) break
    const afterCode = await fs.readFile(result.change.file, 'utf-8').catch(() => '')
    const beforeCode = beforeContents.get(result.change.file) ?? ''

    for (const docRef of result.docs) {
      if (updates.length >= maxUpdates) break
      // Paths in the index are relative to the repo root; resolve for the current environment.
      const docAbsPath = path.isAbsolute(docRef.file)
        ? docRef.file
        : path.resolve(repoDir, docRef.file)
      const docContent = await fs.readFile(docAbsPath, 'utf-8').catch(() => null)
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

      if (updatedBody === body) continue

      updates.push({
        docFile: path.relative(repoDir, docAbsPath),
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
