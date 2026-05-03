import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import type { Root, Heading, RootContent } from 'mdast'

const parser = unified().use(remarkParse)
const serializer = unified().use(remarkParse).use(remarkStringify)

function headingText(node: Heading): string {
  return node.children
    .filter(c => c.type === 'text')
    .map(c => (c as { value: string }).value)
    .join('')
}

function targetHeadingText(sectionHeading: string): string {
  return sectionHeading.replace(/^#{1,6}\s+/, '')
}

export class MarkdownEditor {
  static replaceSection(
    source: string,
    sectionHeading: string,
    newBody: string,
  ): string {
    const tree = parser.parse(source) as Root
    const target = targetHeadingText(sectionHeading)
    const children = tree.children

    const headingIndex = children.findIndex(
      node => node.type === 'heading' && headingText(node as Heading) === target,
    )

    if (headingIndex === -1) return source

    const headingNode = children[headingIndex] as Heading
    const headingDepth = headingNode.depth

    // find the end of this section (next heading at same or higher level)
    let sectionEnd = children.length
    for (let i = headingIndex + 1; i < children.length; i++) {
      const node = children[i]
      if (node.type === 'heading' && (node as Heading).depth <= headingDepth) {
        sectionEnd = i
        break
      }
    }

    const bodyTree = parser.parse(newBody) as Root
    const replacement: RootContent[] = [headingNode, ...bodyTree.children]

    tree.children = [
      ...children.slice(0, headingIndex),
      ...replacement,
      ...children.slice(sectionEnd),
    ]

    return serializer.stringify(tree)
  }
}
