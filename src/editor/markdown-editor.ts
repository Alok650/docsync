import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import type { Root, Heading, Text, RootContent } from 'mdast'

const parse = unified().use(remarkParse)
const stringify = unified().use(remarkParse).use(remarkStringify)

function headingText(node: Heading): string {
  return node.children
    .filter((c): c is Text => c.type === 'text')
    .map(c => c.value)
    .join('')
}

function stripHeadingMarkers(heading: string): string {
  return heading.replace(/^#{1,6}\s+/, '')
}

export class MarkdownEditor {
  static replaceSection(
    source: string,
    sectionHeading: string,
    newBody: string,
  ): string {
    const tree = parse.parse(source) as Root
    const target = stripHeadingMarkers(sectionHeading)
    const children = tree.children

    const headingIndex = children.findIndex(
      node => node.type === 'heading' && headingText(node as Heading) === target,
    )

    if (headingIndex === -1) return source

    const headingNode = children[headingIndex] as Heading
    const headingDepth = headingNode.depth

    let sectionEnd = children.length
    for (let i = headingIndex + 1; i < children.length; i++) {
      if (children[i].type === 'heading' && (children[i] as Heading).depth <= headingDepth) {
        sectionEnd = i
        break
      }
    }

    const bodyNodes = (parse.parse(newBody) as Root).children
    const replacement: RootContent[] = [headingNode, ...bodyNodes]

    tree.children = [
      ...children.slice(0, headingIndex),
      ...replacement,
      ...children.slice(sectionEnd),
    ]

    return stringify.stringify(tree)
  }
}
