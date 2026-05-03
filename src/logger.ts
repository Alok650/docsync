import { createConsola } from 'consola'

// Single logger instance for the whole process.
// Level is read once at startup; set DOCSYNC_DEBUG=1 for verbose output.
// In CI environments (CI=true) consola automatically disables colors and icons.
export const logger = createConsola({
  level: process.env.DOCSYNC_DEBUG ? 4 : 3, // 4 = debug, 3 = info
})
