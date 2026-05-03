#!/usr/bin/env node
import { Command } from 'commander'
import fs from 'fs/promises'
import path from 'path'
import readline from 'readline'
import { extractSymbols } from './extractor/index.js'
import { buildMap } from './map/builder.js'
import { findCodeFiles } from './scanner/file-finder.js'

const SYMBOL_NAME_COLUMN_WIDTH = 30
const MAP_DIR = '.autodocs'
const MAP_FILE = 'map.json'

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
    let symbols: Awaited<ReturnType<typeof extractSymbols>>
    try {
      symbols = await extractSymbols(filePath)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Error extracting symbols: ${message}`)
      return
    }
    if (symbols.length === 0) {
      console.log('No symbols found.')
      return
    }
    for (const s of symbols) {
      console.log(`${s.name.padEnd(SYMBOL_NAME_COLUMN_WIDTH)} [${s.startLine}-${s.endLine}]  (${s.kind})`)
    }
  })

program
  .command('init')
  .description('Scan codebase and docs, write .autodocs/map.json')
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
      console.log('No code files found.')
      return
    }

    console.log(`Scanning ${codeFiles.length} code files and docs in ${docsDir}...`)
    const map = await buildMap(codeFiles, docsDir)

    const outDir = path.join(cwd, MAP_DIR)
    await fs.mkdir(outDir, { recursive: true })
    const outFile = path.join(outDir, MAP_FILE)
    await fs.writeFile(outFile, JSON.stringify(map, null, 2), 'utf-8')

    const mapped = map.mappings.filter(m => m.docs.length > 0).length
    console.log(`Done. ${map.mappings.length} symbols indexed, ${mapped} mapped to doc sections.`)
    console.log(`Map written to ${path.relative(cwd, outFile)}`)
  })

program.parse()

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, answer => {
    rl.close()
    resolve(answer.trim())
  }))
}
