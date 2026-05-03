import Anthropic from '@anthropic-ai/sdk'
import type { DocSection } from '../scanner/doc-scanner.js'

export interface DocUpdateRequest {
  symbol: string
  file: string
  beforeCode: string
  afterCode: string
  docSection: DocSection & { heading: string }
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are a technical documentation editor. \
You will be given a code change and a documentation section that references the changed code. \
Your task is to update ONLY the text within the section to reflect the code change. \
Return only the updated paragraph text — no headings, no surrounding markdown, no explanation.`

function buildUserPrompt(req: DocUpdateRequest): string {
  return `The function \`${req.symbol}\` in \`${req.file}\` was changed.

BEFORE:
\`\`\`
${req.beforeCode}
\`\`\`

AFTER:
\`\`\`
${req.afterCode}
\`\`\`

Documentation section "${req.docSection.heading}" currently reads:
${req.docSection.body}

Update only the paragraph(s) that describe \`${req.symbol}\` to reflect the change. \
Preserve tone, style, and any content unrelated to \`${req.symbol}\`. \
Return only the updated paragraph text.`
}

export class DocUpdateAgent {
  private readonly client: Pick<Anthropic, 'messages'>
  private readonly model: string

  constructor(client?: Pick<Anthropic, 'messages'>, model = DEFAULT_MODEL) {
    this.client = client ?? new Anthropic()
    this.model = model
  }

  async generateUpdate(request: DocUpdateRequest): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(request) }],
    })

    const textBlock = response.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('DocUpdateAgent: Claude returned no text content')
    }

    return textBlock.text.trim()
  }
}
