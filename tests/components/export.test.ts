// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadMarkdown, slugify } from '../../src/utils/export'
import type { HeaderNode, IRNode, ParagraphNode } from '../../src/ir/types'

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('My Post Title')).toBe('my-post-title')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
  })

  it('collapses consecutive non-alphanumerics to a single hyphen', () => {
    expect(slugify('foo  --  bar')).toBe('foo-bar')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  -hello- ')).toBe('hello')
  })

  it('falls back to "post" for a blank string', () => {
    expect(slugify('')).toBe('post')
  })
})

// ---------------------------------------------------------------------------
// downloadMarkdown
// ---------------------------------------------------------------------------

describe('downloadMarkdown', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let capturedAnchor: HTMLAnchorElement | null

  beforeEach(() => {
    capturedAnchor = null
    createObjectURLMock = vi.fn().mockReturnValue('blob:fake-url')
    revokeObjectURLMock = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })

    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag === 'a') {
        capturedAnchor = el as HTMLAnchorElement
        vi.spyOn(capturedAnchor, 'click').mockImplementation(() => {})
      }
      return el
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const headerNode: IRNode = {
    kind: 'Header',
    level: 1,
    content: ['Hello'],
  } satisfies HeaderNode

  const paragraphNode: IRNode = {
    kind: 'Paragraph',
    content: [['World']],
  } satisfies ParagraphNode

  it('renders correctly — anchor is created and clicked', () => {
    downloadMarkdown('test', [headerNode])
    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.click).toHaveBeenCalledOnce()
  })

  it('uses a slugified title as the filename', () => {
    downloadMarkdown('My Post Title', [headerNode])
    expect(capturedAnchor?.download).toBe('my-post-title.md')
  })

  it('falls back to post.md when title is undefined', () => {
    downloadMarkdown(undefined, [headerNode])
    expect(capturedAnchor?.download).toBe('post.md')
  })

  it('falls back to post.md when title is an empty string', () => {
    downloadMarkdown('', [headerNode])
    expect(capturedAnchor?.download).toBe('post.md')
  })

  it('sets the anchor href to the object URL', () => {
    downloadMarkdown('test', [headerNode])
    expect(capturedAnchor?.href).toBe('blob:fake-url')
  })

  it('creates the object URL from a Blob', () => {
    downloadMarkdown('test', [headerNode])
    const [blobArg] = createObjectURLMock.mock.calls[0] as [Blob]
    expect(blobArg).toBeInstanceOf(Blob)
  })

  it('sets the Blob MIME type to text/markdown', () => {
    downloadMarkdown('test', [headerNode])
    const [blobArg] = createObjectURLMock.mock.calls[0] as [Blob]
    expect(blobArg.type).toBe('text/markdown;charset=utf-8')
  })

  it('Blob content matches markdownRenderer output', async () => {
    downloadMarkdown('test', [headerNode])
    const [blobArg] = createObjectURLMock.mock.calls[0] as [Blob]
    const text = await blobArg.text()
    expect(text).toBe('# Hello')
  })

  it('renders a multi-node document with blank-line separators', async () => {
    downloadMarkdown('test', [headerNode, paragraphNode])
    const [blobArg] = createObjectURLMock.mock.calls[0] as [Blob]
    const text = await blobArg.text()
    expect(text).toBe('# Hello\n\nWorld')
  })

  it('revokes the object URL after the click', () => {
    downloadMarkdown('test', [headerNode])
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:fake-url')
  })

  it('removes the anchor from the DOM after the click', () => {
    downloadMarkdown('test', [headerNode])
    expect(document.body.contains(capturedAnchor)).toBe(false)
  })
})
