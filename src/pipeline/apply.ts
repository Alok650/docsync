import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'
import { MarkdownEditor } from '../editor/markdown-editor.js'
import { createOctokit } from '../github/client.js'
import { GitHubOutput, extractUpdatesFromComment } from '../github/pr-comment.js'
import { logger } from '../logger.js'
import type { GitHubContext } from '../github/types.js'

const GIT_AUTHOR = '-c user.name="github-actions[bot]" -c user.email="github-actions[bot]@users.noreply.github.com"'

export async function runApply(
  symbols: string[],
  ctx: GitHubContext,
  repoDir: string,
): Promise<void> {
  const octokit = createOctokit(ctx)
  const ghOutput = new GitHubOutput(octokit, ctx)

  const comment = await ghOutput.findComment()
  if (!comment) {
    logger.warn('No DocSync comment found on this PR.')
    return
  }

  const allUpdates = extractUpdatesFromComment(comment.body)
  if (allUpdates.length === 0) {
    logger.warn('No proposed updates found in the DocSync comment.')
    return
  }

  const toApply = symbols.length > 0
    ? allUpdates.filter(u => symbols.includes(u.symbolName))
    : allUpdates

  if (toApply.length === 0) {
    logger.warn(`No updates found for symbol(s): ${symbols.join(', ')}`)
    return
  }

  const applied: string[] = []
  const modifiedFiles = new Set<string>()

  for (const update of toApply) {
    const docAbsPath = path.resolve(repoDir, update.docFile)
    const content = await fs.readFile(docAbsPath, 'utf-8').catch(() => null)
    if (!content) {
      logger.warn(`Could not read ${update.docFile} — skipping ${update.symbolName}`)
      continue
    }

    const updated = MarkdownEditor.replaceSection(content, update.section, update.afterBody)
    if (updated === content) {
      logger.warn(`Section "${update.section}" not found in ${update.docFile} — skipping`)
      continue
    }

    await fs.writeFile(docAbsPath, updated, 'utf-8')
    modifiedFiles.add(update.docFile)
    applied.push(update.symbolName)
    logger.success(`Applied: ${update.symbolName}`)
  }

  if (applied.length === 0) {
    logger.warn('No updates could be applied.')
    return
  }

  // Commit and push to the PR branch
  const filesArg = [...modifiedFiles].map(f => `"${f}"`).join(' ')
  const commitMsg = applied.length === 1
    ? `docs: apply docsync suggestion for ${applied[0]}`
    : `docs: apply docsync suggestions for ${applied.join(', ')}`

  try {
    execSync(`git ${GIT_AUTHOR} add ${filesArg}`, { cwd: repoDir, stdio: 'pipe' })
    execSync(`git ${GIT_AUTHOR} commit -m ${JSON.stringify(commitMsg)}`, { cwd: repoDir, stdio: 'pipe' })
    execSync('git push', { cwd: repoDir, stdio: 'pipe' })
  } catch (err) {
    logger.error(`Git operation failed: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  // Update the PR comment: mark applied, keep remaining visible
  const remaining = allUpdates.filter(u => !applied.includes(u.symbolName))
  await ghOutput.markApplied(applied, remaining, comment.id)

  logger.success(`Applied ${applied.length} update(s) and pushed to branch.`)
}

export async function runDismiss(ctx: GitHubContext): Promise<void> {
  const octokit = createOctokit(ctx)
  const ghOutput = new GitHubOutput(octokit, ctx)
  await ghOutput.dismiss()
  logger.success('DocSync comment dismissed.')
}
