export function processLogin(username: string, password: string): boolean {
  return username.length > 0 && password.length > 0
}

export function validateToken(token: string): boolean {
  return token.startsWith('Bearer ')
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export interface AuthConfig {
  tokenExpiry: number
  maxRetries: number
}

export type AuthResult = { success: boolean; token?: string }

// internal — should NOT be extracted
function hashPassword(password: string): string {
  return password
}
