// src/components/Editor.tsx
//
// MVP editor — the primary deliverable.
//
// Flow:
//   1. User types Markdown in the left pane
//   2. "Save" → POST /api/parse (Markdown → IR) → POST /api/posts (create post)
//              → POST /api/posts/:id/revisions (store IR)
//   3. On save success, POST /api/render/ir (IR → HTML) updates the right pane
//   4. "Load" tab lists saved posts; selecting one fetches its latest revision
//      and renders it back to HTML for display + reloads the Markdown into the editor

import React, { useState, useCallback, useRef } from 'react'
import DOMPurify from 'dompurify'
import { parse, renderIR, posts, revisions, Post, Revision } from '../api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || `post-${Date.now()}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; message: string }
  | { kind: 'ok';   message: string }
  | { kind: 'err';  message: string }

type View = 'editor' | 'posts'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  userEmail: string
  onLogout: () => void
}

export default function Editor({ userId, userEmail, onLogout }: Props) {
  const [view, setView]           = useState<View>('editor')
  const [markdown, setMarkdown]   = useState(DEFAULT_CONTENT)
  const [title, setTitle]         = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [status, setStatus]       = useState<Status>({ kind: 'idle' })
  const [postList, setPostList]   = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [activePost, setActivePost]   = useState<Post | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Toolbar format helper ─────────────────────────────────────────────────

  const applyFormat = useCallback((type: 'wrap' | 'line-prefix', prefix: string, suffix = '') => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const value = ta.value

    let newValue: string
    let newStart: number
    let newEnd:   number

    if (type === 'wrap') {
      const selected = value.slice(start, end)
      if (selected) {
        if (selected.startsWith(prefix) && selected.endsWith(suffix)) {
          const inner = selected.slice(prefix.length, selected.length - suffix.length)
          newValue = value.slice(0, start) + inner + value.slice(end)
          newStart = start
          newEnd   = start + inner.length
        } else {
          newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
          newStart = start
          newEnd   = end + prefix.length + suffix.length
        }
      } else {
        const before = value.slice(start - prefix.length, start)
        const after  = value.slice(start, start + suffix.length)
        if (before === prefix && after === suffix) {
          newValue = value.slice(0, start - prefix.length) + value.slice(start + suffix.length)
          newStart = start - prefix.length
          newEnd   = newStart
        } else {
          newValue = value.slice(0, start) + prefix + suffix + value.slice(start)
          newStart = start + prefix.length
          newEnd   = newStart
        }
      }
    } else {
      const KNOWN_PREFIXES = ['## ', '# ', '1. ', '- ']
      const lineStart  = value.lastIndexOf('\n', start - 1) + 1
      const lineEndRaw = value.indexOf('\n', start)
      const lineEnd    = lineEndRaw === -1 ? value.length : lineEndRaw
      const line       = value.slice(lineStart, lineEnd)

      if (line.startsWith(prefix)) {
        newValue = value.slice(0, lineStart) + line.slice(prefix.length) + value.slice(lineEnd)
        newStart = Math.max(lineStart, start - prefix.length)
        newEnd   = newStart
      } else {
        const existing = KNOWN_PREFIXES.find(p => line.startsWith(p)) ?? ''
        const bare     = existing ? line.slice(existing.length) : line
        newValue = value.slice(0, lineStart) + prefix + bare + value.slice(lineEnd)
        newStart = lineStart + prefix.length + bare.length
        newEnd   = newStart
      }
    }

    setMarkdown(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newStart, newEnd)
    })
  }, [])

  // ── Toolbar image helper ──────────────────────────────────────────────────

  const insertImage = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const value = ta.value
    const alt   = value.slice(start, end) || 'alt text'
    const template = `![${alt}](url)`

    const newValue = value.slice(0, start) + template + value.slice(end)
    // Position cursor over the 'url' placeholder so the user can type the URL
    const urlStart = start + 2 + alt.length + 2
    const urlEnd   = urlStart + 3

    setMarkdown(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(urlStart, urlEnd)
    })
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setStatus({ kind: 'err', message: 'Please enter a title before saving.' })
      return
    }
    setStatus({ kind: 'working', message: 'Parsing Markdown → IR…' })
    try {
      // 1. Parse markdown to IR
      const { nodes } = await parse(markdown)

      // 2. Create post (or reuse activePost)
      let post = activePost
      if (!post) {
        setStatus({ kind: 'working', message: 'Creating post record…' })
        post = await posts.create(slugify(title), title.trim(), userId)
        setActivePost(post)
      } else if (post.title !== title.trim()) {
        post = await posts.update(post.id, { title: title.trim() })
        setActivePost(post)
      }

      // 3. Save revision
      setStatus({ kind: 'working', message: 'Saving IR revision…' })
      await revisions.create(post.id, nodes)

      // 4. Render IR → HTML for preview
      setStatus({ kind: 'working', message: 'Rendering HTML preview…' })
      const { html } = await renderIR(nodes)
      setPreviewHtml(html)

      setStatus({ kind: 'ok', message: `Saved "${post.title}" · IR stored · preview updated` })
    } catch (err: unknown) {
      setStatus({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Save failed',
      })
    }
  }, [markdown, title, activePost, userId])

  // ── Load posts list ───────────────────────────────────────────────────────

  const handleViewPosts = useCallback(async () => {
    setView('posts')
    setLoadingPosts(true)
    try {
      const list = await posts.list()
      setPostList(list)
    } catch (err: unknown) {
      setStatus({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Could not load posts',
      })
    } finally {
      setLoadingPosts(false)
    }
  }, [])

  // ── Load a post into editor ───────────────────────────────────────────────

  const handleLoadPost = useCallback(async (post: Post) => {
    setStatus({ kind: 'working', message: `Loading "${post.title}"…` })
    try {
      const revList = await revisions.list(post.id)
      if (revList.length === 0) {
        setStatus({ kind: 'err', message: 'No revisions found for this post.' })
        return
      }
      // Most recent revision first (API returns newest first)
      const latest: Revision = revList[0]
      const ir = JSON.parse(latest.ir_json)

      // Render IR → HTML
      const { html } = await renderIR(ir)
      setPreviewHtml(html)
      setActivePost(post)
      setTitle(post.title)
      // We don't try to reconstruct Markdown from IR here — that's IR→MD (week 9).
      // Instead show a note in the editor.
      setMarkdown(
        `<!-- Post loaded from IR. Markdown reconstruction is not yet implemented.\n` +
        `     Edit here to create a new revision. -->\n\n` +
        `# ${post.title}\n`
      )
      setView('editor')
      setStatus({ kind: 'ok', message: `Loaded "${post.title}" · revision ${latest.id.slice(0, 8)}` })
    } catch (err: unknown) {
      setStatus({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Load failed',
      })
    }
  }, [])

  // ── New post ──────────────────────────────────────────────────────────────

  const handleNew = () => {
    setActivePost(null)
    setTitle('')
    setMarkdown(DEFAULT_CONTENT)
    setPreviewHtml(null)
    setStatus({ kind: 'idle' })
    setView('editor')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.shell}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.wordmark}>WriteOnce</span>
          <span style={styles.headerDivider}>·</span>
          <nav style={styles.nav}>
            <button
              className={`btn-ghost ${view === 'editor' ? 'nav-active' : ''}`}
              style={view === 'editor' ? styles.navActive : {}}
              onClick={() => setView('editor')}
            >
              Editor
            </button>
            <button
              className="btn-ghost"
              style={view === 'posts' ? styles.navActive : {}}
              onClick={handleViewPosts}
            >
              Posts
            </button>
          </nav>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userBadge}>{userEmail}</span>
          <button className="btn-ghost" onClick={onLogout} style={{ padding: '0.35rem 0.7rem' }}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Status bar ── */}
      {status.kind !== 'idle' && (
        <div
          className={`status-bar ${
            status.kind === 'ok' ? 'ok' : status.kind === 'err' ? 'err' : 'info'
          }`}
          style={styles.statusBar}
        >
          {status.kind === 'working' && <span style={styles.spinner}>⟳ </span>}
          {status.message}
        </div>
      )}

      {/* ── Editor view ── */}
      {view === 'editor' && (
        <div style={styles.workspace}>
          {/* Left: write pane */}
          <div style={styles.pane}>
            <div style={styles.paneHeader}>
              <div style={styles.paneHeaderLeft}>
                <span style={styles.paneLabel}>Markdown input</span>
                {activePost && (
                  <span style={styles.postBadge}>
                    editing {activePost.id.slice(0, 8)}
                  </span>
                )}
              </div>
              <button className="btn-ghost" onClick={handleNew} style={{ fontSize: '0.68rem' }}>
                New post
              </button>
            </div>

            <input
              type="text"
              placeholder="Post title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={styles.titleInput}
            />

            <div style={styles.toolbar}>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('line-prefix', '# ') }}>H1</button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('line-prefix', '## ') }}>H2</button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('wrap', '**', '**') }}><strong>B</strong></button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('wrap', '*', '*') }}><em>I</em></button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('line-prefix', '- ') }}>• List</button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('line-prefix', '1. ') }}>1. List</button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); applyFormat('wrap', '`', '`') }}>&lt;/&gt;</button>
              <button className="btn-ghost" style={styles.toolbarBtn} onMouseDown={e => { e.preventDefault(); insertImage() }} title="Insert image">&#128247;</button>
            </div>

            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              style={styles.textarea}
              spellCheck={false}
              placeholder="Write Markdown here…"
            />

            <div style={styles.paneFooter}>
              <span style={styles.charCount}>{markdown.length} chars</span>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={status.kind === 'working'}
              >
                {status.kind === 'working' ? 'Saving…' : 'Save → IR'}
              </button>
            </div>
          </div>

          {/* Right: preview pane */}
          <div style={styles.pane}>
            <div style={styles.paneHeader}>
              <span style={styles.paneLabel}>HTML preview</span>
              <span style={styles.paneHint}>rendered from IR</span>
            </div>

            <div style={styles.preview}>
              {previewHtml ? (
                <div
                  style={styles.previewContent}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                />
              ) : (
                <div style={styles.previewEmpty}>
                  <p>Save a post to see the IR → HTML render here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Posts list view ── */}
      {view === 'posts' && (
        <div style={styles.postsView}>
          <div style={styles.postsHeader}>
            <span style={styles.paneLabel}>Saved posts</span>
          </div>
          {loadingPosts ? (
            <p style={styles.emptyNote}>Loading…</p>
          ) : postList.length === 0 ? (
            <p style={styles.emptyNote}>No posts saved yet.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Title', 'Slug', 'Created', 'Actions'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {postList.map(post => (
                  <tr key={post.id} style={styles.tr}>
                    <td style={styles.td}>{post.title || <em style={{ color: 'var(--ink-light)' }}>Untitled</em>}</td>
                    <td style={{ ...styles.td, ...styles.tdMono }}>{post.slug}</td>
                    <td style={{ ...styles.td, ...styles.tdMono }}>
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '0.68rem', padding: '0.3rem 0.6rem' }}
                          onClick={() => handleLoadPost(post)}
                        >
                          Load
                        </button>
                        <button
                          className="btn-danger"
                          onClick={async () => {
                            if (!confirm(`Delete "${post.title}"?`)) return
                            try {
                              await posts.delete(post.id)
                              setPostList(l => l.filter(p => p.id !== post.id))
                            } catch (err: unknown) {
                              setStatus({
                                kind: 'err',
                                message: err instanceof Error ? err.message : 'Delete failed',
                              })
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Default starter content ───────────────────────────────────────────────────

const DEFAULT_CONTENT = `# Hello, WriteOnce

This is a **Markdown** editor. Write here, then press *Save → IR* to:

1. Parse this Markdown into the IR format
2. Store it as a post revision in the database
3. Render it back to HTML in the preview pane

## Supported elements

- Paragraphs and **bold** / *italic* text
- Bullet lists and numbered lists
- \`inline code\`
- Headings (H1–H6)

\`\`\`
code blocks too
\`\`\`
`

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--paper)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.2rem',
    height: '48px',
    borderBottom: '1px solid var(--paper-dark)',
    background: '#fff',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '0.8rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  wordmark: {
    fontFamily: 'var(--display)',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--ink)',
  },
  headerDivider: { color: 'var(--paper-dark)', fontSize: '1rem' },
  nav: { display: 'flex', gap: '0.2rem' },
  navActive: {
    background: 'var(--paper-mid)',
    color: 'var(--ink)',
    borderColor: 'var(--paper-dark)',
  },
  userBadge: {
    fontFamily: 'var(--mono)',
    fontSize: '0.72rem',
    color: 'var(--ink-light)',
  },
  statusBar: {
    flexShrink: 0,
    borderRadius: 0,
    borderBottom: '1px solid var(--paper-dark)',
  },
  spinner: { display: 'inline-block', animation: 'spin 1s linear infinite' },
  workspace: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    overflow: 'hidden',
  },
  pane: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid var(--paper-dark)',
  },
  paneHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    borderBottom: '1px solid var(--paper-mid)',
    background: 'var(--paper-mid)',
    flexShrink: 0,
  },
  paneHeaderLeft: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  paneLabel: {
    fontFamily: 'var(--mono)',
    fontSize: '0.68rem',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--ink-light)',
  },
  paneHint: {
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    color: 'var(--paper-dark)',
    fontStyle: 'italic',
  },
  postBadge: {
    fontFamily: 'var(--mono)',
    fontSize: '0.62rem',
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    padding: '0.1rem 0.4rem',
    borderRadius: '2px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.1rem',
    padding: '0.25rem 0.5rem',
    borderBottom: '1px solid var(--paper-mid)',
    background: 'var(--paper-mid)',
    flexShrink: 0,
  },
  toolbarBtn: {
    fontFamily: 'var(--mono)',
    fontSize: '0.68rem',
    padding: '0.2rem 0.45rem',
    minWidth: 'unset',
  },
  titleInput: {
    fontFamily: 'var(--display)',
    fontSize: '1.1rem',
    background: '#fff',
    border: 'none',
    borderBottom: '1px solid var(--paper-mid)',
    borderRadius: 0,
    padding: '0.7rem 1rem',
    outline: 'none',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    fontFamily: 'var(--mono)',
    fontSize: '0.82rem',
    lineHeight: '1.65',
    padding: '1rem',
    border: 'none',
    outline: 'none',
    resize: 'none',
    background: '#fff',
    color: 'var(--ink)',
  },
  paneFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    borderTop: '1px solid var(--paper-mid)',
    background: 'var(--paper-mid)',
    flexShrink: 0,
  },
  charCount: {
    fontFamily: 'var(--mono)',
    fontSize: '0.68rem',
    color: 'var(--ink-light)',
  },
  preview: {
    flex: 1,
    overflow: 'auto',
    background: '#fff',
  },
  previewContent: {
    padding: '1.5rem 1.8rem',
    fontFamily: 'var(--serif)',
    lineHeight: '1.75',
    maxWidth: '660px',
  },
  previewEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--ink-light)',
    fontFamily: 'var(--mono)',
    fontSize: '0.8rem',
    textAlign: 'center',
    padding: '2rem',
  },
  postsView: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem 2rem',
  },
  postsHeader: {
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--paper-dark)',
  },
  emptyNote: {
    fontFamily: 'var(--mono)',
    fontSize: '0.8rem',
    color: 'var(--ink-light)',
    marginTop: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'var(--serif)',
    fontSize: '0.9rem',
  },
  th: {
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: 'var(--ink-light)',
    textAlign: 'left',
    padding: '0.5rem 0.8rem',
    borderBottom: '2px solid var(--paper-dark)',
  },
  tr: {
    borderBottom: '1px solid var(--paper-mid)',
  },
  td: {
    padding: '0.6rem 0.8rem',
    verticalAlign: 'middle',
  },
  tdMono: {
    fontFamily: 'var(--mono)',
    fontSize: '0.78rem',
    color: 'var(--ink-light)',
  },
}
