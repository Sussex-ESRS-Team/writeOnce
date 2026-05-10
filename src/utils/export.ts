import type { IRNode } from '../ir/types'
import { markdownRenderer } from '../ir/markdown_renderer'

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'post'
  )
}

export function downloadMarkdown(title: string | undefined, nodes: IRNode[]): void {
  const markdown = markdownRenderer.renderDocument({ kind: 'Document', nodes })
  const filename = title ? `${slugify(title)}.md` : 'post.md'
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
