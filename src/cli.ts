#!/usr/bin/env node
import { Command } from 'commander'
import path from 'path'
import { extractSymbols } from './extractor/index.js'

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
    const symbols = await extractSymbols(filePath)
    if (symbols.length === 0) {
      console.log('No symbols found.')
      return
    }
    for (const s of symbols) {
      console.log(`${s.name.padEnd(30)} [${s.startLine}-${s.endLine}]  (${s.kind})`)
    }
  })

program.parse()
