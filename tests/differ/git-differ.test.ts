import { describe, it, expect } from 'vitest'
import { parseGitDiff } from '../../src/differ/git-differ.js'

const FIXTURE_DIFF = `\
diff --git a/src/auth/login.ts b/src/auth/login.ts
index abc1234..def5678 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,7 +1,10 @@
-export function processLogin(username: string, password: string): boolean {
+export function processLogin(username: string, password: string, mfa?: string): boolean {
   return true
 }
 export function validateToken(token: string): boolean {
   return token.startsWith('Bearer ')
 }
+export function processMFA(code: string): boolean {
+  return code.length === 6
+}
diff --git a/src/payments/pay.ts b/src/payments/pay.ts
index 111aaaa..222bbbb 100644
--- a/src/payments/pay.ts
+++ b/src/payments/pay.ts
@@ -5,4 +5,4 @@
-export function charge(amount: number): void {}
+export function charge(amount: number, currency: string): void {}
`

describe('parseGitDiff', () => {
  it('returns one entry per changed file', () => {
    const result = parseGitDiff(FIXTURE_DIFF)
    expect(result).toHaveLength(2)
  })

  it('extracts correct file paths', () => {
    const result = parseGitDiff(FIXTURE_DIFF)
    const files = result.map(r => r.file)
    expect(files).toContain('src/auth/login.ts')
    expect(files).toContain('src/payments/pay.ts')
  })

  it('records changed line ranges from hunks', () => {
    const result = parseGitDiff(FIXTURE_DIFF)
    const auth = result.find(r => r.file === 'src/auth/login.ts')!
    expect(auth.changedLines.length).toBeGreaterThan(0)
  })

  it('returns empty array for empty diff', () => {
    expect(parseGitDiff('')).toHaveLength(0)
  })
})
