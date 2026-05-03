import { describe, it, expect } from 'vitest'
import { diffSymbols } from '../../src/differ/ast-differ.js'

const BASE_TS = `
export function processLogin(username: string, password: string): boolean {
  return true
}
export function validateToken(token: string): boolean {
  return token.startsWith('Bearer ')
}
`.trim()

const MODIFIED_TS = `
export function processLogin(username: string, password: string, mfa?: string): boolean {
  return true
}
export function validateToken(token: string): boolean {
  return token.startsWith('Bearer ')
}
export function processMFA(code: string): boolean {
  return code.length === 6
}
`.trim()

const DELETED_FN_TS = `
export function validateToken(token: string): boolean {
  return token.startsWith('Bearer ')
}
`.trim()

const file = 'src/auth/login.ts'

describe('ASTDiffer — TypeScript', () => {
  it('detects a modified symbol (signature change)', async () => {
    const changes = await diffSymbols(file, BASE_TS, MODIFIED_TS)
    const modified = changes.find(c => c.symbol === 'processLogin')
    expect(modified).toBeDefined()
    expect(modified!.type).toBe('modified')
  })

  it('detects an added symbol', async () => {
    const changes = await diffSymbols(file, BASE_TS, MODIFIED_TS)
    const added = changes.find(c => c.symbol === 'processMFA')
    expect(added).toBeDefined()
    expect(added!.type).toBe('added')
  })

  it('detects a removed symbol', async () => {
    const changes = await diffSymbols(file, BASE_TS, DELETED_FN_TS)
    const removed = changes.find(c => c.symbol === 'processLogin')
    expect(removed).toBeDefined()
    expect(removed!.type).toBe('removed')
  })

  it('reports no changes when source is identical', async () => {
    const changes = await diffSymbols(file, BASE_TS, BASE_TS)
    expect(changes).toHaveLength(0)
  })

  it('sets correct file on each change', async () => {
    const changes = await diffSymbols(file, BASE_TS, MODIFIED_TS)
    for (const c of changes) {
      expect(c.file).toBe(file)
    }
  })
})

const BASE_PY = `
def process_login(username: str, password: str) -> bool:
    return True

def validate_token(token: str) -> bool:
    return token.startswith("Bearer ")
`.trim()

const MODIFIED_PY = `
def process_login(username: str, password: str, mfa: str = '') -> bool:
    return True

def validate_token(token: str) -> bool:
    return token.startswith("Bearer ")

def process_mfa(code: str) -> bool:
    return len(code) == 6
`.trim()

describe('ASTDiffer — Python', () => {
  it('detects a modified symbol', async () => {
    const changes = await diffSymbols('auth.py', BASE_PY, MODIFIED_PY)
    const modified = changes.find(c => c.symbol === 'process_login')
    expect(modified).toBeDefined()
    expect(modified!.type).toBe('modified')
  })

  it('detects an added symbol', async () => {
    const changes = await diffSymbols('auth.py', BASE_PY, MODIFIED_PY)
    const added = changes.find(c => c.symbol === 'process_mfa')
    expect(added).toBeDefined()
    expect(added!.type).toBe('added')
  })
})
