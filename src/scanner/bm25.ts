import { BM25 } from '../defaults.js'
import type { DocSection } from './doc-scanner.js'

export interface BM25Result {
  readonly section: DocSection
  readonly score: number
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[`_\-./]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0)
}

function termFrequencies(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
  return freq
}

export class BM25Matcher {
  private readonly sections: readonly DocSection[]
  private readonly docTokens: string[][]
  private readonly docFreqs: Map<string, number>[]
  private readonly idf: Map<string, number>
  private readonly avgDocLen: number

  constructor(sections: readonly DocSection[]) {
    this.sections = sections
    this.docTokens = sections.map(s => tokenize(s.heading + ' ' + s.body))
    this.docFreqs = this.docTokens.map(termFrequencies)
    this.avgDocLen = this.docTokens.reduce((sum, t) => sum + t.length, 0) / (sections.length || 1)
    this.idf = this.buildIdf()
  }

  private buildIdf(): Map<string, number> {
    const df = new Map<string, number>()
    const N = this.sections.length

    for (const freq of this.docFreqs) {
      for (const term of freq.keys()) {
        df.set(term, (df.get(term) ?? 0) + 1)
      }
    }

    const idf = new Map<string, number>()
    for (const [term, docCount] of df) {
      idf.set(term, Math.log((N - docCount + 0.5) / (docCount + 0.5) + 1))
    }
    return idf
  }

  query(symbolName: string): BM25Result[] {
    const queryTokens = tokenize(symbolName)
    const results: BM25Result[] = []

    for (let i = 0; i < this.sections.length; i++) {
      const docLen = this.docTokens[i].length
      const freq = this.docFreqs[i]
      let score = 0

      for (const term of queryTokens) {
        const tf = freq.get(term) ?? 0
        if (tf === 0) continue
        const idf = this.idf.get(term) ?? 0
        const numerator = tf * (BM25.K1 + 1)
        const denominator = tf + BM25.K1 * (1 - BM25.B + BM25.B * (docLen / this.avgDocLen))
        score += idf * (numerator / denominator)
      }

      if (score > BM25.CORPUS_MIN_SCORE) {
        results.push({ section: this.sections[i], score })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }
}
