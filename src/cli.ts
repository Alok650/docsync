#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'fs/promises'
import path from 'path'
import readline from 'readline'
import { extractSymbols } from './extractor/index.js'
import type { ExtractedSymbol } from './extractor/types.js'
import { buildMap } from './map/builder.js'
import { writeMapFile } from './map/writer.js'
import { findCodeFiles } from './scanner/file-finder.js'
import { createOctokit, GitHubOutput, generateWorkflow, readGitHubContext } from './github/index.js'
import { runCheck } from './pipeline/check.js'
import { loadConfig } from './config.js'
import { AUTODOCS_DIR, MAP_FILENAME, MAP_RELATIVE_PATH } from './constants.js'
import { CLI } from './defaults.js'
import { logger } from './logger.js'

const program = new Command()

program
  .name('autodocs')
  .description('Automatic documentation maintenance for codebases')
  .version('0.1.0')

program
  .command('symbols <file>')
  .description('Extract public symbols from a source file')
  .action(async (file: string) => {
    const filePath = path.resolve(file)
    let symbols: ExtractedSymbol[]
    try {
      symbols = await extractSymbols(filePath)
    } catch (err) {
      logger.error(`Failed to extract symbols: ${err instanceof Error ? err.message : String(err)}`)
      return
    }
    if (symbols.length === 0) {
      logger.info('No symbols found.')
      return
    }
    for (const s of symbols) {
      process.stdout.write(`${s.name.padEnd(CLI.SYMBOL_COLUMN_WIDTH)} [${s.startLine}-${s.endLine}]  (${s.kind})\n`)
    }
  })

program
  .command('init')
  .description('Scan codebase and docs, write .autodocs/map.json and GitHub Actions workflow')
  .option('--docs <dir>', 'Path to docs directory', 'docs')
  .option('--code <dir>', 'Path to code directory', 'src')
  .option('--yes', 'Skip prompts and use defaults')
  .action(async (opts: { docs: string; code: string; yes: boolean }) => {
    const cwd = process.cwd()

    let docsDir = path.resolve(cwd, opts.docs)
    let codeDir = path.resolve(cwd, opts.code)

    if (!opts.yes) {
      docsDir = path.resolve(cwd, await prompt(`Where are your docs? [${opts.docs}] `) || opts.docs)
      codeDir = path.resolve(cwd, await prompt(`Where is your code? [${opts.code}] `) || opts.code)
    }

    const codeFiles = await findCodeFiles(codeDir)
    if (codeFiles.length === 0) {
      logger.warn('No code files found.')
      return
    }

    logger.info(`Scanning ${codeFiles.length} code files and docs in ${docsDir}...`)
    const map = await buildMap(codeFiles, docsDir)

    const outDir = path.join(cwd, AUTODOCS_DIR)
    await fs.mkdir(outDir, { recursive: true })
    await writeMapFile(path.join(outDir, MAP_FILENAME), map)

    const mapped = map.mappings.filter(m => m.docs.length > 0).length
    logger.success(`${map.mappings.length} symbols indexed, ${mapped} mapped to doc sections.`)
    logger.info(`Map written to ${MAP_RELATIVE_PATH}`)

    const workflowPath = await generateWorkflow(cwd)
    logger.info(`Workflow written to ${path.relative(cwd, workflowPath)}`)
    logger.info('Add ANTHROPIC_API_KEY or OPENAI_API_KEY to your GitHub repository secrets to activate AutoDocs.')
  })

program
  .command('check')
  .description('Check changed symbols against docs and post PR comment')
  .option('--dry-run', 'Print proposed updates without posting to GitHub')
  .action(async (opts: { dryRun: boolean }) => {
    const cwd = process.cwd()
    const config = await loadConfig(cwd)
    const ctx = readGitHubContext()

    if (!ctx) {
      logger.error('Missing GitHub context. Set GITHUB_TOKEN, GITHUB_REPOSITORY, and PR_NUMBER.')
      process.exit(1)
    }

    logger.info('Running AutoDocs check...')
    const { updates, skippedFiles } = await runCheck(ctx, config, cwd)

    if (skippedFiles.length > 0) {
      logger.warn(`Skipped ${skippedFiles.length} deleted or unreadable file(s).`)
    }

    if (updates.length === 0) {
      logger.success('No doc updates needed.')
      return
    }

    logger.info(`Found ${updates.length} proposed update(s).`)

    if (opts.dryRun) {
      for (const u of updates) {
        process.stdout.write(`\n${u.docFile} — ${u.section}\n`)
        process.stdout.write(`\n--- before\n${u.beforeBody}\n`)
        process.stdout.write(`\n+++ after\n${u.afterBody}\n`)
        process.stdout.write(`\n`)
      }
      return
    }

    const octokit = createOctokit(ctx)
    await new GitHubOutput(octokit, ctx).postOrUpdate(updates)
    logger.success('PR comment posted.')
  })

program.parse()

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, answer => {
    rl.close()
    resolve(answer.trim())
  }))
}
