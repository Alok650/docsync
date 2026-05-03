import { describe, it, expect } from 'vitest'
import { MarkdownEditor } from '../../src/editor/markdown-editor.js'

const DOC = `\
# Authentication

Intro paragraph.

## Login Flow

The \`processLogin\` function accepts a username and password.
Call it to authenticate users.

## Error Handling

\`AuthError\` is thrown when authentication fails.

## Configuration

Use \`AuthConfig\` to control token expiry.
`

describe('MarkdownEditor', () => {
  it('replaces the target section body without touching others', () => {
    const updated = MarkdownEditor.replaceSection(
      DOC,
      '## Login Flow',
      'The `processLogin` function now also accepts an optional MFA token.',
    )
    expect(updated).toContain('MFA token')
    expect(updated).toContain('## Error Handling')
    expect(updated).toContain('`AuthError` is thrown')
    expect(updated).toContain('## Configuration')
  })

  it('preserves headings and surrounding structure', () => {
    const updated = MarkdownEditor.replaceSection(DOC, '## Login Flow', 'New content.')
    expect(updated).toContain('# Authentication')
    expect(updated).toContain('## Login Flow')
    expect(updated).toContain('## Error Handling')
  })

  it('does not duplicate the heading', () => {
    const updated = MarkdownEditor.replaceSection(DOC, '## Login Flow', 'New content.')
    const count = (updated.match(/## Login Flow/g) ?? []).length
    expect(count).toBe(1)
  })

  it('returns original doc unchanged when section not found', () => {
    const updated = MarkdownEditor.replaceSection(DOC, '## Nonexistent Section', 'New content.')
    expect(updated).toBe(DOC)
  })
})
